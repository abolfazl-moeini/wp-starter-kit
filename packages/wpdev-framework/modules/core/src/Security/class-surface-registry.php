<?php
/**
 * Security Surface Registry Class.
 *
 * Central in-memory and exportable catalog of all declared security surfaces
 * across REST routes, AJAX handlers, Webhooks, CRON, and CLI endpoints.
 *
 * @package WPDevFramework\Core\Security
 * @since   2.14.0
 */

namespace WPDevFramework\Core\Security;

use InvalidArgumentException;

defined( 'ABSPATH' ) || exit;

/**
 * Surface Registry implementation.
 */
class Surface_Registry {

	/**
	 * In-memory stored surface records keyed by unique composite ID.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $surfaces = array();

	/**
	 * Register a security surface in the catalog.
	 *
	 * @param string                      $type        One of Surface_Type::all().
	 * @param string                      $transport   'rest' | 'ajax' | 'cron' | 'cli' | 'webhook'.
	 * @param string                      $identifier  Route path or action name (e.g. 'acme/v1:/settings', 'acme_save_settings').
	 * @param string|callable|null        $capability  Required user capability, or null for public/webhook.
	 * @param string|callable|object|null $handler     Handler class name, closure, or callable.
	 * @param array<string, mixed>        $schema      Input validation schema or parameter constraints.
	 * @param array<string, mixed>        $metadata    Additional metadata (methods, transport settings, etc.).
	 * @return array<string, mixed> The registered surface record.
	 * @throws InvalidArgumentException When validation fails or required capability is absent.
	 */
	public static function register( $type, $transport, $identifier, $capability = null, $handler = null, array $schema = array(), array $metadata = array() ) {

		if ( ! Surface_Type::is_valid( $type ) ) {
			throw new InvalidArgumentException( sprintf( 'Invalid surface model: "%s". Must be one of: %s', $type, implode( ', ', Surface_Type::all() ) ) );
		}

		$policy = Surface_Type::policy( $type );

		if ( ! empty( $policy['requires_capability'] ) ) {
			if ( empty( $capability ) || ( is_string( $capability ) && trim( $capability ) === '' ) ) {
				throw new InvalidArgumentException(
					sprintf( 'Surface "%s" with model "%s" requires a non-empty capability (none provided).', $identifier, $type )
				);
			}
		}

		$handler_repr = 'closure';
		if ( is_string( $handler ) ) {
			$handler_repr = $handler;
		} elseif ( is_array( $handler ) && isset( $handler[0] ) ) {
			$cls          = is_object( $handler[0] ) ? get_class( $handler[0] ) : (string) $handler[0];
			$method       = isset( $handler[1] ) ? (string) $handler[1] : '__invoke';
			$handler_repr = $cls . '::' . $method;
		} elseif ( is_object( $handler ) ) {
			$handler_repr = get_class( $handler );
		}

		$id = strtolower( $transport ) . ':' . ltrim( $identifier, '/' );

		$record = array(
			'id'         => $id,
			'type'       => $type,
			'transport'  => strtolower( $transport ),
			'identifier' => $identifier,
			'capability' => is_string( $capability ) ? $capability : ( is_callable( $capability ) ? 'callable' : null ),
			'handler'    => $handler_repr,
			'schema'     => $schema,
			'metadata'   => $metadata,
			'policy'     => $policy,
		);

		self::$surfaces[ $id ] = $record;

		return $record;
	}

	/**
	 * Retrieve all registered surfaces.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function all() {
		return array_values( self::$surfaces );
	}

	/**
	 * Retrieve a single surface by composite ID or by (transport, identifier).
	 *
	 * @param string      $id_or_transport Surface ID (e.g. 'rest:acme/v1/settings') or transport ('rest').
	 * @param string|null $identifier      Optional route or action identifier when first arg is transport.
	 * @return array<string, mixed>|null
	 */
	public static function get( $id_or_transport, $identifier = null ) {
		if ( null !== $identifier ) {
			$key = strtolower( $id_or_transport ) . ':' . ltrim( $identifier, '/' );
		} else {
			$key = strtolower( $id_or_transport );
		}
		return isset( self::$surfaces[ $key ] ) ? self::$surfaces[ $key ] : null;
	}

	/**
	 * Count of registered surfaces.
	 *
	 * @return int
	 */
	public static function count() {
		return count( self::$surfaces );
	}

	/**
	 * Reset/clear registry (primarily for test teardowns).
	 *
	 * @return void
	 */
	public static function reset() {
		self::$surfaces = array();
	}

	/**
	 * Export registered surfaces as JSON.
	 *
	 * @param bool $pretty Whether to format with indentation.
	 * @return string JSON representation of catalog.
	 */
	public static function export_json( $pretty = true ) {
		$surfaces = array_values( self::$surfaces );

		// Sort deterministically by id
		usort(
			$surfaces,
			static function ( $a, $b ) {
				return strcmp( $a['id'], $b['id'] );
			}
		);

		$payload = array(
			'schema_version' => '1.0.0',
			'generated_at'   => gmdate( 'Y-m-d\TH:i:s\Z' ),
			'generator'      => 'wpdev Surface_Registry::export_json',
			'total_surfaces' => count( $surfaces ),
			'surfaces'       => $surfaces,
		);

		$flags = JSON_UNESCAPED_SLASHES;
		if ( $pretty && defined( 'JSON_PRETTY_PRINT' ) ) {
			$flags |= JSON_PRETTY_PRINT;
		}

		if ( function_exists( 'wp_json_encode' ) ) {
			return (string) wp_json_encode( $payload, $flags );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- Fallback when WordPress bootstrap is absent.
		return (string) json_encode( $payload, $flags );
	}
}

// Backward compatibility alias for legacy WPDev namespace.
if ( ! class_exists( 'WPDev\Core\Security\Surface_Registry', false ) ) {
	class_alias( Surface_Registry::class, 'WPDev\Core\Security\Surface_Registry' );
}
