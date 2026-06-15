<?php
namespace WPSK\Core;

/**
 * Placeholder for the wp-starter-kit Plugin bootstrap.
 *
 * This file exists only to satisfy the PSR-4 autoload mapping
 * (`WPSK\\` => `src/`) declared in `composer.json`. The full Plugin
 * bootstrap — registration, service container, hook wiring — lands
 * in a follow-up task. Keeping the file minimal avoids drifting from
 * the upcoming design before that task starts.
 */
class Plugin
{
    /**
     * Singleton-style accessor for callers that need a handle to the
     * plugin instance before the full bootstrap is in place. Returns
     * null until a real implementation lands.
     */
    public static function instance(): ?self
    {
        return null;
    }
}
