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

$data = array();
$slug = 'signup_countries';
$headers = array(
  __('Country', 'wpdev'),
  __('Customer Count', 'wpdev'),
);

foreach ($countries as $country_code => $count) {

  $line = array(
    wpdev_get_country_name($country_code),
    $count,
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

<?php if (!empty($countries)) : ?>

    <div class="wpdev-advanced-filters wpdev--mx-3 wpdev--mb-3 wpdev-mt-3">

    <table class="wp-list-table widefat fixed striped wpdev-border-t-0 wpdev-border-l-0 wpdev-border-r-0">

      <thead>
        <tr>
          <th><?php _e('Country', 'wpdev'); ?></th>
          <th class="wpdev-text-right"><?php _e('Customer Count', 'wpdev'); ?></th>
        </tr>
      </thead>

      <tbody>

        <?php foreach ($countries as $country_code => $count) : ?>

          <tr>
            <td>
              <?php

                printf('<span class="wpdev-flag-icon wpdev-flag-icon-%s wpdev-w-5 wpdev-mr-1" %s></span>',
                  strtolower($country_code),
                  wpdev_tooltip_text(wpdev_get_country_name($country_code))
                );

              ?>
                  <?php echo wpdev_get_country_name($country_code); ?>
            </td>
            <td class="wpdev-text-right"><?php echo $count; ?></td>
          </tr>

          <?php

          $state_list = wpdev_get_states_of_customers($country_code);
          $_state_count = 0;

          ?>

          <?php foreach ($state_list as $state => $state_count) : $_state_count = $_state_count + $state_count; ?>

            <tr>
              <td class="wpdev-text-xs">|&longrightarrow; <?php echo $state; ?></td>
              <td class="wpdev-text-right"><?php echo $state_count; ?></td>
            </tr>

          <?php endforeach; ?>

          <?php if ($state_list && $count - $_state_count >= 0) : ?>

            <tr>
              <td class="wpdev-text-xs">|&longrightarrow; <?php _e('Other', 'wpdev') ?></td>
              <td class="wpdev-text-right"><?php echo $count - $_state_count; ?></td>
            </tr>

          <?php endif; ?>

        <?php endforeach; ?>

      </tbody>

    </table>

  </div>

<?php else : ?>

  <div class="wpdev-bg-gray-100 wpdev-p-4 wpdev-rounded wpdev-mt-6">

    <?php _e('No countries registered yet.', 'wpdev'); ?>

  </div>

<?php endif; ?>
