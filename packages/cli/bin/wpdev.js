#!/usr/bin/env node
/**
 * @wpdev/cli — bin entry. Imported as the main file by package consumers
 * (`npx wpdev`, `npm exec wpdev`, global install, or `node bin/wpdev.js ...`).
 *
 * The actual CLI logic lives in `../src/main.js` so unit tests can import
 * the program builder in-process without spawning a subprocess.
 */
import "../src/main.js";
