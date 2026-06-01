<?php

/**
 * REST API + Custom Table for reservation slots (capacity)
 */

namespace Itmar\BookingClassPackage\Reservation;

if (! defined('ABSPATH')) exit;


use WP_REST_Request;


abstract class BaseReserve
{
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
}
