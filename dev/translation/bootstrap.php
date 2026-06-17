<?php
/**
 * Translation pipeline bootstrap for wp-starter-kit (Phase 6).
 *
 * Pure helpers live in packages/translation/src/index.js (Node) so they
 * can be unit-tested without spawning wp i18n commands. The functions
 * here are thin wrappers that resolve the source root, define a list
 * of components (anything in components/X/script.js), spawn wp i18n
 * make-pot for each component, and call the JS helper to build the map
 * file.
 *
 * Canonical helpers use the `wpdev_*` prefix. Deprecated `wpsk_*` names
 * at the bottom delegate to the same implementation.
 */
declare(strict_types=1);

require_once __DIR__ . '/colors.php';

if ( ! defined( 'SOURCE_ROOT' ) ) {
	$source_root = getenv( 'WPDEV_SOURCE_ROOT' );
	if ( $source_root === false || $source_root === '' ) {
		$source_root = getenv( 'WPSK_SOURCE_ROOT' );
	}
	define( 'SOURCE_ROOT', ( $source_root !== false && $source_root !== '' ) ? $source_root : dirname( __DIR__, 2 ) );
}

if ( ! defined( 'TRANSLATION_HELPER' ) ) {
	define(
		'TRANSLATION_HELPER',
		dirname( __DIR__, 2 ) . '/packages/translation/src/index.js'
	);
}

/**
 * @return string[]
 */
function wpdev_list_components(): array {
	$out = [];
	foreach ( glob( SOURCE_ROOT . '/components/*/script.js' ) ?: [] as $file ) {
		$out[] = basename( dirname( $file ) );
	}
	sort( $out );
	return $out;
}

/**
 * @param string $op
 * @param array  $payload
 * @return array
 */
function wpdev_run_translation_helper( string $op, array $payload ): array {
	$cmd = [ 'node', TRANSLATION_HELPER, $op, base64_encode( json_encode( $payload ) ) ];
	$env = [ 'PATH' => getenv( 'PATH' ) ];

	$proc = proc_open(
		$cmd,
		[ 1 => [ 'pipe', 'w' ], 2 => [ 'pipe', 'w' ] ],
		$pipes,
		SOURCE_ROOT ?: getcwd(),
		$env
	);
	if ( ! is_resource( $proc ) ) {
		return [ 'ok' => false, 'error' => 'proc_open failed for: ' . implode( ' ', $cmd ) ];
	}
	$stdout = stream_get_contents( $pipes[1] );
	$stderr = stream_get_contents( $pipes[2] );
	fclose( $pipes[1] );
	fclose( $pipes[2] );
	$exit = proc_close( $proc );
	if ( $exit !== 0 ) {
		return [ 'ok' => false, 'error' => "node exited $exit: $stderr" ];
	}
	$decoded = json_decode( trim( $stdout ), true );
	return is_array( $decoded )
		? $decoded
		: [ 'ok' => false, 'error' => 'non-JSON output: ' . $stdout ];
}

/**
 * @param string[] $argv
 * @return array
 */
function wpdev_run_wp_i18n( array $argv ): array {
	$cmd = array_merge( [ 'wp', 'i18n' ], $argv );
	$env = [ 'PATH' => getenv( 'PATH' ) ];

	$proc = proc_open(
		$cmd,
		[ 1 => [ 'pipe', 'w' ], 2 => [ 'pipe', 'w' ] ],
		$pipes,
		SOURCE_ROOT ?: getcwd(),
		$env
	);
	if ( ! is_resource( $proc ) ) {
		return [ 'ok' => false, 'stdout' => '', 'stderr' => 'proc_open failed' ];
	}
	$stdout = stream_get_contents( $pipes[1] );
	$stderr = stream_get_contents( $pipes[2] );
	fclose( $pipes[1] );
	fclose( $pipes[2] );
	$exit = proc_close( $proc );
	return [
		'ok'     => $exit === 0,
		'stdout' => $stdout,
		'stderr' => $stderr,
		'exit'   => $exit,
	];
}

/**
 * @return string
 */
function wpdev_make_script_pot( string $component_name ): string {
	$pot_rel = '/components/' . $component_name . '/' . $component_name . '.script.pot';
	$scan    = '/components/' . $component_name;
	$r       = wpdev_run_wp_i18n(
		[
			'make-pot',
			SOURCE_ROOT . $scan,
			SOURCE_ROOT . $pot_rel,
			'--ignore-domain',
			'--skip-php',
			'--skip-blade',
			'--skip-block-json',
			'--skip-theme-json',
			'--skip-audit',
		]
	);
	return $r['ok'] ? $pot_rel : '';
}

/**
 * @return string
 */
function wpdev_build_map_file( string $component_name, string $pot_rel ): string {
	$pot_abs = SOURCE_ROOT . $pot_rel;
	if ( ! is_file( $pot_abs ) ) {
		return '';
	}

	$bundle = $component_name . '.js';
	$res    = wpdev_run_translation_helper(
		'parseMapFile',
		[
			'potContents' => (string) file_get_contents( $pot_abs ),
			'bundleName'  => $bundle,
		]
	);
	if ( ! ( $res['ok'] ?? false ) || ! is_array( $res['result'] ?? null ) ) {
		return '';
	}

	$map_dir = SOURCE_ROOT . '/assets/map';
	if ( ! is_dir( $map_dir ) ) {
		mkdir( $map_dir, 0777, true );
	}
	$map_file = $map_dir . '/' . $component_name . '.map.json';
	file_put_contents( $map_file, json_encode( $res['result'], JSON_PRETTY_PRINT ) );
	return '/assets/map/' . $component_name . '.map.json';
}

/* Deprecated wpsk_* shims */

if ( ! function_exists( 'wpsk_list_components' ) ) {
	/** @deprecated Use wpdev_list_components() */
	function wpsk_list_components(): array {
		return wpdev_list_components();
	}
}

if ( ! function_exists( 'wpsk_run_translation_helper' ) ) {
	/** @deprecated Use wpdev_run_translation_helper() */
	function wpsk_run_translation_helper( string $op, array $payload ): array {
		return wpdev_run_translation_helper( $op, $payload );
	}
}

if ( ! function_exists( 'wpsk_run_wp_i18n' ) ) {
	/** @deprecated Use wpdev_run_wp_i18n() */
	function wpsk_run_wp_i18n( array $argv ): array {
		return wpdev_run_wp_i18n( $argv );
	}
}

if ( ! function_exists( 'wpsk_make_script_pot' ) ) {
	/** @deprecated Use wpdev_make_script_pot() */
	function wpsk_make_script_pot( string $component_name ): string {
		return wpdev_make_script_pot( $component_name );
	}
}

if ( ! function_exists( 'wpsk_build_map_file' ) ) {
	/** @deprecated Use wpdev_build_map_file() */
	function wpsk_build_map_file( string $component_name, string $pot_rel ): string {
		return wpdev_build_map_file( $component_name, $pot_rel );
	}
}