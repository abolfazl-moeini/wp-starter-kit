/**
 * ExampleFeature admin bundle entry.
 */
import domReady from "@wordpress/dom-ready";

domReady(() => {
  const root = document.getElementById("wpsk-example-feature-admin");
  if (root) {
    root.textContent = "ExampleFeature admin bundle loaded";
  }
});
