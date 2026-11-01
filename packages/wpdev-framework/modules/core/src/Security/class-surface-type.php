<?php
/**
 * Security Surface Type Class.
 *
 * Defines the 6 canonical security surface models and policies under agent-harness governance:
 * PublicRead, AuthenticatedRead, CapabilityWrite, SignedWebhook, CronInternal, CLIPrivileged.
 *
 * @package WPDevFramework\Core\Security
 * @since   2.14.0
 */

namespace WPDevFramework\Core\Security;

defined( 'ABSPATH' ) || exit;

/**
 * Surface classification constants and policy mappings.
 */
final class Surface_Type {

	public const PUBLIC_READ        = 'PublicRead';
	public const AUTHENTICATED_READ = 'AuthenticatedRead';
	public const CAPABILITY_WRITE   = 'CapabilityWrite';
	public const SIGNED_WEBHOOK     = 'SignedWebhook';
	public const CRON_INTERNAL      = 'CronInternal';
	public const CLI_PRIVILEGED     = 'CLIPrivileged';

	/**
	 * Get all allowed surface model names.
	 *
	 * @return string[]
	 */
	public static function all() {
		return array(
			self::PUBLIC_READ,
			self::AUTHENTICATED_READ,
			self::CAPABILITY_WRITE,
			self::SIGNED_WEBHOOK,
			self::CRON_INTERNAL,
			self::CLI_PRIVILEGED,
		);
	}

	/**
	 * Check if a surface model type is valid.
	 *
	 * @param string $type Surface type identifier.
	 * @return bool
	 */
	public static function is_valid( $type ) {
		return in_array( $type, self::all(), true );
	}

	/**
	 * Return policy metadata for a given surface model.
	 *
	 * @param string $type Surface model name.
	 * @return array<string, mixed>
	 * @throws \InvalidArgumentException If surface type is unknown.
	 */
	public static function policy( $type ) {
		switch ( $type ) {
			case self::PUBLIC_READ:
				return array(
					'requires_auth'       => false,
					'requires_capability' => false,
					'requires_nonce'      => false,
					'allowed_methods'     => array( 'GET', 'HEAD', 'OPTIONS' ),
					'description'         => 'Publicly readable data; no authentication or capability required.',
				);

			case self::AUTHENTICATED_READ:
				return array(
					'requires_auth'       => true,
					'requires_capability' => false,
					'requires_nonce'      => false,
					'allowed_methods'     => array( 'GET', 'HEAD', 'OPTIONS' ),
					'description'         => 'Authenticated user required to read data.',
				);

			case self::CAPABILITY_WRITE:
				return array(
					'requires_auth'       => true,
					'requires_capability' => true,
					'requires_nonce'      => true,
					'allowed_methods'     => array( 'POST', 'PUT', 'PATCH', 'DELETE' ),
					'description'         => 'State-mutating action requiring explicit capability and CSRF protection.',
				);

			case self::SIGNED_WEBHOOK:
				return array(
					'requires_auth'       => false,
					'requires_signature'  => true,
					'requires_capability' => false,
					'allowed_methods'     => array( 'POST' ),
					'description'         => 'External incoming webhook requiring cryptographic signature verification.',
				);

			case self::CRON_INTERNAL:
				return array(
					'requires_cron'       => true,
					'requires_capability' => false,
					'description'         => 'Internal scheduled task executing within cron context only.',
				);

			case self::CLI_PRIVILEGED:
				return array(
					'requires_cli'        => true,
					'requires_capability' => false,
					'description'         => 'Privileged command line interface tool executing via WP-CLI.',
				);

			default:
				throw new \InvalidArgumentException( sprintf( 'Unknown surface type: %s', $type ) );
		}
	}
}

// Backward compatibility alias for legacy WPDev namespace.
if ( ! class_exists( 'WPDev\Core\Security\Surface_Type', false ) ) {
	class_alias( Surface_Type::class, 'WPDev\Core\Security\Surface_Type' );
}
