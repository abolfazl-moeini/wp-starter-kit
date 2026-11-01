<?php
/**
 * Reflection Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Parse supported PHPDoc tags from a raw docblock string.
 *
 * @since 2.8.4
 *
 * @param string|false $doc_comment Docblock from Reflection*.
 * @return array<string, array<int, array{type: string, description: string}>>
 */
if (!function_exists('wpdev_reflection_parse_docblock_tags')) {
function wpdev_reflection_parse_docblock_tags( $doc_comment ) {

	$tags = array();

	if ( ! is_string( $doc_comment ) || '' === trim( $doc_comment ) ) {
		return $tags;
	}

	foreach ( preg_split( '/\R/', $doc_comment ) as $line ) {

		$line = trim( $line );
		$line = preg_replace( '/^\/\*\*?|\*\/$/', '', $line );
		$line = ltrim( $line, "* \t" );

		if ( '' === $line || '@' !== $line[0] ) {
			continue;
		}

		if ( preg_match( '/^@param\s+(\S+)\s+\$\S+\s*(.*)$/i', $line, $matches ) ) {
			$tags['param'][] = array(
				'type'        => $matches[1],
				'description' => trim( $matches[2] ),
			);
			continue;
		}

		if ( preg_match( '/^@options\s+(.+)$/i', $line, $matches ) ) {
			$tags['options'][] = array(
				'type'        => '',
				'description' => trim( $matches[1] ),
			);
		}
	}

	return $tags;

}
}
 // end wpdev_reflection_parse_docblock_tags;

/**
 * Creates the REST API schema blueprint for an object based on setters.
 *
 * @since 2.0.12
 *
 * @param string $class_name The model/object class name.
 * @return array
 */
if (!function_exists('wpdev_reflection_parse_object_arguments')) {
function wpdev_reflection_parse_object_arguments($class_name) {

	$base_schema = wpdev_reflection_parse_arguments_from_setters($class_name, true);

	if (wpdev_are_code_comments_available() === false) {

		$arguments = array();

		foreach ( $base_schema as $column ) {
			$arguments[ $column['name'] ] = array(
				'description' => '',
				'type'        => '',
				'required'    => false,
			);
		}

		return $arguments;

	} // end if;

	$reflector = new \ReflectionClass($class_name);

	$arguments = array();

	/**
	 * Tries to fetch the database schema, if one exists.
	 */
	$db_schema = method_exists($class_name, 'get_schema') ? $class_name::get_schema() : false;

	foreach ($base_schema as $column) {

		try {

			$doc_comment = $reflector->getMethod("set_{$column['name']}")->getDocComment();
			$doc_block   = wpdev_reflection_parse_docblock_tags( $doc_comment );

		} catch (\Throwable $exception) {

			/**
			 * Something went wrong trying to parse the doc-blocks.
			 */
			continue;

		} // end try;

		$param = isset( $doc_block['param'] ) ? $doc_block['param'] : array();

		if (isset($param[0]) && is_array($param[0])) {

			$arguments[$column['name']] = array(
				'description' => (string) $param[0]['description'],
				'type'        => (string) $param[0]['type'],
				'required'    => false, // Actual value set later
			);

			if ($db_schema) {

				$db_column = wpdev_array_find_first_by($db_schema, 'name', $column['name']);

				if ($db_column && wpdev_get_isset($db_column, 'type') && preg_match('/^ENUM/', (string) $db_column['type'])) {

					preg_match_all("/'(.*?)'/", (string) $db_column['type'], $matches);

					if (isset($matches[1])) {

						$arguments[$column['name']]['enum'] = array_map('strtolower', $matches[1]);

					} // end if;

				} // end if;

			} // end if;

			$option = isset( $doc_block['options'] ) ? $doc_block['options'] : array();

			if (isset($option[0])) {

				$description = (string) $option[0]['description'];

				if (strpos($description, '\\WPDev\\') !== false) {

					$enum_options = new $description();

					$arguments[$column['name']]['enum'] = array_map('strtolower', array_keys(array_flip($enum_options->get_options())));

				} else {

					$arguments[$column['name']]['enum'] = explode(',', strtolower($description));

				} // end if;

			} // end if;

		} // end if;

	} // end foreach;

	return $arguments;

}
}
 // end wpdev_reflection_parse_object_arguments;

/**
 * Use php reflection to generate the documentation for the REST API.
 *
 * @since 2.0.11
 *
 * @param string  $class_name The class name of the endpoint object.
 * @param boolean $return_schema If we should return the schame or just a key => value.
 * @return array
 */
if (!function_exists('wpdev_reflection_parse_arguments_from_setters')) {
function wpdev_reflection_parse_arguments_from_setters($class_name, $return_schema = true) {

	$arguments = array();

	foreach (get_class_methods($class_name) as $setter_name) {

		if (preg_match('/^set_/', $setter_name)) {

			$argument = str_replace('set_', '', $setter_name);

			if ($return_schema) {

				$arguments[] = array(
					'name' => $argument,
					'type' => '',
				);

			} else {

				$arguments[] = $argument;

			} // end if;

		} // end if;

	} // end foreach;

	return $arguments;

}
}
 // end wpdev_reflection_parse_arguments_from_setters;