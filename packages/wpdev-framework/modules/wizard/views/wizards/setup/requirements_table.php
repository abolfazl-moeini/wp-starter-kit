<?php
/**
 * Requirements table view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-block">

  <div class="wpdev-block wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-text-xs wpdev-py-2">
    <?php echo esc_html( __( 'WPDev Requires:', 'wpdev' ) ); ?>
  </div>

  <div class="wpdev-advanced-filters">
    <table class="widefat fixed striped wpdev-border-b">
      <thead>
        <tr>
          <th><?php esc_html_e( 'Item', 'wpdev' ); ?></th>
          <th><?php esc_html_e( 'Minimum Version', 'wpdev' ); ?></th>
          <th><?php esc_html_e( 'Recommended', 'wpdev' ); ?></th>
          <th><?php esc_html_e( 'Installed', 'wpdev' ); ?></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ( $requirements as $req ) : ?>
        <tr class="">
          <td><?php echo esc_html( $req['name'] ); ?></td>
          <td><?php echo esc_html( $req['required_version'] ); ?></td>
          <?php // translators: %s is the requirement version ?>
          <td><?php echo esc_html( sprintf( __( '%s or later', 'wpdev' ), $req['recommended_version'] ) ); ?></td>
          <td class="<?php echo $req['pass_requirements'] ? 'wpdev-text-green-600' : 'wpdev-text-red-600'; ?>">
            <?php echo esc_html( $req['installed_version'] ); ?>
            <?php echo $req['pass_requirements'] ? '<span class="dashicons-wpdev-check"></span>' : '<span class="dashicons-wpdev-cross"></span>'; ?>

            <?php if ( ! $req['pass_requirements'] ) : ?>

              <a class="wpdev-no-underline wpdev-block" href="<?php echo esc_url( $req['help'] ); ?>" title="<?php esc_attr_e( 'Help', 'wpdev' ); ?>">
                <?php esc_html_e( 'Read More', 'wpdev' ); ?>
                <span class="dashicons-wpdev-help-with-circle"></span>
              </a>

            <?php endif; ?>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <br>
  </div>

  <div class="wpdev-block wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-text-xs wpdev-py-2">
    <?php echo esc_html( __( 'And', 'wpdev' ) ); ?>
  </div>

  <div class="wpdev-advanced-filters">
    <table class="widefat fixed striped wpdev-border-b">
      <thead>
        <tr>
          <th><?php esc_html_e( 'Item', 'wpdev' ); ?></th>
          <th><?php esc_html_e( 'Condition', 'wpdev' ); ?></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ( $plugin_requirements as $req ) : ?>
        <tr class="">
          <td><?php echo esc_html( $req['name'] ); ?></td>
          <td class="<?php echo $req['pass_requirements'] ? 'wpdev-text-green-600' : 'wpdev-text-red-600'; ?>">
            <?php echo esc_html( $req['condition'] ); ?>
            <?php echo $req['pass_requirements'] ? '<span class="dashicons-wpdev-check"></span>' : '<span class="dashicons-wpdev-cross wpdev-align-middle"></span>'; ?>

            <?php if ( ! $req['pass_requirements'] ) : ?>

              <a target="_blank" class="wpdev-no-underline wpdev-ml-2" href="<?php echo esc_url( $req['help'] ); ?>" title="<?php esc_attr_e( 'Help', 'wpdev' ); ?>">
              <span class="dashicons-wpdev-help-with-circle wpdev-align-baseline"></span>
              <?php esc_html_e( 'Read More', 'wpdev' ); ?>
              </a>

            <?php endif; ?>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <br>
  </div>

  <?php if ( \WPDevFramework\Requirements::met() === false ) : ?>

    <div class="wpdev-mt-4 wpdev-p-4 wpdev-bg-red-100 wpdev-border wpdev-border-solid wpdev-border-red-200 wpdev-rounded-sm wpdev-text-red-500">
      <?php esc_html_e( 'It looks like your hosting environment does not support the current version of WPDev. Visit the Read More links on each item to see what steps you need to take to bring your environment up to the WPDev current requirements.', 'wpdev' ); ?>
    </div>

  <?php endif; ?>

</div>