<?php
/**
 * Limitation manager.
 *
 * This class centralizes the limitation modules.
 *
 * @package WPDev
 * @subpackage Limitations
 * @since 2.0.0
 */

namespace WPDevFramework\Objects;

use WPDevFramework\Objects\Limitations;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Limitation manager.
 *
 * This class centralizes the limitation modules.
 *
 * @since 2.0.0
 */
class Limitations {

	/**
	 * Caches early limitation queries to prevent
	 * to many database hits.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	static $limitations_cache = array();

	/**
	 * Version of the limitation schema.
	 *
	 * @since 2.0.0
	 * @var integer
	 */
	protected $version = 2;

	/**
	 * Limitation modules.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	protected $modules = array();

	/**
	 * The current limitation being merged in merge_recursive.
	 *
	 * @since 2.1.0
	 * @var string
	 */
	protected $current_merge_id = '';

	/**
	 * Constructs the limitation class with module data.
	 *
	 * @since 2.0.0
	 *
	 * @param array $modules_data Array of modules data.
	 */
	public function __construct($modules_data = array()) {

		$this->build_modules($modules_data);

	} // end __construct;

	/**
	 * Returns the module via magic getter.
	 *
	 * @since 2.0.0
	 *
	 * @param string $name The module name.
	 * @return \WPDevFramework\Limitations\Limit
	 */
	public function __get($name) {

		$module = wpdev_get_isset($this->modules, $name, false);

		if ($module === false) {

			$repo = self::repository();

			$class_name = wpdev_get_isset($repo, $name, false);

			if (class_exists($class_name)) {

				$module = new $class_name(array());

				$this->modules[$name] = $module;

				return $module;

			} // end if;

		} // end if;

		return $module;

	} // end __get;

	/**
	 * Prepare to serialization.
	 *
	 * @see requires php 7.3
	 * @since 2.0.0
	 * @return array
	 */
	public function __serialize() { // phpcs:ignore

		return $this->to_array();

	} // end __serialize;

	/**
	 * Handles un-serialization.
	 *
	 * @since 2.0.0
	 *
	 * @see requires php 7.3
	 * @param array $modules_data Array of modules data.
	 * @return void
	 */
	public function __unserialize($modules_data) { // phpcs:ignore

		$this->build_modules($modules_data);

	} // end __unserialize;

	/**
	 * Builds the module list based on the module data.
	 *
	 * @since 2.0.0
	 *
	 * @param array $modules_data Array of modules data.
	 * @return self
	 */
	public function build_modules($modules_data) {

		foreach ($modules_data as $type => $data) {

			$module = self::build($data, $type);

			if ($module) {

				$this->modules[$type] = $module;

			} // end if;

		} // end foreach;

		return $this;

	} // end build_modules;
 /**
  * Build a module, based on the data.
  *
  * @since 2.0.0
  *
  * @param string|array $data The module data.
  * @param string       $module_name The module_name.
  * @return false|\WPDevFramework\Limitations\Limit
  */
 static public function build($data, $module_name) {

		$class = wpdev_get_isset(self::repository(), $module_name);

		if (class_exists($class)) {

			if (is_string($data)) {

				$data = json_decode($data, true);

			}

			return new $class($data);

		} // end if;

		return false;

	} // end build;

	/**
	 * Checks if a limitation model exists in this limitations.
	 *
	 * @since 2.0.0
	 *
	 * @param string $module The module name.
	 * @return bool
	 */
	public function exists($module) {

		return wpdev_get_isset($this->modules, $module, false);

	} // end exists;

	/**
	 * Checks if we have any limitation modules setup at all.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function has_limitations() {

		$has_limitations = false;

		foreach ($this->modules as $module) {

			if ($module->is_enabled()) {

				return true;

			} // end if;

		} // end foreach;

		return $has_limitations;

	} // end has_limitations;

	/**
	 * Checks if a particular module is enabled.
	 *
	 * @since 2.0.0
	 *
	 * @param string $module_name Module name.
	 * @return boolean
	 */
	public function is_module_enabled($module_name) {

		$module = $this->{$module_name};

		return $module ? $module->is_enabled() : false;

	}  // end is_module_enabled;

	/**
	 * Merges limitations from other entities.
	 *
	 * This is what we use to combine different limitations from
	 * different sources. For example: we override the limitations
	 * of site with restrictions coming from the membership,
	 * products, etc.
	 *
	 * @since 2.0.0
	 *
	 * @param array|bool $override    A limitation array or a boolean to override the values from first to last limitation.
	 * @param array      ...$limitations Limitation arrays.
	 * @return self
	 */
	public function merge($override = false, ...$limitations) {

		if (!is_bool($override)) {

			$limitations[] = $override;

			$override = false;

		} // end if;

		$results = $this->to_array();

		foreach ($limitations as $limitation) {

			if (is_a($limitation, \WPDevFramework\Objects\Limitations::class)) { // @phpstan-ignore-line

				$limitation = $limitation->to_array();

			} // end if;

			if (!is_array($limitation)) {

				continue;

			} // end if;

			$this->merge_recursive($results, $limitation, !$override);

		} // end foreach;

		return new self($results);

	} // end merge;

	/**
	 * Merges a limitation array
	 *
	 * @since 2.0.20
	 *
	 * @param array $array1 The arrays original.
	 * @param array $array2 The array to be merged in.
	 * @param bool  $should_sum If we should add up numeric values instead of replacing the original.
	 * @return void
	 */
	protected function merge_recursive(array &$array1, array &$array2, $should_sum = true) {

		$current_id = $this->current_merge_id;

		$force_enabled_list = array(
			'plugins',
			'themes',
		);

		$force_enabled = in_array($current_id, $force_enabled_list, true);

		if ($force_enabled && (!wpdev_get_isset($array1, 'enabled', true) || !wpdev_get_isset($array2, 'enabled', true))) {

			$array1['enabled'] = true;
			$array2['enabled'] = true;

		} // end if;

		if (!wpdev_get_isset($array1, 'enabled', true)) {

			$array1 = array(
				'enabled' => false,
			);

		} // end if;

		if (!wpdev_get_isset($array2, 'enabled', true) && $should_sum) {

			return;

		} // end if;

		foreach ($array2 as $key => &$value) {
			/**
			 * Here we need to work with arrays and some limits
			 * as themes and plugins have stdClass values.
			 */
			$value = is_object($value) ? get_object_vars($value) : $value;

			if (isset($array1[$key])) {

				$array1[$key] = is_object($array1[$key]) ? get_object_vars($array1[$key]) : $array1[$key];

			} // end if;

			if (is_array($value) && isset($array1[$key]) && is_array($array1[$key])) {

				$array1_id = wpdev_get_isset($array1[$key], 'id', $current_id);

				$this->current_merge_id = wpdev_get_isset($value, 'id', $array1_id);

				$this->merge_recursive($array1[$key], $value, $should_sum);

				$this->current_merge_id = $current_id;

			} else {

				$original_value = wpdev_get_isset($array1, $key);

				// If the value is 0 or '' it can be a unlimited value
				$is_unlimited = (is_numeric($value) || $value === '') && (int) $value === 0;

				if ($should_sum && ($original_value === '' || $original_value === 0)) {
					/**
					 *  We use values 0 or '' as unlimited in our limits
					 */
					continue;

				} elseif (isset($array1[$key]) && is_numeric($array1[$key]) && is_numeric($value) && $should_sum && !$is_unlimited) {

					$array1[$key] = ((int) $array1[$key]) + $value;

				} elseif ($key === 'visibility' && isset($array1[$key]) && $should_sum) {

					$key_priority = array(
						'hidden'  => 0,
						'visible' => 1,
					);

					$array1[$key] = $key_priority[$value] > $key_priority[$array1[$key]] ? $value : $array1[$key];

				} elseif ($key === 'behavior' && isset($array1[$key]) && $should_sum) {

					$key_priority_list = array(
						'plugins' => array(
							'default'               => 10,
							'force_inactive_locked' => 20,
							'force_inactive'        => 30,
							'force_active_locked'   => 40,
							'force_active'          => 50,
						),
						'site'    => array(
							'not_available' => 10,
							'available'     => 20,
							'pre_selected'  => 30,
						),
						'themes'  => array(
							'not_available' => 10,
							'available'     => 20,
							'force_active'  => 30,
						),
					);

					$key_priority = apply_filters("wpdev_limitation_{$current_id}_priority", $key_priority_list[$current_id]);

					$array1[$key] = $key_priority[$value] > $key_priority[$array1[$key]] ? $value : $array1[$key];

				} else {

					// Avoid change true values
					$array1[$key] = $original_value !== true || !$should_sum ? $value : true;

					$array1[$key] = $original_value !== true || !$should_sum ? $value : true;

				} // end if;

			} // end if;

		} // end foreach;

	} // end merge_recursive;
	/**
	 * Converts the limitations list to an array.
	 *
	 * @since 2.0.0
	 */
	public function to_array(): array {

		return array_map(fn($module) => method_exists($module, 'to_array') ? $module->to_array() : (array) $module, $this->modules);

	} // end to_array;

	/**
	 * Static method to return limitations in very early stages of the WordPress lifecycle.
	 *
	 * @since 2.0.0
	 *
	 * @param string $slug Slug of the model.
	 * @param int    $id ID of the model.
	 * @return \WPDevFramework\Objects\Limitations
	 */
	public static function early_get_limitations($slug, $id) {

		$wpdev_prefix = 'wpdev_';

		/*
		 * Reset the slug and prefixes
		 * for the native tables of blogs.
		 */
		if ($slug === 'site') {

			$slug = 'blog';

			$wpdev_prefix = '';

		} // end if;

		$cache = static::$limitations_cache;

		$key = sprintf('%s-%s', $slug, $id);

		if (isset($cache[$key])) {

			return $cache[$key];

		} // end if;

		global $wpdb;

		$limitations = array();

		$table_name = wpdev_get_db_table( $slug . 'meta' );

		$sql = $wpdb->prepare(
			"SELECT meta_value FROM {$table_name} WHERE meta_key = 'wpdev_limitations' AND {$wpdev_prefix}{$slug}_id = %d LIMIT 1",
			$id
		); // phpcs:ignore

		$results = $wpdb->get_var($sql); // phpcs:ignore

		if (!empty($results)) {

			$limitations = unserialize($results);

		} // end if;

		/*
		 * Caches the results.
		 */
		static::$limitations_cache[$key] = $limitations;

		return $limitations;

	} // end early_get_limitations;

	/**
	 * Delete limitations.
	 *
	 * @since 2.0.0
	 *
	 * @param string $slug The slug of the model.
	 * @param int    $id The id of the meta id.
	 * @return void
	 */
	public static function remove_limitations($slug, $id) {

		global $wpdb;

		$wpdev_prefix = 'wpdev_';

		/*
		 * Site apis are already available,
		 * so no need to use low-level sql calls.
		 */
		if ($slug === 'site') {

			$wpdev_prefix = '';

			$slug = 'blog';

		} // end if;

		$table_name = "{$wpdb->base_prefix}{$wpdev_prefix}{$slug}meta";

		$sql = $wpdb->prepare("DELETE FROM {$table_name} WHERE meta_key = 'wpdev_limitations' AND  {$wpdev_prefix}{$slug}_id = %d LIMIT 1", $id); // phpcs:ignore

		$wpdb->get_var($sql); // phpcs:ignore

	} // end remove_limitations;

	/**
	 * Returns an empty permission set, with modules.
	 *
	 * @since 2.0.0
	 * @return self
	 */
	static public function get_empty() {

		$limitations = new self();

		foreach (array_keys(self::repository()) as $module_name) {

			$limitations->{$module_name};

		} // end foreach;

		return $limitations;

	} // end get_empty;

	/**
	 * Repository of the limitation modules.
	 *
	 * @see wpdev_register_limit_module()
	 *
	 * @since 2.0.0
	 * @return array
	 */
	static public function repository() {

		$classes = array(
			'post_types'         => \WPDevFramework\Limitations\Limit_Post_Types::class,
			'plugins'            => \WPDevFramework\Limitations\Limit_Plugins::class,
			'sites'              => \WPDevFramework\Limitations\Limit_Sites::class,
			'themes'             => \WPDevFramework\Limitations\Limit_Themes::class,
			'visits'             => \WPDevFramework\Limitations\Limit_Visits::class,
			'disk_space'         => \WPDevFramework\Limitations\Limit_Disk_Space::class,
			'users'              => \WPDevFramework\Limitations\Limit_Users::class,
			'site_templates'     => \WPDevFramework\Limitations\Limit_Site_Templates::class,
			'domain_mapping'     => \WPDevFramework\Limitations\Limit_Domain_Mapping::class,
			'customer_user_role' => \WPDevFramework\Limitations\Limit_Customer_User_Role::class,
		);

		return apply_filters('wpdev_limit_classes', $classes);

	} // end repository;

} // end class Limitations;
