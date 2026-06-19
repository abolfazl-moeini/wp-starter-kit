// syncFeaturesToConfig was removed in the config refactor.
// wpdev.json (via buildManifest + writeManifest) is the single source of truth.
// This file is kept as a placeholder so the test suite doesn't error on discovery.

describe("syncFeaturesToConfig removed (refactor complete)", () => {
  test("no-op placeholder — dual config sync is gone", () => {
    expect(true).toBe(true);
  });
});
