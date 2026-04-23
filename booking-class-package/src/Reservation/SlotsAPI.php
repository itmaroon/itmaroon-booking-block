<?php

/**
 * REST API + Custom Table for reservation slots (capacity)
 */

namespace Itmar\BookingClassPackage\Reservation;

if (! defined('ABSPATH')) exit;

use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

final class SlotsAPI
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
                'permission_callback' => [__CLASS__, 'can_manage_slots'],
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

        register_rest_route('itmar/v1', '/generate-spans', [
            'methods'             => 'POST',
            'callback'            => [__CLASS__, 'handle_generate_spans'],
            'permission_callback' => [__CLASS__, 'can_manage_slots'],
        ]);
    }

    private static function table_name(): string
    {
        global $wpdb;
        return $wpdb->prefix . 'itmar_reservation_slots';
    }

    public static function create_tables(): void
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // 1. 親：スロット（1日単位の概要）
        $table_slots = self::table_name();

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
            PRIMARY KEY  (id),
            UNIQUE KEY resource_date (resource_id, slot_date),
            KEY slot_date (slot_date),
            KEY resource_id (resource_id),
            KEY status (status)
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
            KEY slot_unit_time (slot_id, unit_id, start_time)
        ) {$charset_collate};";

        // 一括実行
        foreach ($queries as $sql) {
            dbDelta($sql);
        }
    }



    public static function can_manage_slots(WP_REST_Request $request): bool
    {
        /**
         * 権限は運用に合わせて変更してください。
         * - manage_options: 管理者のみ
         * - edit_posts: 編集者も可
         */
        $cap = apply_filters('itmar_reservation_slots_manage_cap', 'manage_options', $request);
        return current_user_can($cap);
    }


    private static function validate_date_yyyy_mm_dd(string $date): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return false;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $date));
        return checkdate($m, $d, $y);
    }

    private static function normalize_status(?string $status): string
    {
        $status = strtolower((string)$status);
        return in_array($status, ['open', 'closed', 'holiday'], true) ? $status : 'open';
    }

    public static function list_slots(WP_REST_Request $request)
    {
        global $wpdb;

        $table_slots = self::table_name();
        $table_details = $wpdb->prefix . 'itmar_slot_details';
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        $resource_id = (int) $request->get_param('resource_id');
        $from = (string) $request->get_param('from');
        $to   = (string) $request->get_param('to');

        if ($resource_id <= 0) {
            return new WP_Error('invalid_resource_id', 'resource_id is required.', ['status' => 400]);
        }

        // 基本となるWHERE句
        $where = "WHERE s.resource_id = %d";
        $params = [$resource_id];

        // 期間指定（任意）
        if ($from && self::validate_date_yyyy_mm_dd($from)) {
            $where .= " AND s.slot_date >= %s";
            $params[] = $from;
        }
        if ($to && self::validate_date_yyyy_mm_dd($to)) {
            $where .= " AND s.slot_date <= %s";
            $params[] = $to;
        }

        // SQL組み立て：親(s) → 子(d) → ユニット名(u) を結合
        // 予約枠がない日も考慮して LEFT JOIN を使用
        $sql = $wpdb->prepare(
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
         FROM {$table_slots} AS s
         LEFT JOIN {$table_details} AS d ON s.id = d.slot_id
         LEFT JOIN {$table_units} AS u ON d.unit_id = u.id
         {$where}
         ORDER BY s.slot_date ASC, d.start_time ASC, u.id ASC",
            ...$params
        );

        $rows = $wpdb->get_results($sql, ARRAY_A);
        // フロントエンドで扱いやすいように、型を調整して返却
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
        global $wpdb;

        $table = self::table_name();
        $id = (int) $request->get_param('id');
        $resource_id = (int) $request->get_param('resource_id');
        $slot_date = (string) $request->get_param('slot_date');


        if ($resource_id <= 0) {
            return new WP_Error('invalid_resource_id', 'resource_id is required.', ['status' => 400]);
        }
        if (!self::validate_date_yyyy_mm_dd($slot_date)) {
            return new WP_Error('invalid_slot_date', 'slot_date must be YYYY-MM-DD', ['status' => 400]);
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
                ['%d', '%s', '%d', '%s', '%s'],
                ['%d']
            );

            if ($updated === false) {
                return new WP_Error('db_update_failed', 'Failed to update slot.', ['status' => 500]);
            }
            $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id), ARRAY_A);
            if (!$row) {
                return new WP_Error('not_found', 'Slot not found after update.', ['status' => 404]);
            }
            return rest_ensure_response($row);
        }

        /**
         * 新規は「同一(resource_id, slot_date)が既にある場合は更新」＝ upsert
         * UNIQUE(resource_id, slot_date) が前提
         * LAST_INSERT_ID を使って、既存行でも insert_id を取得します。
         */
        $sql = $wpdb->prepare(
            "INSERT INTO {$table}
				(resource_id, slot_date, created_at, updated_at)
			 VALUES
				(%d, %s, %d, %s, %s, %s)
			 ON DUPLICATE KEY UPDATE
				
				updated_at = VALUES(updated_at),
				id = LAST_INSERT_ID(id)",
            $resource_id,
            $slot_date,

            $now_gmt,
            $now_gmt
        );

        $result = $wpdb->query($sql);
        if ($result === false) {
            return new WP_Error('db_insert_failed', 'Failed to upsert slot.', ['status' => 500]);
        }

        $new_id = (int) $wpdb->insert_id;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $new_id), ARRAY_A);

        if (!$row) {
            return new WP_Error('not_found', 'Slot not found after upsert.', ['status' => 404]);
        }
        return rest_ensure_response($row);
    }

    public static function close_slot(WP_REST_Request $request)
    {
        global $wpdb;

        $table = self::table_name();
        $id = (int) $request->get_param('id');
        if ($id <= 0) {
            return new WP_Error('invalid_id', 'Invalid id.', ['status' => 400]);
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
            return new WP_Error('db_update_failed', 'Failed to close slot.', ['status' => 500]);
        }

        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id), ARRAY_A);
        if (!$row) {
            return new WP_Error('not_found', 'Slot not found.', ['status' => 404]);
        }

        return rest_ensure_response($row);
    }

    public static function bulk_upsert_slots(WP_REST_Request $request)
    {
        global $wpdb;
        //テーブルのセット
        $table_slots = self::table_name();
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
            return new WP_Error('invalid_params', 'Required params missing.', ['status' => 400]);
        }

        // 1. まず、このリソースに紐づく「有効なユニット」を取得しておく
        $units = $wpdb->get_results($wpdb->prepare(
            "SELECT id FROM {$table_units} WHERE resource_id = %d AND is_active = 1",
            $resource_id
        ));

        if (empty($units)) {
            return new WP_Error('no_units', 'Resource units not found. Please set units first.', ['status' => 400]);
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
                    "INSERT INTO {$table_slots} (resource_id, slot_date, created_at, updated_at)
                 VALUES (%d, %s, %s, %s)
                 ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)",
                    $resource_id,
                    $slot_date,
                    $now_gmt,
                    $now_gmt
                ));

                // 作成または既存の slot_id を取得
                $slot_id = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM {$table_slots} WHERE resource_id = %d AND slot_date = %s",
                    $resource_id,
                    $slot_date
                ));

                // ② 既存の時間枠（details）を一旦リセット（重複防止のためスクラップ＆ビルド）
                $wpdb->delete($table_details, ['slot_id' => $slot_id], ['%d']);

                // ③ 時間枠（details）の生成
                if ($is_allday) {
                    // 終日の場合：00:00 〜 23:59 で1枠作成
                    foreach ($units as $unit) {
                        $wpdb->insert($table_details, [
                            'slot_id'    => $slot_id,
                            'unit_id'    => $unit->id,
                            'start_time' => '00:00:00',
                            'end_time'   => '23:59:59',
                            'is_booked'  => 0,
                            'status'     => 'open'
                        ]);
                    }
                } else {
                    // 時間指定の場合：インターバルで回して作成
                    $current = strtotime($start_time);
                    $last    = strtotime($end_time);

                    while ($current < $last) {
                        $next = $current + ($interval * 60);
                        $t_start = date('H:i:s', $current);
                        $t_end   = date('H:i:s', $next);

                        foreach ($units as $unit) {
                            $wpdb->insert($table_details, [
                                'slot_id'    => $slot_id,
                                'unit_id'    => $unit->id,
                                'start_time' => $t_start,
                                'end_time'   => $t_end,
                                'is_booked'  => 0,
                                'status'     => 'open'
                            ]);
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
            return new WP_Error('bulk_failed', $e->getMessage(), ['status' => 400]);
        }

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
        global $wpdb;
        $table_name = $wpdb->prefix . 'itmar_resource_units';

        if (empty($units)) {
            return true; // 空設定（全て削除）の場合はここで終了
        }

        // 2. 新しいデータを1件ずつインサート
        foreach ($units as $unit) {
            // すでに ID があるものはスキップ（既存データ）
            if (!empty($unit['id'])) continue;

            $result = $wpdb->insert(
                $table_name,
                [
                    'resource_id'  => $resource_id,
                    'name'         => sanitize_text_field($unit['name']),
                    'min_capacity' => absint($unit['min']),
                    'max_capacity' => absint($unit['max']),
                    'created_at'   => current_time('mysql'),
                ],
                [
                    '%d', // resource_id
                    '%s', // name
                    '%d', // min_capacity
                    '%d', // max_capacity
                    '%s', // created_at
                ]
            );

            if ($result === false) {
                // インサート失敗時のログ出力など（必要に応じて）
                error_log("Failed to insert resource unit for ID: {$resource_id}");
                return false;
            }
        }

        return true;
    }

    // リソースユニット呼び出しのコールバック関数
    public static function get_resource_units(\WP_REST_Request $request)
    {
        global $wpdb;
        $resource_id = (int) $request['id'];
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        $units = $wpdb->get_results($wpdb->prepare(
            "SELECT id, name, min_capacity as min, max_capacity as max 
         FROM {$table_units} 
         WHERE resource_id = %d AND is_active = 1",
            $resource_id
        ), ARRAY_A);

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
                'message' => 'Invalid data provided.'
            ], 400);
        }

        // 2. 保存処理の実行 (以前作成した静的メソッドを呼び出す)
        $result = self::save_resource_units((int)$resource_id, $units);

        if ($result) {
            return new \WP_REST_Response([
                'success' => true,
                'message' => 'Units saved successfully.',
                'data'    => $units
            ], 200);
        } else {
            return new \WP_REST_Response([
                'success' => false,
                'message' => 'Database error occurred.'
            ], 500);
        }
    }

    /**
     * ユニット情報を更新する
     */
    public static function handle_update_resource_unit(\WP_REST_Request $request): \WP_REST_Response
    {
        global $wpdb;
        $id = (int) $request->get_param('id');
        $table_units = $wpdb->prefix . 'itmar_resource_units';

        // 送信されたパラメータを取得
        $name = sanitize_text_field($request->get_param('name'));
        $min  = absint($request->get_param('min'));
        $max  = absint($request->get_param('max'));

        if (empty($name)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Name is required.'], 400);
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
            return new \WP_REST_Response(['success' => true, 'message' => 'Unit updated.'], 200);
        }

        return new \WP_REST_Response(['success' => false, 'message' => 'Update failed.'], 500);
    }

    /**
     * 特定のリソースユニットを削除する
     */
    public static function handle_delete_resource_unit(\WP_REST_Request $request): \WP_REST_Response
    {
        global $wpdb;
        $id = (int) $request->get_param('id');
        $table_units = $wpdb->prefix . 'itmar_resource_units';
        $table_details = $wpdb->prefix . 'itmar_slot_details';

        // 1. すでに「予約済み」のデータがあるか確認
        $booked_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_details} WHERE unit_id = %d AND is_booked = 1",
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
            return new \WP_REST_Response(['success' => true, 'message' => 'ユニットと関連する枠を削除しました。'], 200);
        }

        return new \WP_REST_Response(['success' => false, 'message' => 'DBエラーが発生しました。'], 500);
    }

    //スロット詳細を編集するメソッド
    public static function handle_update_slot_detail(\WP_REST_Request $request)
    {
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

        return rest_ensure_response(['success' => ($result !== false)]);
    }
}
