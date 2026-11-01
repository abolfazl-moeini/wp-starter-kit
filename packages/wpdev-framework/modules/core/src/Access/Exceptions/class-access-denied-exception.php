<?php
/**
 * Access Denied Exception for WPDev Core.
 *
 * @package WPDevFramework\Core\Access\Exceptions
 * @since   2.13.1
 */

namespace WPDevFramework\Core\Access\Exceptions;

defined( 'ABSPATH' ) || exit;

if ( class_exists( 'WPDev\Access\Exceptions\Access_Denied_Exception' ) ) {
	class_alias( 'WPDev\Access\Exceptions\Access_Denied_Exception', 'WPDevFramework\Core\Access\Exceptions\Access_Denied_Exception' );
} else {
	/**
	 * Fallback Access Denied Exception if access-manager runtime is omitted.
	 */
	class Access_Denied_Exception extends \RuntimeException {

		/**
		 * Access identifier.
		 *
		 * @var string
		 */
		protected $access_id;

		/**
		 * Context payload.
		 *
		 * @var array
		 */
		protected $context;

		/**
		 * Constructor.
		 *
		 * @param string          $message   Error message.
		 * @param int             $code      Error code.
		 * @param \Throwable|null $previous  Previous exception.
		 * @param string          $access_id Access ID that failed.
		 * @param array           $context   Context array.
		 */
		public function __construct( $message = '', $code = 0, $previous = null, $access_id = '', array $context = array() ) {
			parent::__construct( $message, (int) $code, $previous );
			$this->access_id = $access_id;
			$this->context   = $context;
		}

		/**
		 * Get the access ID.
		 *
		 * @return string
		 */
		public function get_access_id() {
			return $this->access_id;
		}

		/**
		 * Get the context.
		 *
		 * @return array
		 */
		public function get_context() {
			return $this->context;
		}
	}
}
