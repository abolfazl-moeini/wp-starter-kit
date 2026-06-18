<?php
/**
 * This is the template used for the Template Previewer.
 *
 * This template can be overridden by copying it to yourtheme/wpdev/signup/steps/step-template-previewer.php.
 *
 * HOWEVER, on occasion WPDev will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @author      WPDev
 * @package     WPDev/Views
 * @version     1.0.0
 */

if (!defined('ABSPATH')) {

	exit; // Exit if accessed directly

} // end if;

/**
 * Allow developers to run code before the template previewer is loaded.
 */
do_action('wpdev_template_previewer_before');

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
  <head>

  <meta name="viewport" content="width=device-width, initial-scale=1">
	<meta charset="<?php bloginfo('charset'); ?>">

  <?php wpdev_ignore_errors(function() {
		wp_head();
	}); ?>

  </head>

  <body>

    <div id="switcher">

      <div class="center">

          <div class="logo">

              <a title="<?php echo esc_attr( get_network_option( null, 'site_name' ) ); ?>" href="<?php echo esc_url( network_home_url() ); ?>" target="_blank">

                  <?php if ($use_custom_logo && $custom_logo) : ?>

						        <?php echo wp_get_attachment_image($custom_logo, 'full'); ?>

                  <?php else : ?>

                    <img src="<?php echo esc_url( $logo_url ); ?>" alt="<?php echo esc_attr( get_network_option( null, 'site_name' ) ); ?>">

                  <?php endif; ?>

              </a>

          </div>

          <ul id="theme_list_selector">

              <li id="theme_list">

                  <?php if ($selected_template) : ?>

                      <a id="template_selector" href="#">

						              <?php echo esc_html( $selected_template->get_title() ); ?>

                          <span style="float: right; margin-top:  -3px" class="dashicons dashicons-arrow-down-alt2"></span>

                      </a>

                  <?php else : ?>

                      <a id="template_selector" href="#">

					                <?php _e('Select template...', 'wpdev'); ?>

                          <span style="float: right; margin-top:  -3px" class="dashicons dashicons-arrow-down-alt2"></span>

                      </a>

                  <?php endif; ?>

                  <ul id="test1a">

                      <?php foreach ($templates as $template) : ?>

                          <li>

                              <a
                                href="<?php echo esc_url( $tp->get_preview_url( $template->get_id() ) ); ?>"
                                data-frame="<?php echo esc_url( $template->get_active_site_url() ); ?>"
                                data-title="<?php echo esc_attr( $template->get_title() ); ?>"
                                data-id="<?php echo esc_attr( (string) $template->get_id() ); ?>"
                              >

							                  <?php echo esc_html( $template->get_title() ); ?>

                              </a>

                              <img alt="" class="preview" src="<?php echo esc_url( $template->get_featured_image() ); ?>">

                          </li>

                      <?php endforeach; ?>

                  </ul>

              </li>

          </ul>

          <?php if ($display_responsive_controls) : ?>

              <div class="responsive">

                  <a href="#" class="desktop active dashicons-before dashicons-desktop" title="<?php esc_attr_e('View Desktop Version', 'wpdev'); ?>"></a>

                  <a href="#" class="tabletlandscape dashicons-before dashicons-tablet" title="<?php esc_attr_e('View Tablet Landscape (1024x768)', 'wpdev'); ?>"></a>

                  <a href="#" class="tabletportrait dashicons-before dashicons-tablet" title="<?php esc_attr_e('View Tablet Portrait (768x1024)', 'wpdev'); ?>"></a>

                  <a href="#" class="mobilelandscape dashicons-before dashicons-smartphone" title="<?php esc_attr_e('View Mobile Landscape (480x320)', 'wpdev'); ?>"></a>

                  <a href="#" class="mobileportrait dashicons-before dashicons-smartphone" title="<?php esc_attr_e('View Mobile Portrait (320x480)', 'wpdev'); ?>"></a>

              </div>

          <?php endif; ?>

      </div>

      <?php if (!isset($_GET['switching'])) : ?>

        <ul class="links">

            <?php if (wpdev_request('open')) : ?>

                <li class="select-template">

                    <a id="action-select" href="#"><?php echo esc_html( $button_text ); ?> &rarr;</a>

                </li>

            <?php else : ?>

                <li class="select-template">

                    <a id="action-select-link" href="<?php echo esc_url( wpdev_get_registration_url( '?template_selection=' . $selected_template->get_id() ) ); ?>"><?php echo esc_html( $button_text ); ?> &rarr;</a>

                </li>

            <?php endif; ?>

        </ul>

      <?php endif; ?>

      <input type="hidden" id="template-selector" value="<?php echo esc_attr($_GET['template-preview']); ?>" />

    </div>

    <?php if (!isset($_GET['switching'])) : ?>

      <div class="mobile-selector">

		      <?php if (wpdev_request('open')) : ?>

              <a id="action-select2" href="#"><?php echo esc_html( $button_text ); ?> &rarr;</a>

          <?php else : ?>

              <a id="action-select-link" href="<?php echo esc_url( wpdev_get_registration_url( '?template_id=' . $selected_template->get_id() ) ); ?>"><?php echo esc_html( $button_text ); ?> &rarr;</a>

          <?php endif; ?>

      </div>

    <?php endif; ?>

    <?php if (!wpdev_request('customizer')) : ?>

      <iframe id="iframe" src="<?php echo esc_url( set_url_scheme( add_query_arg( 'wpdev-preview', '1', get_home_url( $selected_template->get_id() ) ) ) ); ?>" width="100%" height="100%"></iframe>

    <?php else : ?>

      <div class="wpdev-styling">

        <div class="wpdev-w-full wpdev-text-center wpdev-relative wpdev-flex wpdev-justify-center wpdev-items-center wpdev-h-screen">

          <div class="wpdev-text-xl wpdev-rounded wpdev-font-bold wpdev-uppercase wpdev-inline-block wpdev-p-8 wpdev-opacity-50" style="margin-top: 62px; background-color: #000; color: #666;">

		        <?php _e('Site Template Preview will go here!', 'wpdev'); ?>

          </div>

        </div>

      </div>

    <?php endif; ?>

		<?php wpdev_ignore_errors(function() {
			wp_footer();
		}); ?>

  </body>

</html>
