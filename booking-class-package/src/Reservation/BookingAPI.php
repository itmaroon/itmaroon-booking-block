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

final class BookingAPI extends BaseReserve
{
    const VERSION = '1.0.0';

    public static function init(): void
    {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    public static function activate(): void
    {
        global $wpdb;

        self::maybe_create_bookings_table($wpdb->prefix . 'itmar_bookings');
    }

    public static function register_routes(): void
    {

        register_rest_route('itmar/v1', '/bookings', [
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'create_booking'],
                'permission_callback' => [__CLASS__, 'can_login_user'],
                'args' => [],
            ],
            // 拡張：削除用 (DELETE)
            [
                'methods'  => WP_REST_Server::DELETABLE, // 'DELETE'
                'callback' => [__CLASS__, 'delete_bookings'], // 削除用のハンドラ
                'permission_callback' => [__CLASS__, 'can_manage_slots'], // 既存の権限チェックを流用
                'args' => [
                    'ids' => [
                        'required' => true,
                        'type'     => 'array',
                        'items'    => ['type' => 'integer'],
                        'description' => '削除対象の予約IDリスト',
                    ],
                ],
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
        register_rest_route('itmar/v1', '/change_booking', [
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'change_booking'],
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


    /**
     * 予約実行 REST API ハンドラ
     */
    public static function create_booking(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom booking tables require direct queries; live availability and row locks must not be cached.
        global $wpdb;

        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_slots = $wpdb->prefix . 'itmar_reservation_slots';
        $table_slot_details = $wpdb->prefix . 'itmar_slot_details';
        $table_units   = $wpdb->prefix . 'itmar_resource_units';

        // パラメータ取得
        // 数値は intval() で整数化（これが最強のサニタイズです）
        $resource_id  = absint($request->get_param('resource_id'));
        $guest_count  = absint($request->get_param('guest_count'));

        $is_same_unit = (bool) $request->get_param('is_same_unit');

        // 文字列は sanitize_text_field() を通す

        $reserve_date = sanitize_text_field($request->get_param('reserveDate')); // YYYY-MM-DD
        $reserve_time = sanitize_text_field($request->get_param('reserveTime')); // HH:mm～HH:mm

        // 1. "～" で分割して開始時刻を取得
        $time_parts = explode('～', $reserve_time);
        $start_time_raw = isset($time_parts[0]) ? trim($time_parts[0]) : '';

        // 2. "16:00" を "16:00:00" に変換
        // すでに秒まで含まれている可能性も考慮して整形します
        $start_time = (strlen($start_time_raw) === 5) ? $start_time_raw . ':00' : $start_time_raw;

        if ($resource_id <= 0 || $guest_count <= 0) {
            return new WP_Error('invalid_booking', __('A valid resource and guest count are required.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorInside']);
        }

        if (!self::validate_date($reserve_date) || !self::validate_time($start_time)) {
            return new WP_Error('invalid_booking_time', __('The reservation date or time is invalid.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorInside']);
        }

        // ユーザーIDの取得  
        $user_id = get_current_user_id();

        // フロントエンドでも制御しますが、念のためサーバー側でもブロック
        if (!$user_id) {
            return new WP_Error('rest_not_logged_in', __('You must be logged in to make a reservation.', 'itmaroon-booking-block'), ['status' => 401, 'info_code' => 'errorLogin']);
        }

        // トランザクション開始
        $wpdb->query('START TRANSACTION');

        // 初期状態ではエラーなし
        $error = null;

        // 1. 親スロットID取得
        $slot_id = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM %i WHERE resource_id = %d AND slot_date = %s",
            $table_slots,
            $resource_id,
            $reserve_date
        ));

        if (!$slot_id) {
            $error = new WP_Error('no_slot', __('No reservation slot was found for the selected date.', 'itmaroon-booking-block'), ['status' => 404, 'info_code' => 'errorNoSlot']);
        }

        if (!$error) {
            // 2. ユニット検索
            // is_same_unit が "on" の場合、単体で guest_count を満たすユニットに絞り込む
            if ($is_same_unit) {
                $available_units = $wpdb->get_results($wpdb->prepare(
                    "SELECT
                        d.id,
                        u.max_capacity
                    FROM %i AS d
                    INNER JOIN %i AS u ON d.unit_id = u.id
                    WHERE d.slot_id = %d
                    AND d.start_time = %s
                    AND d.is_booked = 0
                    AND d.status = 'open'
                    AND u.max_capacity >= %d
                    ORDER BY u.max_capacity ASC
                    FOR UPDATE",
                    $table_slot_details,
                    $table_units,
                    $slot_id,
                    $start_time,
                    $guest_count
                ));
            } else {
                $available_units = $wpdb->get_results($wpdb->prepare(
                    "SELECT
                        d.id,
                        u.max_capacity
                    FROM %i AS d
                    INNER JOIN %i AS u ON d.unit_id = u.id
                    WHERE d.slot_id = %d
                    AND d.start_time = %s
                    AND d.is_booked = 0
                    AND d.status = 'open'
                    ORDER BY u.max_capacity ASC
                    FOR UPDATE",
                    $table_slot_details,
                    $table_units,
                    $slot_id,
                    $start_time
                ));
            }

            // 3. 予約判定ロジック
            $target_unit_ids = [];
            if ($is_same_unit) {
                if (empty($available_units)) {
                    $error = new WP_Error('no_unit', __('No single available unit can accommodate the requested number of guests.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorNoUnit']);
                } else {
                    $target_unit_ids = [$available_units[0]->id];
                }
            } else {
                $current_capacity = 0;
                foreach ($available_units as $unit) {
                    $current_capacity += $unit->max_capacity;
                    $target_unit_ids[] = $unit->id;
                    if ($current_capacity >= $guest_count) break;
                }
                if ($current_capacity < $guest_count) {
                    $error = new WP_Error('insufficient_capacity', __('There is not enough total capacity for this reservation.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorFull']);
                }
            }
        }

        // エラーがあった場合の処理
        if (is_wp_error($error)) {
            $wpdb->query('ROLLBACK');
            return $error; // WordPressが自動的に適切なJSONレスポンスに変換してくれます
        }

        // 4. 更新処理
        foreach ($target_unit_ids as $id) {
            $updated = $wpdb->update(
                $table_slot_details,
                ['is_booked' => 1],
                ['id' => $id],
                ['%d'],
                ['%d']
            );

            if (false === $updated) {
                $wpdb->query('ROLLBACK');
                return new WP_Error('db_error', __('The reservation could not be saved.', 'itmaroon-booking-block'), ['status' => 500, 'info_code' => 'errorInside']);
            }
        }

        // 確保した ID 配列をカンマ区切りの文字列にする
        $detail_ids_string = implode(',', array_map('intval', $target_unit_ids));

        $inserted = $wpdb->insert(
            $table_bookings,
            [
                'user_id'         => $user_id,
                'resource_id'     => $resource_id,
                'slot_detail_ids' => $detail_ids_string,
                'guest_count'     => $guest_count,
                'status'          => 'confirmed',
                'created_at'      => current_time('mysql'),
                'updated_at'      => current_time('mysql'),
            ],
            ['%d', '%d', '%s', '%d', '%s', '%s', '%s']
        );

        if (false === $inserted) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('db_error', __('The reservation could not be saved.', 'itmaroon-booking-block'), ['status' => 500, 'info_code' => 'errorInside']);
        }

        $wpdb->query('COMMIT');
        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new WP_REST_Response(['success' => true, 'info_code' => 'successBooking'], 200);
    }

    //予約レコードの削除
    public static function delete_bookings(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom booking tables require direct queries; deletion and seat release must use current locked data.
        global $wpdb;
        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_details = $wpdb->prefix . 'itmar_slot_details';

        // apiFetch経由なら get_param で直接取れます
        $ids = $request->get_param('ids');

        if (empty($ids) || !is_array($ids)) {
            return new WP_REST_Response(['success' => false, 'message' => __('No booking IDs were provided.', 'itmaroon-booking-block')], 400);
        }

        // 数値の配列であることを保証
        $ids = array_values(array_filter(wp_parse_id_list($ids)));
        if (empty($ids)) {
            return new WP_REST_Response(['success' => false, 'message' => __('No valid booking IDs were provided.', 'itmaroon-booking-block')], 400);
        }

        // プレースホルダ文字列作成 (例: "%d,%d,%d")
        $placeholders = implode(',', array_fill(0, count($ids), '%d'));

        $wpdb->query('START TRANSACTION');

        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
        $bookings = $wpdb->get_results($wpdb->prepare(
            "SELECT slot_detail_ids FROM %i WHERE id IN ($placeholders) AND status = 'confirmed' FOR UPDATE",
            array_merge([$table_bookings], $ids)
        ));
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        $detail_ids = [];
        foreach ($bookings as $booking) {
            $detail_ids = array_merge($detail_ids, array_map('absint', explode(',', $booking->slot_detail_ids)));
        }
        $detail_ids = array_values(array_unique(array_filter($detail_ids)));

        if (!empty($detail_ids)) {
            $detail_placeholders = implode(',', array_fill(0, count($detail_ids), '%d'));
            // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
            $released = $wpdb->query($wpdb->prepare(
                "UPDATE %i SET is_booked = 0 WHERE id IN ($detail_placeholders)",
                array_merge([$table_details], $detail_ids)
            ));
            // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

            if (false === $released) {
                $wpdb->query('ROLLBACK');
                return new WP_REST_Response(['success' => false, 'message' => __('A database error occurred.', 'itmaroon-booking-block')], 500);
            }
        }

        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
        $result = $wpdb->query($wpdb->prepare(
            "DELETE FROM %i WHERE id IN ($placeholders)",
            array_merge([$table_bookings], $ids)
        ));
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        if (false === $result) {
            $wpdb->query('ROLLBACK');
            return new WP_REST_Response(['success' => false, 'message' => __('A database error occurred.', 'itmaroon-booking-block')], 500);
        }

        $wpdb->query('COMMIT');

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new WP_REST_Response([
            'success' => true,
            'deleted_count' => $result,
            'message' => sprintf(
                /* translators: %d: 削除された件数 */
                __("%d cases data deleted.", "itmaroon-booking-block"),
                $result
            )
        ], 200);
    }

    //予約をキャンセルする
    public static function cancel_booking(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom booking tables require direct queries; cancellation must release seats from current locked data.
        global $wpdb;
        //パラメーターの取得
        $booking_id = absint($request->get_param('id'));

        if ($booking_id <= 0) {
            return new WP_Error('invalid_booking_id', __('A valid booking ID is required.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorNoTarget']);
        }

        // 1. ユーザーチェック（門前払い）
        $user_id = get_current_user_id();

        if (!$user_id) {
            return new WP_Error('rest_not_logged_in', __('You must be logged in.', 'itmaroon-booking-block'), ['status' => 401, 'info_code' => 'errorLogin']);
        }


        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_details  = $wpdb->prefix . 'itmar_slot_details';

        // トランザクション開始
        $wpdb->query('START TRANSACTION');

        // 2. 対象の予約が「本人のもの」か確認し、ロックをかける
        $booking = $wpdb->get_row($wpdb->prepare(
            "SELECT id, slot_detail_ids FROM %i WHERE id = %d AND user_id = %d AND status = 'confirmed' FOR UPDATE",
            $table_bookings,
            $booking_id,
            $user_id
        ));

        if (!$booking) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('no_booking_found', __('No cancellable reservation was found.', 'itmaroon-booking-block'), ['status' => 404, 'info_code' => 'errorNoTarget']);
        }

        // 3. 在庫（itmar_slot_details）を解放
        $slot_ids = array_values(array_filter(wp_parse_id_list($booking->slot_detail_ids)));
        $placeholders = implode(',', array_fill(0, count($slot_ids), '%d'));
        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
        $update_details_result = $wpdb->query($wpdb->prepare(
            "UPDATE %i SET is_booked = 0 WHERE id IN ($placeholders)",
            array_merge([$table_details], $slot_ids)
        ));
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        // false はクエリ自体の失敗（構文エラーや接続断など）
        if ($update_details_result === false) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('db_error', __('The reserved capacity could not be released.', 'itmaroon-booking-block'), ['status' => 500, 'info_code' => 'errorInside']);
        }

        // 4. 予約ステータスをキャンセルに更新
        $update_booking_result = $wpdb->update(
            $table_bookings,
            [
                'status' => 'cancelled',
                'updated_at' => current_time('mysql')
            ],
            [
                'id' => $booking_id,
                'user_id' => $user_id
            ],
            ['%s', '%s'],
            ['%d', '%d']
        );

        if ($update_booking_result === false) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('db_error', __('The reservation status could not be updated.', 'itmaroon-booking-block'), ['status' => 500, 'info_code' => 'errorInside']);
        }

        // すべての処理が正常に終わったので確定
        $wpdb->query('COMMIT');

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new WP_REST_Response([
            'success' => true,
            'info_code' => 'cancelSuccess'
        ], 200);
    }

    //予約を変更する
    public static function change_booking(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom booking tables require direct queries; capacity changes and row locks must use live data.
        global $wpdb;
        //パラメーターの取得
        $booking_id = absint($request->get_param('id'));

        $guest_count  = absint($request->get_param('guest_count'));
        $is_same_unit = (bool) $request->get_param('is_same_unit');

        if ($booking_id <= 0 || $guest_count <= 0) {
            return new WP_Error('invalid_booking', __('A valid booking ID and guest count are required.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorInside']);
        }

        // 1. ユーザーチェック（門前払い）
        $user_id = get_current_user_id();

        if (!$user_id) {
            return new WP_Error('rest_not_logged_in', __('You must be logged in.', 'itmaroon-booking-block'), ['status' => 401, 'info_code' => 'errorLogin']);
        }


        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_details  = $wpdb->prefix . 'itmar_slot_details';
        $table_units   = $wpdb->prefix . 'itmar_resource_units';

        // トランザクション開始
        $wpdb->query('START TRANSACTION');

        // 2. 現在の予約状況をロックして取得
        $booking = $wpdb->get_row($wpdb->prepare(
            "SELECT id, guest_count, slot_detail_ids FROM %i WHERE id = %d AND user_id = %d AND status = 'confirmed' FOR UPDATE",
            $table_bookings,
            $booking_id,
            $user_id
        ));

        if (!$booking) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('no_booking', __('The reservation to change was not found.', 'itmaroon-booking-block'), ['status' => 404, 'info_code' => 'errorNoTarget']);
        }

        $old_count = intval($booking->guest_count);
        $diff = $guest_count - $old_count;
        $current_detail_ids = array_values(array_filter(wp_parse_id_list($booking->slot_detail_ids)));

        // 3. ロジック分岐：人数が変わっていない場合は何もしない
        if ($diff === 0) {
            $wpdb->query('COMMIT');
            return new WP_REST_Response(['success' => true, 'info_code' => 'noChange'], 200);
        }

        // 現在確保している各ユニットの詳細（特に定員：capacity）をDBから取得
        $placeholders_current = implode(',', array_fill(0, count($current_detail_ids), '%d'));
        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- Placeholders are generated from validated integer IDs.
        $current_units_info = $wpdb->get_results($wpdb->prepare(
            "SELECT d.id, u.max_capacity 
             FROM %i d
             JOIN %i u ON d.unit_id = u.id
             WHERE d.id IN ($placeholders_current)
             ORDER BY d.id ASC",
            array_merge([$table_details, $table_units], $current_detail_ids)
        ));
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber

        $new_detail_ids = [];
        $release_ids = [];

        if ($diff < 0) {
            /**
             * 【減少】定員を計算し、必要最小限のユニットだけ残す
             */
            $accumulated_capacity = 0;
            foreach ($current_units_info as $unit) {
                if ($accumulated_capacity < $guest_count) {
                    $new_detail_ids[] = $unit->id;
                    $accumulated_capacity += intval($unit->max_capacity);
                } else {
                    // 人数を満たした後の余剰ユニットは解放リストへ
                    $release_ids[] = $unit->id;
                }
            }

            if (!empty($release_ids)) {
                $release_ids = array_values(array_filter(wp_parse_id_list($release_ids)));
                $release_placeholders = implode(',', array_fill(0, count($release_ids), '%d'));
                // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
                $wpdb->query($wpdb->prepare(
                    "UPDATE %i SET is_booked = 0 WHERE id IN ($release_placeholders)",
                    array_merge([$table_details], $release_ids)
                ));
                // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            }
        } else {
            /**
             * 【【増加】既存ユニットの合計定員を確認し、不足分のみ追加確保
             */
            $total_current_capacity = array_sum(array_column($current_units_info, 'max_capacity'));
            $new_detail_ids = $current_detail_ids;
            if ($guest_count > $total_current_capacity) {
                if ($is_same_unit) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('capacity_error', __('The current unit cannot accommodate additional guests.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'seetFull']);
                }

                $needed_extra = $guest_count - $total_current_capacity;
                $first_detail_id = $current_detail_ids[0];
                $slot_id = $wpdb->get_var($wpdb->prepare("SELECT slot_id FROM %i WHERE id = %d", $table_details, $first_detail_id));
                // 同じ枠内の空きユニットを定員付きで取得
                $available_units = $wpdb->get_results($wpdb->prepare(
                    "SELECT d.id, u.max_capacity 
                     FROM %i d
                     JOIN %i u ON d.unit_id = u.id
                     WHERE d.slot_id = %d AND d.is_booked = 0 AND d.status = 'open'
                     ORDER BY u.max_capacity DESC FOR UPDATE",
                    $table_details,
                    $table_units,
                    $slot_id
                ));

                $extra_capacity_secured = 0;
                $added_ids = [];
                foreach ($available_units as $unit) {
                    if ($extra_capacity_secured < $needed_extra) {
                        $added_ids[] = $unit->id;
                        $extra_capacity_secured += intval($unit->max_capacity);
                    } else {
                        break;
                    }
                }

                if ($extra_capacity_secured < $needed_extra) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('no_vacancy', __('There is not enough additional capacity.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorFull']);
                }

                $added_ids = array_values(array_filter(wp_parse_id_list($added_ids)));
                $add_placeholders = implode(',', array_fill(0, count($added_ids), '%d'));
                // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
                $wpdb->query($wpdb->prepare(
                    "UPDATE %i SET is_booked = 1 WHERE id IN ($add_placeholders)",
                    array_merge([$table_details], $added_ids)
                ));
                // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                $new_detail_ids = array_merge($current_detail_ids, $added_ids);
            }
        }

        // 4. 予約テーブルの更新
        $update_res = $wpdb->update(
            $table_bookings,
            [
                'guest_count' => $guest_count,
                'slot_detail_ids' => implode(',', $new_detail_ids),
                'updated_at' => current_time('mysql')
            ],
            ['id' => $booking_id],
            ['%d', '%s', '%s'],
            ['%d']
        );
        if ($update_res === false) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('db_error', __('The reservation could not be updated.', 'itmaroon-booking-block'), ['status' => 500, 'info_code' => 'errorInside']);
        }

        $wpdb->query('COMMIT');
        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new WP_REST_Response(['success' => true, 'info_code' => 'changeSuccess', 'new_count' => $guest_count], 200);
    }

    /**
     * ログインユーザーの予約一覧を取得する
     */
    public static function get_user_bookings(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom booking tables have no WordPress query API; users must receive the current booking status.
        global $wpdb;
        $user_id = get_current_user_id();

        // ログインチェック（念のため）
        if (!$user_id) {
            return new WP_Error('rest_not_logged_in', __('You must be logged in.', 'itmaroon-booking-block'), ['status' => 401, 'info_code' => 'errorLogin']);
        }

        $resource_id = intval($request->get_param('resource_id'));
        if (!$resource_id) {
            return new WP_Error('missing_resource_id', __('A resource ID is required.', 'itmaroon-booking-block'), ['status' => 400, 'info_code' => 'errorInside']);
        }

        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_slots    = $wpdb->prefix . 'itmar_reservation_slots';
        $table_details  = $wpdb->prefix . 'itmar_slot_details';

        // 予約データ、スロット情報、リソース名（船名）を結合して取得
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                b.id AS booking_id,
                s.slot_date AS reserve_date,
                d.start_time AS reserve_time,
                d.end_time,
                b.guest_count,
                b.slot_detail_ids AS slot_ids,
                b.status AS booking_status
            FROM %i AS b
            -- 最初のユニットIDを数値として取り出して結合
            INNER JOIN %i AS d ON d.id = CAST(SUBSTRING_INDEX(b.slot_detail_ids, ',', 1) AS UNSIGNED)
            INNER JOIN %i AS s ON d.slot_id = s.id
            WHERE b.user_id = %d 
            AND b.resource_id = %d
            ORDER BY s.slot_date ASC, d.start_time ASC",
            $table_bookings,
            $table_details,
            $table_slots,
            $user_id,
            $resource_id
        ));

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new WP_REST_Response($results, 200);
    }

    /**
     * テーブルが存在しない場合に作成するプライベートメソッド
     */
    private static function maybe_create_bookings_table($table_name)
    {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        // dbDelta を使うので「存在チェック」なしで SQL を組んでも安全ですが、
        // カラム構成を最新の状態に定義します
        $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        resource_id bigint(20) NOT NULL,
        slot_detail_ids text NOT NULL,
        guest_count int(11) NOT NULL DEFAULT 1,
        status varchar(50) NOT NULL DEFAULT 'confirmed',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY user_id (user_id),
        KEY resource_id (resource_id)
    ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    private static function validate_date(string $date): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return false;
        }

        [$year, $month, $day] = array_map('intval', explode('-', $date));
        return checkdate($month, $day, $year);
    }

    private static function validate_time(string $time): bool
    {
        return 1 === preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/', $time);
    }
}
