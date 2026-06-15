#!/usr/bin/env node
/**
 * @wpsk/cli — bin entry. Imported as the main file by package consumers
 * (`npx wpsk`, `npm exec wpsk`, global install, or `node bin/wpsk.js ...`).
 *
 * The actual CLI logic lives in `../src/main.js` so unit tests can import
 * the program builder in-process without spawning a subprocess.
 */
import "../src/main.js";
