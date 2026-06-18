<?php
/**
 * Displays the Admin Notices on the admin panels (network, sub-sites, and user)
 *
 * @package WPDev/Views
 * @subpackage Admin_Notices
 * @since 2.0.0
 */

foreach ($notices as $key => $notice) : ?>

<div class="notice wpdev-hidden wpdev-admin-notice wpdev-styling hover:wpdev-styling notice-<?php echo esc_attr($notice['type']); ?> <?php echo $notice['dismissible_key'] ? esc_attr('is-dismissible') : ''; ?>">

  <?php if (strpos($notice['message'], '<p>') !== false) : ?>

    <?php echo $notice['message']; ?>

  <?php else : ?>

    <p class="wpdev-py-2"><?php echo $notice['message']; // phpcs:ignore ?></p>

<?php endif; ?>

  <?php if (isset($notice['actions']) && !empty($notice['actions'])) : ?>

    <div class="wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-border-r-0 wpdev-border-l-0 wpdev-border-b-0 wpdev-bg-gray-100 wpdev--ml-2 wpdev--mb-1 wpdev--mr-2 sm:wpdev--mr-7.5 sm:wpdev--ml-3 sm:wpdev--mb-px">

      <ul class="wpdev-text-right wpdev-p-0 wpdev-m-0 wpdev-flex wpdev-justify-end">

        <?php foreach ($notice['actions'] as $action) : ?>

        <li class="wpdev-inline-block wpdev-p-0 wpdev-m-0 wpdev-flex-shrink">
          <a class="wpdev-bg-white wpdev-uppercase wpdev-no-underline wpdev-font-bold wpdev-text-gray-600 hover:wpdev-text-gray-700 wpdev-text-xs wpdev-inline-block wpdev-px-4 wpdev-py-2 wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-border-r-0 wpdev-border-t-0 wpdev-border-b-0 wpdev-transition-all wpdev-mr-px" title="<?php echo esc_attr($action['title']); ?>" href="<?php echo esc_attr($action['url']); ?>"><?php echo $action['title']; ?></a>
        </li>

        <?php endforeach; ?>

      </ul>

    </div>

  <?php endif; ?>

	<?php if (isset($notice['dismissible_key']) && $notice['dismissible_key']) : ?>

    <input type='hidden' name='notice_id' value='<?php echo esc_attr($notice['dismissible_key']); ?>'>

    <input type='hidden' name='nonce' value='<?php echo esc_attr($nonce); ?>'>

	<?php endif; ?>

</div>

<?php endforeach; ?>
