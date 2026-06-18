<?php
/**
 * Ajax button field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-my-6">

  <div class="wpdev-flex">

    <div class="wpdev-w-1/3">

      <label for="<?php echo esc_attr($field->id); ?>">

        <?php echo $field->title; ?>

      </label>

    </div>

    <div class="wpdev-w-2/3">

      <label for="<?php echo esc_attr($field->id); ?>">
        <button class="button" name="<?php echo esc_attr($field->id); ?>" id="<?php echo esc_attr($field->id); ?>" value="<?php echo wp_create_nonce($field->action); ?>">
          <?php echo $field->title; ?>
        </button>
      </label>

      <?php if ($field->desc) : ?>

        <p class="description" id="<?php echo $field->id; ?>-desc">

          <?php echo $field->desc; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

  <?php // if (isset($field['tooltip'])) {echo wpdev_Util::tooltip($field['tooltip']);} ?>

</div>

<script type="text/javascript">
(function($) {
  $('#<?php echo esc_js($field->id); ?>').on('click', function(e) {

    e.preventDefault();

    var $this = $(this);
    var default_label = $this.html();
    var action = "<?php echo esc_js($field->action); ?>";
    var nonce = $this.val();

    $this.html('...').attr('disabled', 'disabled');

    function restore(message) {
      $this.html(message || default_label);
      setTimeout(function() {
        $this.html(default_label).removeAttr('disabled');
      }, 4000);
    }

    // K1-09: route through the shared AJAX client (Ajax_Service envelope).
    if (window.wpdev && window.wpdev.ajax) {
      window.wpdev.ajax.post(action, { nonce: nonce })
        .then(function(res) { restore(res.message); })
        .catch(function(err) { restore(err.message); });
      return;
    }

    $.ajax({
      url: "<?php echo esc_js(admin_url('admin-ajax.php?action=').$field->action); ?>",
      dataType: "json",
      success: function(response) { restore(response.message); }
    });

  });
})(jQuery);
</script>
