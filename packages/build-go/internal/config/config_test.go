package config_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config"
)

func writeJSON(t *testing.T, dir, name string, value any) string {
	t.Helper()
	path := filepath.Join(dir, name)
	var raw []byte
	var err error
	switch v := value.(type) {
	case string:
		raw = []byte(v)
	default:
		raw, err = json.Marshal(v)
		if err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func minimal() map[string]any {
	return map[string]any{
		"slug":        "test",
		"globalName":  "Test",
		"localizeVar": "TestLoc",
		"textDomain":  "test",
		"hookPrefix":  "test",
		"npmScope":    "@test",
	}
}

func TestRead_RequiredAndDefaults(t *testing.T) {
	dir := t.TempDir()
	path := writeJSON(t, dir, "wpdev.json", map[string]any{
		"slug":        "my-project",
		"globalName":  "MyProject",
		"localizeVar": "MyProjectLoc",
		"textDomain":  "my-project",
		"hookPrefix":  "my-project",
		"npmScope":    "@my-org",
	})
	cfg, err := config.Read(config.Options{Path: path})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if cfg.Slug != "my-project" {
		t.Fatalf("slug=%q", cfg.Slug)
	}
	if cfg.UIFramework != "preact" {
		t.Fatalf("uiFramework=%q", cfg.UIFramework)
	}
	if cfg.DepsBundle != "my-project-deps.js" {
		t.Fatalf("depsBundle=%q", cfg.DepsBundle)
	}
	if cfg.PHPFunctionPrefix != "wpdev_" {
		t.Fatalf("phpFunctionPrefix=%q", cfg.PHPFunctionPrefix)
	}
	if cfg.VendorPrefix != "WpdevVendor" {
		t.Fatalf("vendorPrefix=%q", cfg.VendorPrefix)
	}
	if cfg.RESTNamespace != "wpdev/v1" {
		t.Fatalf("restNamespace=%q", cfg.RESTNamespace)
	}
	if cfg.PHPMinVersion != "7.4" || cfg.PHPSourceVersion != "8.1" {
		t.Fatalf("php versions %q %q", cfg.PHPMinVersion, cfg.PHPSourceVersion)
	}
	if cfg.BatchEndpoint != "/batch/v1" {
		t.Fatalf("batchEndpoint=%q", cfg.BatchEndpoint)
	}
}

func TestRead_EmptySlugIsMissing(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = ""
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "empty-slug.json", body)})
	if err == nil || !strings.Contains(err.Error(), "missing required fields: slug") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_NullVendorPrefixStaysNull(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["vendorPrefix"] = nil
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "null-vendor.json", body)})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !cfg.VendorPrefixNull {
		t.Fatalf("expected VendorPrefixNull, got %q", cfg.VendorPrefix)
	}
	if cfg.VendorPrefix != "" {
		t.Fatalf("null vendorPrefix should not keep a default string, got %q", cfg.VendorPrefix)
	}
}

func TestRead_UnicodeSlug(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = "افزونه"
	body["globalName"] = "افزونه"
	body["textDomain"] = "افزونه"
	body["hookPrefix"] = "افزونه"
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "unicode.json", body)})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if cfg.Slug != "افزونه" {
		t.Fatalf("slug=%q", cfg.Slug)
	}
	if cfg.DepsBundle != "افزونه-deps.js" {
		t.Fatalf("depsBundle=%q", cfg.DepsBundle)
	}
}

func TestRead_ArrayRootMissingFields(t *testing.T) {
	dir := t.TempDir()
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "array.json", "[1,2]")})
	if err == nil || !strings.Contains(err.Error(), "missing required fields") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_NullRootRejected(t *testing.T) {
	dir := t.TempDir()
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "null.json", "null")})
	if err == nil || !strings.Contains(err.Error(), "must contain a JSON object") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_MalformedJSON(t *testing.T) {
	dir := t.TempDir()
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "bad.json", "{ bad }")})
	if err == nil || !strings.Contains(err.Error(), "malformed or invalid JSON") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_MissingFile(t *testing.T) {
	_, err := config.Read(config.Options{Path: filepath.Join(t.TempDir(), "nope.json")})
	if err == nil || !strings.Contains(err.Error(), "not found") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_TwoPathsDoNotLeak(t *testing.T) {
	dir := t.TempDir()
	aBody := minimal()
	aBody["slug"] = "alpha"
	bBody := minimal()
	bBody["slug"] = "beta"
	a, err := config.Read(config.Options{Path: writeJSON(t, dir, "a.json", aBody)})
	if err != nil {
		t.Fatal(err)
	}
	b, err := config.Read(config.Options{Path: writeJSON(t, dir, "b.json", bBody)})
	if err != nil {
		t.Fatal(err)
	}
	if a.Slug != "alpha" || b.Slug != "beta" {
		t.Fatalf("a=%q b=%q", a.Slug, b.Slug)
	}
	if a.DepsBundle != "alpha-deps.js" || b.DepsBundle != "beta-deps.js" {
		t.Fatalf("bundles %q %q", a.DepsBundle, b.DepsBundle)
	}
}

func TestRead_InvalidUIFramework(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["uiFramework"] = "vue"
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "vue.json", body)})
	if err == nil || !strings.Contains(err.Error(), `uiFramework must be "preact" or "react"`) {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_NullUIFrameworkRejected(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["uiFramework"] = nil
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "null-ui.json", body)})
	if err == nil || !strings.Contains(err.Error(), `uiFramework must be "preact" or "react"`) {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_UnknownKeysPreserved(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["features"] = map[string]any{"js": "typescript"}
	body["experimentalFlag"] = true
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "extras.json", body)})
	if err != nil {
		t.Fatal(err)
	}
	js, ok := cfg.Extra["features"].(map[string]any)
	if !ok {
		t.Fatalf("features extra=%T %#v", cfg.Extra["features"], cfg.Extra["features"])
	}
	if js["js"] != "typescript" {
		t.Fatalf("features.js=%v", js["js"])
	}
	if cfg.Extra["experimentalFlag"] != true {
		t.Fatalf("experimentalFlag=%v", cfg.Extra["experimentalFlag"])
	}
}

func TestRead_InvalidVendorPrefix(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["vendorPrefix"] = "1Bad"
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "bad-vendor.json", body)})
	if err == nil || !strings.Contains(err.Error(), "vendorPrefix") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_ExplicitOverrides(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["depsBundle"] = "custom-deps.js"
	body["phpFunctionPrefix"] = "custom_"
	body["uiFramework"] = "react"
	body["restNamespace"] = "myns/v2"
	body["vendorPrefix"] = "AcmeVendor"
	body["phpMinVersion"] = "8.0"
	body["phpSourceVersion"] = "8.2"
	body["batchEndpoint"] = "/wp/v2/batch"
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "override.json", body)})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DepsBundle != "custom-deps.js" || cfg.PHPFunctionPrefix != "custom_" || cfg.UIFramework != "react" {
		t.Fatalf("overrides failed: %#v", cfg)
	}
	if cfg.RESTNamespace != "myns/v2" || cfg.VendorPrefix != "AcmeVendor" {
		t.Fatalf("v2 overrides failed: %#v", cfg)
	}
	if cfg.PHPMinVersion != "8.0" || cfg.PHPSourceVersion != "8.2" || cfg.BatchEndpoint != "/wp/v2/batch" {
		t.Fatalf("php/batch overrides failed: %#v", cfg)
	}
}

func TestRead_WalksToRootFromStartDir(t *testing.T) {
	root := t.TempDir()
	body := minimal()
	body["slug"] = "walked"
	if err := os.WriteFile(filepath.Join(root, "wpdev.json"), mustJSON(t, body), 0o644); err != nil {
		t.Fatal(err)
	}
	nested := filepath.Join(root, "src", "Modules")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	cfg, err := config.Read(config.Options{StartDir: nested})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Slug != "walked" {
		t.Fatalf("slug=%q", cfg.Slug)
	}
}

func mustJSON(t *testing.T, v any) []byte {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func TestRead_V2FieldValidation(t *testing.T) {
	dir := t.TempDir()
	cases := []struct {
		field string
		value any
		sub   string
	}{
		{"restNamespace", "nospace", "restNamespace"},
		{"phpMinVersion", "seven", "phpMinVersion"},
		{"phpSourceVersion", "8.x", "phpSourceVersion"},
		{"batchEndpoint", "batch/v1", "batchEndpoint"},
		{"vendorPrefix", "", "vendorPrefix"},
		{"vendorPrefix", 1, "must be a string"},
	}
	for _, tc := range cases {
		body := minimal()
		body[tc.field] = tc.value
		_, err := config.Read(config.Options{Path: writeJSON(t, dir, tc.field+".json", body)})
		if err == nil || !strings.Contains(err.Error(), tc.sub) {
			t.Fatalf("%s=%v err=%v", tc.field, tc.value, err)
		}
	}
}

func TestRead_TruthyNumberSlug(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = 1.0
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "num-slug.json", body)})
	if err != nil {
		t.Fatal(err)
	}
	// JS: `${config.slug}-deps.js` coerces the number → "1-deps.js".
	// The typed Slug field itself keeps "" (documented in DIVERGENCES.md).
	if cfg.DepsBundle != "1-deps.js" {
		t.Fatalf("depsBundle=%q", cfg.DepsBundle)
	}
}

func TestRead_V2TypeErrorUsesJSTypeofNames(t *testing.T) {
	dir := t.TempDir()
	cases := []struct {
		value any
		want  string
	}{
		{1.0, "(got: number)"},
		{true, "(got: boolean)"},
		{map[string]any{}, "(got: object)"},
		{[]any{}, "(got: object)"},
	}
	for i, tc := range cases {
		body := minimal()
		body["vendorPrefix"] = tc.value
		_, err := config.Read(config.Options{Path: writeJSON(t, dir, "typeof.json", body)})
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Fatalf("case %d (%T): err=%v, want %q", i, tc.value, err, tc.want)
		}
	}
}

func TestRead_ObjectUIFrameworkErrorMatchesJSStringCoercion(t *testing.T) {
	// JS template literal: `${{x:1}}` → "[object Object]".
	dir := t.TempDir()
	body := minimal()
	body["uiFramework"] = map[string]any{"x": 1}
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "obj-ui-str.json", body)})
	if err == nil || !strings.Contains(err.Error(), "(got: [object Object])") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_NumericUIFrameworkErrorMatchesJSStringCoercion(t *testing.T) {
	// JS template literal: `${1}` → "1".
	dir := t.TempDir()
	body := minimal()
	body["uiFramework"] = 1.0
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "num-ui-str.json", body)})
	if err == nil || !strings.Contains(err.Error(), "(got: 1)") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_BoolAndArrayUIFrameworkErrorMatchesJSStringCoercion(t *testing.T) {
	// JS: `${true}` → "true"; `${[1,2]}` → "1,2".
	dir := t.TempDir()
	body := minimal()
	body["uiFramework"] = true
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "bool-ui.json", body)})
	if err == nil || !strings.Contains(err.Error(), "(got: true)") {
		t.Fatalf("err=%v", err)
	}
	body["uiFramework"] = []any{1.0, 2.0}
	_, err = config.Read(config.Options{Path: writeJSON(t, dir, "arr-ui.json", body)})
	if err == nil || !strings.Contains(err.Error(), "(got: 1,2)") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_FalseRequired(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = false
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "false-slug.json", body)})
	if err == nil || !strings.Contains(err.Error(), "missing required fields: slug") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_ZeroSlugMissing(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = 0
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "zero-slug.json", body)})
	if err == nil || !strings.Contains(err.Error(), "missing required fields: slug") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_ZeroPointZeroSlugMissing(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = 0.0
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "zerofloat-slug.json", body)})
	if err == nil || !strings.Contains(err.Error(), "missing required fields: slug") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_WalkReachesRoot(t *testing.T) {
	// Create a deep directory without wpdev.json anywhere
	deep := filepath.Join(t.TempDir(), "a", "b", "c", "d")
	if err := os.MkdirAll(deep, 0o755); err != nil {
		t.Fatal(err)
	}
	_, err := config.Read(config.Options{StartDir: deep})
	if err == nil || !strings.Contains(err.Error(), "not found") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_StartDirMissing(t *testing.T) {
	_, err := config.Read(config.Options{StartDir: t.TempDir()})
	if err == nil || !strings.Contains(err.Error(), "not found") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_PathIsDirectory(t *testing.T) {
	_, err := config.Read(config.Options{Path: t.TempDir()})
	if err == nil || !strings.Contains(err.Error(), "Failed to read wpdev.json") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_JSONNumberRootRejected(t *testing.T) {
	dir := t.TempDir()
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "num.json", "1")})
	if err == nil || !strings.Contains(err.Error(), "must contain a JSON object") {
		t.Fatalf("err=%v", err)
	}
}

func TestConfig_MarshalJSON(t *testing.T) {
	cfg := config.Config{Slug: "pilot", VendorPrefix: "WpdevVendor"}
	raw, err := json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), `"slug":"pilot"`) {
		t.Fatalf("json=%s", raw)
	}
	cfg.VendorPrefixNull = true
	cfg.Extra = map[string]any{"features": map[string]any{"js": "typescript"}}
	raw, err = json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), `"vendorPrefix":null`) {
		t.Fatalf("null vendor json=%s", raw)
	}
	if !strings.Contains(string(raw), `"features"`) {
		t.Fatalf("extra missing json=%s", raw)
	}
}

func TestRead_EmptyOptionsWalksFromCwd(t *testing.T) {
	cfg, err := config.Read(config.Options{})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Slug == "" {
		t.Fatal("expected slug from repo wpdev.json")
	}
}

func TestRead_ObjectSlugIsTruthy(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["slug"] = map[string]any{"nested": true}
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "obj-slug.json", body)})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Slug != "" {
		t.Fatalf("object slug string=%q", cfg.Slug)
	}
}

func TestRead_ObjectUIFrameworkRejected(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["uiFramework"] = map[string]any{"x": 1}
	_, err := config.Read(config.Options{Path: writeJSON(t, dir, "obj-ui.json", body)})
	if err == nil || !strings.Contains(err.Error(), "uiFramework") {
		t.Fatalf("err=%v", err)
	}
}

func TestRead_NullOptionalFieldsPreserved(t *testing.T) {
	dir := t.TempDir()
	body := minimal()
	body["restNamespace"] = nil
	body["batchEndpoint"] = nil
	body["phpMinVersion"] = nil
	cfg, err := config.Read(config.Options{Path: writeJSON(t, dir, "null-opts.json", body)})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !cfg.NullFields["restNamespace"] || !cfg.NullFields["batchEndpoint"] || !cfg.NullFields["phpMinVersion"] {
		t.Fatalf("NullFields not recorded: %#v", cfg.NullFields)
	}
	raw, err := json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	s := string(raw)
	if !strings.Contains(s, `"restNamespace":null`) || !strings.Contains(s, `"batchEndpoint":null`) || !strings.Contains(s, `"phpMinVersion":null`) {
		t.Fatalf("marshaled config did not preserve nulls: %s", s)
	}
}
