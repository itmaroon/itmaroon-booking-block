<?php

/**
 * REST API + Custom Table for reservation slots (capacity)
 */

namespace Itmar\BookingClassPackage\Reservation;

if (! defined('ABSPATH')) exit;

use WP_Error;
use WP_REST_Request;
use WP_REST_Server;
use WP_REST_Response;

final class BookingAPI
{
    const VERSION = '1.0.0';

    public static function init(): void
    {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    public static function register_routes(): void
    {

        register_rest_route('itmar/v1', '/bookings', [
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'bookings_exec'],
                'permission_callback' => [__CLASS__, 'can_login_user'],
                'args' => [],
            ],
        ]);
        register_rest_route('itmar/v1', '/cancel_booking', [
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'cancel_booking'],
                'permission_callback' => [__CLASS__, 'can_login_user'],
                'args' => [],
            ],
        ]);
        register_rest_route('itmar/v1', '/get_user_bookings', [
            [
                'methods'  => WP_REST_Server::READABLE, // GET
                'callback' => [__CLASS__, 'get_user_bookings'],
                'permission_callback' => [__CLASS__, 'can_login_user'], // 先ほど作成したログインチェック関数
            ],
        ]);
    }

    public static function can_login_user(WP_REST_Request $request): bool
    {
        // 1. まずログインしているかどうかをチェック
        if (! is_user_logged_in()) {
            return false;
        }

        // 2. フィルタを通した権限チェック（ここを柔軟にする）
        // 予約実行の場合は 'read'（全ログインユーザーが持つ権限）程度で十分です
        $cap = apply_filters('itmar_reservation_login_cap', 'read', $request);

        return current_user_can($cap);
    }



    //予約処理を実行する
    public static function bookings_exec(WP_REST_Request $request)
    {
        global $wpdb;

        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_slots = $wpdb->prefix . 'itmar_reservation_slots';

        // 1. テーブルが存在しない場合は作成（dbDeltaを使用）
        self::maybe_create_bookings_table($table_bookings);

        // 2. パラメータの取得とバリデーション
        $params = $request->get_json_params();
        $slot_id = intval($params['slot_id'] ?? 0);
        $guest_count = intval($params['guest_count'] ?? 1);
        $user_id = get_current_user_id();

        if (!$slot_id || $guest_count <= 0) {
            return new WP_Error('invalid_data', '予約データが正しくありません。', ['status' => 400]);
        }

        // 3. 在庫の最終チェック（SELECT ... FOR UPDATE に相当する排他制御が理想ですが、まずは標準的なチェック）
        $slot = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_slots WHERE id = %d",
            $slot_id
        ));

        if (!$slot) {
            return new WP_Error('not_found', '指定された予約枠が見つかりません。', ['status' => 404]);
        }

        // 残り人数の計算（capacity_total から現在の予約総数を引くなどのロジックに合わせて調整してください）
        // ここでは単純に capacity_total を「残り枠」として扱っている前提で書きます
        if ($slot->capacity_total < $guest_count) {
            return new WP_Error('no_vacancy', '予約枠が足りません。', ['status' => 400]);
        }

        // 4. 予約レコードの追加
        $wpdb->insert(
            $table_bookings,
            [
                'slot_id'     => $slot_id,
                'user_id'     => $user_id,
                'guest_count' => $guest_count,
                'status'      => 'confirmed',
                'created_at'  => current_time('mysql'),
                'updated_at'  => current_time('mysql'),
            ],
            ['%d', '%d', '%d', '%s', '%s', '%s']
        );

        $booking_id = $wpdb->insert_id;

        if (!$booking_id) {
            return new WP_Error('db_error', '予約の保存に失敗しました。', ['status' => 500]);
        }

        // 5. 在庫数の更新（スロット側の残り人数を減らす）
        $wpdb->update(
            $table_slots,
            ['capacity_total' => $slot->capacity_total - $guest_count],
            ['id' => $slot_id],
            ['%d'],
            ['%d']
        );

        return new WP_REST_Response([
            'success'    => true,
            'message'    => '予約が完了しました。',
            'booking_id' => $booking_id
        ], 200);
    }

    //予約をキャンセルする
    public static function cancel_booking(WP_REST_Request $request)
    {
        global $wpdb;
        $booking_id = $request->get_param('id');
        $user_id = get_current_user_id();

        // 1. 予約の存在と所有権チェック
        $booking = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}itmar_bookings WHERE id = %d AND user_id = %d",
            $booking_id,
            $user_id
        ));

        if (!$booking || $booking->status === 'cancelled') {
            return new WP_Error('invalid', 'キャンセル可能な予約が見つかりません。');
        }

        // 2. ステータスを cancelled に更新
        $wpdb->update(
            "{$wpdb->prefix}itmar_bookings",
            ['status' => 'cancelled', 'updated_at' => current_time('mysql')],
            ['id' => $booking_id]
        );

        // 3. 重要：在庫(slots)を人数分戻す
        $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->prefix}itmar_reservation_slots 
         SET capacity_total = capacity_total + %d 
         WHERE id = %d",
            $booking->guest_count,
            $booking->slot_id
        ));

        return ['success' => true];
    }

    /**
     * ログインユーザーの予約一覧を取得する
     */
    public static function get_user_bookings(WP_REST_Request $request)
    {
        global $wpdb;
        $user_id = get_current_user_id();

        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_slots    = $wpdb->prefix . 'itmar_reservation_slots';
        $table_posts    = $wpdb->posts; // 船の名前(resource)を取得するため

        // 予約データ、スロット情報、リソース名（船名）を結合して取得
        $query = $wpdb->prepare("
        SELECT 
            b.id as booking_id,
            b.guest_count,
            b.status as booking_status,
            s.slot_date,
            p.post_title as resource_name
        FROM $table_bookings as b
        JOIN $table_slots as s ON b.slot_id = s.id
        JOIN $table_posts as p ON s.resource_id = p.ID
        WHERE b.user_id = %d
        AND b.status != 'deleted'
        ORDER BY s.slot_date DESC
    ", $user_id);

        $results = $wpdb->get_results($query);

        return new WP_REST_Response($results, 200);
    }

    /**
     * テーブルが存在しない場合に作成するプライベートメソッド
     */
    private static function maybe_create_bookings_table($table_name)
    {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        // テーブルが存在するかチェック
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
            $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            slot_id bigint(20) NOT NULL,
            user_id bigint(20) NOT NULL,
            guest_count int(11) NOT NULL DEFAULT 1,
            status varchar(50) NOT NULL DEFAULT 'confirmed',
            created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            updated_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            PRIMARY KEY  (id),
            KEY slot_id (slot_id),
            KEY user_id (user_id)
        ) $charset_collate;";

            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            dbDelta($sql);
        }
    }
}
