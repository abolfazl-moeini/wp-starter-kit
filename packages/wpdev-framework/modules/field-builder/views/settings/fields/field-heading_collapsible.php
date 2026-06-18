<?php
/**
 * Heading collapsible field view.
 *
 * @since 2.0.0
 */
?>
<div data-target="<?php echo 'collapsible-'.$field_slug; ?>" class="wpdev-settings-heading-collapsible wpdev-col-sm-12 <?php echo isset($field['active']) && !$field['active'] ? 'wpdev-settings-heading-collapsible-disabled' : ''; ?>">
  <?php echo $field['title']; ?>
</div>
