# Contract U01 — readProjectConfig

Source: `core/packages/utils/readProjectConfig.js` @ `8c1e9ba`.

Input: filesystem path to JSON, or walk from StartDir/cwd for `wpdev.json`.

Output: merged config object.

Errors:

- missing file → `wpdev.json not found at: PATH`
- invalid JSON → `wpdev.json is malformed or invalid JSON at: PATH`
- JSON null → `wpdev.json must contain a JSON object`
- JSON array → missing required fields (JS `typeof array === "object"`)
- missing/empty required keys → `wpdev.json missing required fields: ...`

Defaults applied only when the key is absent: `phpFunctionPrefix`, `uiFramework=preact`, v2 fields, `depsBundle={slug}-deps.js`.

Unknown keys are kept in Extra (v3 forward-compat).
