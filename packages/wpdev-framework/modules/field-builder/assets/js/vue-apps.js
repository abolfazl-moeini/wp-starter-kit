(() => {
"use strict";
const { Vue: Vue$1, defineComponent } = window.wpdev_vue || {};
const hooks = wp.hooks || {};
const loadApp = (element, app_id, callback = null) => {

  if (window["wpdev_" + app_id]) {
    const exclusion_list = [
      "add_checkout_form_field"
    ];
    if (!exclusion_list.includes(app_id)) {
      return;
    }
  }

  // Relocate any inline <style> and <script> tags inside the app container before Vue compiles the DOM template.
  // This preserves styles in <head> and moves scripts outside the container while preventing Vue template compilation warnings/errors:
  // "Templates should only be responsible for mapping the state to the UI. Avoid placing tags with side-effects in your templates, such as <style> or <script>".
  if (element && element.querySelectorAll) {
    element.querySelectorAll("style").forEach((st) => {
      document.head.appendChild(st);
    });
    element.querySelectorAll("script").forEach((sc) => {
      if (element.parentNode) {
        element.parentNode.insertBefore(sc, element.nextSibling);
      } else {
        document.body.appendChild(sc);
      }
    });
  }

  window["wpdev_" + app_id] = new Vue$1(defineComponent({
    name: typeof app_id === "string" ? app_id : "",
    el: element,
    directives: {
      init: {
        bind(el, binding, vnode) {
          vnode.context[binding.arg] = binding.value;
        }
      },
      initempty: {
        bind(el, binding, vnode) {
          if (vnode.context[binding.arg] === "") {
            vnode.context[binding.arg] = binding.value;
          }
        }
      }
    },
    data() {
      let prefix = wpdev_settings.currency_symbol;
      let suffix = "";
      if (wpdev_settings.currency_position === "%v%s") {
        prefix = "";
        suffix = wpdev_settings.currency_symbol;
      } else if (wpdev_settings.currency_position === "%s %v") {
        prefix = wpdev_settings.currency_symbol + " ";
      } else if (wpdev_settings.currency_position === "%v %s") {
        prefix = "";
        suffix = " " + wpdev_settings.currency_symbol;
      }
      const settings = {
        money_settings: {
          prefix,
          suffix,
          decimal: wpdev_settings.decimal_separator,
          thousands: wpdev_settings.thousand_separator,
          precision: parseInt(wpdev_settings.precision, 10),
          masked: false
        }
      };
      return Object.assign({}, JSON.parse(element.dataset.state || "{}"), settings);
    },
    computed: {
      hooks: () => hooks,
      console: () => console,
      window: () => window,
      shortcode() {
        if (typeof this.id === "undefined" || typeof this.attributes === "undefined") {
          return "";
        }
        const shortcodeValues = this.id + " " + Object.entries(this.attributes).map(([key, value]) => {
          if (value === this.defaults[key] || typeof value === "object") {
            return "";
          }
          if (this.attributes[key + "_shortcode_requires"]) {
            const hide = Object.entries(this.attributes[key + "_shortcode_requires"]).some(([k, v]) => {
              return this.attributes[k] !== v;
            });
            if (hide) {
              return "";
            }
          }
          return key + '="' + (typeof value === "string" ? value.trim() : value) + '"';
        }).filter((value) => value).join(" ");
        return "[" + shortcodeValues.trim() + "]";
      }
    },
    mounted() {
      if (typeof wpdev_on_load === "function") {
        wpdev_on_load();
      } else if (typeof window.wpdev_on_load === "function") {
        window.wpdev_on_load();
      }
      hooks.doAction("wpdev_" + app_id + "_mounted", this.$data);
      const cb = element.dataset.onLoad;
      if (typeof window[cb] === "function") {
        window[cb]();
      }
      if (callback) {
        callback();
      }
      // Delegated: cloned repeater rows keep .wpdev-remove-repeater-line but lose Vue binds.
      if (this.$el && !this.$el._wpdevRepeaterRemoveBound) {
        this.$el._wpdevRepeaterRemoveBound = true;
        this.$el.addEventListener("click", (e) => {
          const btn = e.target && e.target.closest ? e.target.closest(".wpdev-remove-repeater-line") : null;
          if (!btn || !this.$el.contains(btn)) {
            return;
          }
          e.preventDefault();
          this.remove_line({ currentTarget: btn }, ".field-repeater");
        });
      }
      this.$nextTick(function() {
        if (typeof window.wpdev_initialize_code_editors === 'function') {
          window.wpdev_initialize_code_editors();
        }
        if (window.wubox && typeof window.wubox.refresh === 'function') {
          window.wubox.refresh();
        }
        if (typeof window.wpdev_init_sortable_repeaters === "function") {
          window.wpdev_init_sortable_repeaters(this.$el);
        }
      });
    },
    updated() {
      if (!this._priorState) {
        this._priorState = this.$options.data();
      }
      const self = this;
      const changedProp = Object.keys(this._data).find((key) => JSON.stringify(this._data[key]) !== JSON.stringify(self._priorState[key]));
      this._priorState = { ...this._data };
      this.$nextTick(function() {
        hooks.doAction("wpdev_" + app_id + "_changed", changedProp, self.$data);
        if (typeof window.wpdev_initialize_code_editors === 'function') {
          window.wpdev_initialize_code_editors();
        }
        if (window.wubox && typeof window.wubox.refresh === 'function') {
          window.wubox.refresh();
        }
      });
    },
    methods: {
      send(scope, function_name, value, cb) {
        if (scope === "window") {
          return window[function_name](value, cb);
        }
        return window[scope][function_name](value, cb);
      },
      get_value(variable_name) {
        return window[variable_name];
      },
      set_value(key, value) {
        this[key] = value;
      },
      get_state_value(value, default_value) {
        return typeof this[value] === "undefined" ? default_value : this[value];
      },
      duplicate_and_clean($event, query) {
        var _a;
        const buttonRow = $event && $event.currentTarget ? $event.currentTarget.closest("li") : null;
        const list = buttonRow && buttonRow.parentNode ? buttonRow.parentNode : null;
        // Prefer locating the immediate preceding repeater row before this button
        let target = null;
        if (buttonRow) {
          let prev = buttonRow.previousElementSibling;
          while (prev) {
            if ((query && prev.matches(query)) || (!query && prev.matches(".field-repeater"))) {
              target = prev;
              break;
            }
            prev = prev.previousElementSibling;
          }
        }
        if (!target) {
          const elements = list ? list.querySelectorAll(":scope > " + (query || ".field-repeater")) : document.querySelectorAll(query || ".field-repeater");
          target = elements.item(elements.length - 1);
        }
        if (!target) {
          return;
        }
        const clone = target.cloneNode(true);
        clone.id = clone.id + "_copy";

        // Remove cloned Selectize UI wrappers so new row has a fresh container
        clone.querySelectorAll(".selectize-control").forEach((el) => el.remove());

        // Reset and un-selectize any inputs in the clone
        clone.querySelectorAll(".selectized, [data-model], [data-selectize], [data-selectize-categories]").forEach((el) => {
          el.classList.remove("selectized");
          el.removeAttribute("data-init");
          el.removeAttribute("data-selected");
          el.removeAttribute("tabindex");
          el.value = "";
          el.removeAttribute("value");
          el.style.display = "";
          if (typeof jQuery !== "undefined") {
            jQuery(el).removeData("init").removeData("__options").removeData("selected");
          }
        });

        // Toggle/checkbox labels use id+for. Cloning without renaming makes every
        // new row share the first row's control (label click hits document.getElementById).
        const idMap = /* @__PURE__ */ new Map();
        const uniq = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        clone.querySelectorAll("[id]").forEach((el) => {
          const oldId = el.getAttribute("id");
          if (!oldId) {
            return;
          }
          const newId = oldId + "__" + uniq;
          idMap.set(oldId, newId);
          el.id = newId;
        });
        clone.querySelectorAll("label[for]").forEach((label) => {
          const forId = label.getAttribute("for");
          if (forId && idMap.has(forId)) {
            label.setAttribute("for", idMap.get(forId));
          }
        });
        const textAreas = clone.querySelectorAll("input, textarea");
        textAreas.forEach((el) => el.value = "");
        clone.querySelectorAll("select").forEach((el) => {
          if (!el.classList.contains("selectized")) {
            el.selectedIndex = 0;
          }
        });
        clone.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach((el) => {
          el.checked = false;
        });
        // Reset image previews on cloned rows.
        clone.querySelectorAll(".wpdev-wrapper-image-field img").forEach((img) => {
          img.removeAttribute("src");
          img.classList.add("wpdev-absolute");
          img.style.display = "none";
        });
        clone.querySelectorAll(".wpdev-image-preview-wrap").forEach((el) => {
          el.style.display = "none";
        });
        clone.querySelectorAll(".wpdev-wrapper-image-field-upload-actions").forEach((el) => {
          el.style.display = "none";
        });
        clone.querySelectorAll(".wpdev-change-image-wrapper").forEach((el) => {
          el.style.display = "none";
        });
        clone.querySelectorAll(".wpdev-add-image-wrapper").forEach((el) => {
          el.style.display = "";
        });
        (_a = target.parentNode) == null ? void 0 : _a.insertBefore(clone, target.nextSibling);
        if (clone.classList.contains("wpdev-repeater-accordion-item")) {
          const list = target.parentNode;
          let fieldClass = "";
          clone.classList.forEach((cls) => {
            if (cls.indexOf("field-repeater-") === 0) {
              fieldClass = cls;
            }
          });
          const selector = fieldClass ? ":scope > ." + fieldClass + ".wpdev-repeater-accordion-item" : ":scope > .wpdev-repeater-accordion-item";
          const allItems = list ? list.querySelectorAll(selector) : [];
          allItems.forEach((item, index) => {
            if (item === clone) {
              item.classList.add("is-open");
              const content = item.querySelector(".wpdev-repeater-accordion-content");
              if (content) {
                content.style.display = "";
              }
              const hdr = item.querySelector(".wpdev-repeater-accordion-header");
              if (hdr) {
                hdr.setAttribute("aria-expanded", "true");
              }
              const customTitle = item.querySelector(".wpdev-repeater-accordion-custom-title");
              if (customTitle) {
                customTitle.remove();
              }
              const subBadge = item.querySelector(".wpdev-repeater-accordion-sub-badge");
              if (subBadge) {
                subBadge.remove();
              }
            } else {
              item.classList.remove("is-open");
              const content = item.querySelector(".wpdev-repeater-accordion-content");
              if (content) {
                content.style.display = "none";
              }
              const hdr = item.querySelector(".wpdev-repeater-accordion-header");
              if (hdr) {
                hdr.setAttribute("aria-expanded", "false");
              }
            }
            const indexEl = item.querySelector(".wpdev-repeater-accordion-index");
            if (indexEl) {
              indexEl.textContent = String(index + 1);
            }
          });
        }
        const emptyState = target.parentNode ? target.parentNode.querySelector(".wpdev-repeater-empty-state") : null;
        if (emptyState) {
          emptyState.style.display = "none";
        }
        if (typeof window.wpdev_initialize_imagepicker === "function") {
          window.wpdev_initialize_imagepicker();
        }
        if (typeof window.wpdev_initialize_selectizer === "function") {
          window.wpdev_initialize_selectizer(clone);
        }
        if (typeof window.wpdev_init_sortable_repeaters === "function") {
          window.wpdev_init_sortable_repeaters(target.parentNode);
        }
      },
      remove_line($event, query) {
        const btn = $event && $event.currentTarget ? $event.currentTarget : null;
        const row = btn ? btn.closest(query) || btn.closest("li.field-repeater") : null;
        if (!row || !row.parentNode) {
          return;
        }
        const list = row.parentNode;
        const siblings = list.querySelectorAll(":scope > " + query);
        const emptyState = list.querySelector(".wpdev-repeater-empty-state");

        // Keep one blank seed row so “Add new Line” can still clone, unless emptyState is enabled.
        if (siblings.length <= 1) {
          if (emptyState) {
            row.remove();
            emptyState.style.display = "block";
            return;
          }
          row.querySelectorAll("input, textarea, select").forEach((el) => {
            if (el.type === "checkbox" || el.type === "radio") {
              el.checked = false;
            } else if (el.tagName === "SELECT") {
              el.selectedIndex = 0;
            } else {
              el.value = "";
            }
          });
          row.querySelectorAll(".selectized, [data-model]").forEach((el) => {
            if (el.selectize) {
              el.selectize.clear(true);
            }
          });
          row.querySelectorAll(".wpdev-wrapper-image-field img").forEach((img) => {
            img.removeAttribute("src");
            img.classList.add("wpdev-absolute");
          });
          row.querySelectorAll(".wpdev-wrapper-image-field-upload-actions").forEach((el) => {
            el.style.display = "none";
          });
          row.querySelectorAll(".wpdev-add-image-wrapper").forEach((el) => {
            el.style.display = "";
          });
          return;
        }
        row.remove();
        const accordionSiblings = list.querySelectorAll(":scope > .wpdev-repeater-accordion-item");
        if (accordionSiblings.length > 0) {
          let hasOpen = false;
          accordionSiblings.forEach((item, index) => {
            if (item.classList.contains("is-open")) {
              hasOpen = true;
            }
            const idxEl = item.querySelector(".wpdev-repeater-accordion-index");
            if (idxEl) {
              idxEl.textContent = String(index + 1);
            }
          });
          if (!hasOpen && accordionSiblings[0]) {
            accordionSiblings[0].classList.add("is-open");
            const c = accordionSiblings[0].querySelector(".wpdev-repeater-accordion-content");
            if (c) {
              c.style.display = "";
            }
            const h = accordionSiblings[0].querySelector(".wpdev-repeater-accordion-header");
            if (h) {
              h.setAttribute("aria-expanded", "true");
            }
          }
        }
        if (emptyState) {
          const remainingRows = list.querySelectorAll(":scope > .field-repeater, :scope > .wpdev-repeater-accordion-item");
          if (remainingRows.length === 0) {
            emptyState.style.display = "block";
          }
        }
        if (typeof window.wpdev_init_sortable_repeaters === "function") {
          window.wpdev_init_sortable_repeaters(list);
        }
      },
      wpdev_format_money(value) {
        return wpdev_format_money(value);
      },
      require(data, value) {
        if (Object.prototype.toString.call(this[data]) === "[object Array]") {
          return this[data].indexOf(value) > -1;
        }
        if (Object.prototype.toString.call(value) === "[object Array]") {
          return value.indexOf(this[data]) > -1;
        }
        return this[data] == value;
      },
      open($event) {
        $event.preventDefault();
        this.edit = true;
      }
    }
  }));
  window["wpdev_" + app_id].$watch("section", function(new_value) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(app_id, new_value);
      history.pushState({}, "", url);
    } catch (err) {
      console.warn("Browser does not support pushState.", err);
    }
  });
};
const { Vue } = window.wpdev_vue || {};

const wpdev_init_sortable_repeaters = (root) => {
  if (typeof jQuery === "undefined" || typeof jQuery.fn.sortable === "undefined") {
    return;
  }
  const $ = jQuery;
  const container = root ? $(root) : $(document);

  const sortableIds = [];
  container.find("li.wpdev-repeater-sortable-item[data-repeater-sortable-id]").each(function() {
    const id = $(this).attr("data-repeater-sortable-id");
    if (id && sortableIds.indexOf(id) === -1) {
      sortableIds.push(id);
    }
  });

  sortableIds.forEach(function(fieldId) {
    const $items = container.find("li.field-repeater-" + fieldId + ".wpdev-repeater-sortable-item");
    if (!$items.length) {
      return;
    }
    const $parent = $items.first().parent();
    if (!$parent.length) {
      return;
    }
    if ($parent.data("ui-sortable")) {
      $parent.sortable("refresh");
      return;
    }
    $parent.sortable({
      items: "> li.field-repeater-" + fieldId,
      handle: ".wpdev-repeater-sort-handle",
      axis: "y",
      cursor: "grabbing",
      opacity: 0.75,
      placeholder: "wpdev-repeater-sortable-placeholder",
      forcePlaceholderSize: true,
      tolerance: "pointer",
      start(event, ui) {
        ui.placeholder.height(ui.item.outerHeight());
        ui.placeholder.css({
          "background-color": "#f0f0f1",
          "border": "2px dashed #c3c4c7",
          "margin-bottom": "1rem",
          "border-radius": "4px",
          "box-sizing": "border-box"
        });
      },
      stop(event, ui) {
        $parent.trigger("wpdev:repeater-reordered", [fieldId, ui.item]);
      }
    });
  });
};
window.wpdev_init_sortable_repeaters = wpdev_init_sortable_repeaters;

const wpdev_init_selection_limits = (context) => {
  const root = context || document;
  const wrappers = root.querySelectorAll('[data-selection-limit="1"]');
  if (!wrappers || !wrappers.length) {
    return;
  }

  const isRTL = document.dir === "rtl" ||
    (document.documentElement && (document.documentElement.dir === "rtl" || (document.documentElement.lang && document.documentElement.lang.indexOf("fa") === 0))) ||
    (document.body && document.body.classList.contains("rtl"));

  wrappers.forEach((wrapper) => {
    const exactLimit   = parseInt(wrapper.getAttribute("data-exact-items"), 10) || 0;
    const minLimit     = parseInt(wrapper.getAttribute("data-min-items"), 10) || 0;
    const maxLimit     = parseInt(wrapper.getAttribute("data-max-items"), 10) || 0;
    const disableOnMax = wrapper.getAttribute("data-disable-on-max") === "1" || wrapper.getAttribute("data-disable-on-max") === "true";

    const noticeWrap = wrapper.querySelector(".wpdev-selection-limit-wrap");
    const msgEl = noticeWrap ? noticeWrap.querySelector(".wpdev-limit-message") : null;

    const customValid   = wrapper.getAttribute("data-notice-valid") || "";
    const customInvalid = wrapper.getAttribute("data-notice-invalid") || "";

    const updateState = () => {
      const allCheckboxes = wrapper.querySelectorAll('input[type="checkbox"]');
      const checkedBoxes  = wrapper.querySelectorAll('input[type="checkbox"]:checked');
      const current       = checkedBoxes.length;

      const totalOptionsAttr = parseInt(wrapper.getAttribute("data-total-options"), 10);
      const totalOptions     = (!isNaN(totalOptionsAttr) && totalOptionsAttr > 0) ? totalOptionsAttr : allCheckboxes.length;

      const baseLimit = exactLimit > 0 ? exactLimit : maxLimit;
      const effectiveLimit = baseLimit > 0 ? Math.min(baseLimit, totalOptions) : totalOptions;

      let isValid = true;
      if (exactLimit > 0) {
        isValid = (current === effectiveLimit);
      } else if (minLimit > 0 && current < minLimit) {
        isValid = false;
      } else if (maxLimit > 0 && current > effectiveLimit) {
        isValid = false;
      }

      if (msgEl) {
        if (isValid) {
          msgEl.classList.remove("is-invalid", "wpdev-type-red-600");
          msgEl.classList.add("is-valid", "wpdev-type-green-600");

          let text = "";
          if (customValid) {
            text = customValid.replace(/%d/g, String(effectiveLimit));
          } else if (isRTL) {
            text = "✓ دقیقاً " + effectiveLimit + " خدمت انتخاب شده است.";
          } else {
            text = "✓ Exactly " + effectiveLimit + " items selected.";
          }
          msgEl.textContent = text;
        } else {
          msgEl.classList.remove("is-valid", "wpdev-type-green-600");
          msgEl.classList.add("is-invalid", "wpdev-type-red-600");

          let text = "";
          if (customInvalid) {
            let replaced = customInvalid.replace("%d", String(effectiveLimit));
            replaced = replaced.replace("%d", String(current));
            text = replaced;
          } else if (isRTL) {
            text = "⚠ خطا: باید دقیقاً " + effectiveLimit + " خدمت انتخاب شود. (تعداد فعلی: " + current + " مورد)";
          } else {
            text = "⚠ Error: Exactly " + effectiveLimit + " items must be selected. (Currently: " + current + " selected)";
          }
          msgEl.textContent = text;
        }
      }

      // Checkbox locking: disable ONLY unchecked inputs, NEVER disable checked inputs
      if (disableOnMax) {
        if (current >= effectiveLimit) {
          allCheckboxes.forEach((cb) => {
            if (!cb.checked) {
              cb.disabled = true;
              const parentDiv = cb.closest(".item > div");
              if (parentDiv) {
                parentDiv.classList.add("wpdev-item-disabled");
              }
            }
          });
        } else {
          allCheckboxes.forEach((cb) => {
            cb.disabled = false;
            const parentDiv = cb.closest(".item > div");
            if (parentDiv) {
              parentDiv.classList.remove("wpdev-item-disabled");
            }
          });
        }
      }
    };

    updateState();

    if (!wrapper._wpdevLimitBound) {
      wrapper._wpdevLimitBound = true;
      wrapper.addEventListener("change", (e) => {
        if (e.target && e.target.type === "checkbox") {
          updateState();
        }
      });
    }
  });
};
window.wpdev_init_selection_limits = wpdev_init_selection_limits;

const wpdevGalleryFrameCache = new Map();

const wpdev_init_gallery_fields = (context) => {
  if (typeof jQuery === "undefined") {
    return;
  }
  const $ = jQuery;
  const root = context || document;
  const $containers = $(root).find(".wpdev-gallery-field-container");

  $containers.each(function() {
    const $container = $(this);
    if ($container.data("wpdev-gallery-initialized")) {
      return;
    }
    $container.data("wpdev-gallery-initialized", true);

    const fieldId = $container.data("field-id");
    const $grid = $container.find(".wpdev-gallery-grid");
    const $emptyState = $container.find(".wpdev-gallery-empty-state");
    const $toolbar = $container.find(".wpdev-gallery-toolbar");

    function updateEmptyState() {
      const hasItems = $grid.children("li.wpdev-gallery-item").length > 0;
      if (hasItems) {
        $emptyState.hide();
        $grid.show();
        $toolbar.show();
      } else {
        $emptyState.show();
        $grid.hide();
        $toolbar.hide();
      }
    }

    if ($.fn.sortable) {
      $grid.sortable({
        items: "> li.wpdev-gallery-item",
        handle: ".wpdev-gallery-item-sort-handle, img",
        cancel: ".wpdev-gallery-action-btn, a, button",
        cursor: "grabbing",
        tolerance: "pointer",
        placeholder: "wpdev-gallery-placeholder",
        forcePlaceholderSize: true,
        start: function(e, ui) {
          ui.placeholder.css({
            width: ui.item.outerWidth(),
            height: ui.item.outerHeight(),
            borderRadius: "8px",
            border: "2px dashed #94a3b8",
            background: "#f8fafc"
          });
        }
      });
    }

    $container.on("click", ".wpdev-add-gallery-images-btn", function(e) {
      e.preventDefault();

      if (typeof wp === "undefined" || !wp.media) {
        console.warn("WordPress media library (wp.media) is not available.");
        return;
      }

      let frame = wpdevGalleryFrameCache.get(fieldId);
      if (!frame) {
        frame = wp.media({
          title: (typeof wpdev_fields !== "undefined" && wpdev_fields.l10n && wpdev_fields.l10n.gallery_picker_title)
            ? wpdev_fields.l10n.gallery_picker_title
            : "انتخاب یا آپلود تصاویر گالری",
          button: {
            text: (typeof wpdev_fields !== "undefined" && wpdev_fields.l10n && wpdev_fields.l10n.gallery_picker_button)
              ? wpdev_fields.l10n.gallery_picker_button
              : "افزودن به گالری"
          },
          library: { type: "image" },
          multiple: "add"
        });

        frame.on("open", function() {
          const selection = frame.state().get("selection");
          selection.reset();
          $grid.find("li.wpdev-gallery-item").each(function() {
            const id = $(this).data("id");
            if (id && !isNaN(id)) {
              const attachment = wp.media.attachment(id);
              attachment.fetch();
              selection.add(attachment ? [attachment] : []);
            }
          });
        });

        frame.on("select", function() {
          const selection = frame.state().get("selection");
          selection.each(function(attachment) {
            const data = attachment.toJSON();
            const attId = data.id;

            if ($grid.find('li.wpdev-gallery-item[data-id="' + attId + '"]').length > 0) {
              return;
            }

            const thumbUrl = (data.sizes && data.sizes.thumbnail) ? data.sizes.thumbnail.url : data.url;
            const fullUrl  = data.url;

            const itemHtml = '<li class="wpdev-gallery-item wpdev-relative wpdev-radius wpdev-overflow-hidden wpdev-surface-white wpdev-border wpdev-border-gray-300 wpdev-shadow-xs" data-id="' + attId + '">' +
              '<img src="' + thumbUrl + '" alt="" class="wpdev-gallery-thumb" loading="lazy" />' +
              '<input type="hidden" name="' + fieldId + '[]" value="' + attId + '" />' +
              '<div class="wpdev-gallery-item-actions wpdev-absolute wpdev-top-1" style="inset-inline-end: 0.25rem;">' +
                '<a href="' + fullUrl + '" class="wubox wpdev-gallery-action-btn" title="پیش‌نمایش تصویر" aria-label="پیش‌نمایش تصویر">' +
                  '<span class="dashicons dashicons-visibility wpdev-align-middle" aria-hidden="true"></span>' +
                '</a>' +
                '<button type="button" class="wpdev-gallery-item-remove wpdev-gallery-action-btn" title="حذف تصویر" aria-label="حذف تصویر">' +
                  '<span class="dashicons dashicons-no-alt wpdev-align-middle" aria-hidden="true"></span>' +
                '</button>' +
              '</div>' +
              '<span class="wpdev-gallery-item-sort-handle wpdev-absolute wpdev-bottom-1" style="inset-inline-start: 0.25rem;" title="برای تغییر ترتیب بکشید" aria-label="برای تغییر ترتیب بکشید">' +
                '<span class="dashicons dashicons-menu wpdev-align-middle" aria-hidden="true"></span>' +
              '</span>' +
            '</li>';

            $grid.append(itemHtml);
          });

          updateEmptyState();
          if ($grid.data("ui-sortable")) {
            $grid.sortable("refresh");
          }
        });

        wpdevGalleryFrameCache.set(fieldId, frame);
      }

      frame.open();
    });

    $container.on("click", ".wpdev-gallery-item-remove", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const $item = $(this).closest("li.wpdev-gallery-item");
      $item.fadeOut(150, function() {
        $item.remove();
        updateEmptyState();
      });
    });
  });
};
window.wpdev_init_gallery_fields = wpdev_init_gallery_fields;

const wpdev_handle_selection_limit_submit = (e) => {
  const form = e.target;
  if (!form || !form.querySelectorAll) {
    return;
  }

  const limitedWrappers = form.querySelectorAll('[data-selection-limit="1"]');
  if (!limitedWrappers || !limitedWrappers.length) {
    return;
  }

  for (let i = 0; i < limitedWrappers.length; i++) {
    const wrapper = limitedWrappers[i];
    const exactLimit   = parseInt(wrapper.getAttribute("data-exact-items"), 10) || 0;
    const minLimit     = parseInt(wrapper.getAttribute("data-min-items"), 10) || 0;
    const maxLimit     = parseInt(wrapper.getAttribute("data-max-items"), 10) || 0;

    const allCheckboxes = wrapper.querySelectorAll('input[type="checkbox"]');
    const checkedBoxes  = wrapper.querySelectorAll('input[type="checkbox"]:checked');
    const current       = checkedBoxes.length;

    const totalOptionsAttr = parseInt(wrapper.getAttribute("data-total-options"), 10);
    const totalOptions     = (!isNaN(totalOptionsAttr) && totalOptionsAttr > 0) ? totalOptionsAttr : allCheckboxes.length;

    const baseLimit = exactLimit > 0 ? exactLimit : maxLimit;
    const effectiveLimit = baseLimit > 0 ? Math.min(baseLimit, totalOptions) : totalOptions;

    let isViolation = false;
    if (exactLimit > 0 && current !== effectiveLimit) {
      isViolation = true;
    } else if (minLimit > 0 && current < minLimit) {
      isViolation = true;
    } else if (maxLimit > 0 && current > effectiveLimit) {
      isViolation = true;
    }

    if (isViolation) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const publishBtn = document.getElementById("publish");
      if (publishBtn) {
        publishBtn.classList.remove("disabled");
        const spinner = document.querySelector("#publishing-action .spinner");
        if (spinner) {
          spinner.classList.remove("is-active");
        }
      }

      // Switch to parent tab if inside a tab container
      const tabContent = wrapper.closest('.wpdev-tab-content, [id^="wpdev_tab_"]');
      if (tabContent) {
        const tabId = tabContent.id;
        const sectionId = tabId.replace(/^wpdev_tab_/, "");
        const appEl = tabContent.closest("[data-wpdev-app]");
        if (appEl && appEl.__vue__) {
          appEl.__vue__.section = sectionId;
        }

        const tabBtn = appEl ? appEl.querySelector("a[v-on\\:click*=\"'" + sectionId + "'\"], a[data-tab=\"" + sectionId + "\"]") : null;
        if (tabBtn) {
          tabBtn.click();
          tabBtn.classList.add("wpdev-tab-error-pulse");
          setTimeout(() => tabBtn.classList.remove("wpdev-tab-error-pulse"), 3500);
        }

        const settingsTab = document.querySelector("#tab-selector-" + sectionId + "-link");
        if (settingsTab) {
          settingsTab.click();
          settingsTab.classList.add("wpdev-tab-error-pulse");
          setTimeout(() => settingsTab.classList.remove("wpdev-tab-error-pulse"), 3500);
        }
      }

      // Shake animation and smooth scroll into view
      wrapper.classList.add("wpdev-field-error-shake");
      setTimeout(() => wrapper.classList.remove("wpdev-field-error-shake"), 3000);
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight message notice
      const noticeWrap = wrapper.querySelector(".wpdev-selection-limit-wrap");
      const msgEl = noticeWrap ? noticeWrap.querySelector(".wpdev-limit-message") : null;
      if (msgEl) {
        msgEl.classList.remove("is-valid", "wpdev-type-green-600");
        msgEl.classList.add("is-invalid", "wpdev-type-red-600");
      }

      // Focus first checkbox
      const firstCb = wrapper.querySelector('input[type="checkbox"]');
      if (firstCb) {
        firstCb.focus();
      }

      break;
    }
  }
};
document.addEventListener("submit", wpdev_handle_selection_limit_submit, true);
document.addEventListener("click", function(e) {
  const btn = e.target && e.target.closest ? e.target.closest("#publish, #save-post, input[type='submit'][id*='save']") : null;
  if (!btn) return;
  const form = btn.closest("form") || document.querySelector("form#post");
  if (!form) return;
  const limitedWrappers = form.querySelectorAll('[data-selection-limit="1"]');
  if (!limitedWrappers.length) return;
  for (let i = 0; i < limitedWrappers.length; i++) {
    const wrapper = limitedWrappers[i];
    const exactLimit = parseInt(wrapper.getAttribute("data-exact-items"), 10) || 0;
    const maxLimit = parseInt(wrapper.getAttribute("data-max-items"), 10) || 0;
    const allCheckboxes = wrapper.querySelectorAll('input[type="checkbox"]');
    const checkedBoxes = wrapper.querySelectorAll('input[type="checkbox"]:checked');
    const totalOptionsAttr = parseInt(wrapper.getAttribute("data-total-options"), 10);
    const totalOptions = (!isNaN(totalOptionsAttr) && totalOptionsAttr > 0) ? totalOptionsAttr : allCheckboxes.length;
    const baseLimit = exactLimit > 0 ? exactLimit : maxLimit;
    const effectiveLimit = baseLimit > 0 ? Math.min(baseLimit, totalOptions) : totalOptions;
    if (exactLimit > 0 && checkedBoxes.length !== effectiveLimit) {
      e.preventDefault();
      e.stopImmediatePropagation();
      wpdev_handle_selection_limit_submit({ target: form, preventDefault: () => {}, stopImmediatePropagation: () => {} });
      return;
    }
  }
}, true);

const loadApps = () => {
  const appsElements = document.querySelectorAll("[data-wpdev-app]");
  appsElements.forEach((element) => {
    if (!Vue) {
      return;
    }
    const appId = element.dataset["wpdevApp"];

    if (appId) {
      loadApp(element, appId);
    }
  });
};
document.addEventListener("DOMContentLoaded", () => {
  Vue.component("colorPicker", {
    props: ["value"],
    template: '<input type="text">',
    mounted() {
      const vm = this;
      jQuery(this.$el).val(this.value).wpColorPicker({
        width: 200,
        defaultColor: this.value,
        change(event, ui) {
          vm.$emit("input", ui.color.toString());
        }
      });
    },
    watch: {
      value(value) {
        jQuery(this.$el).wpColorPicker("color", value);
      }
    },
    destroyed() {
      jQuery(this.$el).off().wpColorPicker("destroy");
    }
  });
  Vue.component("wpEditor", {
    props: ["value", "id", "name"],
    template: '<textarea v-bind="$props"></textarea>',
    mounted() {
      if (typeof wp.editor === "undefined") {
        return;
      }
      const that = this;
      wp.editor.remove(this.id);
      wp.editor.initialize(this.id, {
        tinymce: {
          setup(editor) {
            editor.on("init", function() {
              if (typeof window.wubox !== "undefined" && typeof window.wubox.refresh === "function") {
                window.wubox.refresh();
              }
            });
            editor.on("keyup", () => {
              if (editor.isDirty()) {
                that.$emit("input", editor.getContent());
              }
            });
          }
        }
      });
    },
    destroyed() {
      if (typeof wp.editor === "undefined") {
        return;
      }
      wp.editor.remove(this.id);
    }
  });
  document.body.addEventListener("wubox:unload", function() {
    const modal = document.getElementById("WUB_window");
    const app = modal.querySelector("ul[data-wpdev-app]");
    const app_name = "wpdev_" + app.dataset["wpdevApp"];
    delete window[app_name];
    delete window[app_name + "_errors"];
  });
  document.body.addEventListener("wubox:load", function() {
    loadApps();
    if (typeof window.wpdev_init_sortable_repeaters === "function") {
      window.wpdev_init_sortable_repeaters();
    }
    if (typeof window.wpdev_init_selection_limits === "function") {
      window.wpdev_init_selection_limits();
    }
    if (typeof window.wpdev_init_gallery_fields === "function") {
      window.wpdev_init_gallery_fields();
    }
  });
  // Delegated accordion toggle listener
  document.addEventListener("click", function(e) {
    const header = e.target && e.target.closest ? e.target.closest(".wpdev-repeater-accordion-header") : null;
    if (!header) {
      return;
    }
    // Ignore clicks on remove button, sort handle, or inside them
    if (e.target.closest(".wpdev-remove-repeater-line") || e.target.closest(".wpdev-repeater-sort-handle")) {
      return;
    }
    e.preventDefault();

    const currentItem = header.closest(".wpdev-repeater-accordion-item");
    if (!currentItem || !currentItem.parentNode) {
      return;
    }

    const list = currentItem.parentNode;
    let fieldClass = "";
    currentItem.classList.forEach((cls) => {
      if (cls.indexOf("field-repeater-") === 0) {
        fieldClass = cls;
      }
    });

    const selector = fieldClass ? ":scope > ." + fieldClass + ".wpdev-repeater-accordion-item" : ":scope > .wpdev-repeater-accordion-item";
    const siblings = list.querySelectorAll(selector);
    const isCurrentlyOpen = currentItem.classList.contains("is-open");

    // Only ONE item is open at a time in this repeater instance
    siblings.forEach((item) => {
      if (item !== currentItem) {
        item.classList.remove("is-open");
        const content = item.querySelector(".wpdev-repeater-accordion-content");
        if (content) {
          content.style.display = "none";
        }
        const hdr = item.querySelector(".wpdev-repeater-accordion-header");
        if (hdr) {
          hdr.setAttribute("aria-expanded", "false");
        }
      }
    });

    // Toggle current item
    if (isCurrentlyOpen) {
      currentItem.classList.remove("is-open");
      const content = currentItem.querySelector(".wpdev-repeater-accordion-content");
      if (content) {
        content.style.display = "none";
      }
      header.setAttribute("aria-expanded", "false");
    } else {
      currentItem.classList.add("is-open");
      const content = currentItem.querySelector(".wpdev-repeater-accordion-content");
      if (content) {
        content.style.display = "";
      }
      header.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("input", function(e) {
    const target = e.target;
    if (!target || !target.name) return;
    const name = target.name;
    const item = target.closest(".wpdev-repeater-accordion-item");
    if (!item) return;
    const headerTitle = item.querySelector(".wpdev-repeater-accordion-title");
    if (!headerTitle) return;

    if (
      name.indexOf("title") !== -1 ||
      name.indexOf("step_title") !== -1 ||
      name.indexOf("name") !== -1 ||
      name.indexOf("label") !== -1
    ) {
      let customTitle = headerTitle.querySelector(".wpdev-repeater-accordion-custom-title");
      const val = target.value.trim() || target.getAttribute("placeholder") || target.getAttribute("data-parent-val") || "";
      if (val) {
        if (!customTitle) {
          customTitle = document.createElement("span");
          customTitle.className = "wpdev-repeater-accordion-custom-title wpdev-type-gray-600 wpdev-font-normal";
          const subBadge = headerTitle.querySelector(".wpdev-repeater-accordion-sub-badge");
          if (subBadge) {
            headerTitle.insertBefore(customTitle, subBadge);
          } else {
            headerTitle.appendChild(customTitle);
          }
        }
        customTitle.textContent = " — " + val;
      } else if (customTitle) {
        customTitle.remove();
      }
    }

    const header = item.querySelector(".wpdev-repeater-accordion-header");
    if (header && header.hasAttribute("data-badge-field")) {
      const badgeField = header.getAttribute("data-badge-field");
      if (badgeField && name.indexOf(badgeField) !== -1) {
        let subBadge = headerTitle.querySelector(".wpdev-repeater-accordion-sub-badge");
        const val = target.value.trim();
        if (val) {
          if (!subBadge) {
            subBadge = document.createElement("span");
            subBadge.className = "wpdev-repeater-accordion-sub-badge wpdev-badge wpdev-badge-info wpdev-pad-x-2 wpdev-pad-y-1 wpdev-radius wpdev-type-xs wpdev-font-medium wpdev-surface-blue-50 wpdev-type-blue-700 wpdev-border wpdev-border-blue-200";
            subBadge.style.marginInlineStart = "0.5rem";
            headerTitle.appendChild(subBadge);
          }
          subBadge.textContent = val;
        } else if (subBadge) {
          subBadge.remove();
        }
      }
    }
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") {
      const header = e.target && e.target.closest ? e.target.closest(".wpdev-repeater-accordion-header") : null;
      if (header && e.target === header) {
        e.preventDefault();
        header.click();
      }
    }
  });

  window.wpdevQuickAddTerm = {
    onTermCreated: function(data, removeBox) {
      if (!data || !data.term_id) {
        if (typeof removeBox === "function") removeBox();
        return;
      }
      var fieldId = data.field_id || "";
      var termId = data.term_id;
      var termName = data.term_name || "";

      var container = null;
      if (fieldId) {
        var fieldWrapper = document.querySelector(".field-multi_checkbox-" + fieldId + ", .field-multiselect-" + fieldId + ", [id*='" + fieldId + "']");
        if (fieldWrapper) {
          container = fieldWrapper.querySelector("ul.wpdev-multiselect-content, ul.items");
        }
      }
      if (!container && data.taxonomy) {
        var btn = document.querySelector("a[data-taxonomy='" + data.taxonomy + "']");
        if (btn) {
          var wrap = btn.closest(".field-multi_checkbox, .field-multiselect, li");
          if (wrap) {
            container = wrap.querySelector("ul.wpdev-multiselect-content, ul.items");
          }
        }
      }

      if (container) {
        var inputName = fieldId ? (fieldId + "[]") : (data.taxonomy ? ("tax_input_" + data.taxonomy + "[]") : "tax_input[]");
        var inputId = (fieldId || "tax_input") + "_" + termId;

        var li = document.createElement("li");
        li.className = "item wpdev-box-border wpdev-mar-0 wpdev-mar-y-2";

        var div = document.createElement("div");
        div.className = "wpdev-surface-gray-100 wpdev-pad-3 wpdev-mar-0 wpdev-border-gray-300 wpdev-border-solid wpdev-border wpdev-radius wpdev-items-center wpdev-row wpdev-justify-between";

        var label = document.createElement("label");
        label.setAttribute("for", inputId);
        label.className = "wpdev-block wpdev-cursor-pointer wpdev-flex-grow";

        var span = document.createElement("span");
        span.className = "wpdev-mar-y-1 wpdev-type-xs wpdev-font-bold wpdev-block";
        span.appendChild(document.createTextNode(termName));
        label.appendChild(span);

        var chkSpan = document.createElement("span");
        chkSpan.className = "wpdev-block wpdev-mar-l-2";

        var chk = document.createElement("input");
        chk.type = "checkbox";
        chk.id = inputId;
        chk.name = inputName;
        chk.value = String(termId);
        chk.checked = true;
        chk.className = "wpdev-checkbox";

        chkSpan.appendChild(chk);
        div.appendChild(label);
        div.appendChild(chkSpan);
        li.appendChild(div);
        container.appendChild(li);

        chk.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (typeof removeBox === "function") {
        removeBox();
      }
    }
  };

  loadApps();
  if (typeof window.wpdev_init_sortable_repeaters === "function") {
    window.wpdev_init_sortable_repeaters();
  }
  if (typeof window.wpdev_init_selection_limits === "function") {
    window.wpdev_init_selection_limits();
  }
  if (typeof window.wpdev_init_gallery_fields === "function") {
    window.wpdev_init_gallery_fields();
  }
  // List/filter pages may enqueue vue-apps with zero [data-wpdev-app].
  // mounted() is the usual wpdev_on_load path — call it once when nothing mounts
  // so Flatpickr (and other widgets) still initialize.
  if (document.querySelectorAll("[data-wpdev-app]").length === 0 && typeof window.wpdev_on_load === "function") {
    window.wpdev_on_load();
  }
});
})()
