<?php
/**
 * Number field view wrapper.
 *
 * @since 2.5.0
 * @package WPDevFramework\Modules\FieldBuilder
 */
defined('ABSPATH') || exit;

wpdev_get_template('admin-pages/fields/field-text', array(
    'field' => $field,
));
