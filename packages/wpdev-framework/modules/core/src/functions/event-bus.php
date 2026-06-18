<?php
/**
 * Framework event bus transport (hook namespace only).
 *
 * Persistence and event-type schemas live in examples (e.g. wpdev-events).
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Dispatch a domain event through the framework hook bus.
 *
 * @since 2.8.0
 *
 * @param string               $slug    Event slug (sanitized).
 * @param array<string, mixed> $payload Event payload.
 * @return void
 */
function wpdev_dispatch_event( $slug, array $payload = array() ) {

	$slug = sanitize_key( (string) $slug );

	if ( '' === $slug ) {
		return;
	}

	/**
	 * Fires for every dispatched WPDev event.
	 *
	 * @since 2.8.0
	 *
	 * @param string               $slug    Event slug.
	 * @param array<string, mixed> $payload Event payload.
	 */
	do_action( 'wpdev_event', $slug, $payload );

	/**
	 * Fires for a specific WPDev event slug.
	 *
	 * @since 2.8.0
	 *
	 * @param array<string, mixed> $payload Event payload.
	 */
	do_action( "wpdev_event_{$slug}", $payload );

} // end wpdev_dispatch_event;

/**
 * Register a listener for a specific event slug.
 *
 * @since 2.8.0
 *
 * @param string   $slug     Event slug.
 * @param callable $callback Listener callback.
 * @param int      $priority Hook priority.
 * @param int      $accepted_args Accepted arguments.
 * @return bool
 */
function wpdev_register_event_listener( $slug, $callback, $priority = 10, $accepted_args = 1 ) {

	$slug = sanitize_key( (string) $slug );

	if ( '' === $slug || ! is_callable( $callback ) ) {
		return false;
	}

	return add_action( "wpdev_event_{$slug}", $callback, (int) $priority, (int) $accepted_args );

} // end wpdev_register_event_listener;

/**
 * Register a listener for all WPDev events.
 *
 * @since 2.8.0
 *
 * @param callable $callback Listener callback.
 * @param int      $priority Hook priority.
 * @param int      $accepted_args Accepted arguments.
 * @return bool
 */
function wpdev_register_global_event_listener( $callback, $priority = 10, $accepted_args = 2 ) {

	if ( ! is_callable( $callback ) ) {
		return false;
	}

	return add_action( 'wpdev_event', $callback, (int) $priority, (int) $accepted_args );

} // end wpdev_register_global_event_listener;
