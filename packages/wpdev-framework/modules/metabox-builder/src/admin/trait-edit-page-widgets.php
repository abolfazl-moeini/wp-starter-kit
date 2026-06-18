<?php
/**
 * Shared edit-page metabox widget API.
 *
 * @package WPDevFramework\Admin_Pages
 * @since   2.5.0
 */

namespace WPDevFramework\Admin_Pages;

defined( 'ABSPATH' ) || exit;

/**
 * Widget helpers used by Edit_Admin_Page and Post_Edit_Admin_Page.
 */
trait Edit_Page_Widgets {

	/**
	 * Mirror a widget definition into Metabox_Registry when available (K6-01).
	 *
	 * @since 2.6.0
	 *
	 * @param string               $id   Widget id.
	 * @param string               $type Widget type slug.
	 * @param array<string, mixed> $atts Widget attributes.
	 * @return void
	 */
	protected function register_metabox_in_registry( $id, $type, array $atts, $callback = null ) {

		if ( ! class_exists( 'WPDev\\Modules\\MetaboxBuilder\\Metabox_Registry' ) ) {
			return;
		}

		$page_id = method_exists( $this, 'get_id' ) ? $this->get_id() : '';

		if ( '' === $page_id ) {
			return;
		}

		$config = array_merge(
			$atts,
			array(
				'type' => $type,
			)
		);

		if ( is_callable( $callback ) ) {
			$config['callback'] = $callback;
		}

		\WPDevFramework\Modules\MetaboxBuilder\Metabox_Registry::register(
			$page_id,
			$id,
			$config
		);

	} // end register_metabox_in_registry;

	/**
	 * WordPress add_meta_box callback that renders via Metabox_Registry (single authority).
	 *
	 * @since 2.6.0
	 *
	 * @param string $metabox_id Metabox id registered in the registry.
	 * @return callable
	 */
	protected function metabox_wp_render_callback( $metabox_id ) {

		$page_id = method_exists( $this, 'get_id' ) ? $this->get_id() : '';

		return static function () use ( $page_id, $metabox_id ) {

			if ( ! class_exists( 'WPDev\\Modules\\MetaboxBuilder\\Metabox_Registry' ) || '' === $page_id ) {
				return;
			}

			\WPDevFramework\Modules\MetaboxBuilder\Metabox_Registry::render( $page_id, $metabox_id );

		};

	} // end metabox_wp_render_callback;

	/**
	 * Resolve a metabox-builder view slug.
	 *
	 * @since 2.5.0
	 *
	 * @param string $slug View basename (e.g. widget-list-table).
	 * @return string
	 */
	protected function metabox_view( $slug ) {

		return 'metabox/' . ltrim( (string) $slug, '/' );

	} // end metabox_view;

	/**
	 * Adds a basic widget with info (and fields) to be shown.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Unique ID for the widget.
	 * @param array  $atts Widget attributes.
	 * @return void
	 */
	protected function add_info_widget( $id, $atts = array() ) {

		$created_key = 'date_created';

		if ( method_exists( $this->get_object(), 'get_date_registered' ) ) {
			$created_key = 'date_registered';
		}

		$created_value = call_user_func( array( $this->get_object(), "get_$created_key" ) );

		$atts['fields'][ $created_key ] = array(
			'title'         => __( 'Created at', 'wpdev' ),
			'type'          => 'text-display',
			'date'          => true,
			'display_value' => $this->edit ? $created_value : false,
			'value'         => $created_value,
			'placeholder'   => '2020-04-04 12:00:00',
			'html_attr'     => array(
				'wpdev-datepicker' => 'true',
				'data-format'      => 'Y-m-d H:i:S',
				'data-allow-time'  => 'true',
			),
		);

		$show_modified = wpdev_get_isset( $atts, 'modified', true );

		if ( $this->edit && true === $show_modified ) {
			$atts['fields']['date_modified'] = array(
				'title'         => __( 'Last Modified at', 'wpdev' ),
				'type'          => 'text-display',
				'date'          => true,
				'display_value' => $this->edit ? $this->get_object()->get_date_modified() : __( 'No date', 'wpdev' ),
				'value'         => $this->get_object()->get_date_modified(),
				'placeholder'   => '2020-04-04 12:00:00',
				'html_attr'     => array(
					'wpdev-datepicker' => 'true',
					'data-format'      => 'Y-m-d H:i:S',
					'data-allow-time'  => 'true',
				),
			);
		}

		$this->register_metabox_in_registry( $id, 'info', $atts );

		$this->add_fields_widget( $id, $atts );

	} // end add_info_widget;

	/**
	 * Adds a basic widget to display list tables.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Unique ID for the widget.
	 * @param array  $atts Widget attributes.
	 * @return void
	 */
	protected function add_list_table_widget( $id, $atts = array() ) {

		$atts = wp_parse_args(
			$atts,
			array(
				'widget_id'    => $id,
				'before'       => '',
				'after'        => '',
				'title'        => __( 'List Table', 'wpdev' ),
				'position'     => 'advanced',
				'screen'       => get_current_screen(),
				'page'         => $this,
				'labels'       => method_exists( $this, 'get_labels' ) ? $this->get_labels() : array(),
				'object'       => $this->get_object(),
				'edit'         => true,
				'table'        => false,
				'query_filter' => false,
			)
		);

		$atts['table']->set_context( 'widget' );

		$atts['table']->set_ajax_table_id( $atts['table']->get_table_id() . '__' . sanitize_key( $id ) );

		$table_name = $atts['table']->get_table_id();

		if ( is_callable( $atts['query_filter'] ) ) {
			add_filter( "wpdev_{$table_name}_get_items", $atts['query_filter'] );
		}

		$list_table_view = $this->metabox_view( 'widget-list-table' );

		$render_callback = static function () use ( $atts, $list_table_view ) {
			wp_enqueue_script( 'wpdev-ajax-list-table' );
			wpdev_get_template( $list_table_view, $atts, 'base/edit/widget-list-table' );
		};

		$this->register_metabox_in_registry( $id, 'list-table', $atts, $render_callback );

		add_meta_box(
			"wpdev-list-table-{$id}",
			$atts['title'],
			$this->metabox_wp_render_callback( $id ),
			$atts['screen']->id,
			$atts['position'],
			'default'
		);

	} // end add_list_table_widget;

	/**
	 * Adds field widgets to edit pages.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Widget ID.
	 * @param array  $atts Form attributes.
	 * @return void
	 */
	protected function add_fields_widget( $id, $atts = array() ) {

		$atts = wp_parse_args(
			$atts,
			array(
				'widget_id'             => $id,
				'before'                => '',
				'after'                 => '',
				'title'                 => __( 'Fields', 'wpdev' ),
				'position'              => 'side',
				'screen'                => get_current_screen(),
				'fields'                => array(),
				'html_attr'             => array(),
				'classes'               => '',
				'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
			)
		);

		$render_callback = function () use ( $atts ) {
			if ( wpdev_get_isset( $atts['html_attr'], 'data-wpdev-app' ) ) {
				$atts['fields']['loading'] = array(
					'type'              => 'note',
					'desc'              => sprintf( '<div class="wpdev-block wpdev-text-center wpdev-blinking-animation wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">%s</div>', __( 'Loading...', 'wpdev' ) ),
					'wrapper_html_attr' => array(
						'v-if' => 0,
					),
				);
			}

			$form = new \WPDevFramework\UI\Form(
				$atts['widget_id'],
				$atts['fields'],
				array(
					'views'                 => 'admin-pages/fields',
					'classes'               => 'wpdev-widget-list wpdev-striped wpdev-m-0 wpdev--mt-2 wpdev--mb-3 wpdev--mx-3 ' . $atts['classes'],
					'field_wrapper_classes' => $atts['field_wrapper_classes'],
					'html_attr'             => $atts['html_attr'],
					'before'                => $atts['before'],
					'after'                 => $atts['after'],
				)
			);

			$form->render();
		};

		$this->register_metabox_in_registry( $id, 'fields', $atts, $render_callback );

		add_meta_box(
			"wpdev-{$id}-widget",
			$atts['title'],
			$this->metabox_wp_render_callback( $id ),
			$atts['screen']->id,
			$atts['position'],
			'default'
		);

	} // end add_fields_widget;

	/**
	 * Adds tabbed field widgets to edit pages.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Widget ID.
	 * @param array  $atts Widget attributes.
	 * @return void
	 */
	protected function add_tabs_widget( $id, $atts = array() ) {

		$atts = wp_parse_args(
			$atts,
			array(
				'widget_id' => $id,
				'before'    => '',
				'after'     => '',
				'title'     => __( 'Tabs', 'wpdev' ),
				'position'  => 'advanced',
				'screen'    => get_current_screen(),
				'sections'  => array(),
				'html_attr' => array(),
			)
		);

		$current_section = wpdev_request( $id, current( array_keys( $atts['sections'] ) ) );

		$atts['html_attr']['data-wpdev-app'] = $id;

		$atts['html_attr']['data-state'] = array(
			'section'     => $current_section,
			'display_all' => false,
		);

		$tabs_view = $this->metabox_view( 'widget-tabs' );

		$render_callback = function () use ( $atts, $tabs_view ) {
				foreach ( $atts['sections'] as $section_id => &$section ) {
					$section = wp_parse_args(
						$section,
						array(
							'form'                  => '',
							'before'                => '',
							'after'                 => '',
							'v-show'                => '1',
							'fields'                => array(),
							'html_attr'             => array(),
							'state'                 => array(),
							'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
						)
					);

					$atts['html_attr']['data-state'] = array_merge( $atts['html_attr']['data-state'], $section['state'] );

					$section['html_attr'] = array(
						'v-cloak' => 1,
						'v-show'  => "(section == '{$section_id}' || display_all) && " . $section['v-show'],
					);

					$section['fields'] = array_merge(
						array(
							$section_id => array(
								'title'             => $section['title'],
								'desc'              => $section['desc'],
								'type'              => 'header',
								'wrapper_html_attr' => array(
									'v-show' => 'display_all',
								),
							),
						),
						$section['fields']
					);

					$section['form'] = new \WPDevFramework\UI\Form(
						$section_id,
						$section['fields'],
						array(
							'views'                 => 'admin-pages/fields',
							'classes'               => 'wpdev-widget-list wpdev-striped wpdev-m-0 wpdev-border-solid wpdev-border-gray-300 wpdev-border-0 wpdev-border-b',
							'field_wrapper_classes' => $section['field_wrapper_classes'],
							'html_attr'             => $section['html_attr'],
							'before'                => $section['before'],
							'after'                 => $section['after'],
						)
					);
				}

				wpdev_get_template(
					$tabs_view,
					array(
						'sections'  => $atts['sections'],
						'html_attr' => $atts['html_attr'],
						'before'    => $atts['before'],
						'after'     => $atts['after'],
					),
					'base/edit/widget-tabs'
				);
		};

		$this->register_metabox_in_registry( $id, 'tabs', $atts, $render_callback );

		add_meta_box(
			"wpdev-{$id}-widget",
			$atts['title'],
			$this->metabox_wp_render_callback( $id ),
			$atts['screen']->id,
			$atts['position'],
			'default'
		);

	} // end add_tabs_widget;

	/**
	 * Adds a generic widget to the admin page.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Widget ID.
	 * @param array  $atts Widget parameters.
	 * @return void
	 */
	protected function add_widget( $id, $atts = array() ) {

		$atts = wp_parse_args(
			$atts,
			array(
				'widget_id' => $id,
				'before'    => '',
				'after'     => '',
				'title'     => __( 'Fields', 'wpdev' ),
				'screen'    => get_current_screen(),
				'position'  => 'side',
				'display'   => '__return_empty_string',
			)
		);

		add_meta_box( "wpdev-{$id}-widget", $atts['title'], $atts['display'], $atts['screen']->id, $atts['position'], 'default' );

	} // end add_widget;

	/**
	 * Adds a basic save widget.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Widget ID.
	 * @param array  $atts Widget attributes.
	 * @return void
	 */
	protected function add_save_widget( $id, $atts = array() ) {

		$labels = $this->get_labels();

		$atts['title'] = __( 'Save', 'wpdev' );

		$atts['fields']['submit_save'] = array(
			'type'              => 'submit',
			'title'             => $labels['save_button_label'],
			'placeholder'       => $labels['save_button_label'],
			'value'             => 'save',
			'classes'           => 'button button-primary wpdev-w-full',
			'html_attr'         => array(),
			'wrapper_html_attr' => array(),
		);

		if ( isset( $atts['html_attr']['data-wpdev-app'] ) ) {
			$atts['fields']['submit_save']['wrapper_html_attr']['v-cloak'] = 1;
		}

		if ( $this->get_object() && $this->edit && $this->get_object()->is_locked() ) {
			$atts['fields']['submit_save']['title']                 = __( 'Locked', 'wpdev' );
			$atts['fields']['submit_save']['value']                 = 'none';
			$atts['fields']['submit_save']['html_attr']['disabled'] = 'disabled';
		}

		$this->add_fields_widget( 'save', $atts );

	} // end add_save_widget;

	/**
	 * Adds a basic delete widget.
	 *
	 * @since 2.0.0
	 *
	 * @param string $id   Widget ID.
	 * @param array  $atts Widget attributes.
	 * @return void
	 */
	protected function add_delete_widget( $id, $atts = array() ) {

		$labels = $this->get_labels();

		$atts_default = array(
			'title'    => __( 'Delete', 'wpdev' ),
			'position' => 'side-bottom',
		);
		$atts         = array_merge( $atts_default, $atts );

		$atts['fields']['note'] = array(
			'type' => 'note',
			'desc' => $labels['delete_description'],
		);

		$default_delete_field_settings = array(
			'type'            => 'link',
			'title'           => '',
			'display_value'   => $labels['delete_button_label'] ?? '',
			'placeholder'     => $labels['delete_button_label'] ?? '',
			'value'           => 'delete',
			'classes'         => 'button wubox wpdev-w-full wpdev-text-center',
			'wrapper_classes' => 'wpdev-bg-gray-100',
			'html_attr'       => array(
				'title' => $labels['delete_button_label'],
				'href'  => wpdev_get_form_url(
					'delete_modal',
					array(
						'id'    => $this->get_object()->get_id(),
						'model' => $this->get_object()->model,
					)
				),
			),
		);

		$custom_delete_field_settings = wpdev_get_isset( $atts['fields'], 'delete', array() );

		$atts['fields']['delete'] = array_merge( $default_delete_field_settings, $custom_delete_field_settings );

		$this->add_fields_widget( 'delete', $atts );

	} // end add_delete_widget;

} // end trait Edit_Page_Widgets;
