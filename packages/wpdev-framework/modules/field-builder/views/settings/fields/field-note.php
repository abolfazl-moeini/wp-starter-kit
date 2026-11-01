<?php
/**
 * Note field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-mar-y-6">

  <div class="wpdev-row">

    <?php if ($field->title) : ?>

    <div class="wpdev-w-1/3">

      <label for="<?php echo esc_attr($field->id); ?>">

        <?php echo $field->title; ?>

      </label>

    </div>

    <?php endif; ?>

    <div class="<?php echo esc_attr($field->title ? 'wpdev-w-2/3' : 'wpdev-full'); ?>">

      <?php $note_content = ! empty( $field->desc ) ? $field->desc : ( ! empty( $field->content ) ? $field->content : '' ); ?>
      <?php if ( $note_content ) : ?>

        <p class="description" id="<?php echo esc_attr($field->id); ?>-desc">

          <?php echo $note_content; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

  <?php // if (isset($field['tooltip'])) {echo wpdev_Util::tooltip($field['tooltip']);} ?>

</div>
