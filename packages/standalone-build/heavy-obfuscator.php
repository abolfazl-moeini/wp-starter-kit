<?php
/**
 * Deep PHP Obfuscator & Spaghetti Engine (Plan 3 Complete)
 *
 * Implements:
 * 1. 100% Comment and DocBlock stripping (zero developer guidance).
 * 2. Dense whitespace compaction (minification).
 * 3. Class and Function symbol mangling for all internal entities.
 * 4. Private method and private property mangling.
 * 5. Local variable mangling.
 * 6. 100% Token-safe preservation of string literals, SQL queries, HTML, and gettext (%1$s).
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', true );
}

class Deep_PHP_Obfuscator {

	protected $seed;
	protected $function_map = array();
	protected $class_map    = array();
	protected $is_root_file = false;

	protected static $reserved_vars = array(
		'$this',
		'$_GET',
		'$_POST',
		'$_COOKIE',
		'$_REQUEST',
		'$_SERVER',
		'$_ENV',
		'$_FILES',
		'$_SESSION',
		'$GLOBALS',
		'$wpdb',
		'$wp_query',
		'$post',
		'$wp_version',
	);

	protected static $reserved_funcs = array(
		'add_action',
		'add_filter',
		'apply_filters',
		'do_action',
		'get_option',
		'update_option',
		'delete_option',
		'get_post_meta',
		'update_post_meta',
		'sprintf',
		'printf',
		'__',
		'_e',
		'_x',
		'_n',
		'esc_html',
		'esc_attr',
		'esc_url',
		'wp_kses_post',
		'wp_unslash',
		'defined',
		'is_readable',
		'file_exists',
		'require_once',
		'include_once',
		'require',
		'include',
		'dirname',
		'count',
		'is_array',
		'is_object',
		'is_string',
		'is_admin',
		'plugins_url',
		'plugin_dir_path',
		'plugin_dir_url',
	);

	protected static $magic_methods = array(
		'__construct',
		'__destruct',
		'__call',
		'__callStatic',
		'__get',
		'__set',
		'__isset',
		'__unset',
		'__sleep',
		'__wakeup',
		'__serialize',
		'__unserialize',
		'__toString',
		'__invoke',
		'__set_state',
		'__clone',
		'__debugInfo',
	);

	public function __construct( $seed = 'wpdev-plan3-deep' ) {
		$this->seed = $seed;
	}

	/**
	 * Pass 1: Scan entire directory to discover all internal functions and classes.
	 */
	public function scan_symbols_in_directory( $dir ) {
		$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir ) );
		foreach ( $it as $file ) {
			if ( $file->isFile() && $file->getExtension() === 'php' ) {
				$this->scan_file_symbols( $file->getPathname() );
			}
		}
	}

	public function scan_file_symbols( $file_path ) {
		$source = file_get_contents( $file_path );
		$tokens = token_get_all( $source );
		$count  = count( $tokens );

		for ( $i = 0; $i < $count; $i++ ) {
			$token = $tokens[ $i ];
			if ( is_array( $token ) ) {
				$id = $token[0];

				if ( $id === T_CLASS ) {
					$next = $i + 1;
					while ( $next < $count && is_array( $tokens[ $next ] ) && ( $tokens[ $next ][0] === T_WHITESPACE || $tokens[ $next ][0] === T_STATIC || $tokens[ $next ][0] === T_ABSTRACT ) ) {
						$next++;
					}
					if ( $next < $count && is_array( $tokens[ $next ] ) && $tokens[ $next ][0] === T_STRING ) {
						$class_name = $tokens[ $next ][1];
						if ( ! isset( $this->class_map[ $class_name ] ) ) {
							$this->class_map[ $class_name ] = '_c_' . substr( hash( 'sha256', $this->seed . ':class:' . $class_name ), 0, 8 );
						}
					}
				} elseif ( $id === T_FUNCTION ) {
					// Check if this is a standalone function or class method
					$prev = $i - 1;
					$is_method = false;
					while ( $prev >= 0 && is_array( $tokens[ $prev ] ) && ( $tokens[ $prev ][0] === T_WHITESPACE || $tokens[ $prev ][0] === T_STATIC || $tokens[ $prev ][0] === T_FINAL ) ) {
						$prev--;
					}
					if ( $prev >= 0 && is_array( $tokens[ $prev ] ) && in_array( $tokens[ $prev ][0], array( T_PUBLIC, T_PROTECTED, T_PRIVATE ), true ) ) {
						$is_method = true;
					}

					if ( ! $is_method ) {
						$next = $i + 1;
						while ( $next < $count && is_array( $tokens[ $next ] ) && $tokens[ $next ][0] === T_WHITESPACE ) {
							$next++;
						}
						if ( $next < $count && is_array( $tokens[ $next ] ) && $tokens[ $next ][0] === T_STRING ) {
							$func_name = $tokens[ $next ][1];
							if ( ! in_array( $func_name, self::$reserved_funcs, true ) && ! isset( $this->function_map[ $func_name ] ) ) {
								$this->function_map[ $func_name ] = '_f_' . substr( hash( 'sha256', $this->seed . ':func:' . $func_name ), 0, 8 );
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Pass 2: Transform, mangle, strip comments and compact whitespace.
	 */
	public function transform_file( $file_path, $is_main_plugin_file = false ) {
		$source = file_get_contents( $file_path );
		$tokens = token_get_all( $source );
		$count  = count( $tokens );

		// Identify private methods and properties in this file
		$private_methods    = array();
		$private_properties = array();
		$public_properties  = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$token = $tokens[ $i ];
			if ( is_array( $token ) ) {
				$id = $token[0];

				if ( $id === T_PRIVATE ) {
					$j = $i + 1;
					while ( $j < $count && is_array( $tokens[ $j ] ) && ( $tokens[ $j ][0] === T_WHITESPACE || $tokens[ $j ][0] === T_STATIC ) ) {
						$j++;
					}
					if ( $j < $count && is_array( $tokens[ $j ] ) ) {
						if ( $tokens[ $j ][0] === T_FUNCTION ) {
							$k = $j + 1;
							while ( $k < $count && is_array( $tokens[ $k ] ) && $tokens[ $k ][0] === T_WHITESPACE ) {
								$k++;
							}
							if ( $k < $count && is_array( $tokens[ $k ] ) && $tokens[ $k ][0] === T_STRING ) {
								$func_name = $tokens[ $k ][1];
								if ( ! in_array( $func_name, self::$magic_methods, true ) ) {
									$private_methods[ $func_name ] = '_m_' . substr( hash( 'sha256', $this->seed . ':m:' . $func_name ), 0, 8 );
								}
							}
						} elseif ( $tokens[ $j ][0] === T_VARIABLE ) {
							$prop_name = substr( $tokens[ $j ][1], 1 );
							$private_properties[ $prop_name ] = '_p_' . substr( hash( 'sha256', $this->seed . ':p:' . $prop_name ), 0, 8 );
						}
					}
				} elseif ( $id === T_PUBLIC || $id === T_PROTECTED || $id === T_VAR ) {
					$j = $i + 1;
					while ( $j < $count && is_array( $tokens[ $j ] ) && ( $tokens[ $j ][0] === T_WHITESPACE || $tokens[ $j ][0] === T_STATIC ) ) {
						$j++;
					}
					if ( $j < $count && is_array( $tokens[ $j ] ) && $tokens[ $j ][0] === T_VARIABLE ) {
						$prop_name = substr( $tokens[ $j ][1], 1 );
						$public_properties[ $prop_name ] = true;
					}
				}
			}
		}

		// Reconstruct code with complete stripping and mangling
		$output                 = '';
		$in_double_quote_string = false;
		$seen_first_docblock    = false;

		for ( $i = 0; $i < $count; $i++ ) {
			$token = $tokens[ $i ];

			if ( is_array( $token ) ) {
				$id   = $token[0];
				$text = $token[1];

				// 1. Comment & DocBlock Stripping
				if ( $id === T_COMMENT || $id === T_DOC_COMMENT ) {
					// Only preserve the initial plugin header in the main plugin file
					if ( $is_main_plugin_file && ! $seen_first_docblock && stripos( $text, 'Plugin Name:' ) !== false ) {
						$seen_first_docblock = true;
						$output .= "\n" . $text . "\n";
					}
					// Otherwise strip 100% of comments
					continue;
				}

				// 2. Whitespace Compaction (Minification)
				if ( $id === T_WHITESPACE ) {
					if ( strpos( $text, "\n" ) !== false ) {
						$output .= "\n";
					} else {
						$output .= ' ';
					}
					continue;
				}

				// 3. Class Name Mangling
				if ( $id === T_STRING && isset( $this->class_map[ $text ] ) ) {
					$output .= $this->class_map[ $text ];
					continue;
				}

				// 4. Standalone Function Name Mangling (definitions and direct calls)
				if ( $id === T_STRING && isset( $this->function_map[ $text ] ) ) {
					$output .= $this->function_map[ $text ];
					continue;
				}

				// 5. Function/Class name string literals (e.g. in add_action('init', 'my_func'))
				if ( $id === T_CONSTANT_ENCAPSED_STRING ) {
					$raw_str = trim( $text, "'\"" );
					if ( isset( $this->function_map[ $raw_str ] ) ) {
						$quote = $text[0];
						$output .= $quote . $this->function_map[ $raw_str ] . $quote;
						continue;
					}
					if ( isset( $this->class_map[ $raw_str ] ) ) {
						$quote = $text[0];
						$output .= $quote . $this->class_map[ $raw_str ] . $quote;
						continue;
					}
					$output .= $text;
					continue;
				}

				// 6. Variable Mangling
				if ( $id === T_VARIABLE ) {
					if ( $in_double_quote_string || in_array( $text, self::$reserved_vars, true ) ) {
						$output .= $text;
					} else {
						$raw_name = substr( $text, 1 );
						if ( isset( $private_properties[ $raw_name ] ) ) {
							$output .= '$_' . $private_properties[ $raw_name ];
						} elseif ( isset( $public_properties[ $raw_name ] ) ) {
							$output .= $text;
						} else {
							$output .= '$_v_' . substr( hash( 'sha256', $this->seed . ':v:' . $text ), 0, 8 );
						}
					}
					continue;
				}

				// 7. Object Property / Method Access
				if ( $id === T_OBJECT_OPERATOR ) {
					$output .= $text;
					$next = $i + 1;
					while ( $next < $count && is_array( $tokens[ $next ] ) && $tokens[ $next ][0] === T_WHITESPACE ) {
						$output .= $tokens[ $next ][1];
						$next++;
					}
					if ( $next < $count && is_array( $tokens[ $next ] ) && $tokens[ $next ][0] === T_STRING ) {
						$accessed_name = $tokens[ $next ][1];
						if ( isset( $private_methods[ $accessed_name ] ) ) {
							$output .= $private_methods[ $accessed_name ];
							$i = $next;
						} elseif ( isset( $private_properties[ $accessed_name ] ) ) {
							$output .= $private_properties[ $accessed_name ];
							$i = $next;
						}
					}
					continue;
				}

				// 8. Private Method Declaration
				if ( $id === T_STRING && isset( $private_methods[ $text ] ) ) {
					$prev = $i - 1;
					while ( $prev >= 0 && is_array( $tokens[ $prev ] ) && $tokens[ $prev ][0] === T_WHITESPACE ) {
						$prev--;
					}
					if ( $prev >= 0 && is_array( $tokens[ $prev ] ) && $tokens[ $prev ][0] === T_FUNCTION ) {
						$output .= $private_methods[ $text ];
						continue;
					}
				}

				$output .= $text;
			} else {
				if ( $token === '"' ) {
					$in_double_quote_string = ! $in_double_quote_string;
				}
				$output .= $token;
			}
		}

		return $output;
	}
}

if ( isset( $argv[0] ) && basename( $argv[0] ) === 'heavy-obfuscator.php' ) {
	$target_dir   = isset( $argv[1] ) ? $argv[1] : '';
	$main_file    = isset( $argv[2] ) ? $argv[2] : '';
	$seed         = isset( $argv[3] ) ? $argv[3] : 'wpdev-plan3-deep';

	if ( empty( $target_dir ) || ! is_dir( $target_dir ) ) {
		fwrite( STDERR, "Usage: php heavy-obfuscator.php <target-dir> [main-plugin-file] [seed]\n" );
		exit( 1 );
	}

	$obfuscator = new Deep_PHP_Obfuscator( $seed );
	echo "==> Scanning all PHP symbols across plugin directory...\n";
	$obfuscator->scan_symbols_in_directory( $target_dir );

	echo "==> Applying deep obfuscation, comment stripping, minification, and symbol mangling...\n";
	$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $target_dir ) );
	foreach ( $it as $file ) {
		if ( $file->isFile() && $file->getExtension() === 'php' ) {
			$path = $file->getPathname();
			$is_main = ( ! empty( $main_file ) && basename( $path ) === basename( $main_file ) );
			$transformed = $obfuscator->transform_file( $path, $is_main );
			file_put_contents( $path, $transformed );
			echo "Obfuscated & Stripped: " . basename( $path ) . "\n";
		}
	}
	echo "==> Deep obfuscation complete!\n";
}
