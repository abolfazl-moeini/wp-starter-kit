<?php
/**
 * Domain mapping view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <!-- Title Element -->
    <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

      <?php if ($title) : ?>

        <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

          <?php echo $title; ?>

        </h3>

      <?php endif; ?>

      <div class="wpdev-ml-auto">

        <a title="<?php _e('Add Domain', 'wpdev'); ?>" href="<?php echo $modal['url']; ?>" class="wpdev-text-sm wpdev-no-underline wubox button">

          <?php _e('Add Domain', 'wpdev'); ?>

        </a>

      </div>

    </div>
    <!-- Title Element - End -->

    <div class="wpdev-border-t wpdev-border-solid wpdev-border-0 wpdev-border-gray-200">

      <table class="wpdev-m-0 wpdev-my-2 wpdev-p-0 wpdev-w-full">

        <tbody class="wpdev-align-baseline">

          <?php if ($domains) : ?>

              <?php foreach ($domains as $key => $domain) : $item = $domain['domain_object']; ?>

                  <tr>

                    <td class="wpdev-px-1">

                      <?php

                      $label = $item->get_stage_label();

                      if (!$item->is_active()) {

                        $label = sprintf('%s <small>(%s)</small>', $label, __('Inactive', 'wpdev'));

                      } // end if;

                      $class = $item->get_stage_class();

                      $status = "<span class='wpdev-py-1 wpdev-px-2 wpdev-rounded-sm wpdev-text-xs wpdev-leading-none wpdev-font-mono $class'>{$label}</span>";

                      $second_row_actions = array();

                      if (!$item->is_primary_domain()) {

                        $second_row_actions['make_primary'] = array(
                          'wrapper_classes' => 'wubox',
                          'icon'            => 'dashicons-wpdev-edit1 wpdev-align-middle wpdev-mr-1',
                          'label'           => '',
                          'url'             => $domain['primary_link'],
                          'value'           => __('Make Primary', 'wpdev'),
                        );

                      } // end if;

                      $second_row_actions['remove'] = array(
                        'wrapper_classes' => 'wpdev-text-red-500 wubox',
                        'icon'            => 'dashicons-wpdev-trash-2 wpdev-align-middle wpdev-mr-1',
                        'label'           => '',
                        'value'           => __('Delete', 'wpdev'),
                        'url'             => $domain['delete_link'],
                      );

                      echo wpdev_responsive_table_row(array(
                        'id'     => false,
                        'title'  => strtolower($item->get_domain()),
                        'url'    => false,
                        'status' => $status,
                      ), array(
                        'primary' => array(
                          'wrapper_classes' => $item->is_primary_domain() ? 'wpdev-text-blue-600' : '',
                          'icon'  => $item->is_primary_domain() ? 'dashicons-wpdev-filter_1 wpdev-align-text-bottom wpdev-mr-1' : 'dashicons-wpdev-plus-square wpdev-align-text-bottom wpdev-mr-1',
                          'label' => '',
                          'value' => $item->is_primary_domain() ? __('Primary', 'wpdev').wpdev_tooltip(__('All other mapped domains will redirect to the primary domain.', 'wpdev'), 'dashicons-editor-help wpdev-align-middle wpdev-ml-1') : __('Alias', 'wpdev'),
                        ),
                        'secure'  => array(
                          'wrapper_classes' => $item->is_secure() ? 'wpdev-text-green-500' : '',
                          'icon'            => $item->is_secure() ? 'dashicons-wpdev-lock1 wpdev-align-text-bottom wpdev-mr-1' : 'dashicons-wpdev-lock1 wpdev-align-text-bottom wpdev-mr-1',
                          'label'           => '',
                          'value'           => $item->is_secure() ? __('Secure (HTTPS)', 'wpdev') : __('Not Secure (HTTP)', 'wpdev'),
                        ),
                      ),
                      $second_row_actions);

                      ?>

                    </td>

                  </tr>

              <?php endforeach; ?>

          <?php else : ?>

            <div class="wpdev-text-center wpdev-bg-gray-100 wpdev-rounded wpdev-uppercase wpdev-font-semibold wpdev-text-xs wpdev-text-gray-700 wpdev-p-4 wpdev-m-4 wpdev-mt-6">
              <span><?php echo __('No domains added.', 'wpdev'); ?></span>
            </div>

          <?php endif; ?>

        </tbody>

    </table>

    </div>

  </div>

</div>
