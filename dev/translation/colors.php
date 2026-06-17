<?php
/**
 * Tiny color-log helper used by the dev/translation/*.php scripts.
 *
 * Usage:
 *   wpdev_color_log('Done');
 *   wpdev_color_log('SKIP — wp not installed', 'w');
 *
 * Color codes (ANSI): g=green, w=yellow, r=red, c=cyan, b=blue, n=none.
 * Honors NO_COLOR (https://no-color.org).
 */
declare(strict_types=1);

if ( ! function_exists( 'wpdev_color_log' ) ) {
	function wpdev_color_log( string $msg, string $color = 'n' ): void {
		if ( getenv( 'NO_COLOR' ) !== false ) {
			fwrite( STDOUT, $msg . "\n" );
			return;
		}
		$codes = [
			'g' => "\033[32m",
			'w' => "\033[33m",
			'r' => "\033[31m",
			'c' => "\033[36m",
			'b' => "\033[34m",
			'n' => '',
		];
		$code  = $codes[ $color ] ?? '';
		$reset = $code === '' ? '' : "\033[0m";
		fwrite( STDOUT, $code . $msg . $reset . "\n" );
	}
}

if ( ! function_exists( 'wpdev_color_log' ) ) {
	/** @deprecated Use wpdev_color_log() */
	function wpdev_color_log( string $msg, string $color = 'n' ): void {
		wpdev_color_log( $msg, $color );
	}
}