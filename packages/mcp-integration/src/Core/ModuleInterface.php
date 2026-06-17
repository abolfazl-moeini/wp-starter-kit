<?php
declare(strict_types=1);

namespace WPDev\MCP\Core;

/**
 * Contract every ability-module implements.
 *
 * A module groups related abilities and registers them with the
 * AbilityRegistry inside its boot() method. boot() must NOT call
 * wp_register_ability() directly — it only adds AbilityInterface
 * instances to the registry, which performs the actual WordPress
 * registration on the wp_abilities_api_init hook.
 */
interface ModuleInterface
{
    /**
     * Register this module's abilities with the registry.
     * Called once by ModuleLoader::boot_all().
     */
    public function boot(): void;

    /**
     * Unique, stable slug used as the lookup key in ModuleLoader.
     */
    public function get_slug(): string;
}