/* eslint-disable no-undef */
(function($) {

  $(document).ready(function() {

    const jumper_registry = window.wpdev = window.wpdev || {};
    jumper_registry.jumper = jumper_registry.jumper || {};
    jumper_registry.jumper.actions = jumper_registry.jumper.actions || {};
    jumper_registry.jumper.registerAction = function(action_id, callback) {
      if (! action_id || typeof callback !== 'function') {
        return;
      }

      jumper_registry.jumper.actions[action_id] = callback;
    };

    // Adds WUChosen.js to our custom select input
    const $jumper = $('#wpdev-jumper-select').selectize({
      create: false,
      maxItems: 1,
      optgroupField: 'group',
      optgroupValueField: 'value',
      searchField: ['text', 'name', 'display_name', 'domain', 'title', 'desc', 'code', 'keywords', 'plugin', 'section', 'group_label'],
      render: {
        option(option) {

          if (typeof option.model === 'undefined') {

            option.model = 'jumper-link';

          } // end if;

          if (typeof option.text === 'undefined') {

            option.text = option.reference_code || option.name || option.title || option.display_name || option.code;

          } // end if;

          if (typeof option.group === 'undefined') {

            option.group = option.model;

          } // end if;

          if (typeof option.group_label === 'undefined') {

            option.group_label = option.group;

          } // end if;

          const template_html = jQuery('#wpdev-template-' + option.model).length ?
            jQuery('#wpdev-template-' + option.model).html() :
            jQuery('#wpdev-template-default').html();

          const template = _.template(template_html, {
            interpolate: /\{\{(.+?)\}\}/g,
          });

          return template(option);

        },
      },
      load(query, callback) {

        if (! query.length) {

          return callback();

        } // end if;

        $('#wpdev-jumper .wpdev-jumper-loading').show();

        jQuery.ajax({
          // eslint-disable-next-line no-undef
          url: wpdev_jumper_vars.ajaxurl,
          type: 'POST',
          data: {
            action: 'wpdev_search',
            model: 'all',
            number: 99,
            query: {
              search: '*' + query + '*',
            },
          },
          error() {

            callback();

          },
          success(res) {

            $('#wpdev-jumper .wpdev-jumper-loading').hide();

            callback(res);

          },
        });

      },
    });
    const selectize = $jumper[0] && $jumper[0].selectize ? $jumper[0].selectize : null;

    function register_commands(commands_groups) {
      if (! selectize || ! Array.isArray(commands_groups)) {
        return;
      }

      commands_groups.forEach(function(group) {
        if (! group || ! group.value || ! group.label) {
          return;
        }

        if (! selectize.optgroups[group.value]) {
          selectize.addOptionGroup(group.value, {
            value: group.value,
            label: group.label,
          });
        }

        const commands = Array.isArray(group.commands) ? group.commands : [];

        commands.forEach(function(command) {
          if (! command || ! command.value) {
            return;
          }

          command.group = group.value;
          command.group_label = group.label;

          selectize.addOption(command);
        });
      });
    }

    register_commands(wpdev_jumper_vars.commands || []);

    const is_local_url = function(url) {

      if (! url || typeof url !== 'string') {
        return false;
      }

      return url.toLowerCase().indexOf(wpdev_jumper_vars.base_url) >= 0 || url.toLowerCase().indexOf(wpdev_jumper_vars.network_base_url) >= 0;

    }; // end is_local_url

    const run_action_command = function(option) {
      const action_id = option.js_action || '';
      const callback = jumper_registry.jumper.actions[action_id];

      if (action_id && typeof callback === 'function') {
        callback(option);
        return;
      }

      jQuery.ajax({
        url: wpdev_jumper_vars.ajaxurl,
        type: 'POST',
        data: {
          action: 'wpdev_jumper_run_command',
          command_id: option.id || '',
          nonce: wpdev_jumper_vars.nonce || '',
        },
        success(res) {
          if (! res || ! res.success || ! res.data) {
            return;
          }

          if (res.data.redirect) {
            window.location.href = res.data.redirect;
            $('#wpdev-jumper .wpdev-jumper-redirecting').show();
            return;
          }

          if (res.data.modal) {
            $(document).trigger('wpdev:jumper:modal', [res.data.modal, option]);
          }

          if (res.data.notice) {
            // eslint-disable-next-line no-alert
            window.alert(res.data.notice);
          }
        },
      });
    };

    // Every time the value changes, we need to redirect the user
    $jumper.on('change', function() {
      const selected_value = $(this).val();
      const option = selectize && selected_value ? selectize.options[selected_value] : null;

      if (! selected_value) {
        return;
      }

      if (option && option.type === 'action') {
        run_action_command(option);
        return;
      }

      const target_url = option && option.url ? option.url : selected_value;

      // Check if we need to open this in a new tab
      if (is_local_url(target_url)) {

        window.location.href = target_url;

        $(this).parent().parent().find('.wpdev-jumper-redirecting').show();

      } else {

        window.open(target_url, '_blank');

        $($jumper.parent()).hide();

      } // end if;

    });

    // Closes on clicking other elements
    $(document).on('click', ':not(#wpdev-jumper-button-trigger)', function(e) {

      const target = e.target;

      if ($(target).attr('id') === 'wpdev-jumper-button-trigger' || $(target).parent().attr('id') === 'wpdev-jumper-button-trigger') {

        return;

      } // end if;

      if (! $(target).is($jumper.parent()) && ! $(target).parents().is($jumper.parent())) {

        $($jumper.parent().parent()).hide();

      } // end if;

    });

    const trigger_key = wpdev_jumper_vars.trigger_key.charAt(0);

    // Our bar is hidden by default, we need to display it when a certain shortcut is pressed
    Mousetrap.bind(['command+option+' + trigger_key, 'ctrl+alt+' + trigger_key], function(e) {

      e.preventDefault();

      open_jumper();

    }); // end mousetrap;

    $(document).on('click', '#wpdev-jumper-button-trigger', function(e) {

      e.preventDefault();

      open_jumper();

    });

    /**
     * Actually opens the jumper.
     */
    function open_jumper() {

      $('#wpdev-jumper').show();

      $('#wpdev-jumper').find('input').focus();

      return false;

    } // end open_jumper;

  });

}(jQuery));

