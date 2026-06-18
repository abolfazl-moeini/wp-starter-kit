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
$slug = 'signup_forms';
$headers = array(
  __('Checkout Form', 'wpdev'),
  __('Signups', 'wpdev'),
);

foreach ($forms as $form) {

  $line = array(
    $form->signup_form,
    $form->count,
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

<?php if (!empty($forms)) : ?>

    <div class="wpdev-advanced-filters wpdev--mx-3 wpdev--mb-3 wpdev-mt-3">

    <table class="wp-list-table widefat fixed striped wpdev-border-t-0 wpdev-border-l-0 wpdev-border-r-0">

      <thead>
        <tr>
          <th><?php _e('Checkout Form', 'wpdev'); ?></th>
          <th class="wpdev-text-right"><?php _e('Signups', 'wpdev'); ?></th>
        </tr>
      </thead>

      <tbody>

        <?php foreach ($forms as $form) : ?>

          <tr>
            <td>
              <?php echo $form->signup_form; ?>
              <?php if ($form->signup_form === 'by-admin') : ?>
                <?php echo wpdev_tooltip(__('Customers created via the admin panel, by super admins.', 'wpdev')); ?>
              <?php endif;?>
            </td>
            <td class="wpdev-text-right"><?php echo $form->count; ?></td>
          </tr>

        <?php endforeach; ?>

      </tbody>

    </table>

  </div>

<?php else : ?>

  <div class="wpdev-bg-gray-100 wpdev-p-4 wpdev-rounded wpdev-mt-6">

    <?php _e('No data yet.', 'wpdev'); ?>

  </div>

<?php endif; ?>
