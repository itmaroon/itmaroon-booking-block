<?php

/**
 * Plugin Name:       ITMAROON BOOKING BLOCK
 * Plugin URI:        https://itmaroon.net
 * Description:       We provide blocks with reservation management function.
 * Requires at least: 6.4
 * Requires PHP:      8.2
 * Version:           0.1.0
 * Author:            Web Creator ITmaroon
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       itmaroon-booking-block
 * Domain Path:       /languages 
 *
 * @package           itmar
 */


//PHPファイルに対する直接アクセスを禁止
if (!defined('ABSPATH')) exit;

// プラグイン情報取得に必要なファイルを読み込む
if (!function_exists('get_plugin_data')) {
	require_once(ABSPATH . 'wp-admin/includes/plugin.php');
}

require_once __DIR__ . '/vendor/itmar/loader-package/src/register_autoloader.php';
$blocks_entry = new \Itmar\BlockClassPackage\ItmarEntryClass();

use Itmar\BookingClassPackage\Reservation\SlotsAPI;
use Itmar\BookingClassPackage\Reservation\BookingAPI;

// init は plugins_loaded などで
add_action('plugins_loaded', function () {
	SlotsAPI::init();
	BookingAPI::init();
});

//ブロックの初期登録
add_action('init', function () use ($blocks_entry) {
	$plugin_data = get_plugin_data(__FILE__);
	$blocks_entry->block_init($plugin_data['TextDomain'], __FILE__);
});

//Rest APIのルート設定
register_activation_hook(__FILE__, [SlotsAPI::class, 'activate']);
