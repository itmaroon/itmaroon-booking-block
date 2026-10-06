<?php

/**
 * 管理画面（予約管理）専用の REST API。
 *
 * 枠・ユニットの編集と予約の削除は、SlotsAPI と BookingAPI の既存のルートをそのまま使う。
 * ここにあるのは、管理画面だけが必要とする次の3つ。
 *  - 設定（予約の対象にする投稿タイプ）の取得と保存
 *  - 対象の投稿タイプの投稿（リソース）の一覧
 *  - 全ユーザーの予約の一覧（既存の get_user_bookings はログイン中のユーザー自身の分だけ）
 */

namespace Itmar\BookingClassPackage\Reservation;

if (! defined('ABSPATH')) exit;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

final class AdminAPI extends BaseReserve
{
    /** 予約の対象にする投稿タイプを保存するオプション名 */
    public const OPTION_POST_TYPE = 'itmaroon_booking_resource_post_type';

    /** 設定が空のときに使う投稿タイプ（登録されていれば） */
    private const DEFAULT_POST_TYPE = 'resourse';

    public static function init(): void
    {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    public static function register_routes(): void
    {
        register_rest_route('itmar/v1', '/admin/settings', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [__CLASS__, 'get_settings'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [__CLASS__, 'save_settings'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
                'args'                => [
                    'post_type' => ['type' => 'string', 'required' => true],
                ],
            ],
        ]);

        register_rest_route('itmar/v1', '/admin/resources', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [__CLASS__, 'list_resources'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
        ]);

        register_rest_route('itmar/v1', '/admin/bookings', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [__CLASS__, 'list_bookings'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
            'args'                => [
                'resource_id' => ['type' => 'integer', 'required' => false],
                'status'      => ['type' => 'string', 'required' => false],
                'from'        => ['type' => 'string', 'required' => false],
                'to'          => ['type' => 'string', 'required' => false],
                'page'        => ['type' => 'integer', 'required' => false, 'default' => 1],
                'per_page'    => ['type' => 'integer', 'required' => false, 'default' => 20],
            ],
        ]);
    }

    /** 設定されている投稿タイプ。未設定なら既定（登録されていれば）、なければ空 */
    public static function resource_post_type(): string
    {
        $saved = (string) get_option(self::OPTION_POST_TYPE, '');
        if ($saved !== '' && post_type_exists($saved)) {
            return $saved;
        }
        return post_type_exists(self::DEFAULT_POST_TYPE) ? self::DEFAULT_POST_TYPE : '';
    }

    public static function get_settings(WP_REST_Request $request)
    {
        $post_types = [];
        foreach (get_post_types(['show_ui' => true], 'objects') as $slug => $object) {
            // 予約の対象になるのは、ユーザーが管理するコンテンツの投稿タイプ。メディアなどは除く
            if (in_array($slug, ['attachment', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face'], true)) {
                continue;
            }
            $post_types[] = [
                'slug'  => $slug,
                'label' => $object->labels->singular_name ?: $slug,
            ];
        }

        return rest_ensure_response([
            'post_type'  => (string) get_option(self::OPTION_POST_TYPE, ''),
            'effective'  => self::resource_post_type(),
            'post_types' => $post_types,
        ]);
    }

    public static function save_settings(WP_REST_Request $request)
    {
        $post_type = sanitize_key((string) $request->get_param('post_type'));

        if ($post_type !== '' && ! post_type_exists($post_type)) {
            return new WP_Error('invalid_post_type', __('The post type does not exist.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        update_option(self::OPTION_POST_TYPE, $post_type);

        return rest_ensure_response([
            'post_type' => $post_type,
            'effective' => self::resource_post_type(),
        ]);
    }

    public static function list_resources(WP_REST_Request $request)
    {
        $post_type = self::resource_post_type();
        if ($post_type === '') {
            return rest_ensure_response([]);
        }

        $posts = get_posts([
            'post_type'      => $post_type,
            'post_status'    => ['publish', 'private', 'draft'],
            'posts_per_page' => 200,
            'orderby'        => 'title',
            'order'          => 'ASC',
        ]);

        return rest_ensure_response(array_map(static function ($post) {
            return [
                'id'     => (int) $post->ID,
                'title'  => get_the_title($post) ?: sprintf('#%d', $post->ID),
                'status' => $post->post_status,
            ];
        }, $posts));
    }

    private static function valid_date(string $date): bool
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return false;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $date));
        return checkdate($m, $d, $y);
    }

    /**
     * 全ユーザーの予約の一覧。日付の新しい順。
     */
    public static function list_bookings(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Custom booking tables have no WordPress query API; the admin list must show current data, and the conditions are assembled from validated values with placeholders.
        global $wpdb;

        $table_bookings = $wpdb->prefix . 'itmar_bookings';
        $table_slots    = $wpdb->prefix . 'itmar_reservation_slots';
        $table_details  = $wpdb->prefix . 'itmar_slot_details';
        $table_units    = $wpdb->prefix . 'itmar_resource_units';

        $resource_id = (int) $request->get_param('resource_id');
        $status      = sanitize_key((string) $request->get_param('status'));
        $from        = (string) $request->get_param('from');
        $to          = (string) $request->get_param('to');
        $page        = max(1, (int) $request->get_param('page'));
        $per_page    = min(100, max(1, (int) $request->get_param('per_page')));

        $where = ['1=1'];
        $args  = [];

        if ($resource_id > 0) {
            $where[] = 'b.resource_id = %d';
            $args[]  = $resource_id;
        }
        if (in_array($status, ['confirmed', 'cancelled'], true)) {
            $where[] = 'b.status = %s';
            $args[]  = $status;
        }
        if ($from !== '' && self::valid_date($from)) {
            $where[] = 's.slot_date >= %s';
            $args[]  = $from;
        }
        if ($to !== '' && self::valid_date($to)) {
            $where[] = 's.slot_date <= %s';
            $args[]  = $to;
        }

        $from_sql = "FROM %i AS b
            INNER JOIN %i AS d ON d.id = CAST(SUBSTRING_INDEX(b.slot_detail_ids, ',', 1) AS UNSIGNED)
            INNER JOIN %i AS s ON d.slot_id = s.id
            WHERE " . implode(' AND ', $where);
        $tables = [$table_bookings, $table_details, $table_slots];

        $total = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) {$from_sql}",
            array_merge($tables, $args)
        ));

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT
                b.id AS booking_id,
                b.resource_id,
                b.user_id,
                b.guest_count,
                b.status AS booking_status,
                b.slot_detail_ids,
                b.created_at,
                s.slot_date AS reserve_date,
                d.start_time,
                d.end_time
             {$from_sql}
             ORDER BY s.slot_date DESC, d.start_time DESC, b.id DESC
             LIMIT %d OFFSET %d",
            array_merge($tables, $args, [$per_page, ($page - 1) * $per_page])
        ), ARRAY_A);

        // 予約に含まれるユニット名（複数のユニットをまとめて予約することがある）
        $detail_ids = [];
        foreach ($rows as $row) {
            foreach (explode(',', (string) $row['slot_detail_ids']) as $detail_id) {
                $detail_id = absint($detail_id);
                if ($detail_id) {
                    $detail_ids[$detail_id] = true;
                }
            }
        }
        $unit_names = [];
        if (! empty($detail_ids)) {
            $ids          = array_keys($detail_ids);
            $placeholders = implode(',', array_fill(0, count($ids), '%d'));
            $unit_rows    = $wpdb->get_results($wpdb->prepare(
                "SELECT d.id AS detail_id, u.name
                 FROM %i AS d
                 INNER JOIN %i AS u ON u.id = d.unit_id
                 WHERE d.id IN ({$placeholders})",
                array_merge([$table_details, $table_units], $ids)
            ), ARRAY_A);
            foreach ($unit_rows as $unit_row) {
                $unit_names[(int) $unit_row['detail_id']] = $unit_row['name'];
            }
        }
        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, PluginCheck.Security.DirectDB.UnescapedDBParameter

        $items = array_map(static function ($row) use ($unit_names) {
            $user = get_userdata((int) $row['user_id']);

            $names = [];
            foreach (explode(',', (string) $row['slot_detail_ids']) as $detail_id) {
                $detail_id = absint($detail_id);
                if ($detail_id && isset($unit_names[$detail_id])) {
                    $names[] = $unit_names[$detail_id];
                }
            }

            return [
                'booking_id'     => (int) $row['booking_id'],
                'resource_id'    => (int) $row['resource_id'],
                'resource_title' => get_the_title((int) $row['resource_id']) ?: sprintf('#%d', (int) $row['resource_id']),
                'user_id'        => (int) $row['user_id'],
                'user_name'      => $user ? $user->display_name : '',
                'user_email'     => $user ? $user->user_email : '',
                'guest_count'    => (int) $row['guest_count'],
                'status'         => $row['booking_status'],
                'reserve_date'   => $row['reserve_date'],
                'start_time'     => substr((string) $row['start_time'], 0, 5),
                'end_time'       => substr((string) $row['end_time'], 0, 5),
                'unit_names'     => array_values(array_unique($names)),
                'created_at'     => $row['created_at'],
            ];
        }, $rows);

        $response = new WP_REST_Response([
            'items'       => $items,
            'total'       => $total,
            'total_pages' => (int) ceil($total / $per_page),
        ], 200);
        return $response;
    }
}
