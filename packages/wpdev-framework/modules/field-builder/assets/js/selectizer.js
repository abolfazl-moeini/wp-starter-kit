/* global _, wpdev_initialize_selectizer, wpdev_selector */
(function($) {

  $(document).ready(function() {

    window.wpdev_initialize_selectizer = function() {

      jQuery('[data-selectize]').selectize();

      $.each($('[data-selectize-categories]'), function(index, item) {

        jQuery($(item)).selectize({
          maxItems: $(item).data('max-items') || 10,
          create(input) {

            return {
              value: input,
              text: input,
            };

          },
        });

      });

      $.each($('[data-model]'), function(index, item) {

        wpdev_selector({
          el: item,
          valueField: $(item).data('value-field'),
          labelField: $(item).data('label-field'),
          searchField: $(item).data('search-field'),
          maxItems: $(item).data('max-items'),
          selected: $(item).data('selected'),
          options: [],
          data: {
            action: 'wpdev_search',
            model: $(item).data('model'),
            number: 10,
            exclude: $(item).data('exclude'),
            include: $(item).data('include'),
          },
        });

      });

    };

    wpdev_initialize_selectizer();

    jQuery('body').on('wubox:load', function() {

      wpdev_initialize_selectizer();

    });

  });

  window.wpdev_selector = function wpdev_selector(options) {

    options = _.defaults(options, {
      options: [],
      maxItems: 1,
      templateName: false,
      create: false,
    });

    if (jQuery(options.el).data('init')) {

      return;

    } // end if;

    jQuery(options.el).data('__options', options);

    const select = jQuery(options.el).selectize({
      valueField: options.valueField,
      labelField: options.labelField,
      searchField: ['text', 'name', 'display_name', 'domain', 'path', 'title', 'desc', 'code', 'post_title', 'reference_code'],
      options: options.options,
      maxItems: options.maxItems,
      create: options.create,
      render: {
        option(option) {

          const templateName = options.templateName ? options.templateName : options.data.model;

          const template_html = jQuery('#wpdev-template-' + templateName).length
            ? jQuery('#wpdev-template-' + templateName).html()
            : jQuery('#wpdev-template-default').html();

          const template = _.template(template_html, {
            interpolate: /\{\{(.+?)\}\}/g,
          });

          const render = template(option);

          return render;

        },
      },
      load(query, callback) {

        if (! query.length) {

          return callback();

        } // end if;

        const __options = jQuery(options.el).data('__options');

        jQuery.ajax({
          // eslint-disable-next-line no-undef
          url: wpdev_selectizer.ajaxurl,
          type: 'POST',
          data: {
            ...__options.data,
            query: {
              search: '*' + query + '*',
            },
          },
          error() {

            callback();

          },
          success(res) {

            selectize.savedItems = res;

            callback(res);

          },
        });

      },
    });

    jQuery(options.el).attr('data-init', 1);

    const selectize = select[0].selectize;

    /*
     * Makes sure this is reactive for vue
     */
    selectize.on('change', function(value) {

      const input = jQuery(select[0]);

      const vue_app = input.parents('[data-wpdev-app]').data('wpdev-app');

      if (vue_app && typeof window['wpdev_' + vue_app] !== 'undefined') {

        window['wpdev_' + vue_app][input.attr('name')] = value;

      } // end if;

    });

    selectize.on('item_add', function(value) {

      let active_item = {
        url: null,
      };

      jQuery.each(selectize.savedItems, function(index, item) {

        if (item.setting_id === value) {

          active_item = item;

        } // end if;

      });

      if (active_item.url) {

        window.location.href = active_item.url;

      } // end if;

    });

    if (options.selected) {

      selectize.options = [];

      selectize.clearOptions();

      const selected_values = _.isArray(options.selected) ? options.selected : [options.selected];

      selectize.addOption(selected_values);

      const selected = _.isArray(options.selected) ? _.pluck(options.selected, options.valueField) : options.selected[options.valueField];

      selectize.setValue(selected, false);

    } // end if;

  };

}(jQuery));
