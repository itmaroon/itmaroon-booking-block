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

final class SlotsAPI extends BaseReserve
{
    const VERSION = '1.0.0';

    public static function init(): void
    {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    /**
     * Call this from register_activation_hook in main plugin file.
     */
    public static function activate(): void
    {
        self::create_tables();
    }

    public static function register_routes(): void
    {
        register_rest_route('itmar/v1', '/slots', [
            [
                'methods'  => WP_REST_Server::READABLE,
                'callback' => [__CLASS__, 'list_slots'],
                'permission_callback' => '__return_true',
                'args' => [
                    'resource_id' => [
                        'type' => 'integer',
                        'required' => true,
                    ],
                    'from' => [
                        'type' => 'string',
                        'required' => false,
                    ],
                    'to' => [
                        'type' => 'string',
                        'required' => false,
                    ],
                ],
            ],
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'upsert_slot'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
                'args' => [
                    'id' => ['type' => 'integer', 'required' => false],
                    'resource_id' => ['type' => 'integer', 'required' => true],
                    'slot_date' => ['type' => 'string', 'required' => true],

                ],
            ],
        ]);

        register_rest_route('itmar/v1', '/slots/(?P<id>\d+)/close', [
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'close_slot'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
                'args' => [
                    'id' => ['type' => 'integer', 'required' => true],
                ],
            ],
        ]);

        register_rest_route('itmar/v1', '/slots/bulk', [
            [
                'methods'  => WP_REST_Server::CREATABLE, // POST
                'callback' => [__CLASS__, 'bulk_upsert_slots'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
                'args' => [
                    'resource_id' => ['type' => 'integer', 'required' => true],
                    'dates' => ['type' => 'array', 'required' => true],
                ],
            ],
        ]);

        register_rest_route('itmar/v1', '/resource-units', [
            'methods'             => 'POST',
            'callback'            => [__CLASS__, 'handle_save_resource_units'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
        ]);

        register_rest_route('itmar/v1', '/resource-units/(?P<id>\d+)', [
            [
                'methods'             => 'PUT', // または 'PATCH'
                'callback'            => [__CLASS__, 'handle_update_resource_unit'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
                'args' => [
                    'id' => ['validate_callback' => fn($param) => is_numeric($param)],
                ],
            ],
        ]);

        register_rest_route('itmar/v1', '/resource-units/(?P<id>\d+)', [
            [
                'methods'             => 'DELETE',
                'callback'            => [__CLASS__, 'handle_delete_resource_unit'],
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
                'args' => [
                    'id' => [
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ],
                ],
            ],
        ]);

        register_rest_route('itmar/v1', '/resource-units/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [__CLASS__, 'get_resource_units'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
        ]);

        register_rest_route('itmar/v1', '/slot-details/(?P<id>\d+)', [
            'methods'             => 'PUT',
            'callback'            => [__CLASS__, 'handle_update_slot_detail'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
        ]);

        register_rest_route('itmar/v1', '/slot-details/bulk-update', [
            'methods'             => 'POST', // まとまったデータを送るのでPOST
            'callback'            => [__CLASS__, 'handle_bulk_update_slot_details'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
        ]);

        register_rest_route('itmar/v1', '/slot-details/bulk-delete', [
            'methods'             => 'DELETE',
            'callback'            => [__CLASS__, 'handle_bulk_delete_slot_details'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'], // 管理者権限チェック
        ]);

    }

    public static function create_tables(): void
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // 1. 親：スロット（1日単位の概要）
        $table_slots = $wpdb->prefix . 'itmar_reservation_slots';

        // 2. 新設：リソースユニット（2名用テーブル、カウンター席などのマスタ）
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        // 3. 新設：スロット詳細（時間枠 × 座席種別ごとの在庫）
        $table_slot_details = $wpdb->prefix . 'itmar_slot_details';

        // SQL組み立て
        $queries = [];
        // ① Slotsテーブル
        $queries[] = "CREATE TABLE {$table_slots} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            resource_id BIGINT(20) UNSIGNED NOT NULL,
            slot_date DATE NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'open',
            PRIMARY KEY  (id),
            UNIQUE KEY resource_date (resource_id, slot_date),
            KEY slot_date (slot_date),
            KEY resource_id (resource_id)
        ) {$charset_collate};";

        // ② Resource Unitsテーブル（座席マスタ）
        $queries[] = "CREATE TABLE {$table_units} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            resource_id BIGINT(20) UNSIGNED NOT NULL,
            name VARCHAR(100) NOT NULL,
            min_capacity INT(11) UNSIGNED NOT NULL DEFAULT 1,
            max_capacity INT(11) UNSIGNED NOT NULL DEFAULT 1,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY resource_id (resource_id)
        ) {$charset_collate};";

        // ③ Slot Detailsテーブル（時間帯別の在庫管理）
        $queries[] = "CREATE TABLE {$table_slot_details} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            slot_id BIGINT(20) UNSIGNED NOT NULL,
            unit_id BIGINT(20) UNSIGNED NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_booked TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'open',
            PRIMARY KEY  (id),
            KEY slot_id (slot_id),
            KEY unit_id (unit_id),
            UNIQUE KEY slot_unit_time (slot_id, unit_id, start_time)
        ) {$charset_collate};";

        // 一括実行
        foreach ($queries as $sql) {
            dbDelta($sql);
        }
    }


    private static function validate_date_yyyy_mm_dd(string $date): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return false;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $date));
        return checkdate($m, $d, $y);
    }

    public static function list_slots(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom slot tables have no WordPress query API; availability must be returned from current data.
        global $wpdb;

        $table_slots = $wpdb->prefix . 'itmar_reservation_slots';
        $table_details = $wpdb->prefix . 'itmar_slot_details';
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        $resource_id = (int) $request->get_param('resource_id');
        $from = (string) $request->get_param('from');
        $to   = (string) $request->get_param('to');

        if ($resource_id <= 0) {
            return new WP_Error('invalid_resource_id', __('A resource ID is required.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        // 不正な期間指定は未指定として扱う
        $from = ($from && self::validate_date_yyyy_mm_dd($from)) ? $from : '';
        $to   = ($to && self::validate_date_yyyy_mm_dd($to)) ? $to : '';

        // SQL組み立て：親(s) → 子(d) → ユニット名(u) を結合
        // 予約枠がない日も考慮して LEFT JOIN を使用
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT 
            s.id AS slot_id,
            s.slot_date,
            d.id AS detail_id,
            d.unit_id,
            u.name AS unit_name,
            u.min_capacity,
            u.max_capacity,
            d.start_time,
            d.end_time,
            d.is_booked,
            d.status AS detail_status
         FROM %i AS s
         LEFT JOIN %i AS d ON s.id = d.slot_id
         LEFT JOIN %i AS u ON d.unit_id = u.id
         WHERE s.resource_id = %d
         AND (%s = '' OR s.slot_date >= %s)
         AND (%s = '' OR s.slot_date <= %s)
         ORDER BY s.slot_date ASC, d.start_time ASC, u.id ASC",
            $table_slots,
            $table_details,
            $table_units,
            $resource_id,
            $from,
            $from,
            $to,
            $to
        ), ARRAY_A);
        // フロントエンドで扱いやすいように、型を調整して返却
        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response(array_map(function ($row) {
            return [
                'slot_id'      => (int)$row['slot_id'],
                'slot_date'    => $row['slot_date'],
                'detail_id'    => $row['detail_id'] ? (int)$row['detail_id'] : null,
                'unit_id'      => $row['unit_id'] ? (int)$row['unit_id'] : null,
                'unit_name'    => $row['unit_name'],
                'capacity'     => ['min' => (int)$row['min_capacity'], 'max' => (int)$row['max_capacity']],
                'start_time'   => $row['start_time'] ? substr($row['start_time'], 0, 5) : null, // '09:00:00' -> '09:00'
                'end_time'     => $row['end_time'] ? substr($row['end_time'], 0, 5) : null,
                'is_booked'    => (bool)$row['is_booked'],
                'status'       => $row['detail_status']
            ];
        }, $rows));
    }

    public static function upsert_slot(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom slot-table writes and their verification reads must use the current database state.
        global $wpdb;

        $table = $wpdb->prefix . 'itmar_reservation_slots';
        $id = (int) $request->get_param('id');
        $resource_id = (int) $request->get_param('resource_id');
        $slot_date = (string) $request->get_param('slot_date');


        if ($resource_id <= 0) {
            return new WP_Error('invalid_resource_id', __('A resource ID is required.', 'itmaroon-booking-block'), ['status' => 400]);
        }
        if (!self::validate_date_yyyy_mm_dd($slot_date)) {
            return new WP_Error('invalid_slot_date', __('The slot date must use YYYY-MM-DD format.', 'itmaroon-booking-block'), ['status' => 400]);
        }


        $now_gmt = current_time('mysql', true);

        // id がある場合は更新（ただし resource_id/slot_date はユニーク衝突に注意）
        if ($id > 0) {
            $updated = $wpdb->update(
                $table,
                [
                    'resource_id' => $resource_id,
                    'slot_date' => $slot_date,

                    'updated_at' => $now_gmt,
                ],
                ['id' => $id],
                ['%d', '%s', '%s'],
                ['%d']
            );

            if ($updated === false) {
                return new WP_Error('db_update_failed', __('Failed to update the slot.', 'itmaroon-booking-block'), ['status' => 500]);
            }
            $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM %i WHERE id = %d", $table, $id), ARRAY_A);
            if (!$row) {
                return new WP_Error('not_found', __('The slot was not found after the update.', 'itmaroon-booking-block'), ['status' => 404]);
            }
            return rest_ensure_response($row);
        }

        /**
         * 新規は「同一(resource_id, slot_date)が既にある場合は更新」＝ upsert
         * UNIQUE(resource_id, slot_date) が前提
         * LAST_INSERT_ID を使って、既存行でも insert_id を取得します。
         */
        $result = $wpdb->query($wpdb->prepare(
            "INSERT INTO %i
				(resource_id, slot_date, created_at, updated_at)
			 VALUES
				(%d, %s, %s, %s)
			 ON DUPLICATE KEY UPDATE
				
				updated_at = VALUES(updated_at),
				id = LAST_INSERT_ID(id)",
            $table,
            $resource_id,
            $slot_date,

            $now_gmt,
            $now_gmt
        ));
        if ($result === false) {
            return new WP_Error('db_insert_failed', __('Failed to save the slot.', 'itmaroon-booking-block'), ['status' => 500]);
        }

        $new_id = (int) $wpdb->insert_id;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM %i WHERE id = %d", $table, $new_id), ARRAY_A);

        if (!$row) {
            return new WP_Error('not_found', __('The slot was not found after it was saved.', 'itmaroon-booking-block'), ['status' => 404]);
        }
        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response($row);
    }

    public static function close_slot(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Closing a custom-table slot is a write operation and the verification read must be current.
        global $wpdb;

        $table = $wpdb->prefix . 'itmar_reservation_slots';
        $id = (int) $request->get_param('id');
        if ($id <= 0) {
            return new WP_Error('invalid_id', __('The slot ID is invalid.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        // TODO: 予約テーブル導入後、booked が存在するなら close を拒否/要確認などの運用ルールを入れると安全
        $now_gmt = current_time('mysql', true);

        $updated = $wpdb->update(
            $table,
            [
                'status' => 'closed',
                'updated_at' => $now_gmt,
            ],
            ['id' => $id],
            ['%s', '%s'],
            ['%d']
        );

        if ($updated === false) {
            return new WP_Error('db_update_failed', __('Failed to close the slot.', 'itmaroon-booking-block'), ['status' => 500]);
        }

        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM %i WHERE id = %d", $table, $id), ARRAY_A);
        if (!$row) {
            return new WP_Error('not_found', __('The slot was not found.', 'itmaroon-booking-block'), ['status' => 404]);
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response($row);
    }

    public static function bulk_upsert_slots(WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Bulk creation uses custom tables in a transaction; unit and slot state must not be cached.
        global $wpdb;
        //テーブルのセット
        $table_slots = $wpdb->prefix . 'itmar_reservation_slots';
        $table_details = $wpdb->prefix . 'itmar_slot_details';
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        //// パラメータのセット
        $resource_id = (int) $request->get_param('resource_id');
        $dates = $request->get_param('dates');

        $is_allday   = $request->get_param('isAllday');
        $start_time  = $request->get_param('startTime');
        $end_time    = $request->get_param('endTime');
        $interval    = (int) $request->get_param('timeTravel'); // フロントの interval
        //パラメータのエラー処理
        if ($resource_id <= 0 || empty($dates)) {
            return new WP_Error('invalid_params', __('Required parameters are missing.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        if (!is_array($dates)) {
            return new WP_Error('invalid_dates', __('Dates must be an array.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        $dates = array_values(array_unique(array_filter(array_map('sanitize_text_field', $dates), [__CLASS__, 'validate_date_yyyy_mm_dd'])));
        if (empty($dates)) {
            return new WP_Error('invalid_dates', __('No valid dates were provided.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        if (!$is_allday && (!self::validate_time_hh_mm($start_time) || !self::validate_time_hh_mm($end_time) || $start_time >= $end_time || $interval <= 0)) {
            return new WP_Error('invalid_time_range', __('A valid time range and interval are required.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        // 1. まず、このリソースに紐づく「有効なユニット」を取得しておく
        $units = $wpdb->get_results($wpdb->prepare(
            "SELECT id FROM %i WHERE resource_id = %d AND is_active = 1",
            $table_units,
            $resource_id
        ));

        if (empty($units)) {
            return new WP_Error('no_units', __('No resource units were found. Add a unit first.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        $now_gmt = current_time('mysql', true);
        $inserted = 0;
        $updated = 0;

        // まとめ処理（失敗したら戻す）
        $wpdb->query('START TRANSACTION');

        try {
            foreach ($dates as $slot_date) {
                // ① 親スロットの作成/更新 (ON DUPLICATE KEY UPDATE)
                $wpdb->query($wpdb->prepare(
                    "INSERT INTO %i (resource_id, slot_date, created_at, updated_at)
                 VALUES (%d, %s, %s, %s)
                 ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)",
                    $table_slots,
                    $resource_id,
                    $slot_date,
                    $now_gmt,
                    $now_gmt
                ));

                // 作成または既存の slot_id を取得
                $slot_id = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM %i WHERE resource_id = %d AND slot_date = %s",
                    $table_slots,
                    $resource_id,
                    $slot_date
                ));

                // ② 既存の時間枠（details）を一旦リセット（重複防止のためスクラップ＆ビルド）
                //$wpdb->delete($table_details, ['slot_id' => $slot_id], ['%d']);

                // ③ 時間枠（details）の生成
                if ($is_allday) {
                    // 終日の場合：00:00 〜 23:59 で1枠作成
                    foreach ($units as $unit) {

                        // INSERT IGNORE を使い、重複があれば何もしない（エラーも出さない）
                        $wpdb->query($wpdb->prepare(
                            "INSERT IGNORE INTO %i (slot_id, unit_id, start_time, end_time, is_booked, status) VALUES (%d, %d, %s, %s, %d, %s)",
                            $table_details,
                            $slot_id,
                            $unit->id,
                            '00:00:00',
                            '23:59:59',
                            0,
                            'open'
                        ));
                    }
                } else {
                    // 時間指定の場合：インターバルで回して作成
                    $current = strtotime('1970-01-01 ' . $start_time . ' UTC');
                    $last    = strtotime('1970-01-01 ' . $end_time . ' UTC');

                    while ($current < $last) {
                        $next = $current + ($interval * 60);
                        $t_start = gmdate('H:i:s', $current);
                        $t_end   = gmdate('H:i:s', $next);

                        foreach ($units as $unit) {
                            // ここも INSERT IGNORE で「あればスキップ」を実現
                            $wpdb->query($wpdb->prepare(
                                "INSERT IGNORE INTO %i (slot_id, unit_id, start_time, end_time, is_booked, status) VALUES (%d, %d, %s, %s, %d, %s)",
                                $table_details,
                                $slot_id,
                                $unit->id,
                                $t_start,
                                $t_end,
                                0,
                                'open'
                            ));
                        }
                        $current = $next;
                    }
                }
                $inserted++;
            }
            //トランザクションのコミット
            $wpdb->query('COMMIT');
        } catch (\Throwable $e) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('bulk_failed', __('The slots could not be created.', 'itmaroon-booking-block'), ['status' => 500]);
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response([
            'processed' => count($dates),
            'status' => 'success'
        ]);
    }

    /**
     * リソースに関連付けられた座席種別（ユニット）を保存する
     * * @param int   $resource_id 投稿ID（リソースID）
     * @param array $units       座席設定の配列
     * [
     * ['name' => '2名用テーブル', 'min' => 1, 'max' => 2, 'quantity' => 5],
     * ['name' => '4名用個室',   'min' => 3, 'max' => 4, 'quantity' => 2]
     * ]
     */
    public static function save_resource_units(int $resource_id, array $units): bool
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Resource units are stored in a custom table and this method only performs writes.
        global $wpdb;
        $table_name = $wpdb->prefix . 'itmar_resource_units';

        if (empty($units)) {
            return true; // 空設定（全て削除）の場合はここで終了
        }

        // 2. 新しいデータを1件ずつインサート
        foreach ($units as $unit) {
            // すでに ID があるものはスキップ（既存データ）
            if (!empty($unit['id'])) continue;

            $name = isset($unit['name']) ? sanitize_text_field($unit['name']) : '';
            $min_capacity = isset($unit['min']) ? absint($unit['min']) : 0;
            $max_capacity = isset($unit['max']) ? absint($unit['max']) : 0;

            if ('' === $name || $min_capacity < 1 || $max_capacity < $min_capacity) {
                return false;
            }

            $now = current_time('mysql');

            $result = $wpdb->insert(
                $table_name,
                [
                    'resource_id'  => $resource_id,
                    'name'         => $name,
                    'min_capacity' => $min_capacity,
                    'max_capacity' => $max_capacity,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ],
                [
                    '%d', // resource_id
                    '%s', // name
                    '%d', // min_capacity
                    '%d', // max_capacity
                    '%s', // created_at
                    '%s', // updated_at
                ]
            );

            if ($result === false) {
                // インサート失敗時のログ出力など（必要に応じて）
                return false;
            }
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return true;
    }

    // リソースユニット呼び出しのコールバック関数
    public static function get_resource_units(\WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom resource-unit data has no WordPress query API and callers require the latest configuration.
        global $wpdb;
        $resource_id = (int) $request['id'];
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        $units = $wpdb->get_results($wpdb->prepare(
            "SELECT id, name, min_capacity as min, max_capacity as max 
         FROM %i 
         WHERE resource_id = %d AND is_active = 1",
            $table_units,
            $resource_id
        ), ARRAY_A);

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response($units);
    }

    /**
     * リソースユニット保存のAPIコールバック
     */
    public static function handle_save_resource_units(\WP_REST_Request $request): \WP_REST_Response
    {
        $resource_id = $request->get_param('resource_id');
        $units       = $request->get_param('units');

        // 1. 基本的なバリデーション
        if (empty($resource_id) || !is_array($units)) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => __('Invalid data provided.', 'itmaroon-booking-block')
            ], 400);
        }

        // 2. 保存処理の実行 (以前作成した静的メソッドを呼び出す)
        $result = self::save_resource_units((int)$resource_id, $units);

        if ($result) {
            return new \WP_REST_Response([
                'success' => true,
                'message' => __('Units saved successfully.', 'itmaroon-booking-block'),
                'data'    => $units
            ], 200);
        } else {
            return new \WP_REST_Response([
                'success' => false,
                'message' => __('Database error occurred.', 'itmaroon-booking-block')
            ], 500);
        }
    }

    /**
     * ユニット情報を更新する
     */
    public static function handle_update_resource_unit(\WP_REST_Request $request): \WP_REST_Response
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Updating a custom resource-unit table is a write operation and is not cacheable.
        global $wpdb;
        $id = (int) $request->get_param('id');
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        // 送信されたパラメータを取得
        $name = sanitize_text_field($request->get_param('name'));
        $min  = absint($request->get_param('min'));
        $max  = absint($request->get_param('max'));

        if (empty($name)) {
            return new \WP_REST_Response(['success' => false, 'message' => __('Name is required.', 'itmaroon-booking-block')], 400);
        }

        $result = $wpdb->update(
            $table_units,
            [
                'name'         => $name,
                'min_capacity' => $min,
                'max_capacity' => $max,
                'updated_at'   => current_time('mysql'),
            ],
            ['id' => $id], // どのレコードを
            ['%s', '%d', '%d', '%s'], // データの型
            ['%d'] // IDの型
        );

        // $result は影響を受けた行数（変更がない場合は 0 が返ることもあるので注意）
        if ($result !== false) {
            return new \WP_REST_Response(['success' => true, 'message' => __('Unit updated.', "itmaroon-booking-block")], 200);
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new \WP_REST_Response(['success' => false, 'message' => __('Update failed.', "itmaroon-booking-block")], 500);
    }

    /**
     * 特定のリソースユニットを削除する
     */
    public static function handle_delete_resource_unit(\WP_REST_Request $request): \WP_REST_Response
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Deletion checks and writes use custom inventory tables and must read current booking state.
        global $wpdb;
        $id = (int) $request->get_param('id');
        $table_units = $wpdb->prefix . 'itmar_resource_units';
        $table_details = $wpdb->prefix . 'itmar_slot_details';

        // 1. すでに「予約済み」のデータがあるか確認
        $booked_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM %i WHERE unit_id = %d AND is_booked = 1",
            $table_details,
            $id
        ));

        if ($booked_count > 0) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => __('This unit cannot be deleted because it is already reserved.', "itmaroon-booking-block")
            ], 400);
        }

        // 2. 予約が入っていないなら、関連する slot_details を先に削除
        $wpdb->delete($table_details, ['unit_id' => $id], ['%d']);

        // 3. ユニット本体を削除
        $result = $wpdb->delete($table_units, ['id' => $id], ['%d']);

        if ($result !== false) {
            return new \WP_REST_Response(['success' => true, 'message' => __('The frame associated with the unit has been removed.', "itmaroon-booking-block")], 200);
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return new \WP_REST_Response(['success' => false, 'message' => __('A database error occurred.', "itmaroon-booking-block")], 500);
    }

    //スロット詳細を編集するメソッド
    public static function handle_update_slot_detail(\WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Updating live availability in a custom slot-detail table is not cacheable.
        global $wpdb;
        $id = (int) $request['id'];
        $table_details = $wpdb->prefix . 'itmar_slot_details';

        $is_booked = $request->get_param('is_booked') ? 1 : 0;
        $status    = sanitize_text_field($request->get_param('status'));

        $result = $wpdb->update(
            $table_details,
            ['is_booked' => $is_booked, 'status' => $status],
            ['id' => $id],
            ['%d', '%s'],
            ['%d']
        );

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response(['success' => ($result !== false)]);
    }

    // スロット詳細を編集するメソッド（まとめて処理）
    public static function handle_bulk_update_slot_details(\WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transactional writes to custom slot-detail inventory must not be cached.
        global $wpdb;
        $table_details = $wpdb->prefix . 'itmar_slot_details';
        $updates = $request->get_param('updates'); // [{id, is_booked, status}, ...]

        if (!is_array($updates)) {
            return new \WP_Error('invalid_data', __('Updates must be an array.', 'itmaroon-booking-block'), ['status' => 400]);
        }

        $wpdb->query('START TRANSACTION');

        try {
            foreach ($updates as $item) {
                $wpdb->update(
                    $table_details,
                    [
                        'is_booked' => $item['is_booked'] ? 1 : 0,
                        'status'    => sanitize_text_field($item['status'])
                    ],
                    ['id' => (int)$item['id']],
                    ['%d', '%s'],
                    ['%d']
                );
            }
            $wpdb->query('COMMIT');
        } catch (\Exception $e) {
            $wpdb->query('ROLLBACK');
            return new \WP_Error('db_error', __('The slot details could not be updated.', 'itmaroon-booking-block'), ['status' => 500]);
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return rest_ensure_response(['success' => true, 'updated_count' => count($updates)]);
    }

    /**
     * スロット詳細の一括削除
     */
    public static function handle_bulk_delete_slot_details(\WP_REST_Request $request)
    {
        // phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transactional deletion uses custom inventory tables and must check current booking state.
        global $wpdb;
        $table_details = $wpdb->prefix . 'itmar_slot_details';
        $table_slots   = $wpdb->prefix . 'itmar_reservation_slots';

        // JSONボディから detail_ids を取得
        $body = $request->get_body();
        $params = json_decode($body, true);
        $detail_ids = isset($params['detail_ids']) ? $params['detail_ids'] : [];
        $sel_date = isset($params['sel_date']) ? $params['sel_date'] : "";
        $resource_id = isset($params['resource_id']) ? $params['resource_id'] : "";

        // バリデーション：配列が空なら何もしない
        if (empty($detail_ids) || !is_array($detail_ids)) {
            return new WP_Error('no_ids', __('The ID to be deleted has not been specified.', "itmaroon-booking-block"), ['status' => 400]);
        }

        // セキュリティ：すべてのIDを正の整数に正規化（SQLインジェクション対策）
        $detail_ids = array_values(array_filter(wp_parse_id_list($detail_ids)));
        if (empty($detail_ids)) {
            return new WP_Error('no_ids', __('No valid IDs were provided.', 'itmaroon-booking-block'), ['status' => 400]);
        }
        $placeholders = implode(',', array_fill(0, count($detail_ids), '%d'));

        // 【追加】削除対象の中に「予約済み」が含まれていないかチェック
        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
        $booked_count = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM %i WHERE id IN ($placeholders) AND is_booked = 1",
            array_merge([$table_details], $detail_ids)
        ));
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

        if ($booked_count > 0) {
            return new WP_Error(
                'has_bookings',
                sprintf(
                    /* translators: %d: Number of reserved slots that prevent deletion. */
                    __('This slot cannot be deleted because it contains %d reserved slots.', 'itmaroon-booking-block'),
                    $booked_count
                ),
                ['status' => 403]
            );
        }

        // 親ID（slot_id）を特定しておく
        // 子レコードを消す前に、どの親に紐付いているかを把握します
        // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
        $slot_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT slot_id FROM %i WHERE id IN ($placeholders)",
            array_merge([$table_details], $detail_ids)
        ));
        // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $slot_ids = array_values(array_filter(wp_parse_id_list($slot_ids)));

        // 3. 削除実行（トランザクション的に処理するのが理想）
        $wpdb->query('START TRANSACTION');

        // 削除実行
        try {
            // 子レコードを削除
            // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholders are generated from validated integer IDs.
            $wpdb->query($wpdb->prepare(
                "DELETE FROM %i WHERE id IN ($placeholders)",
                array_merge([$table_details], $detail_ids)
            ));
            // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared

            // 子レコードがすべてなくなった親レコードだけを削除。
            if (!empty($slot_ids)) {
                $slot_placeholders = implode(',', array_fill(0, count($slot_ids), '%d'));
                // phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- Placeholders are generated from validated integer IDs.
                $wpdb->query($wpdb->prepare(
                    "DELETE FROM %i
                    WHERE id IN ($slot_placeholders)
                    AND NOT EXISTS (
                        SELECT 1 FROM %i WHERE %i.slot_id = %i.id
                    )",
                    array_merge([$table_slots, $table_details, $table_details, $table_slots], $slot_ids)
                ));
                // phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
            } elseif ($resource_id && $sel_date) {
                //日付の指定による削除も行う
                $wpdb->delete(
                    $table_slots,
                    [
                        'resource_id' => $resource_id,
                        'slot_date'   => $sel_date
                    ],
                    ['%d', '%s']
                );
            }

            $wpdb->query('COMMIT');
        } catch (\Exception $e) {
            $wpdb->query('ROLLBACK');
            return new \WP_Error('db_error', __('An error occurred while deleting the slots.', 'itmaroon-booking-block'), ['status' => 500]);
        }

        // phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return [
            'success' => true,
            'deleted_count' => count($detail_ids),
        ];
    }

    private static function validate_time_hh_mm($time): bool
    {
        return is_string($time) && 1 === preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time);
    }
}
