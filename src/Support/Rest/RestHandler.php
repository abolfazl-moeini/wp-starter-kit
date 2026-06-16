<?php
/**
 * Phase 23.A2b compatibility bridge shim.
 *
 * The implementation moved to the wpsk/framework Composer
 * package at packages/framework/src/. This thin shim keeps the
 * legacy src/Core / src/Support path loadable until every
 * reference in the kit and its consumers has been migrated.
 *
 * @deprecated Will be removed once no $root/src references remain.
 */
require_once __DIR__ . '/../../../packages/framework/src/Support/Rest/RestHandler.php';
