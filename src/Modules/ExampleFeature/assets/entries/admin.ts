/**
 * ExampleFeature admin bundle entry.
 *
 * Hook examples (subscribe in any module bundle after the deps bundle loads):
 *
 *   import { getHooks } from "@wpdev/hooks";
 *   const hooks = getHooks();
 *   hooks?.addAction(
 *     `${__WPDEV_HOOK_PREFIX__}-request-ajax-start`,
 *     "@wpdev/example-feature",
 *     (endpoint, options = {}) => { ... },
 *   );
 *   hooks?.applyFilters(
 *     `${__WPDEV_HOOK_PREFIX__}.example-feature.validate`,
 *     errors,
 *     formData,
 *   );
 */
import domReady from "@wordpress/dom-ready";

domReady(() => {
  const root = document.getElementById("wpdev-starter-example-feature-admin");
  if (root) {
    root.textContent = "ExampleFeature admin bundle loaded";
  }
});