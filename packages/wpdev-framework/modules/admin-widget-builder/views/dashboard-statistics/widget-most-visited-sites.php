<?php
/**
 * Graph countries view.
 *
 * @since 2.0.0
 */
?>

<div class="wpdev-styling">

<div class="wpdev-widget-inset">

<?php

$data    = array();
$slug    = 'most_visited_sites';
$headers = array(
	__('Site', 'wpdev'),
	__('Visits', 'wpdev'),
);

foreach ($sites as $site_visits) {

	$site_line = $site_visits->site->get_title().' '.get_admin_url($site_visits->site->get_id());

	$line = array(
		$site_line,
		$site_visits->count,
	);

	$data[] = $line;

} // end foreach;

$page->render_csv_button(array(
	'headers' => $headers,
	'data'    => $data,
	'slug'    => $slug,
));

?>

</div>

</div>


<?php if (!empty($sites)) : ?>

    <div class="wpdev-advanced-filters wpdev--mx-3 wpdev--mb-3 wpdev-mt-3">

    <table class="wp-list-table widefat fixed striped wpdev-border-t-0 wpdev-border-l-0 wpdev-border-r-0">

      <thead>
        <tr>
          <th class="wpdev-w-8/12"><?php _e('Site', 'wpdev'); ?></th>
          <th class="wpdev-text-right"><?php _e('Visits', 'wpdev'); ?></th>
        </tr>
      </thead>

      <tbody>

	      <?php foreach ($sites as $site_visits) : ?>

          <tr>
            <td class="wpdev-align-middle">
              <span class="wpdev-uppercase wpdev-text-xs wpdev-text-gray-700 wpdev-font-bold">
		            <?php echo $site_visits->site->get_title(); ?>
              </span>

              <div class="sm:wpdev-flex">

                <a title="<?php _e('Homepage', 'wpdev'); ?>" href="<?php echo esc_attr(get_home_url($site_visits->site->get_id())); ?>" class="wpdev-no-underline wpdev-flex wpdev-items-center wpdev-text-xs wp-ui-text-highlight">

                  <span class="dashicons-wpdev-link1 wpdev-align-middle wpdev-mr-1"></span>
                  <?php _e('Homepage', 'wpdev'); ?>

                </a>

                <a title="<?php _e('Dashboard', 'wpdev'); ?>" href="<?php echo esc_attr(get_admin_url($site_visits->site->get_id())); ?>" class="wpdev-no-underline wpdev-flex wpdev-items-center wpdev-text-xs wp-ui-text-highlight sm:wpdev-mt-0 sm:wpdev-ml-6">

                  <span class="dashicons-wpdev-browser wpdev-align-middle wpdev-mr-1"></span>
                  <?php _e('Dashboard', 'wpdev'); ?>

                </a>

              </div>
            </td>
            <td class="wpdev-align-middle wpdev-text-right">
              <?php echo sprintf(_n('%d visit', '%d visits', $site_visits->count, 'wpdev'), $site_visits->count); ?>
            </td>
          </tr>

        <?php endforeach; ?>

      </tbody>

    </table>

  </div>

<?php else : ?>

  <div class="wpdev-bg-gray-100 wpdev-p-4 wpdev-rounded wpdev-mt-6">

    <?php _e('No visits registered in this period.', 'wpdev'); ?>

  </div>

<?php endif; ?>
