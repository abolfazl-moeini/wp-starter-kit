<?php
/**
 * Save widget view.
 *
 * @since 2.0.0
 */
?>
<?php if (!empty($labels['save_description'])) : ?>

  <p class="wpdev-mb-5">
    <?php echo $labels['save_description']; ?>
  </p>

<?php endif; ?>

<div class="wpdev-bg-gray-200 wpdev-p-4 wpdev--m-3 wpdev--mt-2 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-400 wpdev-border-solid">

  <button type="submit" name="action" value="save" class="button button-primary wpdev-w-full">
    <?php echo $labels['save_button_label']; ?>
  </button>

</div>
