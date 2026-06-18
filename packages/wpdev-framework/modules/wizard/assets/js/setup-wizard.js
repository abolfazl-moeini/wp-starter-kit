/* global wpdev_setup, wpdev_setup_settings, ajaxurl, wpdev_block_ui_polyfill, _wpdev_block_ui_polyfill  */
(function($) {

  window._wpdev_block_ui_polyfill = wpdev_block_ui_polyfill;

  wpdev_block_ui_polyfill = function() { };

  $(document).ready(function() {

    // Click button
    // Generates queue
    // Start to process queue items one by one
    // Changes the status
    // Move to the next item
    // When all is done, redirect to the next page via a form submission
    $('#poststuff').on('submit', 'form', function(e) {

      e.preventDefault();

      const $form = $(this);

      const install_id = $form.find('table[data-id]').data('id');

      $form.find('[name=next]').attr('disabled', 'disabled');

      let queue = $form.find('tr[data-content]');

      /*
       * Only keep items selected on the queue.
       */
      queue = queue.filter(function() {

        const checkbox = $(this).find('input[type=checkbox]');

        if (checkbox.length) {

          return checkbox.is(':checked');

        } // end if;

        return true;

      });

      let successes = 0;

      let index = 0;

      process_queue_item(queue.eq(index));

      /**
       * Process the queue items one by one recursively.
       *
       * @param {string} item The item to process.
       */
      function process_queue_item(item) {

        window.onbeforeunload = function() {

          return '';

        };

        if (item.length === 0) {

          if (queue.length === successes) {

            window.onbeforeunload = null;

            _wpdev_block_ui_polyfill($('#poststuff .inside'));

            setTimeout(() => {

              $form.get(0).submit();

            }, 100);

          } // end if;

          $form.find('[name=next]').removeAttr('disabled');

          return false;

        } // end if;

        const $item = $(item);

        const content = $item.data('content');

        $item.get(0).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        $item.find('td.status')
          .attr('class', '')
          .addClass('status')
          .find('> span').html(wpdev_setup[content].installing).end()
          .find('.spinner').addClass('is-active').end()
          .find('a.help').slideUp();

        // Ajax request
        $.ajax({
          url: ajaxurl,
          method: 'post',
          data: {
            action: 'wpdev_setup_install',
            installer: content,
            'dry-run': wpdev_setup_settings.dry_run,
            nonce: wpdev_setup_settings.nonce,
          },
          success(data) {

            if (data.success === true) {

              $item.find('td.status')
                .attr('class', '')
                .addClass('status wpdev-text-green-600')
                .find('> span').html(wpdev_setup[content].success).end()
                .find('.spinner').removeClass('is-active');

              $item.removeAttr('data-content');

              successes++;

            } else {

              $item.find('td.status')
                .attr('class', '')
                .addClass('status wpdev-text-red-400')
                .find('> span').html(data.data[0].message).end()
                .find('.spinner').removeClass('is-active').end()
                .find('a.help').slideDown();

            } // end if;

            index++;

            process_queue_item(queue.eq(index));

          },
          error() {

            $item.find('td.status')
              .attr('class', '')
              .addClass('status wpdev-text-red-400')
              .find('span').html('').end()
              .find('.spinner').removeClass('is-active').end()
              .find('a.help').slideDown();

            index++;

            process_queue_item(queue.eq(index));

          },
        });

      } // end process_queue_item;

    });

  });

}(jQuery));

if (typeof wpdev_initialize_tooltip !== 'function') {

  const wpdev_initialize_tooltip = function() {

    jQuery('[role="tooltip"]').tipTip({
      attribute: 'aria-label',
    });

  }; // end wpdev_initialize_tooltip;

  // eslint-disable-next-line no-unused-vars
  const wpdev_block_ui = function(el) {

    jQuery(el).wpdev_block({
      message: '<span>Please wait...</span>',
      overlayCSS: {
        backgroundColor: '#FFF',
        opacity: 0.6,
      },
      css: {
        padding: 0,
        margin: 0,
        width: '50%',
        fontSize: '14px !important',
        top: '40%',
        left: '35%',
        textAlign: 'center',
        color: '#000',
        border: 'none',
        backgroundColor: 'none',
        cursor: 'wait',
      },
    });

    return jQuery(el);

  };

  (function($) {

    $(document).ready(function() {

      wpdev_initialize_tooltip();

    });

  }(jQuery));

} // end if;
