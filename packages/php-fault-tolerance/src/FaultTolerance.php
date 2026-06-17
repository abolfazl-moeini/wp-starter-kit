<?php
declare(strict_types=1);

namespace WPDev\FaultTolerance;

/**
 * Static facade for the fault-tolerance package.
 *
 * @see CircuitBreaker
 * @see HttpClient
 * @see Resilient
 */
final class FaultTolerance {

	/**
	 * @param string $key
	 * @param int    $threshold
	 * @param int    $cooldown
	 */
	public static function circuitBreaker( string $key, int $threshold = 5, int $cooldown = 60 ): CircuitBreaker {
		return new CircuitBreaker( $key, $threshold, $cooldown );
	}

	/**
	 * @param list<array{url:string,args?:array<string,mixed>}> $requests
	 * @return list<array<string,mixed>|\WP_Error>
	 */
	public static function httpPool( array $requests ): array {
		return HttpClient::pool( $requests );
	}

	/**
	 * @param list<array{url:string,args?:array<string,mixed>}> $requests
	 * @return list<array<string,mixed>|\WP_Error>
	 */
	public static function httpBatch( array $requests ): array {
		return HttpClient::batch( $requests );
	}

	/**
	 * @param callable():mixed $fn
	 * @param int              $retries
	 * @param int              $delay
	 * @param mixed            $fallback
	 * @return mixed
	 */
	public static function resilient( callable $fn, int $retries = 3, int $delay = 100, mixed $fallback = null ): mixed {
		return Resilient::resilient(
			$fn,
			[
				'retries'  => $retries,
				'delayMs'  => $delay,
				'fallback' => $fallback,
			]
		);
	}
}