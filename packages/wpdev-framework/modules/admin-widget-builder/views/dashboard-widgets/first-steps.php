<?php
/**
 * First steps view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling odd:wpdev-styling" style="margin: -12px -12px;">

  <div class="wpdev-flex wpdev-p-4 wpdev-content-center wpdev-items-center">

    <div class="wpdev-w-full sm:wpdev-w-8/12">

      <span class="wpdev-block wpdev-my-1 wpdev-text-base wpdev-font-semibold wpdev-text-gray-700">
        <?php _e('Your network is taking shape!', 'wpdev'); ?>
      </span>

      <span class="wpdev-block wpdev-my-1 wpdev-text-gray-600">
        <?php _e('Here are the next steps to keep you on that streak!', 'wpdev'); ?>
      </span>

    </div>

    <div class="wpdev-w-4/12 wpdev-text-right wpdev-hidden sm:wpdev-inline-block">

      <span class="wpdev-inline-block wpdev-bg-green-100 wpdev-text-center wpdev-align-middle wpdev-p-2 wpdev-font-mono wpdev-px-3 wpdev-border wpdev-border-green-300 wpdev-text-green-700 wpdev-border-solid wpdev-rounded">
        <?php echo $percentage.'% '.__('done', 'wpdev'); ?>
      </span>

    </div>

  </div>

  <ul class="wpdev-m-0 wpdev-p-0">

    <?php $index = 1; foreach ($steps as $step_slug => $step) : ?>

      <li
        class="sm:wpdev-flex wpdev-py-2 wpdev-px-4 wpdev-content-center wpdev-items-center wpdev-m-0 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300 <?php echo $step['done'] ? 'wpdev-bg-white wpdev-opacity-75' : 'wpdev-bg-gray-100' ; ?>"
      >

        <div>
          <span class="wpdev-hidden sm:wpdev-inline-block wpdev-mr-4 wpdev-bg-white wpdev-text-center wpdev-align-middle wpdev-p-1 wpdev-font-mono wpdev-px-3 wpdev-border wpdev-border-gray-300 wpdev-border-solid wpdev-rounded">
            <?php echo $index; ?>
          </span>
        </div>

        <div class="wpdev-w-full sm:wpdev-w-1/2">

          <span class="wpdev-block wpdev-my-1 wpdev-font-semibold wpdev-text-gray-700">

            <span class="<?php echo $step['done'] ? 'wpdev-line-through' : '' ; ?>"><?php echo $step['title']; ?></span>

            <?php if ($step['done']) : ?>

              <span class="wpdev-text-green-600 dashicons dashicons-yes-alt"></span>

            <?php endif; ?>

          </span>

          <span class="wpdev-block wpdev-my-1 wpdev-text-gray-600 <?php echo $step['done'] ? 'wpdev-line-through' : '' ; ?>"><?php echo $step['desc']; ?></span>

        </div>

        <div class="wpdev-w-full sm:wpdev-w-1/2 wpdev-text-right">

          <div class="wpdev-block sm:wpdev-hidden wpdev-h-2">&nbsp;</div>

          <a href="<?php echo $step['action_link']; ?>" class="button wpdev-w-full sm:wpdev-w-auto wpdev-text-center">
            <?php echo $step['action_label']; ?>
          </a>

        </div>

      </li>

    <?php $index++; endforeach; ?>

  </ul>

  <?php if ($all_done) : ?>

    <div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-text-right wpdev-border-gray-300">

      <button
        value="wpdev-setup"
        checked="checked"
        class="button wpdev-text-center hide-postbox-tog"
        id="wpdev-setup-hide"
      >
        <?php _e('Dismiss', 'wpdev'); ?>
      </button>

    </div>

  <?php endif; ?>

</div>
