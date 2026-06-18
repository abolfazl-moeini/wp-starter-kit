<?php
/**
 * Steps view.
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-checkout-editor-app">

  <!-- Add new Step Section -->
  <div id="wpdev-list-table-add-new-1" class="postbox wpdev-mb-0" v-cloak>

    <div class="wpdev-bg-white wpdev-px-4 wpdev-py-3 wpdev-flex wpdev-items-center">

      <div class="wpdev-w-1/2">

        <span class="wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">

          <?php printf(__('%1$s steps and %2$s fields', 'wpdev'), '{{ steps.length }}', '{{ field_count }}'); ?>

        </span>

      </div>

      <div class="wpdev-w-1/2 wpdev-text-right">

        <ul class="wpdev-m-0 wpdev-overflow-hidden wpdev-flex wpdev-justify-end">

          <li class="wpdev-m-0 wpdev-ml-4">
            <a
              title="<?php _e('Preview', 'wpdev'); ?>"
              href="#"
              type="button"
              class="wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800"
              @click.prevent="get_preview()"
            >
              <span class="dashicons-wpdev-eye wpdev-align-middle"></span>
              <span v-show="!preview"><?php _e('Preview', 'wpdev'); ?></span>
              <span v-cloak v-show="preview"><?php _e('Editor', 'wpdev'); ?></span>
            </a>
          </li>

          <li class="wpdev-m-0 wpdev-ml-4" v-show="!preview">
            <a
              title="<?php _e('Add new Checkout Step', 'wpdev'); ?>"
              href="<?php echo wpdev_get_form_url('add_new_form_step', array(
                'checkout_form' => $checkout_form,
              )); ?>"
              type="button"
              class="wubox wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800"
            >
              <span class="dashicons-wpdev-circle-with-plus wpdev-align-middle"></span>
              <?php _e('Add new Checkout Step', 'wpdev'); ?>
            </a>
          </li>

        </ul>

      </div>

    </div>

  </div>
  <!-- /Add new Step Section -->

  <!-- Editor -->
  <div
    v-cloak
    class="wpdev-px-4 wpdev-py-1 wpdev-bg-gray-200 wpdev-border wpdev-border-solid wpdev-border-gray-400 wpdev-border-t-0 wpdev-border-b-0"
    :class="dragging ? 'is-dragging' : ''"
  >

    <!-- Editor Proper -->
    <draggable
      :list="steps"
      :tag="'div'"
      group="step"
      handle=".hndle"
      ghost-class="wpdev-draggable-ghost"
      drag-class="wpdev-hide-inside"
      @start="dragging = true"
      @end="dragging = false"
      v-show="!preview"
    >

      <div
        :id="'wpdev-list-table-' + step.id"
        class="postbox wpdev-my-4"
        v-cloak
        v-for="(step, idx) in steps"
      >

        <div class="postbox-header">
          <h2 class="hndle ui-sortable-handle">
            <span class="wpdev-text-gray-700 ">
              <span class="wpdev-text-2xs wpdev-font-mono wpdev-uppercase wpdev-mr-4"><?php printf(__('Step %s', 'wpdev'), '{{ idx + 1 }}'); ?></span> {{ step.name }}
            </span>
          </h2>
        </div>

        <div class="inside" style="margin-top: 0 !important;">

          <!-- Visibility -->
          <div v-if="step.logged && step.logged !== 'always'" class="wpdev-py-2 wpdev-px-4 wpdev--mx-3 wpdev-bg-blue-100 wpdev-text-blue-600 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-400">

              <span class="dashicons-wpdev-eye wpdev-mr-1 wpdev-align-middle"></span>

              <span v-if="step.logged == 'guests_only'">
                <?php _e('This step is only visible for <strong>guests</strong>', 'wpdev'); ?>
              </span>

              <span v-else>
                <?php _e('This step is only visible for <strong>logged-in users</strong>', 'wpdev'); ?>
              </span>

          </div>
          <!-- Visibility - End -->

          <div class="wpdev-advanced-filters wpdev-widget-list-table wpdev--mx-3 wpdev--mb-3">

            <div id="wpdev-checkout_form_section_list_table" class="wpdev-list-table wpdev-mode-list">

              <wpdev-draggable-table
                :list="step.fields"
                :headers="headers"
                :step_name="step.id"
              ></wpdev-draggable-table>

            </div>

          </div>

          <div
            class="wpdev-bg-gray-100 wpdev-px-4 wpdev-py-3 wpdev--m-3 wpdev-mt-3 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-400 wpdev-border-solid wpdev-text-right">

            <ul class="wpdev-m-0 wpdev-overflow-hidden md:wpdev-flex wpdev-w-full md:wpdev-w-auto wpdev-justify-end">

              <li class="wpdev-m-0 md:wpdev-ml-4 wpdev-text-center">

                <a
                  v-show="delete_step_id !== step.id"
                  v-on:click.prevent="delete_step_id = step.id"
                  title="<?php _e('Delete'); ?>"
                  href="#"
                  class="wpdev-text-red-500 wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-p-4 md:wpdev-p-0 wpdev-inline-block"
                >
                  <?php _e('Delete Step'); ?>
                </a>

                <a
                  v-show="delete_step_id === step.id"
                  v-on:click.prevent="remove_step(step.id)"
                  title="<?php _e('Delete'); ?>"
                  href="#"
                  class="wpdev-text-red-700 wpdev-uppercase wpdev-text-2xs wpdev-font-bold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-p-4 md:wpdev-p-0 wpdev-inline-block"
                >
                  <?php _e('Confirm?', 'wpdev'); ?>
                </a>

              </li>

              <li class="wpdev-m-0 md:wpdev-ml-4 wpdev-text-center">

                <a title="<?php _e('Edit Section', 'wpdev'); ?>"
                  :href="'<?php echo wpdev_get_form_url('add_new_form_step', array(
                    'checkout_form' => $checkout_form,
                    'step'          => '',
                  )); ?>=' + step.id"
                  type="button"
                  class="wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800 wubox wpdev-p-4 md:wpdev-p-0 wpdev-inline-block"
                >
                    <?php _e('Edit Section', 'wpdev'); ?>
                </a>

              </li>

              <li class="wpdev-m-0 md:wpdev-ml-4 wpdev-text-center">

                <a title="<?php _e('Add new Field', 'wpdev'); ?>"
                  :href="'<?php echo wpdev_get_form_url('add_new_form_field', array(
                    'checkout_form' => $checkout_form,
                    'width'         => 600,
                    'step'          => '',
                  )); ?>=' + step.id"
                  type="button" class="wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800 wubox wpdev-p-4 md:wpdev-p-0 wpdev-inline-block">
                    <span class="dashicons-wpdev-circle-with-plus wpdev-align-text-bottom"></span>
                    <?php _e('Add new Field', 'wpdev'); ?>
                </a>

              </li>

            </ul>

          </div>

        </div>

      </div>

    </draggable>
    <!-- /Editor Proper -->

    <!-- Preview Block -->
    <div v-show="preview">

      <div v-show="!loading_preview && !preview_error" class="wpdev-text-center wpdev-mt-3">

        <a @click.prevent="get_preview('user')" href="#" class="wpdev-m-2 wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800">
          <?php _e('See as existing user', 'wpdev'); ?>
        </a>

        <a @click.prevent="get_preview('visitor')" href="#" class="wpdev-m-2 wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800">
          <?php _e('See as visitor', 'wpdev'); ?>
        </a>

      </div>

      <!-- Preview Loading -->
      <div v-show="loading_preview" class="wpdev-block wpdev-p-4 wpdev-py-8 wpdev-bg-white wpdev-text-center wpdev-my-4 wpdev-border wpdev-border-solid wpdev-rounded wpdev-border-gray-400">

        <span class="wpdev-blinking-animation wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">
          <?php _e('Loading Preview...', 'wpdev'); ?>
        </span>

      </div>
      <!-- /Preview Loading -->

      <!-- Error -->
      <div v-show="preview_error" class="wpdev-block wpdev-p-4 wpdev-py-8 wpdev-bg-white wpdev-text-center wpdev-my-4 wpdev-border wpdev-border-solid wpdev-rounded wpdev-border-gray-400">

        <span class="wpdev-text-red-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">
          <?php _e('Something wrong happened along the way =(', 'wpdev'); ?>
        </span>

      </div>
      <!-- /Error -->

      <!-- Preview Proper -->
      <!-- <div v-show="!loading_preview && !preview_error" class="wpdev-block wpdev-p-8 wpdev-bg-white wpdev-my-4 wpdev-border wpdev-border-solid wpdev-rounded wpdev-border-gray-400" v-html="preview_content"></div> -->
      <div v-show="!loading_preview && !preview_error" id="wpdev-iframe-content" class="wpdev-w-full wpdev-relative">

        <iframe id="wpdev-checkout-preview" v-bind:src="iframe_preview_url" class="wpdev-w-full wpdev-h-full wpdev-m-0 wpdev-mt-4 wpdev-mb-2 wpdev-p-0 wpdev-overflow-hidden wpdev-border-radius wpdev-border wpdev-border-solid wpdev-rounded wpdev-border-gray-400">
          <?php _e('Your browser doesn\'t support iframes', 'wpdev'); ?>
        </iframe>

      </div>
      <!-- /Preview Proper -->

    </div>
    <!-- /Preview Block -->

  </div>
  <!-- /Editor -->

  <!-- Add new Step Section -->
  <div id="wpdev-list-table-add-new-2" class="postbox" v-cloak>

    <div class="wpdev-bg-white wpdev-px-4 wpdev-py-3 wpdev-flex wpdev-items-center">

      <div class="wpdev-w-1/2">

        <span class="wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">

          <?php printf(__('%1$s steps and %2$s fields', 'wpdev'), '{{ steps.length }}', '{{ field_count }}'); ?>

        </span>

      </div>

      <div class="wpdev-w-1/2 wpdev-text-right">

        <ul class="wpdev-m-0 wpdev-overflow-hidden wpdev-flex wpdev-justify-end">

          <li class="wpdev-m-0 wpdev-ml-4">
            <a
              title="<?php _e('Preview', 'wpdev'); ?>"
              href="#"
              type="button"
              class="wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800"
              @click.prevent="get_preview('user')"
            >
              <span class="dashicons-wpdev-eye wpdev-align-middle"></span>
              <span v-show="!preview"><?php _e('Preview', 'wpdev'); ?></span>
              <span v-cloak v-show="preview"><?php _e('Editor', 'wpdev'); ?></span>
            </a>
          </li>

          <li class="wpdev-m-0 wpdev-ml-4" v-show="!preview">
            <a
              title="<?php _e('Add new Checkout Step', 'wpdev'); ?>"
              href="<?php echo wpdev_get_form_url('add_new_form_step', array(
                'checkout_form' => $checkout_form,
              )); ?>"
              type="button"
              class="wubox wpdev-uppercase wpdev-text-2xs wpdev-font-semibold wpdev-no-underline wpdev-outline-none hover:wpdev-shadow-none focus:wpdev-shadow-none wpdev-text-gray-600 hover:wpdev-text-gray-800"
            >
              <span class="dashicons-wpdev-circle-with-plus wpdev-align-middle"></span>
              <?php _e('Add new Checkout Step', 'wpdev'); ?>
            </a>
          </li>

        </ul>

      </div>

    </div>

  </div>
  <!-- /Add new Step Section -->

  <textarea class="wpdev-hidden" v-cloak name="_settings" v-html="JSON.stringify(steps)"></textarea>

</div>
