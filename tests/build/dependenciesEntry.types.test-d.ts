/**
 * Type-only test fixture for assets/dependencies.ts.
 *
 * This file is intentionally NOT a Jest test -- its filename ends in
 * `.test-d.ts` (the `d` suffix is the convention for "type definition"
 * smoke tests) so it is excluded from jest's `testMatch` (which only
 * globs `.test.js`).
 *
 * It exists to be type-checked by `tsc --noEmit` (the
 * `npm run typecheck` script). Each line either:
 *   1. Asserts a contract -- the assignment would fail to compile if the
 *      contract were broken.
 *   2. Uses a `@ts-expect-error` comment to assert a NEGATIVE contract:
 *      the line MUST be a type error, otherwise `@ts-expect-error`
 *      itself fails to compile.
 *
 * The point is to lock the type surface of `assets/dependencies.ts` so
 * a future refactor (e.g. changing the `table` shape) cannot silently
 * break consumers that depend on the IIFE global's shape.
 *
 * Why the `.js` extension in the import: with `moduleResolution:
 * "Bundler"`, TypeScript resolves the explicit `.js` extension to the
 * corresponding `.ts` file. The `.js` extension is the only form that
 * does NOT require `allowImportingTsExtensions` to be set. The
 * file at `../../assets/dependencies.ts` is the canonical target.
 *
 * Why `unknown` casts in the assertions: `assets/dependencies.ts`
 * imports `createHooks` from `@wordpress/hooks` (an OPTIONAL runtime
 * dep) and uses the `__WPDEV_HOOK_PREFIX__` esbuild define. When
 * `@wordpress/hooks` is not installed and the defines are not
 * registered, tsc infers the exports as `any` / `unknown`. The
 * assertions below cast through `unknown` to assert the SHAPE (an
 * object with `addAction`, an object with `Tabulator`) without
 * requiring the source to be fully type-clean today.
 */
import * as depsModule from "../../assets/dependencies.js";

// 1. POSITIVE: `hooks` is an object with a callable `addAction` method.
//    This asserts the createHooks() factory is wired correctly. If
//    a future refactor replaced it with a primitive value, the
//    assignment below would fail to type-check.
const _typedHooks: { addAction: (...args: unknown[]) => unknown } =
  depsModule.hooks as unknown as { addAction: (...args: unknown[]) => unknown };

// 2. POSITIVE: `table` is an object literal with a `Tabulator` key.
//    We assert the shape without locking the value type (Tabulator's
//    own types are heavy; we only care that the bridge is preserved).
const _tableShape: { Tabulator: unknown } = depsModule.table as unknown as {
  Tabulator: unknown;
};

// 3. POSITIVE: `table.Tabulator` is `unknown`. We never committed to
//    the third-party Tabulator type surface, and we don't want to.
const _tableTabulator: unknown = (depsModule.table as { Tabulator: unknown })
  .Tabulator;

// Reference the variables so a future refactor cannot delete them.
void _typedHooks;
void _tableShape;
void _tableTabulator;
