<?php
/**
 * Installation steps view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-advanced-filters">
  <table class="widefat fixed striped wpdev-border-b" data-id="<?php echo esc_attr($page->get_current_section()); ?>">
    <thead>
      <tr>
        <?php if ($checks) : ?>
          <th class="check" style="width: 30px;"></th>
        <?php endif ?>
        <th class="item"><?php _e( 'Item', 'wpdev'); ?></th>
        <th class="status" style="width: 40%;"><?php _e( 'Status', 'wpdev'); ?></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($steps as $slug => $default) : ?>

        <tr
          <?php echo !$default['done'] ? 'data-content="'.esc_attr($slug).'"' : ''; ?>
          <?php echo wpdev_array_to_html_attrs(wpdev_get_isset($default, 'html_attr', array())); ?>
        >

          <?php if ($checks) : ?>
            <td>
              <?php if (!$default['done']) : ?>
                <input type="checkbox" name="default_content[<?php echo esc_attr($slug); ?>]" id="default_content_<?php echo esc_attr($slug); ?>" value="1" checked>
              <?php endif ?>
            </td>
          <?php endif ?>

          <td>
            <label class="wpdev-font-semibold wpdev-text-gray-700" for="default_content_<?php echo esc_attr( $slug ); ?>">
              <?php echo $default['title']; ?>
            </label>
            <span class="wpdev-text-xs wpdev-block wpdev-mt-1">
              <?php echo $default['description']; ?>
            </span>
          </td>

          <?php if ($default['done']) : ?>
            <td class="status">
              <span class="wpdev-text-green-600">
                <?php echo isset($default['completed']) ? $default['completed'] : __('Completed!', 'wpdev'); ?>
              </span>
            </td>
          <?php else : ?>
            <td class="status">
              <span><?php echo $default['pending']; ?></span>
              <div class="spinner"></div>
              <!-- <a style="display: none;" class="wpdev-no-underline wpdev-block help" href="<?php echo $default['help']; ?>" title="<?php esc_attr_e('Help', 'wpdev'); ?>">
                  <?php _e('Read More', 'wpdev'); ?>
                  <span class="dashicons-wpdev-help-with-circle"></span>
              </a> -->
            </td>
          <?php endif; ?>

        </tr>

      <?php endforeach; ?>

    </tbody>
  </table>
</div>
