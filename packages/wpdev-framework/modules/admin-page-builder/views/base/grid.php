<?php
/**
 * Grid view.
 *
 * @since 2.0.0
 */
?>
<?php $table->display_tablenav('top'); ?>

<div class="wpdev-mt-4 <?php echo esc_attr( implode( ' ', $table->get_table_classes() ) ); ?>">

  <div id="the-list" class="wpdev-grid-content wpdev-grid wpdev-gap-4 wpdev-grid-cols-1 md:wpdev-grid-cols-2 lg:wpdev-grid-cols-3 xl:wpdev-grid-cols-4">

    <?php $table->display_rows_or_placeholder(); ?>

  </div>
</div>
