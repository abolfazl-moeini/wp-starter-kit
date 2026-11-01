<?php
/**
 * Migration Result Value Object.
 *
 * @package WPDevFramework\Database\Migration
 * @since   2.14.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Database\Migration;

defined( 'ABSPATH' ) || exit;

/**
 * Class Migration_Result
 *
 * Immutable result representation of a migration step or execution.
 */
final class Migration_Result {

	public const STATUS_COMPLETED   = 'completed';
	public const STATUS_IN_PROGRESS = 'in_progress';
	public const STATUS_FAILED      = 'failed';
	public const STATUS_SKIPPED     = 'skipped';

	private bool $success;
	private bool $complete;
	private int $processed_count;
	private string $status;
	private string $message;
	private string $error;
	private array $extra;

	public function __construct(
		bool $success,
		bool $complete,
		int $processed_count = 0,
		string $status = self::STATUS_COMPLETED,
		string $message = '',
		string $error = '',
		array $extra = []
	) {
		$this->success         = $success;
		$this->complete        = $complete;
		$this->processed_count = $processed_count;
		$this->status          = $status;
		$this->message         = $message;
		$this->error           = $error;
		$this->extra           = $extra;
	}

	public static function success( int $processed_count = 0, string $message = '', array $extra = [] ): self {
		return new self( true, true, $processed_count, self::STATUS_COMPLETED, $message, '', $extra );
	}

	public static function incomplete( int $processed_count = 0, string $message = '', array $extra = [] ): self {
		return new self( true, false, $processed_count, self::STATUS_IN_PROGRESS, $message, '', $extra );
	}

	public static function failure( string $error, array $extra = [] ): self {
		return new self( false, false, 0, self::STATUS_FAILED, '', $error, $extra );
	}

	public static function skipped( string $reason = '' ): self {
		return new self( true, true, 0, self::STATUS_SKIPPED, $reason, '', [] );
	}

	public function is_success(): bool {
		return $this->success;
	}

	public function is_complete(): bool {
		return $this->complete;
	}

	public function get_processed_count(): int {
		return $this->processed_count;
	}

	public function get_status(): string {
		return $this->status;
	}

	public function get_message(): string {
		return $this->message;
	}

	public function get_error(): string {
		return $this->error;
	}

	public function get_extra(): array {
		return $this->extra;
	}
}
