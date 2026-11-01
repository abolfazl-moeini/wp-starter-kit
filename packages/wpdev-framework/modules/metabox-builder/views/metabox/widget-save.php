<?php
/**
 * Save widget view.
 *
 * @since 2.0.0
 */
?>
<?php if (!empty($labels['save_description'])) : ?>

  <p class="wpdev-mar-b-5">
    <?php echo $labels['save_description']; ?>
  </p>

<?php endif; ?>

<div class="wpdev-surface-gray-200 wpdev-pad-4 wpdev--m-3 wpdev--mt-2 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-400 wpdev-border-solid">

  <button type="submit" name="action" value="save" class="button button-primary wpdev-full">
    <?php echo $labels['save_button_label']; ?>
  </button>

</div>
