<?php
/**
 * News view.
 *
 * @since 2.0.0
 */
?>

<div class="wpdev-styling">

  <div class="rss-widget">

    <div class='wpdev-rss-widget-title wpdev-uppercase wpdev-font-semibold wpdev-text-gray-600 wpdev-text-xs wpdev-mb-3 wpdev-py-1'><?php _e('From the Community', 'wpdev'); ?></div>

    <div id='wpdev-blog-feed'>

      <div class="wpdev-text-center wpdev-bg-gray-100 wpdev-rounded wpdev-uppercase wpdev-font-semibold wpdev-text-xs wpdev-text-gray-700 wpdev-p-4">
        <span class="wpdev-blinking-animation"><?php _e('Loading...', 'wpdev'); ?></span>
      </div>

    </div>

  </div>

  <div style="margin: 12px -12px -12px;" class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-text-right wpdev-border-gray-300">

    <a target="_blank" href="<?php echo 'https://community.wpdev.ir/home'; ?>" class="button button-primary wpdev-w-full wpdev-text-center">

      <?php _e('Join our Community', 'wpdev'); ?> &rarr;

    </a>

  </div>

</div>

<script>

  document.addEventListener('DOMContentLoaded', async () => {

    try {

      const url = ajaxurl;

      const query_params = <?php echo json_encode(array(
        'url'          => 'https://versions.wpdev.ir/updates/news.php',
        'action'       => 'wpdev_fetch_rss',
        'title'        => __('WPDev Community', 'wpdev'),
        'items'        => 3,
        'show_summary' => 1,
        'show_author'  => 0,
        'show_date'    => 1,
      )); ?>;

      const request = await fetch(`${url}?${new URLSearchParams(query_params)}`);

      if (!request.ok) {
        throw new Error(request.statusText);
      }

      const text = await request.text();

      document.getElementById('wpdev-blog-feed').innerHTML = text;

    } catch(error) {

      document.getElementById('wpdev-blog-feed').innerHTML = '<?php echo __("Error loading external feed.", "wpdev"); ?>';

    }

  });

</script>
