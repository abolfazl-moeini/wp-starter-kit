# Conflict plugin fixtures

Minimal plugin stubs used by `VendorScopingIntegrationTest` to prove that
two scoped vendor trees can coexist in one PHP process.

Each plugin ships a pre-built `vendor-prefixed/` tree with a fake
`GuzzleHttp\Client` class under a distinct namespace prefix
(`AlphaVendor\` vs `BetaVendor\`).

These fixtures are **not** full WordPress plugins — they only exercise
autoload isolation.
