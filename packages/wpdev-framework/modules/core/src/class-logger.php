<?php
/**
 * WPDev Logger
 *
 * Log string messages to a file with a timestamp. Useful for debugging.
 *
 * @package WPDev
 * @subpackage Logger
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

use WPDevFramework\Dependencies\Psr\Log\AbstractLogger;
use WPDevFramework\Dependencies\Psr\Log\LogLevel;

/**
 * WPDev Logger
 *
 * @since 2.0.0
 */
class Logger extends AbstractLogger {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Holds the log file path.
	 *
	 * @since 2.1
	 * @var string
	 */
	protected $log_file = '';

	/**
	 * Returns the logs folder
	 *
	 * @return string
	 */
	public static function get_logs_folder() {

		return wpdev_maybe_create_folder('wpdev-logs');

	} // end get_logs_folder;

	/**
	 * Add a log entry to chosen file.
	 *
	 * @param string           $handle Name of the log file to write to.
	 * @param string|\WP_Error $message Log message to write.
	 * @param string           $log_level Log level to write.
	 */
	public static function add($handle, $message, $log_level = LogLevel::INFO) {

		$allowed_log_level = wpdev_get_setting('error_logging_level', 'default');

		if ($allowed_log_level === 'disabled') {

			return;

		} // end if;

		if ($allowed_log_level === 'default') {
			/**
			 * Get from default php reporting level
			 *
			 * Here we are converting the PHP error reporting level to the PSR-3 log level.
			 */
			$reporting_level = error_reporting();

			$psr_log_levels = array(
				E_ERROR             => LogLevel::ERROR,
				E_WARNING           => LogLevel::WARNING,
				E_PARSE             => LogLevel::ERROR,
				E_NOTICE            => LogLevel::NOTICE,
				E_CORE_ERROR        => LogLevel::CRITICAL,
				E_CORE_WARNING      => LogLevel::WARNING,
				E_COMPILE_ERROR     => LogLevel::ALERT,
				E_COMPILE_WARNING   => LogLevel::WARNING,
				E_USER_ERROR        => LogLevel::ERROR,
				E_USER_WARNING      => LogLevel::WARNING,
				E_USER_NOTICE       => LogLevel::NOTICE,
				E_STRICT            => LogLevel::DEBUG,
				E_RECOVERABLE_ERROR => LogLevel::ERROR,
				E_DEPRECATED        => LogLevel::NOTICE,
				E_USER_DEPRECATED   => LogLevel::NOTICE,
			);

			$current_log_levels = array();

			foreach ($psr_log_levels as $php_level => $psr_level) {

				if ($reporting_level & $php_level) {

					$current_log_levels[] = $psr_level;

				} // end if;

			} // end foreach;

			if (!in_array($log_level, $current_log_levels, true) && ($reporting_level & ~E_ALL)) {

				return;

			} // end if;

		} elseif ($allowed_log_level === 'errors' && $log_level !== LogLevel::ERROR && $log_level !== LogLevel::CRITICAL) {

			return;

		} // end if;

		$instance = self::get_instance();

		$instance->set_log_file(self::get_logs_folder() . "/$handle.log");

		if (is_wp_error($message)) {

			$message = $message->get_error_message();

		} // end if;

		$instance->log($log_level, $message);

		do_action('wpdev_log_add', $handle, $message);

	} // end add;

	/**
	 * Get the log contents
	 *
	 * @since  1.6.0
	 *
	 * @param  string  $handle File name to read.
	 * @param  integer $lines Number of lines to retrieve, defaults to 10.
	 * @return array
	 */
	public static function read_lines($handle, $lines = 10) {

		$file = self::get_logs_folder() . "/$handle.log";

		if (!file_exists($file)) {

			return array();

		} // end if;

		// read file
		$content = file_get_contents($file);

		// split into lines
		$arr_content = explode(PHP_EOL, $content);

		// remove last line if empty
		if (empty(end($arr_content))) {

			array_pop($arr_content);

		} // end if;

		// return last lines
		return array_slice($arr_content, -$lines);

	} // end read_lines;

	/**
	 * Clear entries from chosen file.
	 *
	 * @param mixed $handle Name of the log file to clear.
	 */
	public static function clear($handle) {

		$file = self::get_logs_folder() . "/$handle.log";

		// Delete the file if it exists.
		if (file_exists($file)) {

			@unlink($file); // phpcs:ignore

		} // end if;

		do_action('wpdev_log_clear', $handle);

	} // end clear;

	/**
	 * Takes a callable as a parameter and logs how much time it took to execute it.
	 *
	 * @since 2.0.0
	 *
	 * @param string   $handle Name of the log file to write to.
	 * @param string   $message  Log message to write.
	 * @param callable $callback Function to track the execution time.
	 * @return array
	 */
	public static function track_time($handle, $message, $callback) {

		$start = microtime(true);

		$return = call_user_func($callback);

		$time_elapsed = microtime(true) - $start;

		// translators: the placeholder %s will be replaced by the time in seconds (float).
		$message .= ' - ' . sprintf(__('This action took %s seconds.', 'wpdev'), $time_elapsed);

		self::add($handle, $message);

		return $return;

	} // end track_time;

	/**
	 * Set the log file path.
	 *
	 * @since 2.1
	 *
	 * @param string $log_file The log file path.
	 */
	public function set_log_file($log_file) {

		$this->log_file = $log_file;

	} // end set_log_file;

	/**
	 * Logs with an arbitrary level.
	 *
	 * @since 2.1
	 *
	 * @param mixed   $level   The log level.
	 * @param string  $message The message to log.
	 * @param mixed[] $context The context.
	 *
	 * @return void
	 */
	public function log($level, $message, array $context = array()) {

		if (!$this->is_valid_log_level($level) ) {

			return;

		} // end if;

		$formatted_message = $this->format_message($level, $message, $context);

		$this->write_to_file($formatted_message);

	} // end log;

	/**
	 * Check if the log level is valid.
	 *
	 * @since 2.1
	 *
	 * @param string $level The log level to check.
	 */
	protected function is_valid_log_level($level): bool {

		$valid_log_levels = array(
			LogLevel::EMERGENCY,
			LogLevel::ALERT,
			LogLevel::CRITICAL,
			LogLevel::ERROR,
			LogLevel::WARNING,
			LogLevel::NOTICE,
			LogLevel::INFO,
			LogLevel::DEBUG,
		);

		return in_array($level, $valid_log_levels, true);

	} // end is_valid_log_level;

	/**
	 * Format the message to be logged.
	 *
	 * @since 2.1
	 *
	 * @param string $level The log level.
	 * @param string $message The message to log.
	 * @param array  $context The context of the message.
	 * @return string
	 */
	protected function format_message($level, $message, $context = array()) {

		$date = new \DateTime();

		$formatted_message = sprintf(
			'[%s] [%s] %s' . PHP_EOL,
			$date->format('Y-m-d H:i:s'),
			strtoupper($level),
			$message
		);

		return $formatted_message;

	} // end format_message;

	/**
	 * Write the message to the log file.
	 *
	 * @since 2.1
	 *
	 * @param string $message The message to log.
	 * @return void
	 */
	protected function write_to_file($message) {

		if (!file_exists($this->log_file)) {

			touch($this->log_file);

		} // end if;

		if (!is_writable($this->log_file)) {

			return;

		} // end if;

		file_put_contents($this->log_file, $message, FILE_APPEND | LOCK_EX);

	} // end write_to_file;

} // end class Logger;
