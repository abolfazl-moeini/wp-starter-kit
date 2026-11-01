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
      maxHeight: '100px',
      objectFit: 'contain',
      height: 'auto',
    });

    const src = that.find('img').attr('src');

    if (src && src.trim() !== '') {

      that.find('.wpdev-image-preview-wrap').show();
      that.find('.wpdev-wrapper-image-field-upload-actions').show();
      that.find('.wpdev-add-image-wrapper').hide();
      that.find('.wpdev-change-image-wrapper').show();

    } else {

      that.find('.wpdev-image-preview-wrap').hide();
      that.find('.wpdev-wrapper-image-field-upload-actions').hide();
      that.find('.wpdev-add-image-wrapper').show();
      that.find('.wpdev-change-image-wrapper').hide();

    } // end if;

    that.off('click', 'a.wpdev-add-image, a.wpdev-change-image').on('click', 'a.wpdev-add-image, a.wpdev-change-image', function(e) {

      e.preventDefault();

      const picker_title = (typeof wpdev_fields !== 'undefined' && wpdev_fields.l10n && wpdev_fields.l10n.image_picker_title)
        ? wpdev_fields.l10n.image_picker_title
        : 'Select Image';
      const picker_button = (typeof wpdev_fields !== 'undefined' && wpdev_fields.l10n && wpdev_fields.l10n.image_picker_button_text)
        ? wpdev_fields.l10n.image_picker_button_text
        : 'Select';

      const frame = wp.media({
        title: picker_title,
        multiple: false,
        button: {
          text: picker_button,
        },
      });

      frame.on('select', function() {

        const mediaObject = frame.state().get('selection').first().toJSON();

        const img_el = that.find('img');

        img_el.removeClass('wpdev-absolute').attr('src', mediaObject.url).show().css({
          maxWidth: '100%',
          maxHeight: '100px',
          objectFit: 'contain',
          height: 'auto',
          display: 'block',
        });

        that.find('.wubox').attr('href', mediaObject.url);

        that.find('input[type="hidden"]').val(mediaObject.id).trigger('change');

        that.find('.wpdev-image-preview-wrap').show();
        that.find('.wpdev-wrapper-image-field-upload-actions').show();
        that.find('.wpdev-add-image-wrapper').hide();
        that.find('.wpdev-change-image-wrapper').show();

      });

      frame.open();

    });

    that.off('click', 'a.wpdev-remove-image').on('click', function(e) {

      e.preventDefault();

      that.find('img').removeAttr('src').addClass('wpdev-absolute').hide();

      that.find('.wubox').removeAttr('href');

      that.find('input[type="hidden"]').val('').trigger('change');

      that.find('.wpdev-image-preview-wrap').hide();
      that.find('.wpdev-wrapper-image-field-upload-actions').hide();
      that.find('.wpdev-change-image-wrapper').hide();
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

/**
 * Pad a number to 2 digits.
 *
 * @param {number} value
 * @return {string}
 */
window.wpdev_datepicker_pad = function(value) {
  return String(value).padStart(2, '0');
};

/**
 * Whether a Flatpickr locale key enables the Jalali calendar (flatpickr-wrap).
 *
 * @param {string} locale
 * @return {boolean}
 */
window.wpdev_datepicker_is_jalali_locale = function(locale) {
  return locale === 'fa' || locale === 'fa-IR';
};

/**
 * Resolve datepicker locale: per-input data-locale → wpdev_settings → default.
 *
 * @param {JQuery} $input
 * @return {string}
 */
window.wpdev_datepicker_resolve_locale = function($input) {
  const from_input = $input.attr('data-locale') || $input.data('locale');
  if (typeof from_input !== 'undefined' && from_input !== null && from_input !== '') {
    return String(from_input);
  }

  if (typeof wpdev_settings !== 'undefined' && wpdev_settings.datepicker_locale) {
    return String(wpdev_settings.datepicker_locale);
  }

  return 'default';
};

/**
 * Convert Jalali Y/M/D to a Gregorian Date (local time).
 *
 * @param {number} jy
 * @param {number} jm 1-12
 * @param {number} jd
 * @param {number} [hour]
 * @param {number} [minute]
 * @param {number} [second]
 * @return {Date|undefined}
 */
window.wpdev_jalali_to_gregorian_date = function(jy, jm, jd, hour, minute, second) {
  if (typeof wpdev_jalaali === 'undefined' || typeof wpdev_jalaali.jalaaliToDateObject !== 'function') {
    return undefined;
  }

  try {
    const date = wpdev_jalaali.jalaaliToDateObject(
      Number(jy),
      Number(jm),
      Number(jd),
      hour ? Number(hour) : 0,
      minute ? Number(minute) : 0,
      second ? Number(second) : 0
    );

    return isNaN(date.getTime()) ? undefined : date;
  } catch (e) {
    return undefined;
  }
};

/**
 * Format a Date with Flatpickr-like tokens using Gregorian getters.
 * Keeps form/DB values as Gregorian even when the calendar UI is Jalali.
 *
 * @param {Date} date
 * @param {string} format
 * @return {string}
 */
window.wpdev_format_gregorian_date = function(date, format) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const map = {
    Y: String(Date.prototype.getFullYear.call(date)),
    m: wpdev_datepicker_pad(Date.prototype.getMonth.call(date) + 1),
    d: wpdev_datepicker_pad(Date.prototype.getDate.call(date)),
    H: wpdev_datepicker_pad(Date.prototype.getHours.call(date)),
    i: wpdev_datepicker_pad(Date.prototype.getMinutes.call(date)),
    S: wpdev_datepicker_pad(Date.prototype.getSeconds.call(date)),
  };

  return String(format || 'Y-m-d').replace(/Y|m|d|H|i|S/g, function(token) {
    return map[token];
  });
};

/**
 * Format a Date with Flatpickr-like tokens using the Date's own getters
 * (Jalali when flatpickr-wrap locale fa is active).
 *
 * @param {Date} date
 * @param {string} format
 * @return {string}
 */
window.wpdev_format_locale_date = function(date, format) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const map = {
    Y: String(date.getFullYear()),
    m: wpdev_datepicker_pad(date.getMonth() + 1),
    d: wpdev_datepicker_pad(date.getDate()),
    H: wpdev_datepicker_pad(date.getHours()),
    i: wpdev_datepicker_pad(date.getMinutes()),
    S: wpdev_datepicker_pad(date.getSeconds()),
  };

  return String(format || 'Y-m-d').replace(/Y|m|d|H|i|S/g, function(token) {
    return map[token];
  });
};

/**
 * Parse a Gregorian date string into a Date.
 *
 * @param {string} date_str
 * @return {Date|undefined}
 */
window.wpdev_parse_gregorian_date = function(date_str) {
  if (!date_str) {
    return undefined;
  }

  const match = String(date_str).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  // Self-healing: if an input value contains a Jalali year (1300-1500) because PHP
  // formatted with wp_date() or date_i18n() on a Persian site, parse as Jalali!
  if (year >= 1300 && year <= 1500) {
    return wpdev_jalali_to_gregorian_date(
      match[1],
      match[2],
      match[3],
      match[4],
      match[5],
      match[6]
    );
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    match[4] ? Number(match[4]) : 0,
    match[5] ? Number(match[5]) : 0,
    match[6] ? Number(match[6]) : 0
  );

  return isNaN(date.getTime()) ? undefined : date;
};

/**
 * Parse a Jalali date string (Y/m/d or Y-m-d, optional time) into a Date.
 *
 * @param {string} date_str
 * @return {Date|undefined}
 */
window.wpdev_parse_jalali_date = function(date_str) {
  if (!date_str) {
    return undefined;
  }

  const match = String(date_str).trim().match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );

  if (!match) {
    return undefined;
  }

  return wpdev_jalali_to_gregorian_date(
    match[1],
    match[2],
    match[3],
    match[4],
    match[5],
    match[6]
  );
};

// DatePicker (Flatpickr / flatpickr-wrap with optional Jalali UI);
window.wpdev_initialize_datepickers = function() {

  jQuery('.wpdev-datepicker, [wpdev-datepicker]').each(function() {

    const $this = jQuery(this);

    if (this._flatpickr) {
      return;
    }

    const format = $this.data('format') || 'Y-m-d',
      allow_time = $this.data('allow-time'),
      locale = wpdev_datepicker_resolve_locale($this),
      jalali = wpdev_datepicker_is_jalali_locale(locale),
      enable_time = typeof allow_time === 'undefined' ? true : allow_time,
      alt_format = $this.data('alt-format') || (enable_time ? (format.indexOf(':S') !== -1 || format.indexOf(':s') !== -1 ? 'Y/m/d H:i:S' : 'Y/m/d H:i') : 'Y/m/d');

    const config = {
      animate: false,
      time_24hr: true,
      enableTime: enable_time,
      dateFormat: format,
      allowInput: true,
      defaultDate: $this.val() || undefined,
      disableMobile: true,
    };

    if (locale && locale !== 'default') {
      config.locale = locale;
    }

    // Jalali calendar UI (fa) while keeping the real input value Gregorian.
    if (jalali) {
      config.altInput = true;
      config.altFormat = alt_format;
      config.formatDate = function(date, format_str) {
        if (format_str === format) {
          return wpdev_format_gregorian_date(date, format_str);
        }

        return wpdev_format_locale_date(date, format_str);
      };
      config.parseDate = function(date_str, format_str) {
        if (!date_str) {
          return undefined;
        }

        if (format_str === format) {
          return wpdev_parse_gregorian_date(date_str);
        }

        // Time-only string handling (e.g. minTime/maxTime parsing in Flatpickr)
        if (/^\d{1,2}:\d{2}/.test(String(date_str).trim())) {
          const tMatch = String(date_str).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
          if (tMatch) {
            const d = new Date();
            d.setHours(Number(tMatch[1]), Number(tMatch[2]), tMatch[3] ? Number(tMatch[3]) : 0, 0);
            return d;
          }
        }

        return wpdev_parse_jalali_date(date_str);
      };
    }

    $this.flatpickr(config);

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

  if (typeof window.wpdev_init_gallery_fields === 'function') {
    window.wpdev_init_gallery_fields();
  }

} // end wpdev_on_load;

window.wpdev_on_load = wpdev_on_load;

