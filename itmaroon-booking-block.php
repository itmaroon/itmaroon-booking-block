<?php

/**
 * Plugin Name:       ITMAROON Booking Block
 * Plugin URI:        https://itmaroon.net
 * Description:       Provides a reservation calendar block with capacity and booking management.
 * Requires at least: 6.4
 * Requires PHP:      8.2
 * Version:           1.1.0
 * Author:            Web Creator ITmaroon
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       itmaroon-booking-block
 * Domain Path:       /languages
 *
 * @package           itmar
 */


// PHP ファイルへの直接アクセスを禁止します。
if (! defined('ABSPATH')) {
	exit;
}

// プラグインヘッダーの情報を取得するために読み込みます。
if (! function_exists('get_plugin_data')) {
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

// 複数プラグインに同系統の Composer パッケージが同梱された場合の
// クラス衝突を避けるため、ITMAR の専用ローダーを使用します。
require_once __DIR__ . '/vendor/itmar/loader-package/src/register_autoloader.php';

// サンプル（ブロックパターン）の登録
require_once __DIR__ . '/patterns/register.php';

/**
 * Register REST API hooks.
 */
function itmaroon_booking_block_load_rest_api()
{
	\Itmar\BookingClassPackage\Reservation\SlotsAPI::init();
	\Itmar\BookingClassPackage\Reservation\BookingAPI::init();
	\Itmar\BookingClassPackage\Reservation\AdminAPI::init();
}
add_action('plugins_loaded', 'itmaroon_booking_block_load_rest_api');

/**
 * 管理画面のメニュー「予約管理」。枠・ユニット・予約の操作はここで行う。
 */
function itmaroon_booking_block_load_admin()
{
	if (is_admin()) {
		\Itmar\BookingClassPackage\Admin\AdminPage::init(__FILE__);
	}
}
add_action('plugins_loaded', 'itmaroon_booking_block_load_admin');

/**
 * Register blocks provided by this plugin.
 */
function itmaroon_booking_block_register_blocks()
{
	$plugin_data = get_plugin_data(__FILE__);
	$entry        = new \Itmar\BlockClassPackage\ItmarEntryClass();

	$entry->block_init(
		$plugin_data['TextDomain'],
		__FILE__
	);
}
add_action('init', 'itmaroon_booking_block_register_blocks');

/**
 * Create the custom tables used by the reservation APIs.
 */
function itmaroon_booking_block_activate()
{
	\Itmar\BookingClassPackage\Reservation\SlotsAPI::activate();
	\Itmar\BookingClassPackage\Reservation\BookingAPI::activate();
}
register_activation_hook(__FILE__, 'itmaroon_booking_block_activate');
