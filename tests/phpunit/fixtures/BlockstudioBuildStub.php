<?php
/**
 * Test-only stub for Blockstudio\Build when vendor/ is not installed.
 */
declare(strict_types=1);

namespace Blockstudio;

final class Build
{
    /** @var array<string, mixed>|null */
    public static ?array $lastInitArgs = null;

    public static function reset(): void
    {
        self::$lastInitArgs = null;
    }

    /**
     * @param array<string, mixed> $args
     */
    public static function init(array $args): void
    {
        self::$lastInitArgs = $args;
    }
}