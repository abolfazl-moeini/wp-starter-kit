<?php
/**
 * Grid item view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-border-transparent" tabindex="0">

  <div class="wpdev-grid-item wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-py-8 wpdev-bg-white wpdev-text-center">

    <div
      class="wpdev--mt-8 wpdev-py-8 wpdev-bg-gray-100 wpdev-bg-cover wpdev-bg-center"
      style="opacity: 0.15; background-image: url(<?php echo esc_url( get_avatar_url($item->get_user_id(), array(
        'default' => 'identicon',
        'size'    => 320,
      )) ); ?>)"
    >
      &nbsp;
    </div>

    <div class="customer-avatar wpdev-relative wpdev--mt-8">
      <?php echo get_avatar($item->get_user_id(), 92, 'identicon', '', array('force_display' => true, 'class' => 'wpdev-rounded-full wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-bg-white')); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_avatar returns sanitized markup. ?>
    </div>

    <div class="wpdev-text-base wpdev-mt-1">
      <div>
        <span class="wpdev-font-semibold"><?php echo esc_html( $item->get_display_name() ); ?></span>
        <small>#<?php echo esc_html( $item->get_id() ); ?></small>
      </div>
      <div class="wpdev-text-xs wpdev-my-1">
        <?php if ($item->get_email_address()) : ?>
        <a class="wpdev-no-underline" href="mailto:<?php echo esc_attr( antispambot( $item->get_email_address() ) ); ?>">
          <?php echo esc_html( antispambot( $item->get_email_address() ) ); ?>
        </a>
        <?php else : ?>
          <?php _e('No email address', 'wpdev'); ?>
        <?php endif; ?>
      </div>
      <div class="wpdev-text-xs">
        <span class="<?php echo $item->is_vip() ? esc_attr('wpdev-font-semibold') : ''; ?>">
          <?php echo $item->is_vip() ? esc_html__('VIP Customer', 'wpdev') : esc_html__('Regular Customer', 'wpdev'); ?>
        </span>
      </div>
    </div>

    <div class="customer-secondary-info wpdev-mt-5">

        <div class="wpdev-flex wpdev-justify-between wpdev-border-0 wpdev-border-t wpdev-border-solid wpdev-border-gray-300 wpdev-py-2 wpdev-px-3">
          <span>
            <?php _e( 'Last Login:', 'wpdev' ); ?>
          </span>
          <span class="wpdev-font-semibold">
            <?php
							if ($item->is_online()) {
								echo '<span class="wpdev-inline-block wpdev-mr-1 wpdev-rounded-full wpdev-h-2 wpdev-w-2 wpdev-bg-green-500"></span>'.__('Online', 'wpdev');
							} else {
								if ( '0000-00-00 00:00:00' !== $item->get_last_login() ) {
									echo human_time_diff( strtotime( $item->get_last_login() ), time() ).' '.__('ago', 'wpdev');
								} else {
									_e('Never logged in', 'wpdev');
								}
							}
            ?>
          </span>
        </div>
        <div class="wpdev-flex wpdev-justify-between wpdev-border-0 wpdev-border-t wpdev-border-solid wpdev-border-gray-300 wpdev-py-2 wpdev-px-3">
          <span>
            <?php _e( 'Customer Since:', 'wpdev' ); ?>
          </span>
          <span class="wpdev-font-semibold">
            <?php echo human_time_diff( strtotime( $item->get_date_registered() ), time() ).' '.__('ago', 'wpdev'); ?>
          </span>
        </div>

        <div class="wpdev-flex wpdev-justify-between wpdev-border-0 wpdev-border-gray-300 wpdev-border-t wpdev-border-b-0 wpdev-border-solid wpdev-py-2 wpdev-px-3">
          <span>
            <?php _e( 'Memberships:', 'wpdev' ); ?>
          </span>
          <div>
            <span class="wpdev-font-semibold">
              <?php echo esc_html( count( $item->get_memberships() ) ); ?>
            </span>

            <?php
            if (!empty($item->get_memberships())) {
              ?>
              <a  href="<?php echo wpdev_network_admin_url('wpdev-memberships', array( 'customer_id' => $item->get_id() ) ); ?>">
                <?php _e( 'View', 'wpdev' ); ?>
              </a>
              <?php
            }
            ?>

          </div>
        </div>

        <div class="wpdev-flex wpdev-justify-between wpdev-border-0 wpdev-border-gray-300 wpdev-border-t wpdev-border-b-0 wpdev-border-solid wpdev-py-2 wpdev-px-3">
          <span>
            <?php _e( 'Actions:', 'wpdev' ); ?>
          </span>
          <div>

            <?php

              $is_modal_switch_to = \WPDevFramework\User_Switching::get_instance()->check_user_switching_is_activated() ? '' : 'wubox';

              $switch_url = \WPDevFramework\User_Switching::get_instance()->render( $item->get_user_id() );

              $url_switch_to = sprintf(
                  '<a title="%s" class="%s" href="%s">%s</a>',
                  esc_attr__( 'Switch To', 'wpdev' ),
                  esc_attr( $is_modal_switch_to ),
                  esc_url( $switch_url ),
                  esc_html__( 'Switch To', 'wpdev' )
              );

              $actions = array(
                  'switch-to' => $item->get_user_id() !== get_current_user_id() ? $url_switch_to : esc_html__( 'None', 'wpdev' ),
              );

              echo implode( '<br />', $actions ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML built with escaped parts above, only anchor + br tags.

            ?>

          </div>
        </div>

    </div>

    <div class="wpdev-flex wpdev-justify-between wpdev-items-center wpdev--mb-8 wpdev-p-4 wpdev-bg-gray-100 wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0">

        <label>
          <input class="wpdev-rounded-none" type="checkbox" name="bulk-delete[]" value="<?php echo esc_attr( $item->get_id() ); ?>" />
          <?php _e( 'Select Customer', 'wpdev' ); ?>
        </label>

        <a href="<?php echo wpdev_network_admin_url('wpdev-edit-customer', array( 'id' => $item->get_id() ) ); ?>" class="button button-primary">
          <?php _e('Manage', 'wpdev'); ?>
        </a>
    </div>
  </div>
</div>
