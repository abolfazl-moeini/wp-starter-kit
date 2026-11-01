<?php
/**
 * List table widget view.
 *
 * @since 2.0.0
 */
?>
<?php echo $before; ?>

<?php //if ($page->edit) : ?>

  <div class="wpdev-advanced-filters wpdev-widget-list-table wpdev--m-3 wpdev--mt-1 wpdev--mb-3">

      <?php $table->prepare_items(); ?>

      <!-- <form id="posts-filter" method="post"> -->

      <?php if(is_callable([$page,'get_id'])): ?>
        <input type="hidden" name="page" value="<?php echo esc_attr( $page->get_id() ); ?>">
        <?php endif ?>
      <?php $table->display(); ?>

    <!-- </form> -->

  </div>

<?php /*else : ?>

  <div class="wpdev-pad-12 wpdev-h-12 wpdev--mt-1 wpdev--mx-3 wpdev--mb-3 wpdev-surface-gray-100 wpdev-type-gray-500 wpdev-type-xs wpdev-type-center">
    <span class="dashicons dashicons-warning wpdev-h-8 wpdev-w-8 wpdev-mar-x-auto wpdev-type-center wpdev-type-4xl wpdev-block"></span>
    <span class="wpdev-block wpdev-type-sm wpdev-mar-t-2">
        <?php printf(__('%s will show up here once this item is saved.', 'wpdev'), $title); ?>
    </span>
  </div>

<?php endif;*/ ?>

<?php echo $after; ?>
