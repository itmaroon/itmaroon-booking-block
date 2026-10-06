<?php
/**
 * サンプル（ブロックパターン）の登録。
 *
 * パターンは、テーマ固有のプリセット名（余白の番号、フォント名、色のスラッグ）を使わず、
 * block-collections が橋渡しする「役割変数」（--itmar-*）だけを参照している。
 * そのため、どのテーマに挿入しても、そのテーマの色・余白・フォントに従う。
 *
 * 挿入時にエディターが再保存するので、影の計算など、環境に依存する値は挿入先で作り直される。
 *
 * @package itmaroon-booking-block
 */

if (! defined('ABSPATH')) {
	exit;
}

function itmaroon_booking_block_register_patterns()
{
	if (! function_exists('register_block_pattern')) {
		return;
	}

	register_block_pattern_category(
		'itmar-booking',
		array('label' => __('ITmar Booking', 'itmaroon-booking-block'))
	);

	$dir      = plugin_dir_path(__FILE__);
	$patterns = array(
		'booking-reserve-timed' => array(
			'title'       => __('Reservation calendar (time slots)', 'itmaroon-booking-block'),
			'description' => __('A calendar, a time-slot panel, and the reservation dialogs. Choose the resource in the Reservation Block settings.', 'itmaroon-booking-block'),
			'keywords'    => array('reservation', 'booking', 'calendar'),
		),
		'booking-reserve-day'   => array(
			'title'       => __('Reservation calendar (by day)', 'itmaroon-booking-block'),
			'description' => __('A calendar that books a whole day, with the reservation dialogs. Choose the resource in the Reservation Block settings.', 'itmaroon-booking-block'),
			'keywords'    => array('reservation', 'booking', 'calendar', 'day'),
		),
	);

	foreach ($patterns as $slug => $meta) {
		$file = $dir . $slug . '.html';
		if (! is_readable($file)) {
			continue;
		}
		register_block_pattern(
			'itmaroon-booking-block/' . $slug,
			array_merge(
				$meta,
				array(
					'content'       => file_get_contents($file), // phpcs:ignore WordPress.WP_Filesystem.FileSystemReadsNotAllowed -- Reads a bundled pattern file.
					'categories'    => array('itmar-booking'),
					'viewportWidth' => 1280,
				)
			)
		);
	}
}
add_action('init', 'itmaroon_booking_block_register_patterns');
