/**
 * WPDev Metabox Conditions Driver.
 *
 * Toggles metabox visibility in WordPress post/page edit screens based on
 * declarative condition data attributes (data-wpdev-condition-template,
 * data-wpdev-condition-format).
 *
 * Supports both Classic Editor and Gutenberg Block Editor.
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.14.0
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node / CommonJS / Jest
    module.exports = factory();
  } else {
    // Browser global
    root.WPDevMetaboxConditions = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Normalizes a template string.
   *
   * @param {string|null|undefined} tpl
   * @return {string}
   */
  function normalizeTemplate(tpl) {
    if (!tpl || tpl === '' || tpl === 'default') {
      return 'default';
    }
    return String(tpl).trim();
  }

  /**
   * Normalizes a post format string.
   *
   * @param {string|null|undefined} fmt
   * @return {string}
   */
  function normalizeFormat(fmt) {
    if (!fmt || fmt === '0' || fmt === 'standard') {
      return 'standard';
    }
    return String(fmt).trim();
  }

  /**
   * Evaluate whether a metabox condition matches the current editor state.
   *
   * @param {Object} condition - { template?: string|string[], format?: string|string[] }
   * @param {Object} currentState - { template?: string, format?: string }
   * @return {boolean}
   */
  function evaluateCondition(condition, currentState) {
    currentState = currentState || {};

    // 1. Template check
    if (condition.template !== undefined && condition.template !== null) {
      const allowedTemplates = (Array.isArray(condition.template)
        ? condition.template
        : String(condition.template).split(',')
      ).map(normalizeTemplate);

      const currentTpl = normalizeTemplate(currentState.template);

      if (!allowedTemplates.includes(currentTpl)) {
        return false;
      }
    }

    // 2. Post format check
    if (condition.format !== undefined && condition.format !== null) {
      const allowedFormats = (Array.isArray(condition.format)
        ? condition.format
        : String(condition.format).split(',')
      ).map(normalizeFormat);

      const currentFmt = normalizeFormat(currentState.format);

      if (!allowedFormats.includes(currentFmt)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Scans container for conditioned metaboxes and toggles display style.
   *
   * @param {Element|Document} container
   * @param {Object} currentState - { template?: string, format?: string }
   */
  function updateMetaboxVisibility(container, currentState) {
    const rootEl = container || document;
    if (!rootEl.querySelectorAll) {
      return;
    }

    const elements = rootEl.querySelectorAll(
      '[data-wpdev-condition-template], [data-wpdev-condition-format]'
    );

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const condition = {};

      const tplAttr = el.getAttribute('data-wpdev-condition-template');
      if (tplAttr !== null) {
        condition.template = tplAttr.split(',').map(function (s) {
          return s.trim();
        });
      }

      const fmtAttr = el.getAttribute('data-wpdev-condition-format');
      if (fmtAttr !== null) {
        condition.format = fmtAttr.split(',').map(function (s) {
          return s.trim();
        });
      }

      const isMatch = evaluateCondition(condition, currentState);
      const target = (el.closest && el.closest('.postbox')) || el;

      if (isMatch) {
        target.style.display = '';
      } else {
        target.style.display = 'none';
      }
    }
  }

  /**
   * Reads current editor state from Classic Editor DOM.
   *
   * @param {Element|Document} rootEl
   * @param {string} [templateSelector]
   * @return {{ template: string, format: string }}
   */
  function getClassicEditorState(rootEl, templateSelector) {
    const doc = rootEl || document;
    let template = 'default';
    let format = 'standard';

    const tplSelect = doc.querySelector(templateSelector || '#page_template');
    if (tplSelect && tplSelect.value) {
      template = tplSelect.value;
    }

    const fmtRadio = doc.querySelector('input[name="post_format"]:checked');
    if (fmtRadio && fmtRadio.value) {
      format = fmtRadio.value;
    }

    return { template: template, format: format };
  }

  /**
   * Initialize condition listeners across Classic and Gutenberg editors.
   *
   * @param {Object} [options]
   * @param {Element|Document} [options.root]
   * @param {string} [options.templateSelector]
   * @return {Function} Teardown cleanup function.
   */
  function initMetaboxConditions(options) {
    options = options || {};
    const rootEl = options.root || (typeof document !== 'undefined' ? document : null);
    if (!rootEl) {
      return function () {};
    }

    const tplSelector = options.templateSelector || '#page_template';
    let unsubscribeGutenberg = null;

    function refresh() {
      const state = getClassicEditorState(rootEl, tplSelector);
      updateMetaboxVisibility(rootEl, state);
    }

    // 1. Initial run
    refresh();

    // 2. Classic Editor: Change listener on #page_template
    const tplEl = rootEl.querySelector(tplSelector);
    if (tplEl && tplEl.addEventListener) {
      tplEl.addEventListener('change', refresh);
    }

    // 3. Classic Editor: Change listener on post format radios
    const formatRadios = rootEl.querySelectorAll ? rootEl.querySelectorAll('input[name="post_format"]') : [];
    for (let i = 0; i < formatRadios.length; i++) {
      if (formatRadios[i].addEventListener) {
        formatRadios[i].addEventListener('change', refresh);
      }
    }

    // 4. Gutenberg Block Editor: subscribe to store changes if available
    if (typeof window !== 'undefined' && window.wp && window.wp.data && window.wp.data.subscribe) {
      let lastGutenbergTemplate = null;
      unsubscribeGutenberg = window.wp.data.subscribe(function () {
        const select = window.wp.data.select('core/editor');
        if (!select || !select.getEditedPostAttribute) {
          return;
        }
        const currentTemplate = select.getEditedPostAttribute('template');
        if (currentTemplate !== lastGutenbergTemplate) {
          lastGutenbergTemplate = currentTemplate;
          updateMetaboxVisibility(rootEl, {
            template: currentTemplate || 'default',
            format: select.getEditedPostAttribute('format') || 'standard',
          });
        }
      });
    }

    // Teardown function
    return function teardown() {
      if (tplEl && tplEl.removeEventListener) {
        tplEl.removeEventListener('change', refresh);
      }
      for (let i = 0; i < formatRadios.length; i++) {
        if (formatRadios[i].removeEventListener) {
          formatRadios[i].removeEventListener('change', refresh);
        }
      }
      if (typeof unsubscribeGutenberg === 'function') {
        unsubscribeGutenberg();
      }
    };
  }

  // Auto-init in browser when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initMetaboxConditions();
      });
    } else {
      initMetaboxConditions();
    }
  }

  return {
    normalizeTemplate: normalizeTemplate,
    normalizeFormat: normalizeFormat,
    evaluateCondition: evaluateCondition,
    updateMetaboxVisibility: updateMetaboxVisibility,
    getClassicEditorState: getClassicEditorState,
    initMetaboxConditions: initMetaboxConditions,
  };
});
