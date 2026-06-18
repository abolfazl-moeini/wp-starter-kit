/**
 * Playground parity list pages — load curated sample data via AJAX.
 *
 * @package WPDev
 * @since   2.7.0
 */
(function ($) {
  'use strict';

  var cfg = window.wpdev_playground_seeder || {};

  function getAjax() {
    return window.wpdev && window.wpdev.ajax ? window.wpdev.ajax : null;
  }

  function setLoading($btn, loading) {
    if (!$btn || !$btn.length) {
      return;
    }

    if (loading) {
      $btn.data('wpdev-original-label', $btn.text());
      $btn.addClass('disabled').attr('aria-disabled', 'true').css('pointer-events', 'none');
      $btn.text(cfg.strings && cfg.strings.loading ? cfg.strings.loading : 'Loading…');
      return;
    }

    var original = $btn.data('wpdev-original-label');

    if (original) {
      $btn.text(original);
    }

    $btn.removeClass('disabled').removeAttr('aria-disabled').css('pointer-events', '');
  }

  $(document).on('click', 'a.wpdev-playground-load-sample-data', function (e) {
    e.preventDefault();

    var $btn = $(this);
    var ajax = getAjax();

    if (!ajax || typeof ajax.post !== 'function') {
      window.alert(cfg.strings && cfg.strings.error ? cfg.strings.error : 'AJAX unavailable.');
      return;
    }

    setLoading($btn, true);

    ajax
      .post(cfg.action || 'wpdev_playground_load_sample_data', {
        entity: cfg.entity || '',
        nonce: cfg.nonce || undefined,
      })
      .then(function () {
        window.location.reload();
      })
      .catch(function (err) {
        setLoading($btn, false);
        var message =
          (err && err.message) ||
          (cfg.strings && cfg.strings.error) ||
          'Could not load sample data.';
        window.alert(message);
      });
  });
})(jQuery);
