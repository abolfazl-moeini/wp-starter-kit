/**
 * Build-time injected globals for the dependencies bundle.
 * These are provided via esbuild --define from the build system
 * reading project.config.json (hookPrefix, etc.).
 *
 * They exist only in the final bundled IIFE, not at source typecheck time.
 * Declaring them here lets `tsc --noEmit` (Phase 12) pass on the .ts source
 * while the real values are substituted at esbuild time.
 */
declare const __WPSK_HOOK_PREFIX__: string;
declare const __WPSK_LOCALIZE_VAR__: string;
