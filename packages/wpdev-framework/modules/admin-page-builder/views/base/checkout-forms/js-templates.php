<?php
/**
 * JS templates view.
 *
 * @since 2.0.0
 */
?>
<script type="text/x-template" id="wpdev-table">

<table class="wp-list-table widefat fixed striped">

	<thead>

		<tr>

			<th v-for="(header_label, header) in headers" :key="header" scope="col" v-html="header_label" :class="'manage-column column-' + header"></th>

		</tr>

	</thead>

	<tbody v-if="list.length === 0">
		<tr class="no-items">
			<td :colspan="Object.keys(headers).length" class="colspanchange">
				<div class="wpdev-p-6 wpdev-text-gray-600 wpdev-text-base wpdev-text-center">
					<span><?php _e('Add the first field!', 'wpdev'); ?></span>
				</div>
			</td>
		</tr>
	</tbody>

	<draggable
		:list="list"
		:tag="'tbody'"
		group="field"
		handle=".wpdev-placeholder-sortable"
		ghost-class="wpdev-draggable-field-ghost"
		drag-class="wpdev-bg-white"
	>

		<tr v-for="(field, idx) in list" :key="field.id" :id="'wpdev-field-' + field.id">

			<td class="order column-order has-row-actions column-primary" data-colname="<?php _e('Order', 'wpdev'); ?>">

				<span
					class="wpdev-inline-block wpdev-bg-gray-100 wpdev-text-center wpdev-align-middle wpdev-p-1 wpdev-font-mono wpdev-px-3 wpdev-border wpdev-border-gray-300 wpdev-border-solid wpdev-rounded">
					{{ parseInt(idx, 10) + 1 }}
				</span>

				<button type="button" class="toggle-row">
					<span class="screen-reader-text"><?php _e('Show more details', 'wpdev'); ?></span>
				</button>

			</td>

			<td class="name column-name" data-colname="<?php _e('Name', 'wpdev'); ?>">

				<span class="wpdev-inline-block wpdev-font-medium">

					{{ field.name ? field.name : "<?php echo __('(no label)', 'wpdev'); ?>" }}

					<!-- Visibility -->
          <span
						v-if="field.logged && field.logged == 'guests_only'"
						class="wpdev-px-1 wpdev-ml-1 wpdev-text-xs wpdev-align-text-bottom wpdev-inline-block wpdev-rounded wpdev-bg-blue-100 wpdev-text-blue-600"
					>
            <?php echo wpdev_tooltip('Guests only', 'dashicons-wpdev-eye'); ?>
          </span>

          <span
						v-if="field.logged && field.logged == 'logged_only'"
						class="wpdev-px-1 wpdev-ml-1 wpdev-text-xs wpdev-align-text-bottom wpdev-inline-block wpdev-rounded wpdev-bg-blue-100 wpdev-text-blue-600"
					>
            <?php echo wpdev_tooltip('Logged-in users only', 'dashicons-wpdev-eye'); ?>
          </span>
          <!-- Visibility - End -->

				</span>

				<div class="row-actions">
					<span class="edit">
						<a
							title="Edit Field"
							class="wubox"
							:href="'<?php echo wpdev_get_form_url('add_new_form_field', array(
								'checkout_form' => $checkout_form,
								'step'          => '',
							)); ?>=' + step_name + '&field=' + field.id"
							>
								<?php _e('Edit'); ?>
						</a>
						|
					</span>
					<span class="delete">

						<a
							v-show="delete_field_id !== field.id"
							v-on:click.prevent="delete_field_id = field.id"
							title="<?php _e('Delete'); ?>"
							href="#"
						><?php _e('Delete'); ?></a>

						<a
							v-show="delete_field_id === field.id"
							v-on:click.prevent="remove_field(field.id)"
							title="<?php _e('Delete'); ?>"
							href="#"
							class="wpdev-font-bold"
						><?php _e('Confirm?', 'wpdev'); ?></a>

					</span>
				</div>

				<button type="button" class="toggle-row">
					<span class="screen-reader-text">
						<?php _e('Show more details', 'wpdev'); ?>
					</span>
				</button>

			</td>

			<td class="type column-type" data-colname="<?php _e('Type', 'wpdev'); ?>">
				<span class="wpdev-bg-gray-200 wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-rounded-sm wpdev-text-xs wpdev-font-mono">{{ field.type }}</span>
			</td>

			<td class="type column-slug" data-colname="<?php _e('Slug', 'wpdev'); ?>">
				<span class="wpdev-bg-gray-200 wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-rounded-sm wpdev-text-xs wpdev-font-mono">{{ field.id }}</span>
			</td>

			<td class="move column-move wpdev-text-right" data-colname="<?php _e('Move', 'wpdev'); ?>">

				<span class="wpdev-placeholder-sortable dashicons-wpdev-menu"></span>

			</td>

		</tr>

	</draggable>

</table>

</script>
