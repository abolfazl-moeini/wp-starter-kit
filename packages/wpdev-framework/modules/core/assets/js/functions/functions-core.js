/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* global wpdev_settings, wpdev_input_masks, wpdev_money_input_masks, Cleave, ClipboardJS, wpdev_fields, tinymce, wpdev_media_frame, fontIconPicker */
window.wpdev_initialize_tooltip = function() {

  jQuery('[role="tooltip"]').tipTip({
    attribute: 'aria-label',
  });

}; // end wpdev_initialize_tooltip;

window.wpdev_initialize_editors = function() {

  jQuery('textarea[data-editor]').each(function() {

    tinymce.remove('#' + jQuery(this).attr('id'));

    tinymce.init({
      selector: '#' + jQuery(this).attr('id'), // change this value according to your HTML
      menubar: '',
      theme: 'modern',
      ...wp.editor.getDefaultSettings().tinymce,
    });

  });

}; // end wpdev_initialize_editors

window.wpdev_initialize_imagepicker = function() {

  jQuery('.wpdev-wrapper-image-field').each(function() {

    const that = jQuery(this);

    that.find('img').css({
      maxWidth: '100%',
    });

    const value = that.find('img').attr('src');

    if (value) {

      that.find('.wpdev-wrapper-image-field-upload-actions').show();

    } else {

      that.find('.wpdev-add-image-wrapper').show();

    } // end if;

    that.on('click', 'a.wpdev-add-image', function() {

      if (typeof wpdev_media_frame !== 'undefined') {

        wpdev_media_frame.open();

        return;

      } // end if;

      wpdev_media_frame = wp.media({
        title: wpdev_fields.l10n.image_picker_title,
        multiple: false,
        button: {
          text: wpdev_fields.l10n.image_picker_button_text,
        },
      });

      wpdev_media_frame.on('select', function() {

        const mediaObject = wpdev_media_frame.state().get('selection').first().toJSON();

        const img_el = that.find('img');

        that.find('img').removeClass('wpdev-absolute').attr('src', mediaObject.url);

        that.find('.wubox').attr('href', mediaObject.url);

        that.find('input').val(mediaObject.id);

        that.find('.wpdev-add-image-wrapper').hide();

        img_el.on('load', function() {

          that.find('.wpdev-wrapper-image-field-upload-actions').show();

        });

      });

      wpdev_media_frame.open();

    });

    that.find('.wpdev-remove-image').on('click', function(e) {

      e.preventDefault();

      that.find('img').removeAttr('src').addClass('wpdev-absolute');

      that.find('input').val('');

      that.find('.wpdev-wrapper-image-field-upload-actions').hide();

      that.find('.wpdev-add-image-wrapper').show();

    });

  });

}; // end wpdev_initialize_imagepicker

window.wpdev_initialize_colorpicker = function() {

  jQuery(document).ready(function() {

    jQuery('.wpdev_color_field').each(function() {

      jQuery(this).wpColorPicker();

    });

  });

}; // end wpdev_initialize_colorpicker;

window.wpdev_initialize_iconfontpicker = function() {

  jQuery(document).ready(function() {

    if (jQuery('.wpdev_select_icon').length) {

      jQuery('.wpdev_select_icon').fontIconPicker({
        theme: 'wpdev-theme',
      });

    }

  });

}; // end wpdev_initialize_iconfontpicker;

window.wpdev_initialize_clipboardjs = function() {

  new ClipboardJS('.wpdev-copy');

}; // end wpdev_initialize_clipboardjs;

// DatePicker;
window.wpdev_initialize_datepickers = function() {

  jQuery('.wpdev-datepicker, [wpdev-datepicker]').each(function() {

    const $this = jQuery(this);

    const format = $this.data('format'),
      allow_time = $this.data('allow-time');

    $this.flatpickr({
      animate: false,
      // locale: wpu.datepicker_locale,
      time_24hr: true,
      enableTime: typeof allow_time === 'undefined' ? true : allow_time,
      dateFormat: format,
      allowInput: true,
      defaultDate: $this.val(),
    });

  });

}; // end wpdev_initialize_datepickers;

window.wpdev_update_clock = function() {

  // eslint-disable-next-line no-undef
  const yourTimeZoneFrom = wpdev_ticker.server_clock_offset; // time zone value where you are at

  const d = new Date();
  //get the timezone offset from local time in minutes

  // eslint-disable-next-line no-mixed-operators
  const tzDifference = yourTimeZoneFrom * 60 + d.getTimezoneOffset();

  //convert the offset to milliseconds, add to targetTime, and make a new Date
  const offset = tzDifference * 60 * 1000;

  function callback_update_clock() {

    const tDate = new Date(new Date().getTime() + offset);

    const in_years = tDate.getFullYear();

    let in_months = tDate.getMonth() + 1;

    let in_days = tDate.getDate();

    let in_hours = tDate.getHours();

    let in_minutes = tDate.getMinutes();

    let in_seconds = tDate.getSeconds();

    if (in_months < 10) {

      in_months = '0' + in_months;

    }

    if (in_days < 10) {

      in_days = '0' + in_days;

    }

    if (in_minutes < 10) {

      in_minutes = '0' + in_minutes;

    }

    if (in_seconds < 10) {

      in_seconds = '0' + in_seconds;

    }

    if (in_hours < 10) {

      in_hours = '0' + in_hours;

    }

    jQuery('#wpdev-ticker').text(in_years + '-' + in_months + '-' + in_days + ' ' + in_hours + ':' + in_minutes + ':' + in_seconds);

  }

  function start_clock() {

    setInterval(callback_update_clock, 500);

  }

  start_clock();

};

// eslint-disable-next-line no-unused-vars
function wpdev_on_load() {

  wpdev_initialize_tooltip();

  wpdev_initialize_datepickers();

  wpdev_initialize_colorpicker();

  wpdev_initialize_iconfontpicker();

  wpdev_initialize_editors();

  wpdev_update_clock();

  wpdev_initialize_clipboardjs();

  wpdev_initialize_imagepicker();

  wpdev_image_preview();

} // end wpdev_on_load;

window.wpdev_on_load = wpdev_on_load;

