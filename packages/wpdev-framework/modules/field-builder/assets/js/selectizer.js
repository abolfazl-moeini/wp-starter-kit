/* global _, wpdev_initialize_selectizer, wpdev_selector, wpdev_selectizer */
(function($) {

  /** @type {Object.<string, string>} */
  var templateHtmlCache = {};

  /** @type {Object.<string, Function>} */
  var compiledTemplates = {};

  /**
   * Normalize Persian and Arabic character variants (Yeh, Kaf, Alef, Heh, Hamza, ZWNJ, Tashkeel, digits).
   * Ensures seamless searching across Windows, macOS, and mobile keyboards.
   *
   * @param {string} str
   * @return {string}
   */
  function normalizePersianText(str) {
    if (str === null || str === undefined) {
      return '';
    }
    return String(str)
      .replace(/[\u064A\u0649\u0626\u06D2\u06D3]/g, '\u06CC') // ي, ى, ئ, ے, ۓ -> ی (Arabic/Urdu Yeh to Persian Yeh)
      .replace(/[\u0643\u06AA]/g, '\u06A9') // ك -> ک (Arabic Kaf to Persian Keheh)
      .replace(/[\u0629\u06C0]/g, '\u0647') // ة, ۀ -> ه (Teh Marbuta to Heh)
      .replace(/\u0624/g, '\u0648') // ؤ -> و (Waw with Hamza to Waw)
      .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ, أ, إ, ٱ -> ا (Alef variants)
      .replace(/\u0621/g, '') // Standalone Hamza -> stripped
      .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel / Harakat
      .replace(/\u0640/g, '') // Tatweel / Kashida
      .replace(/[\u0660-\u0669]/g, function(d) { return String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48); }) // Arabic digits
      .replace(/[\u06F0-\u06F9]/g, function(d) { return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); }) // Persian digits
      .replace(/[\u200C\u200D\u00A0\uFEFF]/g, ' ') // ZWNJ / ZWJ / NBSP -> space
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get template HTML from DOM with caching to prevent DOM queries during keystrokes.
   *
   * @param {string} name
   * @return {string}
   */
  function getTemplateHtml(name) {
    if (!name) {
      return '';
    }
    if (Object.prototype.hasOwnProperty.call(templateHtmlCache, name)) {
      return templateHtmlCache[name];
    }
    var $el = jQuery('#wpdev-template-' + name);
    var html = $el.length ? ($el.html() || '').trim() : '';
    if (html || (typeof document !== 'undefined' && document.readyState === 'complete')) {
      templateHtmlCache[name] = html;
    }
    return html;
  }

  /**
   * Get compiled template function cached by template name.
   * Eliminates repetitive DOM lookups and template recompilation.
   *
   * @param {string} name
   * @return {Function|null}
   */
  function getCompiledTemplate(name) {
    if (!name) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(compiledTemplates, name)) {
      return compiledTemplates[name];
    }
    var templateHtml = getTemplateHtml(name);
    if (!templateHtml) {
      return null;
    }
    compiledTemplates[name] = _.template(templateHtml, {
      interpolate: /\{\{(.+?)\}\}/g,
    });
    return compiledTemplates[name];
  }

  /**
   * Build pre-normalized search string for an item across all relevant fields.
   * Handles Persian ZWNJ (نیم‌فاصله) dual-indexing so searches match both spaced and joined variants.
   *
   * @param {Object} item
   * @param {Object} [opts]
   * @return {string}
   */
  function buildItemNormSearch(item, opts) {
    if (!item || typeof item !== 'object') {
      return '';
    }
    var parts = [];
    var knownFields = [
      'name', 'post_title', 'title', 'text', 'label', 'display_name',
      'id', 'ID', 'code', 'reference_code', 'user_email', 'slug',
      'post_name', 'post_status', 'desc', 'description', 'section_title',
      'group', 'group_label', 'domain', 'path', 'type',
      'discount_description', 'webhook_url', 'siteurl'
    ];
    var seen = {};
    if (opts) {
      if (opts.valueField) knownFields.unshift(opts.valueField);
      if (opts.labelField) knownFields.unshift(opts.labelField);
      if (opts.searchField) {
        if (Array.isArray(opts.searchField)) {
          knownFields = opts.searchField.concat(knownFields);
        } else {
          knownFields.unshift(opts.searchField);
        }
      }
    }
    for (var i = 0; i < knownFields.length; i++) {
      var k = knownFields[i];
      if (!k || seen[k]) continue;
      seen[k] = true;
      var val = item[k];
      if (val !== undefined && val !== null && typeof val !== 'object' && typeof val !== 'function') {
        parts.push(typeof val === 'string' ? val.replace(/<[^>]+>/g, ' ') : String(val));
      }
    }
    if (item.customer && typeof item.customer === 'object') {
      if (item.customer.display_name) parts.push(String(item.customer.display_name));
      if (item.customer.name) parts.push(String(item.customer.name));
      if (item.customer.user_email) parts.push(String(item.customer.user_email));
      seen.customer = true;
    }
    for (var prop in item) {
      if (Object.prototype.hasOwnProperty.call(item, prop) && !seen[prop] && prop.charCodeAt(0) !== 95 /* _ */ && prop.charCodeAt(0) !== 36 /* $ */) {
        if (prop === 'image' || prop === 'avatar' || prop === 'styles' || prop === 'classes') continue;
        var pval = item[prop];
        if (pval !== undefined && pval !== null && typeof pval !== 'object' && typeof pval !== 'function') {
          parts.push(typeof pval === 'string' ? pval.replace(/<[^>]+>/g, ' ') : String(pval));
        }
      }
    }

    var rawJoined = parts.join(' ');
    // If text contains ZWNJ (\u200C), index both spaced and joined variants
    if (rawJoined.indexOf('\u200C') !== -1) {
      var normSpace = normalizePersianText(rawJoined);
      var normJoined = normalizePersianText(rawJoined.replace(/\u200C/g, ''));
      return normSpace + (normSpace !== normJoined ? ' ' + normJoined : '');
    }
    return normalizePersianText(rawJoined);
  }

  /**
   * Ensure model objects have standard keys (id, ID, value, name, post_title, title, type, formatted_price, image)
   * and pre-normalized search cache (_norm_search) for sub-millisecond lookups.
   *
   * @param {*} item
   * @param {Object} [opts]
   * @return {Object}
   */
  function normalizeModelItem(item, opts) {
    if (item === null || item === undefined) {
      return item;
    }
    if (typeof item !== 'object') {
      var scalar = item;
      item = {
        id: scalar,
        ID: scalar,
        value: scalar,
        name: String(scalar),
        post_title: String(scalar),
        title: String(scalar),
        text: String(scalar),
        label: String(scalar),
      };
    }
    const normId = item.id !== undefined ? item.id : item.ID;
    const normTitle = item.name !== undefined ? item.name : (item.post_title || item.title || item.text || item.label || '');
    item.id = normId;
    item.ID = normId;
    if (item.value === undefined) {
      item.value = normId;
    }
    item.name = normTitle;
    item.post_title = normTitle;
    item.title = normTitle;
    item.text = item.text || normTitle;
    item.type = typeof item.type !== 'undefined' ? item.type : '';
    item.formatted_price = typeof item.formatted_price !== 'undefined' ? item.formatted_price : '';
    item.image = typeof item.image !== 'undefined' ? item.image : '';
    item._norm_search = buildItemNormSearch(item, opts);
    return item;
  }

  window.wpdev_selector = function wpdev_selector(options) {

    options = _.defaults(options, {
      options: [],
      maxItems: 1,
      templateName: false,
      create: false,
    });

    if (Array.isArray(options.options)) {
      options.options = options.options.map(function(item) {
        return normalizeModelItem(item, options);
      });
    }

    // Pre-populate initialOptions with options.selected so Selectize knows about the selected item
    // BEFORE inspecting the input value, preventing the dummy option bug where key is locked with numeric ID.
    var initialOptions = Array.isArray(options.options) ? options.options.slice() : [];
    if (options.selected) {
      var rawSelected = Array.isArray(options.selected) ? options.selected : [options.selected];
      for (var s = 0; s < rawSelected.length; s++) {
        if (rawSelected[s] && typeof rawSelected[s] === 'object') {
          initialOptions.push(normalizeModelItem(rawSelected[s], options));
        }
      }
    }

    if (jQuery(options.el).data('init')) {

      return;

    } // end if;

    jQuery(options.el).data('__options', options);

    var maxItems = Number(options.maxItems) || 1;
    var isMulti = maxItems > 1;
    /** @type {JQuery.jqXHR|null} */
    var searchXhr = null;

    const select = jQuery(options.el).selectize({
      valueField: options.valueField,
      labelField: options.labelField,
      searchField: ['text', 'name', 'display_name', 'domain', 'path', 'title', 'desc', 'code', 'post_title', 'reference_code'],
      options: initialOptions,
      maxItems: options.maxItems,
      create: options.create,
      // × only for multi chips. Single ajax fields (e.g. professor) change by
      // opening the control and searching again — no remove_button.
      plugins: isMulti ? ['remove_button'] : [],
      // Avoid keeping the menu open (and re-rendering options) after each pick.
      closeAfterSelect: isMulti,
      // Highlighting re-walks the dropdown DOM on every refreshOptions().
      highlight: false,
      // Debounce typeahead before hitting wpdev_search (selectize wraps onSearchChange).
      loadThrottle: 300,
      score(search) {
        const normQuery = normalizePersianText(search);
        if (!normQuery) {
          return function() {
            return 1;
          };
        }

        const normTokens = normQuery.split(' ').filter(Boolean);
        const tokenCount = normTokens.length;
        const spaceQuery = ' ' + normQuery;
        const spaceTokens = new Array(tokenCount);
        for (let t = 0; t < tokenCount; t++) {
          spaceTokens[t] = ' ' + normTokens[t];
        }

        return function(item) {
          if (!item) {
            return 0;
          }
          const itemSearch = item._norm_search || (item._norm_search = buildItemNormSearch(item, options));
          if (!itemSearch) {
            return 0;
          }

          // Exact full query match
          let exactPos = itemSearch.indexOf(normQuery);
          if (exactPos === 0) {
            return 200 + (normQuery.length / itemSearch.length);
          }
          if (exactPos > 0) {
            let isWordStart = itemSearch.charCodeAt(exactPos - 1) === 32;
            if (!isWordStart) {
              const sp = itemSearch.indexOf(spaceQuery);
              if (sp !== -1) {
                exactPos = sp + 1;
                isWordStart = true;
              }
            }
            return (isWordStart ? 150 : 100) + (1 / (exactPos + 1));
          }

          if (tokenCount <= 1) {
            return 0;
          }

          // Multi-word token match: all tokens must be present
          let tokenScore = 0;
          for (let t = 0; t < tokenCount; t++) {
            const token = normTokens[t];
            let pos = itemSearch.indexOf(token);
            if (pos === -1) {
              return 0;
            }
            let isStart = (pos === 0 || itemSearch.charCodeAt(pos - 1) === 32);
            if (!isStart) {
              const spacePos = itemSearch.indexOf(spaceTokens[t]);
              if (spacePos !== -1) {
                pos = spacePos + 1;
                isStart = true;
              }
            }
            tokenScore += (isStart ? 10 : 2) + (token.length / (pos + 1));
          }

          return tokenScore;
        };
      },
      render: {
        option(option) {

          option = normalizeModelItem(option, options);

          const templateName = options.templateName ? options.templateName : (options.data && options.data.model ? options.data.model : '');

          let template = getCompiledTemplate(templateName);

          // CPT posts (professors, page, …) share ID/post_title with the page template.
          if (!template && option && (option.post_title || option.ID)) {
            template = getCompiledTemplate('page');
          }

          if (!template) {
            template = getCompiledTemplate('default');
          }

          if (!template) {
            const label = option.post_title || option.label || option.name || option.text || option.ID || option.id || '';
            return '<div class="wpdev-p-2">' + _.escape(String(label)) + '</div>';
          }

          try {
            return template(option);
          } catch (e) {
            const label = option.post_title || option.label || option.name || option.text || option.ID || option.id || '';
            return '<div class="wpdev-p-2">' + _.escape(String(label)) + '</div>';
          }

        },
      },
      load(query, callback) {

        if (searchXhr && searchXhr.readyState !== 4) {
          searchXhr.abort();
          searchXhr = null;
        }

        if (! query.length) {

          return callback();

        } // end if;

        const __options = jQuery(options.el).data('__options');
        const normalizedQuery = normalizePersianText(query);

        searchXhr = jQuery.ajax({
          // eslint-disable-next-line no-undef
          url: wpdev_selectizer.ajaxurl,
          type: 'POST',
          data: {
            ...__options.data,
            query: {
              search: '*' + (normalizedQuery || query) + '*',
            },
          },
          error(xhr, textStatus) {

            // Aborted on purpose by a newer keystroke — still invoke callback so
            // Selectize's loading counter stays balanced. Drop loadedSearches so
            // an incomplete query can be retried later.
            if (textStatus === 'abort') {
              if (selectize && selectize.loadedSearches) {
                delete selectize.loadedSearches[query];
              }
              callback();
              return;
            }

            searchXhr = null;
            callback();

          },
          success(res) {

            searchXhr = null;
            if (Array.isArray(res)) {
              res = res.map(function(item) {
                return normalizeModelItem(item, options);
              });
            }
            selectize.savedItems = res;

            callback(res);

          },
        });

      },
    });

    jQuery(options.el).attr('data-init', 1);

    const selectize = select[0].selectize;

    // Single ajax model: no × control — let users replace the value by typing.
    // On first keystroke, clear the chip silently, keep the typed query, and
    // run search. Restore the previous value only if the dropdown closes empty.
    if (!isMulti) {
      var singleStash = null;

      selectize.on('dropdown_open', function () {
        selectize.showInput();
        if (selectize.$control_input && selectize.$control_input[0]) {
          selectize.$control_input[0].focus();
        }
      });

      selectize.on('type', function (str) {
        if (!str || !selectize.items.length) {
          return;
        }
        singleStash = selectize.getValue();
        selectize.clear(true);
        selectize.setTextboxValue(str);
        selectize.showInput();
        selectize.onSearchChange(str);
      });

      selectize.on('item_add', function () {
        singleStash = null;
      });

      selectize.on('dropdown_close', function () {
        if (singleStash !== null && singleStash !== undefined && !selectize.items.length) {
          selectize.setValue(singleStash, true);
        }
        singleStash = null;
      });
    }

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

      // Clear any prior selections or dummy items before registering normalized option
      selectize.clear(true);
      selectize.clearOptions();

      const selected_values = (_.isArray(options.selected) ? options.selected : [options.selected]).map(function(item) {
        return normalizeModelItem(item, options);
      });

      selectize.addOption(selected_values);

      const valField = options.valueField || 'id';
      const selected = _.isArray(options.selected)
        ? _.pluck(selected_values, valField)
        : (typeof options.selected === 'object' && options.selected !== null
          ? (options.selected[valField] || options.selected.id || options.selected.ID || options.selected.value)
          : options.selected);

      selectize.setValue(selected, false);

    } // end if;

  };

  window.wpdev_initialize_selectizer = function wpdev_initialize_selectizer(scope) {

    var $root = scope ? jQuery(scope) : jQuery(document);

    var $selectizeTargets = $root.is('[data-selectize]') ? $root.add($root.find('[data-selectize]')) : $root.find('[data-selectize]');
    $selectizeTargets.each(function(index, item) {
      if (item.selectize || jQuery(item).hasClass('selectized')) {
        return;
      }
      jQuery(item).selectize();
    });

    var $categoryTargets = $root.is('[data-selectize-categories]') ? $root.add($root.find('[data-selectize-categories]')) : $root.find('[data-selectize-categories]');
    $categoryTargets.each(function(index, item) {
      if (item.selectize || jQuery(item).hasClass('selectized')) {
        return;
      }
      jQuery(item).selectize({
        maxItems: jQuery(item).data('max-items') || 10,
        create(input) {
          return {
            value: input,
            text: input,
          };
        },
      });
    });

    var $modelTargets = $root.is('[data-model]') ? $root.add($root.find('[data-model]')) : $root.find('[data-model]');
    $modelTargets.each(function(index, item) {
      if (item.selectize || jQuery(item).hasClass('selectized') || jQuery(item).data('init')) {
        return;
      }

      var selectedData = jQuery(item).data('selected');
      if (typeof selectedData === 'string' && selectedData.trim().startsWith('[')) {
        try {
          selectedData = JSON.parse(selectedData);
        } catch (e) {
          // ignore parse error
        }
      }

      window.wpdev_selector({
        el: item,
        valueField: jQuery(item).data('value-field'),
        labelField: jQuery(item).data('label-field'),
        searchField: jQuery(item).data('search-field'),
        maxItems: jQuery(item).data('max-items'),
        selected: selectedData,
        options: [],
        data: {
          action: 'wpdev_search',
          model: jQuery(item).data('model'),
          number: 10,
          exclude: jQuery(item).data('exclude'),
          include: jQuery(item).data('include'),
        },
      });
    });

  };

  $(document).ready(function() {

    window.wpdev_initialize_selectizer();

    jQuery('body').on('wubox:load', function() {

      templateHtmlCache = {};
      compiledTemplates = {};
      window.wpdev_initialize_selectizer();

    });

  });

}(jQuery));
