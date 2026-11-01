/* WPDev: flatpickr-wrap Persian/Jalali locale (fa). Load after wpdev-flatpicker. */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.fa = {}));
})(this, (function (exports) { 'use strict';

  var fp = typeof window !== "undefined" && window.flatpickr !== undefined
      ? window.flatpickr
      : {
          l10ns: {},
      };
  var Persian = {
      weekdays: {
          shorthand: ["1ش", "۲ش", "۳ش", "۴ش", "۵ش", "ج", "ش"],
          longhand: [
              "یک‌شنبه",
              "دوشنبه",
              "سه‌شنبه",
              "چهارشنبه",
              "پنج‌شنبه",
              "جمعه",
              "شنبه",
          ],
      },
      months: {
          shorthand: [
              "فَر",
              "اُر",
              "خُر",
              "تیر",
              "مُر",
              "شَه",
              "مهر",
              "آب",
              "آذر",
              "دی",
              "بَه",
              "اِس",
          ],
          longhand: [
              "فروردین",
              "اردیبهشت",
              "خرداد",
              "تیر",
              "مرداد",
              "شهریور",
              "مهر",
              "آبان",
              "آذر",
              "دی",
              "بهمن",
              "اسفند",
          ],
      },
      firstDayOfWeek: 6,
      daysInMonth: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30],
      ordinal: function () {
          return "";
      },
      rangeSeparator: "\u200E تا \u200E",
      // weekAbbreviation: "Wk",
      // scrollTitle: "Scroll to increment",
      // toggleTitle: "Click to toggle",
      amPM: ["صبح", "بعدازظهر"],
      yearAriaLabel: "سال",
      monthAriaLabel: "ماه",
      hourAriaLabel: "ساعت",
      minuteAriaLabel: "دقیقه",
      time_24hr: false,
  };
  fp.l10ns.fa = Persian;
  var fa = fp.l10ns;

  exports.Persian = Persian;
  exports["default"] = fa;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
