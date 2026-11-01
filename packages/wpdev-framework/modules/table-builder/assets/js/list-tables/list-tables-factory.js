/* eslint-disable no-undef */
(function($, hooks) {
  /**
   * Function that creates the code to handle the AJAX functionality of the WU List Tables.
   *
   * @param id
   * @param count
   * @param filters
   * @param date_filters
   */
  // eslint-disable-next-line no-undef
  wpdev_create_list = function(id) {

    return {

      /**
       * In-flight ajax request (aborted on rapid filter/pagination changes).
       */
      _xhr: null,

      /**
       * Table element ID
       */
      el: '#' + id,

      /**
       * Filters ID
       */
      filters_el: '#' + id + '-filters',

      /**
       * Wether or not the table was initialized.
       */
      initialized: false,

      /**
       * Register our triggers
       *
       * We want to capture clicks on specific links, but also value change in
       * the pagination input field. The links contain all the information we
       * need concerning the wanted page number or ordering, so we'll just
       * parse the URL to extract these variables.
       *
       * The page number input is trickier: it has no URL so we have to find a
       * way around. We'll use the hidden inputs added in TT_Example_List_Table::display()
       * to recover the ordering variables, and the default paged input added
       * automatically by WordPress.
       */
      init() {

        const table = this;

        const $table_parent = $('[data-table-id="' + id + '"]').first();

        // This will have its utility when dealing with the page number input
        let timer;

        const delay = 500;

        $table_parent.on('click', '#cb-select-all-grid', function(e) {

          e.preventDefault();

          const checkboxes = jQuery(this)
            .parents('form')
            .find('#the-list')
            .find('input[type=checkbox]');

          const checked = checkboxes.prop('checked');

          checkboxes.parents('.wpdev-grid-item')
            .toggleClass('wpdev-grid-item-selected', ! checked);

          checkboxes.prop('checked', ! checked);

        });

        $table_parent.on('change', '.wpdev-grid-item input[type=checkbox]', function() {

          const checked = $(this).prop('checked');

          $(this).parents('.wpdev-grid-item')
            .toggleClass('wpdev-grid-item-selected', checked);

        });

        /*
         * Handles bulk-delete.
         */
        $table_parent.on('click', '#doaction, #doaction2', function(event) {

          const form = jQuery(event.target).parents('form');

          const form_data = form.serialize();

          const params = new URL('https://example.com?' + form_data);

          const action = params.searchParams.get('action') || params.searchParams.get('action2');

          const ids = params.searchParams.getAll('bulk-delete[]');

          if (action !== '-1' && ids.length) {

            event.preventDefault();

          } else {

            return;

          }// end if;

          params.searchParams.set('bulk_action', action);

          params.searchParams.forEach((value, key) => {

            if (key !== 'bulk_action' && key !== 'bulk-delete[]') {

              params.searchParams.delete(key);

            } // end if;

          });

          params.searchParams.set('model', wpdev_list_table.model);

          /*
           * Re-attach page context (view/source filters, `page`, search, …).
           * Form serialize includes them, but the strip above removed everything
           * except bulk ids — handlers then defaulted to the wrong source.
           */
          const locationParams = new URLSearchParams(window.location.search);

          locationParams.forEach((value, key) => {

            if (key === 'action' || key === 'action2') {

              return;

            } // end if;

            if (!params.searchParams.has(key)) {

              params.searchParams.set(key, value);

            } // end if;

          });

          wubox.show(wpdev_list_table.i18n.confirm, wpdev_list_table.base_url + '&' + params.searchParams.toString());

        });

        // Pagination links, sortable link
        $table_parent.on('click', '.tablenav-pages a, .manage-column.sortable a, .manage-column.sorted a', function(e) {

          // We don't want to actually follow these links
          e.preventDefault();

          // Simple way: use the URL to extract our needed variables
          const query = this.search.substring(1);
          const parsedQuery = table.__get_query(query);

          delete parsedQuery.action;
          delete parsedQuery.list_table_screen;
          delete parsedQuery.table_id;

          const data = $.extend({}, parsedQuery, {
            order: table.__query(query, 'order') || 'DESC',
            paged: table.__query(query, 'paged') || '1',
            s: table.__query(query, 's') || '',
          });

          if (!data.page) {

            const pageSlug = table.get_page_slug();
            if (pageSlug) {

              data.page = pageSlug;

            }

          }

          table.update(data);

        });

        // Page number input
        $table_parent.on('keyup', 'input[name=paged]', function(e) {

          // If user hit enter, we don't want to submit the form
          // We don't preventDefault() for all keys because it would
          // also prevent to get the page number!
          if (13 === e.which) {

            e.preventDefault();

          } // end if;

          // This time we fetch the variables in inputs
          const data = {
            paged: parseInt($table_parent.find('input[name=paged]').val()) || '1',
            s: $table_parent.find('input[name=s]').val() || '',
          };

          // Now the timer comes to use: we wait half a second after
          // the user stopped typing to actually send the call. If
          // we don't, the keyup event will trigger instantly and
          // thus may cause duplicate calls before sending the intended
          // value
          window.clearTimeout(timer);

          timer = window.setTimeout(function() {

            table.update(data);

          }, delay);

        });

        /**
         * Initializes filters
         */
        if (table.initialized === false && $(table.filters_el).get(0)) {

          table.filters = table.init_filters();

        } // end if;

        table.init_reorder();

        table.initialized = true;

        return table;

      },

      /**
       * Copy a object
       *
       * @param {Object} obj
       */
      copy: function copy(obj) {

        return JSON.parse(JSON.stringify(obj));

      },

      /**
       * Setup up the filters
       */
      init_filters() {

        if (typeof window.Vue === 'undefined') {

          return;

        } // end if;

        const table = this;

        const $table_parent = $('[data-table-id="' + id + '"]').first();

        const available_filters = table.copy(window[id + '_config'].filters);

        // eslint-disable-next-line no-undef
        return new Vue({
          el: table.filters_el,
          data() {

            return {
              open: true,
              view: false,
              // relation: 'and',
              available_filters: [], // table.copy(available_filters),
              filters: [], //[_.first(table.copy(available_filters))],
            };

          },
          computed: {
          },
          mounted() {

            let timer;

            const delay = 500;

            wpdev_on_load();

            $(table.filters_el + ' form.search-form').on('submit', function(e) {

              e.preventDefault();

            });

            // Page number input
            $(table.filters_el + ' input[name=s]').on('input keyup', function(e) {

              // If user hit enter, we don't want to submit the form
              // We don't preventDefault() for all keys because it would
              // also prevent to get the page number!
              if (13 === e.which) {

                e.preventDefault();

              } // end if;

              // This time we fetch the variables in inputs
              const data = {
                paged: parseInt($table_parent.find('input[name=paged]').val()) || '1',
                s: $(this).val() || '',
              };

              // Fix paged
              if ($(this).val() !== '') {

                data.paged = '1';

              } // end if;

              // Now the timer comes to use: we wait half a second after
              // the user stopped typing to actually send the call. If
              // we don't, the keyup event will trigger instantly and
              // thus may cause duplicate calls before sending the intended
              // value
              window.clearTimeout(timer);

              timer = window.setTimeout(function() {

                table.update(data);

              }, delay);

            });

          },
          methods: {
            set_view(type, value) {

              const query = window.location.href.split('?')[1] || '';
              const parsedQuery = table.__get_query(query);

              delete parsedQuery.action;
              delete parsedQuery.list_table_screen;
              delete parsedQuery.table_id;

              const data = $.extend({}, parsedQuery, {
                paged: table.__query(query, 'paged') || '1',
                s: table.__query(query, 's') || '',
              });

              if (!data.page) {

                const pageSlug = table.get_page_slug();
                if (pageSlug) {

                  data.page = pageSlug;

                }

              }

              this.view = value;

              data[type] = value;

              $table_parent.find('.wpdev-filter .current').removeClass('current');

              table.update(data);

            },
            get_filter_type(field) {

              const available_filter = _.findWhere(available_filters, {
                field,
              });

              return available_filter.type;

            },
            get_filter_rule(field) {

              const available_filter = _.findWhere(available_filters, {
                field,
              });

              return available_filter.rule;

            },
            remove_filter(index) {

              this.filters.splice(index, 1);

            },
            add_new_filter() {

              this.filters.push(_.first(table.copy(this.available_filters)));

            },
            open_filters() {

              this.open = true;

            },
            close_filters() {

              this.open = false;

            },
          },
        });

      },

      /**
       * Resolve the admin page slug for query strings and pushState.
       *
       * @return {string}
       */
      get_page_slug() {

        const $table_parent = $('[data-table-id="' + id + '"]').first();
        const config = window[id + '_config'] || {};
        let page = (config.page)
          || $table_parent.find('input#page').val()
          || $('form#posts-filter input[name="page"]').val()
          || $('input[name="page"]').val()
          || '';

        if (!page && window.location.search) {

          const match = window.location.search.match(/[?&]page=([^&]+)/);
          if (match && match[1]) {

            page = decodeURIComponent(match[1]);

          }

        }

        if (!page) {

          const screenId = $table_parent.data('screen-id')
            || $table_parent.find('input#list_table_screen').val()
            || '';

          if (screenId.indexOf('toplevel_page_') === 0) {

            page = screenId.substring(14);

          } else if (screenId.indexOf('_page_') !== -1) {

            page = screenId.substring(screenId.indexOf('_page_') + 6);

          }

        }

        return page;

      },

      set_history(data) {

        if (window[id + '_config'].context !== 'page') {

          return;

        }

        /** Update History */
        try {

          const history_vars = _.omit(data, function(value, key) {

            return key === 'action' ||
              key === 'table_id' ||
              key === 'list_table_screen' ||
              ! value ||
              key.indexOf('_') === 0;

          });

          // Ensure 'page' is NEVER lost on admin.php pages
          if (!history_vars.page) {

            const pageSlug = this.get_page_slug();
            if (pageSlug) {

              history_vars.page = pageSlug;

            }

          }

          // Safety guard: Never push an admin.php URL with no 'page' query param
          if (!history_vars.page && window.location.pathname.indexOf('admin.php') !== -1) {

            return;

          }

          history.pushState({}, null, '?' + $.param(history_vars));

        } catch (err) {

          // eslint-disable-next-line no-console
          console.warn('Browser does not support pushState.', err);

        } // end try;

      },

      /**
       * AJAX call
       *
       * Send the call and replace table parts with updated version!
       *
       * @param {Object} data The data to pass through AJAX
       */
      update(data) {

        const table = this;

        const $table_parent = $('[data-table-id="' + id + '"]').first();

        const default_data = {
          action: 'wpdev_list_table_fetch_ajax_results',
          table_id: id,
          id: $table_parent.find('input#id').val(),
        };

        default_data['_ajax_' + id + '_nonce'] = $table_parent.find('#_ajax_' + id + '_nonce').val();

        // Keep Screen Options hidden-column prefs in sync on ajax refresh.
        const screenId = $table_parent.data('screen-id')
          || $table_parent.find('input#list_table_screen').val()
          || '';

        if (screenId) {
          default_data.list_table_screen = screenId;
        }

        const pageSlug = table.get_page_slug();
        if (pageSlug) {
          default_data.page = pageSlug;
        }

        const form_data = $.extend(
          {},
          default_data,
          // $($table_parent).find('input').serializeObject(),
          // $(table.filters_el).find('input').serializeObject(),
          data,
        );

        const $content = $table_parent.find('tbody, .wpdev-grid-content');

        $content.animate({ opacity: 0.4 }, 300);

        if (table._xhr && table._xhr.readyState !== 4) {
          table._xhr.abort();
        }

        table._xhr = $.ajax({
          // eslint-disable-next-line no-undef
          url: ajaxurl,
          // Add action and nonce to our collected data
          data: form_data,
          // Handle the successful result
          statusCode: {
            403() {

              $content.animate({ opacity: 1 }, 300);

            },
          },
          complete() {
            table._xhr = null;
          },
          success(response) {

            // Align with @wpdev/wpdev-bridge envelope contract (Phase 3.1).
            // List-table refresh returns wp_send_json_success({ rows, ... }).
            // Bare / failed payloads must not reach DOM updates.
            let payload = response;

            if (response && typeof response.success === 'boolean') {

              if (!response.success || typeof response.data === 'undefined' || response.data === null) {

                $content.animate({ opacity: 1 }, 300);
                return;

              }

              payload = response.data;

            }

            if (!payload || typeof payload !== 'object') {

              $content.animate({ opacity: 1 }, 300);
              return;

            }

            table.set_history(form_data, default_data);

            $content.animate({ opacity: 1 }, 300);

            // Add the requested rows
            if (typeof payload.rows !== 'undefined') {

              $content.html(payload.rows);

            } // end if;

            // Add the requested rows
            if (typeof payload.count !== 'undefined') {

              // table.filters.count = payload.count;

            } // end if;

            // Update column headers for sorting
            if (payload && typeof payload.column_headers === 'string' && payload.column_headers.length) {

              $table_parent.find('thead tr, tfoot tr').html(payload.column_headers);

            } // end if;

            // Update pagination for navigation
            if (payload && payload.pagination && typeof payload.pagination.top === 'string' && payload.pagination.top.length) {

              $table_parent.find('.tablenav.top .tablenav-pages').html($(payload.pagination.top).html());

            } // end if;

            if (payload && payload.pagination && typeof payload.pagination.bottom === 'string' && payload.pagination.bottom.length) {

              $table_parent.find('.tablenav.bottom .tablenav-pages').html($(payload.pagination.bottom).html());

            } // end if;

            hooks.doAction('wpdev_list_table_update', payload, form_data, $table_parent);

            table.init_reorder();

            // Init back our event handlers
            // table.init();

          },
        });

      },

      /**
       * Filter the URL Query to extract variables
       *
       * @see http://css-tricks.com/snippets/javascript/get-url-variables/
       * @param {string} query The URL query part containing the variables
       * @param {string} variable The URL query part containing the variables
       * @return {string|boolean} The variable value if available, false else.
       */
      __query(query, variable) {

        const vars = query.split('&');

        for (let i = 0; i < vars.length; i++) {

          const pair = vars[i].split('=');

          if (pair[0] === variable) {

            return pair[1];

          } // end if;

        } // end for;

        return false;

      },

      __get_query(query) {

        const vars = query.split('&');

        const _query = {};

        for (let i = 0; i < vars.length; i++) {

          const pair = vars[i].split('=');

          _query[pair[0]] = pair[1];

        } // end for;

        return _query;

      },

      /**
       * Initializes drag-and-drop row reordering if table is reorderable.
       *
       * @since 2.15.0
       */
      init_reorder() {

        const table = this;
        const $table_parent = $('[data-table-id="' + id + '"]').first();

        const isReorderable = $table_parent.data('reorderable') === true || $table_parent.attr('data-reorderable') === 'true';
        if (!isReorderable) {
          return;
        }

        const $tbody = $table_parent.find('table.wp-list-table tbody');
        if (!$tbody.length || typeof $tbody.sortable !== 'function') {
          return;
        }

        if ($tbody.hasClass('ui-sortable')) {
          $tbody.sortable('destroy');
        }

        const isAllowed = $table_parent.data('reorder-allowed') !== false && $table_parent.attr('data-reorder-allowed') !== 'false';
        if (!isAllowed) {
          return;
        }

        $tbody.sortable({
          items: 'tr:not(.no-items)',
          handle: '.wpdev-row-drag-handle',
          axis: 'y',
          cursor: 'grabbing',
          containment: $tbody,
          placeholder: 'wpdev-sortable-placeholder',
          helper: function(e, tr) {
            const $originals = tr.children();
            const $helper = tr.clone();
            $helper.addClass('wpdev-dragging-row');
            $helper.children().each(function(index) {
              $(this).width($originals.eq(index).width());
            });
            return $helper;
          },
          start: function(e, ui) {
            ui.placeholder.height(ui.item.height());
            ui.item.data('prev-index', ui.item.index());
          },
          update: function() {
            const ordered_ids = [];
            $tbody.find('tr[data-id]').each(function() {
              const rowId = $(this).data('id');
              if (rowId) {
                ordered_ids.push(rowId);
              }
            });

            if (!ordered_ids.length) {
              return;
            }

            $table_parent.addClass('wpdev-table-saving');

            const nonce = $table_parent.find('#_ajax_' + id + '_nonce').val()
              || $table_parent.find('#_wpnonce').val()
              || (window[id + '_config'] && window[id + '_config'].nonce);

            $.ajax({
              url: ajaxurl,
              type: 'POST',
              data: {
                action: 'wpdev_list_table_reorder_rows',
                table_id: id,
                ordered_ids: ordered_ids,
                paged: table.__query(window.location.search, 'paged') || 1,
                _ajax_nonce: nonce
              }
            }).done(function(response) {
              $table_parent.removeClass('wpdev-table-saving');
              if (!response || !response.success) {
                $tbody.sortable('cancel');
                const errMsg = (response && response.data && response.data.message) ? response.data.message : 'Reordering failed.';
                if (typeof wpdev_toast_error === 'function') {
                  wpdev_toast_error(errMsg);
                } else {
                  alert(errMsg);
                }
              } else {
                $tbody.find('tr[data-id]').addClass('wpdev-row-saved');
                setTimeout(function() {
                  $tbody.find('tr[data-id]').removeClass('wpdev-row-saved');
                }, 1500);

                if (typeof wpdev_toast_success === 'function') {
                  wpdev_toast_success(response.data && response.data.message ? response.data.message : 'Order updated successfully.');
                }
              }
            }).fail(function() {
              $table_parent.removeClass('wpdev-table-saving');
              $tbody.sortable('cancel');
              if (typeof wpdev_toast_error === 'function') {
                wpdev_toast_error('Network error occurred.');
              } else {
                alert('Network error occurred.');
              }
            });
          }
        });

        // WCAG 2.1 AA Keyboard Reordering on drag handles
        $tbody.off('keydown.wpdev_reorder', '.wpdev-row-drag-handle').on('keydown.wpdev_reorder', '.wpdev-row-drag-handle', function(e) {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) {
            return;
          }
          e.preventDefault();
          const $row = $(this).closest('tr');
          if (e.key === 'ArrowUp') {
            const $prev = $row.prev('tr:not(.no-items)');
            if ($prev.length) {
              $row.insertBefore($prev);
              $tbody.sortable('option', 'update')();
              $(this).focus();
            }
          } else if (e.key === 'ArrowDown') {
            const $next = $row.next('tr:not(.no-items)');
            if ($next.length) {
              $row.insertAfter($next);
              $tbody.sortable('option', 'update')();
              $(this).focus();
            }
          }
        });

      },

    };

  }; // end wpdev_create_list;

}(jQuery, wp.hooks));
