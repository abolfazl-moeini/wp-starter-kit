<?php
/**
 * Ajax button field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-mar-y-6">

  <div class="wpdev-row">

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

    // K1-09 / integrate Phase 3.1: prefer shared AJAX client (Ajax_Service envelope).
    if (window.wpdev && window.wpdev.ajax) {
      window.wpdev.ajax.post(action, { nonce: nonce })
        .then(function(res) {
          restore((res && res.message) || default_label);
        })
        .catch(function(err) {
          restore((err && err.message) || default_label);
        });
      return;
    }

    // Fallback: still send the button nonce and guard the envelope.
    $.ajax({
      url: "<?php echo esc_js(admin_url('admin-ajax.php')); ?>",
      method: "POST",
      dataType: "json",
      data: {
        action: action,
        nonce: nonce
      },
      success: function(response) {
        if (!response || response.success === false) {
          var msg = (response && response.message)
            || (response && response.data && response.data.message)
            || default_label;
          restore(msg);
          return;
        }
        restore((response && response.message) || default_label);
      },
      error: function(xhr) {
        var msg = default_label;
        try {
          var parsed = JSON.parse(xhr.responseText);
          msg = (parsed && parsed.message) || msg;
        } catch (e) {}
        restore(msg);
      }
    });

  });
})(jQuery);
</script>
