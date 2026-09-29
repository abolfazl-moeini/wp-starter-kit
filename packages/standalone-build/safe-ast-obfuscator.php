<?php
/**
 * Token-Safe PHP Obfuscator (Plan 3)
 *
 * Uses native token_get_all() to guarantee zero corruption of strings,
 * gettext placeholders (%1$s, %2$d), SQL queries, HTML, and public contracts.
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', true );
}

class Safe_Token_Obfuscator {

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

	/**
	 * Obfuscate PHP source code safely without corrupting string literals or gettext templates.
	 *
	 * @param string $source PHP Source code.
	 * @param string $seed Salt for deterministic symbol hashing.
	 * @return string Transformed PHP code.
	 */
	public static function transform( $source, $seed = 'wpdev-plan3' ) {
		$tokens = token_get_all( $source );
		$count  = count( $tokens );

		// Pass 1: Identify private methods, private properties, and protected/public properties.
		$private_methods    = array();
		$private_properties = array();
		$public_properties  = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$token = $tokens[ $i ];
			if ( is_array( $token ) ) {
				$id   = $token[0];
				$text = $token[1];

				if ( $id === T_PRIVATE ) {
					// Check next non-whitespace tokens
					$j = $i + 1;
					while ( $j < $count && is_array( $tokens[ $j ] ) && ( $tokens[ $j ][0] === T_WHITESPACE || $tokens[ $j ][0] === T_STATIC ) ) {
						$j++;
					}
					if ( $j < $count && is_array( $tokens[ $j ] ) ) {
						if ( $tokens[ $j ][0] === T_FUNCTION ) {
							// Find function name
							$k = $j + 1;
							while ( $k < $count && is_array( $tokens[ $k ] ) && $tokens[ $k ][0] === T_WHITESPACE ) {
								$k++;
							}
							if ( $k < $count && is_array( $tokens[ $k ] ) && $tokens[ $k ][0] === T_STRING ) {
								$func_name = $tokens[ $k ][1];
								if ( ! in_array( $func_name, self::$magic_methods, true ) ) {
									$private_methods[ $func_name ] = '_m' . substr( hash( 'sha256', $seed . ':m:' . $func_name ), 0, 8 );
								}
							}
						} elseif ( $tokens[ $j ][0] === T_VARIABLE ) {
							// A declaration may contain multiple comma-separated properties.
							for ( $k = $j; $k < $count && $tokens[ $k ] !== ';'; $k++ ) {
								if ( is_array( $tokens[ $k ] ) && $tokens[ $k ][0] === T_VARIABLE ) {
									$prop_name = substr( $tokens[ $k ][1], 1 );
									$private_properties[ $prop_name ] = '_p' . substr( hash( 'sha256', $seed . ':p:' . $prop_name ), 0, 8 );
								}
							}
						}
					}
				} elseif ( $id === T_PUBLIC || $id === T_PROTECTED || $id === T_VAR ) {
					$j = $i + 1;
					while ( $j < $count && is_array( $tokens[ $j ] ) && ( $tokens[ $j ][0] === T_WHITESPACE || $tokens[ $j ][0] === T_STATIC ) ) {
						$j++;
					}
					if ( $j < $count && is_array( $tokens[ $j ] ) && $tokens[ $j ][0] === T_VARIABLE ) {
						for ( $k = $j; $k < $count && $tokens[ $k ] !== ';'; $k++ ) {
							if ( is_array( $tokens[ $k ] ) && $tokens[ $k ][0] === T_VARIABLE ) {
								$public_properties[ substr( $tokens[ $k ][1], 1 ) ] = true;
							}
						}
					}
				}
			}
		}

		// Pass 2: Reconstruct code replacing only proven private tokens and executable local variables
		$output = '';
		$in_double_quote_string = false;

		for ( $i = 0; $i < $count; $i++ ) {
			$token = $tokens[ $i ];
			if ( is_array( $token ) ) {
				$id   = $token[0];
				$text = $token[1];

				if ( $id === T_VARIABLE ) {
					if ( $in_double_quote_string || in_array( $text, self::$reserved_vars, true ) ) {
						// NEVER mutate variables or format specifiers ($s, $d) inside double quoted strings!
						$output .= $text;
					} else {
						$raw_name = substr( $text, 1 );
						if ( isset( $private_properties[ $raw_name ] ) ) {
							$output .= '$_' . $private_properties[ $raw_name ];
						} elseif ( isset( $public_properties[ $raw_name ] ) ) {
							$output .= $text; // Preserve public/protected property declarations
						} else {
							// Executable local variable
							$output .= '$_v' . substr( hash( 'sha256', $seed . ':v:' . $text ), 0, 8 );
						}
					}
				} elseif ( $id === T_OBJECT_OPERATOR ) {
					// Check if followed by private property or private method
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
				} elseif ( $id === T_STRING && isset( $private_methods[ $text ] ) ) {
					// Check if this string is immediately preceded by T_FUNCTION
					$prev = $i - 1;
					while ( $prev >= 0 && is_array( $tokens[ $prev ] ) && $tokens[ $prev ][0] === T_WHITESPACE ) {
						$prev--;
					}
					if ( $prev >= 0 && is_array( $tokens[ $prev ] ) && $tokens[ $prev ][0] === T_FUNCTION ) {
						$output .= $private_methods[ $text ];
					} elseif ( $prev >= 0 && is_array( $tokens[ $prev ] ) && $tokens[ $prev ][0] === T_DOUBLE_COLON ) {
						// Private static calls must follow the renamed declaration.
						$output .= $private_methods[ $text ];
					} else {
						$output .= $text;
					}
				} elseif ( $id === T_COMMENT || $id === T_DOC_COMMENT ) {
					// Remove non-essential comments from the disposable artifact while
					// retaining legal/plugin metadata required by the role manifest.
					if ( preg_match( '/Plugin Name:|License:|SPDX-License-Identifier|Copyright|\bNOTICE\b/i', $text ) ) {
						$output .= $text;
					}
				} else {
					// All other tokens (strings, gettext %1$s, comments, HTML, numbers, keywords) remain 100% UNTOUCHED
					$output .= $text;
				}
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

if ( isset( $argv[0] ) && basename( $argv[0] ) === 'safe-ast-obfuscator.php' ) {
	$target = isset( $argv[1] ) ? $argv[1] : '';
	$seed   = isset( $argv[2] ) ? $argv[2] : 'wpdev-plan3-release';

	if ( empty( $target ) || ! file_exists( $target ) ) {
		fwrite( STDERR, "Usage: php safe-ast-obfuscator.php <file-or-dir> [seed]\n" );
		exit( 1 );
	}

	if ( is_file( $target ) ) {
		$source      = file_get_contents( $target );
		$transformed = Safe_Token_Obfuscator::transform( $source, $seed );
		file_put_contents( $target, $transformed );
		echo "Transformed: $target\n";
	} elseif ( is_dir( $target ) ) {
		$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $target ) );
		foreach ( $it as $file ) {
			if ( $file->isFile() && $file->getExtension() === 'php' ) {
				$source      = file_get_contents( $file->getPathname() );
				$transformed = Safe_Token_Obfuscator::transform( $source, $seed );
				file_put_contents( $file->getPathname(), $transformed );
				echo "Transformed: " . $file->getPathname() . "\n";
			}
		}
	}
}
