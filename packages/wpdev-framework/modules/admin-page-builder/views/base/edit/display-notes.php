<?php
/**
 * Display notes widget view.
 *
 * @since 2.0.0
 */
?>

<?php if (empty($notes)) : ?>

	<?php echo wpdev_render_empty_state(array(
		'message'                  => __("No notes yet.", 'wpdev'),
		'sub_message'              => __('Use the "Add new Note" to create the first one.', 'wpdev'),
		'link_url'                 => false,
		'display_background_image' => false,
	)); ?>

<?php else : ?>

	<?php foreach ($notes as $note) : ?>

		<div class="wpdev-flex wpdev-justify-end wpdev-items-end wpdev-flex-col wpdev-mt-4">

			<div class="wpdev-m-0 wpdev-p-3 wpdev-rounded wpdev-bg-gray-200 wpdev-text-right" id="wpdev-text-note">

				<?php echo wp_kses_post( wpdev_remove_empty_p( $note->text ) ); ?>

			</div>

			<div class="wpdev-m-0 wpdev-mb-4 wpdev-p-0" id="wpdev-date-avatar">

				<?php $user = get_user_by('ID', $note->author_id); ?>

				<div class="wpdev-flex wpdev-overflow-hidden wpdev-ml-3 wpdev-mt-1">

					<?php echo wp_kses_post(get_avatar($note->author_id, 20, 'identicon', '', array('force_display' => true, 'class' => 'wpdev-rounded-full wpdev-mr-2'))); ?> <?php echo esc_html( $user->display_name ); ?>

				</div>

				<div class="wpdev-text-right">

					<span class="wpdev-text-xs wpdev-text-gray-500">

						<?php echo esc_html(date_i18n('M d, H:i', strtotime($note->date_created))); ?>

					</span>

					<?php if (current_user_can('delete_notes')) : ?>

						<?php $modal_atts = array(
							'object_id' => wpdev_request('id'),
							'model'     => $model,
							'note_id'   => $note->note_id,
							'height'    => 306,
						); ?>

						<span class="wpdev-ml-2">

							<a class="dashicons-wpdev-trash wpdev-p-0 wpdev-border-none wpdev-text-red-600 wpdev-button-delete wpdev-no-underline wubox" href="<?php echo esc_url(wpdev_get_form_url('delete_note', $modal_atts)); ?>"
							title="<?php echo esc_attr__('Clear Note', 'wpdev'); ?>"></a>

						</span>

					<?php endif; ?>

				</div>

			</div>

		</div>

	<?php endforeach; ?>

<?php endif; ?>
