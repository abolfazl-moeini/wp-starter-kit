<?php
/**
 * Product Details
 *
 * @since 2.0.0
 */
?>

<div class="<?php echo "wpdev-product-{$product->get_id()}-head"; ?> wpdev-bg-gray-100 wpdev-p-4 wpdev-flex wpdev-items-center">

  <div>

    <span class="wpdev-text-xl wpdev-font-medium wpdev-block"><?php echo $product->get_name(); ?></span>

    <small class="wpdev-text-gray-600 wpdev-text-sm wpdev-block wpdev-mt-2"><?php echo $product->get_price_description(); ?></small>

  </div>

  <?php if ($product->get_featured_image()) : ?>

    <div class="wpdev-ml-auto">

      <img
        class="wpdev-h-12 wpdev-w-12 wpdev-rounded"
        src="<?php echo esc_url($product->get_featured_image()); ?>"
        alt="<?php echo esc_attr($product->get_name()); ?>"
      >

    </div>

  <?php endif; ?>

</div>

<div class="<?php echo "wpdev-product-{$product->get_id()}-description"; ?> wpdev-p-4 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b wpdev-border-gray-300 wpdev-border-solid">

  <?php if ($product->get_description()) : ?>

    <span class="wpdev-text-xs wpdev-uppercase wpdev-font-bold wpdev-block">

      <?php _e('Product Description:', 'wpdev'); ?>

    </span>

    <p class="wpdev-mb-6"><?php echo $product->get_description(); ?></p>

  <?php endif; ?>

  <span class="wpdev-text-xs wpdev-uppercase wpdev-font-bold wpdev-block">

    <?php _e('Product Characteristics:', 'wpdev'); ?>

  </span>

  <ul class="wpdev-m-0 wpdev-mt-4 wpdev-p-0 wpdev-list-none">

    <?php foreach ($product->get_pricing_table_lines() as $key => $line) : ?>

      <li class="<?php echo str_replace('_', '-', $key); ?>"><?php echo $line; ?></li>

    <?php endforeach; ?>

  </ul>

</div>
