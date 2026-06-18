<?php
/**
 * Form render pipeline and modal forms
 *
 * @package WPDevFramework\Modules\FormBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\FormBuilder\Component_Registry;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/src/class-component-registry.php';
require_once __DIR__ . '/src/form/class-form.php';
require_once __DIR__ . '/src/functions/form.php';
require_once __DIR__ . '/src/functions/modal.php';

Module_Loader::register(
	'form-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'field-builder' ),
	)
);

Component_Registry::init();
