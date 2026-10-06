<?php

/**
 * 管理画面のメニュー「予約管理」。
 *
 * 画面そのものは React（build/admin/index.js）が描画する。ここではメニューの登録と、
 * React を載せる領域の出力、スクリプトの読み込みだけを行う。枠・ユニット・予約の操作は、
 * ブロックエディターではなく、この管理画面で行う。
 */

namespace Itmar\BookingClassPackage\Admin;

if (! defined('ABSPATH')) exit;

final class AdminPage
{
    public const SLUG = 'itmar-booking';
    private const SCRIPT_HANDLE = 'itmaroon-booking-admin';

    /** メニューが返したフック名（このページでだけスクリプトを読み込むため） */
    private static array $hook_suffixes = [];

    /** プラグインのメインファイル（スクリプトのURLと翻訳の場所の基準） */
    private static string $plugin_file = '';

    public static function init(string $plugin_file): void
    {
        self::$plugin_file = $plugin_file;
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue']);
    }

    /** 管理画面を使える権限。REST と同じフィルターで変更できる */
    public static function capability(): string
    {
        return (string) apply_filters('itmar_reservation_slots_manage_cap', 'manage_options', null);
    }

    public static function add_menu(): void
    {
        $cap = self::capability();

        $views = [
            'slots'    => [self::SLUG, __('Slots', 'itmaroon-booking-block'), __('Slot Management', 'itmaroon-booking-block')],
            'units'    => [self::SLUG . '-units', __('Units', 'itmaroon-booking-block'), __('Unit Management', 'itmaroon-booking-block')],
            'bookings' => [self::SLUG . '-bookings', __('Bookings', 'itmaroon-booking-block'), __('Booking List', 'itmaroon-booking-block')],
            'settings' => [self::SLUG . '-settings', __('Settings', 'itmaroon-booking-block'), __('Reservation Settings', 'itmaroon-booking-block')],
        ];

        $first = true;
        foreach ($views as $view => [$slug, $menu_title, $page_title]) {
            $callback = function () use ($view, $page_title) {
                self::render($view, $page_title);
            };

            if ($first) {
                // トップレベルのメニュー（最初のサブメニューを兼ねる）
                $hook = add_menu_page(
                    __('Reservation Management', 'itmaroon-booking-block'),
                    __('Reservation Management', 'itmaroon-booking-block'),
                    $cap,
                    $slug,
                    $callback,
                    'dashicons-calendar-alt',
                    30
                );
                self::$hook_suffixes[] = $hook;
                // 先頭のサブメニューの表示名を、トップレベルとは別の名前にする
                $sub = add_submenu_page($slug, $page_title, $menu_title, $cap, $slug, $callback);
                if ($sub) {
                    self::$hook_suffixes[] = $sub;
                }
                $first = false;
                continue;
            }

            $sub = add_submenu_page(self::SLUG, $page_title, $menu_title, $cap, $slug, $callback);
            if ($sub) {
                self::$hook_suffixes[] = $sub;
            }
        }
    }

    private static function render(string $view, string $title): void
    {
        if (! current_user_can(self::capability())) {
            wp_die(esc_html__('You do not have permission to access this page.', 'itmaroon-booking-block'));
        }

        echo '<div class="wrap itmar-booking-admin-wrap">';
        echo '<h1 class="wp-heading-inline">' . esc_html($title) . '</h1>';
        echo '<hr class="wp-header-end">';
        printf('<div id="itmar-booking-admin" data-view="%s"></div>', esc_attr($view));
        echo '</div>';
    }

    public static function enqueue(string $hook_suffix): void
    {
        if (! in_array($hook_suffix, self::$hook_suffixes, true)) {
            return;
        }

        $dir = plugin_dir_path(self::$plugin_file);
        $asset_file = $dir . 'build/admin/index.asset.php';
        if (! file_exists($asset_file)) {
            return;
        }
        $asset = include $asset_file;

        wp_enqueue_script(
            self::SCRIPT_HANDLE,
            plugins_url('build/admin/index.js', self::$plugin_file),
            $asset['dependencies'],
            $asset['version'],
            true
        );
        wp_set_script_translations(self::SCRIPT_HANDLE, 'itmaroon-booking-block', $dir . 'languages');

        if (file_exists($dir . 'build/admin/index.css')) {
            wp_enqueue_style(
                self::SCRIPT_HANDLE,
                plugins_url('build/admin/index.css', self::$plugin_file),
                ['wp-components'],
                $asset['version']
            );
        }
    }
}
