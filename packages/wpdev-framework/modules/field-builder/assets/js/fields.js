/* global Vue */

if (typeof window.Vue !== 'undefined') {

  /**
   * Registers the ColorPicker component.
   *
   * @since 2.0.0
   */
  Vue.component('colorPicker', {
    props: ['value'],
    template: '<input type="text">',
    mounted() {

      const vm = this;

      $(this.$el)
        .val(this.value)
        .wpColorPicker({
          width: 200,
          defaultColor: this.value,
          change(event, ui) {

            // emit change event on color change using mouse
            vm.$emit('input', ui.color.toString());

          },
        });

    },
    watch: {
      value(value) {

        // update value
        $(this.$el).wpColorPicker('color', value);

      },
    },
    destroyed() {

      $(this.$el).off().wpColorPicker('destroy'); // (!) Not tested

    },
  });

} // end if;

if (typeof window.wpdev_init_selection_limits === 'function') {
  if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(function() {
      window.wpdev_init_selection_limits();
    });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      window.wpdev_init_selection_limits();
    });
  }
}

if (typeof window.wpdev_init_gallery_fields === 'function') {
  if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(function() {
      window.wpdev_init_gallery_fields();
    });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      window.wpdev_init_gallery_fields();
    });
  }
}

if (!window.wpdevQuickAddTerm) {
  window.wpdevQuickAddTerm = {
    onTermCreated: function(data, removeBox) {
      if (!data || !data.term_id) {
        if (typeof removeBox === 'function') removeBox();
        return;
      }
      var fieldId = data.field_id || '';
      var termId = data.term_id;
      var termName = data.term_name || '';

      var container = null;
      if (fieldId) {
        var fieldWrapper = document.querySelector('.field-multi_checkbox-' + fieldId + ', .field-multiselect-' + fieldId + ', [id*="' + fieldId + '"]');
        if (fieldWrapper) {
          container = fieldWrapper.querySelector('ul.wpdev-multiselect-content, ul.items');
        }
      }
      if (!container && data.taxonomy) {
        var btn = document.querySelector('a[data-taxonomy="' + data.taxonomy + '"]');
        if (btn) {
          var wrap = btn.closest('.field-multi_checkbox, .field-multiselect, li');
          if (wrap) {
            container = wrap.querySelector('ul.wpdev-multiselect-content, ul.items');
          }
        }
      }

      if (container) {
        var inputName = fieldId ? (fieldId + '[]') : (data.taxonomy ? ('tax_input_' + data.taxonomy + '[]') : 'tax_input[]');
        var inputId = (fieldId || 'tax_input') + '_' + termId;

        var li = document.createElement('li');
        li.className = 'item wpdev-box-border wpdev-mar-0 wpdev-mar-y-2';

        var div = document.createElement('div');
        div.className = 'wpdev-surface-gray-100 wpdev-pad-3 wpdev-mar-0 wpdev-border-gray-300 wpdev-border-solid wpdev-border wpdev-radius wpdev-items-center wpdev-row wpdev-justify-between';

        var label = document.createElement('label');
        label.setAttribute('for', inputId);
        label.className = 'wpdev-block wpdev-cursor-pointer wpdev-flex-grow';

        var span = document.createElement('span');
        span.className = 'wpdev-mar-y-1 wpdev-type-xs wpdev-font-bold wpdev-block';
        span.appendChild(document.createTextNode(termName));
        label.appendChild(span);

        var chkSpan = document.createElement('span');
        chkSpan.className = 'wpdev-block wpdev-mar-l-2';

        var chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.id = inputId;
        chk.name = inputName;
        chk.value = String(termId);
        chk.checked = true;
        chk.className = 'wpdev-checkbox';

        chkSpan.appendChild(chk);
        div.appendChild(label);
        div.appendChild(chkSpan);
        li.appendChild(div);
        container.appendChild(li);

        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (typeof removeBox === 'function') {
        removeBox();
      }
    }
  };
}
