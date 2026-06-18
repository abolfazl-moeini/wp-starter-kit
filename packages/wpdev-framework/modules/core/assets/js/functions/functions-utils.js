// eslint-disable-next-line no-unused-vars
window.wpdev_block_ui = function(el) {

  jQuery(el).wpdev_block({
    message: '<div class="spinner is-active wpdev-float-none" style="float: none !important;"></div>',
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

  const el_instance = jQuery(el);

  el_instance.unblock = jQuery(el).wpdev_unblock;

  return el_instance;

};

function wpdev_format_money(value) {

  value = parseFloat(value.toString().replace(/[^0-9\.]/g, ''));

  const settings = wp.hooks.applyFilters('wpdev_format_money', {
    currency: {
      symbol: wpdev_settings.currency_symbol, // default currency symbol is '$'
      format: wpdev_settings.currency_position, // controls output: %s = symbol, %v = value/number (can be object: see below)
      decimal: wpdev_settings.decimal_separator, // decimal point separator
      thousand: wpdev_settings.thousand_separator, // thousands separator
      precision: wpdev_settings.precision, // decimal places
    },
    number: {
      precision: 0, // default precision on numbers is 0
      thousand: ',',
      decimal: ',',
    },
  });

  accounting.settings = settings;

  return accounting.formatMoney(value);

} // end wpdev_format_money;

window.wpdev_image_preview = function() {

  const xOffset = 10;

  const yOffset = 30;

  const preview_el = '#wpdev-image-preview';

  // eslint-disable-next-line eqeqeq
  const selector = wpdev_settings.disable_image_zoom == true ? '.wpdev-image-preview:not(img)' : '.wpdev-image-preview';

  const el_id = preview_el.replace('#', '');

  if (jQuery(preview_el).length === 0) {

    jQuery('body').append(
      "<div id='" + el_id + "' class='wpdev-rounded wpdev-p-1 wp-ui-primary' style='max-width: 600px; display: none; z-index: 9999999;'>" +
        "<img class='wpdev-rounded wpdev-block wpdev-m-0 wpdev-p-0 wpdev-bg-gray-100' style='max-width: 100%;' src='' alt=''>" +
      '</div>'
    );

  } // end if;

  /* END CONFIG */
  jQuery(selector).hover(function(e) {

    this.t = this.title;

    this.title = '';

    const img = jQuery(this).data('image');

    jQuery(preview_el)
      .find('img')
      .attr('src', img)
      .attr('alt', this.t)
      .end()
      .css({
        position: 'absolute',
        display: 'none',
      })
      .css('top', (e.pageY - xOffset) + 'px')
      .css('left', (e.pageX + yOffset) + 'px')
      .fadeIn('fast');

  },
  function() {

    this.title = this.t;

    jQuery(preview_el).fadeOut('fast');

  });

  jQuery(selector).mousemove(function(e) {

    jQuery(preview_el)
      .css('top', (e.pageY - xOffset) + 'px')
      .css('left', (e.pageX + yOffset) + 'px');

  });

};

// eslint-disable-next-line no-undef
window.wpdev_initialize_code_editors = function() {

  if (jQuery('[data-code-editor]').length) {

    if (typeof window.wpdev_editor_instances === 'undefined') {

      window.wpdev_editor_instances = {};

    } // end if;

    jQuery('[data-code-editor]').each(function() {

      const code_editor = jQuery(this);

      const editor_id = code_editor.attr('id');

      if (typeof window.wpdev_editor_instances[editor_id] === 'undefined') {

        if (! code_editor.is(':visible')) {

          return;

        } // end if;

        window.wpdev_editor_instances[editor_id] = wp.codeEditor.initialize(editor_id, {
          codemirror: {
            mode: code_editor.data('code-editor'),
            lint: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 2,
            indentWithTabs: true,
            lineNumbers: true,
            lineWrapping: true,
            styleActiveLine: true,
            continueComments: true,
            inputStyle: 'contenteditable',
            direction: 'ltr', // Code is shown in LTR even in RTL languages.
            gutters: [],
            extraKeys: {
              'Ctrl-Space': 'autocomplete',
              'Ctrl-/': 'toggleComment',
              'Cmd-/': 'toggleComment',
              'Alt-F': 'findPersistent',
            },
          },
        });

      } // end if;

    });

  } // end if;

}; // end wpdev_initialize_code_editors;

/**
 * Get a timezone-d moment instance.
 *
 * @param {*} a The date.
 * @return moment instance
 */
window.wpdev_moment = function(a) {

  return moment.tz(a, 'Etc/UTC');

}; // end wpdev_moment;
