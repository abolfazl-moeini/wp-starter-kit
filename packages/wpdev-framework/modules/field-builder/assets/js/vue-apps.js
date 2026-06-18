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
      wpdev_on_load();
      hooks.doAction("wpdev_" + app_id + "_mounted", this.$data);
      const cb = element.dataset.onLoad;
      if (typeof window[cb] === "function") {
        window[cb]();
      }
      if (callback) {
        callback();
      }
      this.$nextTick(function() {
        window.wpdev_initialize_code_editors();
        window.wubox.refresh();
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
        window.wpdev_initialize_code_editors();
        window.wubox.refresh();
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
        const elements = document.querySelectorAll(query);
        const target = elements.item(elements.length - 1);
        const clone = target.cloneNode(true);
        clone.id = clone.id + "_copy";
        const textAreas = clone.querySelectorAll("input, textarea");
        textAreas.forEach((el) => el.value = "");
        (_a = target.parentNode) == null ? void 0 : _a.insertBefore(clone, target.nextSibling);
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
              wubox.refresh();
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
  document.body.addEventListener("wubox:load", loadApps);
  loadApps();
});
})()
