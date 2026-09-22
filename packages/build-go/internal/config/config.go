package config

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/jsnum"
)

type Options struct {
	Path     string
	StartDir string
}

type Config struct {
	Slug              string
	GlobalName        string
	LocalizeVar       string
	TextDomain        string
	HookPrefix        string
	NPMScope          string
	DepsBundle        string
	PHPFunctionPrefix string
	UIFramework       string
	RESTNamespace     string
	VendorPrefix      string
	VendorPrefixNull  bool
	PHPMinVersion     string
	PHPSourceVersion  string
	BatchEndpoint     string
	NullFields        map[string]bool
	Extra             map[string]any
}

var requiredFields = []string{
	"slug",
	"globalName",
	"localizeVar",
	"textDomain",
	"hookPrefix",
	"npmScope",
}

var knownFields = map[string]struct{}{
	"slug":              {},
	"globalName":        {},
	"localizeVar":       {},
	"textDomain":        {},
	"hookPrefix":        {},
	"npmScope":          {},
	"depsBundle":        {},
	"phpFunctionPrefix": {},
	"uiFramework":       {},
	"restNamespace":     {},
	"vendorPrefix":      {},
	"phpMinVersion":     {},
	"phpSourceVersion":  {},
	"batchEndpoint":     {},
}

var (
	reVendorPrefix  = regexp.MustCompile(`^[A-Z][A-Za-z0-9_]*$`)
	reRESTNamespace = regexp.MustCompile(`^[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$`)
	rePHPVersion    = regexp.MustCompile(`^\d+\.\d+(\.\d+)?$`)
)

func Read(opts Options) (Config, error) {
	path := opts.Path
	if path == "" {
		start := opts.StartDir
		if start == "" {
			wd, err := os.Getwd()
			if err != nil {
				return Config{}, err
			}
			start = wd
		}
		found, err := findWPDevJSON(start)
		if err != nil {
			return Config{}, err
		}
		path = found
	}
	return ReadFile(path)
}

// ReadFile is the library contract for an explicit path (R-008g): no
// discovery walk. A directory path fails with "Failed to read", matching
// readProjectConfig's readFileSync throw. Discovery (skip-directories)
// lives in findWPDevJSON / CLI only and is not getRootPath.
func ReadFile(path string) (Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return Config{}, fmt.Errorf("wpdev.json not found at: %s", path)
		}
		return Config{}, fmt.Errorf("Failed to read wpdev.json: %v", err)
	}

	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return Config{}, fmt.Errorf("wpdev.json is malformed or invalid JSON at: %s", path)
	}
	if decoded == nil {
		return Config{}, fmt.Errorf("wpdev.json must contain a JSON object")
	}

	obj, ok := decoded.(map[string]any)
	if !ok {
		if _, isArr := decoded.([]any); isArr {
			return Config{}, fmt.Errorf(
				"wpdev.json missing required fields: %s. Required: %s",
				strings.Join(requiredFields, ", "),
				strings.Join(requiredFields, ", "),
			)
		}
		return Config{}, fmt.Errorf("wpdev.json must contain a JSON object")
	}

	merged := map[string]any{
		"phpFunctionPrefix": "wpdev_",
		"uiFramework":       "preact",
		"restNamespace":     "wpdev/v1",
		"vendorPrefix":      "WpdevVendor",
		"phpMinVersion":     "7.4",
		"phpSourceVersion":  "8.1",
		"batchEndpoint":     "/batch/v1",
	}
	for k, v := range obj {
		merged[k] = v
	}

	var missing []string
	for _, field := range requiredFields {
		if !truthy(merged[field]) {
			missing = append(missing, field)
		}
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf(
			"wpdev.json missing required fields: %s. Required: %s",
			strings.Join(missing, ", "),
			strings.Join(requiredFields, ", "),
		)
	}

	slug := jsString(merged["slug"])
	if _, ok := obj["depsBundle"]; !ok {
		merged["depsBundle"] = slug + "-deps.js"
	}

	ui := merged["uiFramework"]
	if ui != "preact" && ui != "react" {
		return Config{}, fmt.Errorf(
			`wpdev.json uiFramework must be "preact" or "react" (got: %s)`,
			jsString(ui),
		)
	}

	v2 := []string{
		"restNamespace",
		"vendorPrefix",
		"phpMinVersion",
		"phpSourceVersion",
		"batchEndpoint",
	}
	for _, field := range v2 {
		if _, present := obj[field]; present {
			if err := validateV2(field, obj[field]); err != nil {
				return Config{}, err
			}
		}
	}

	cfg := Config{
		Slug:              storedString(merged["slug"]),
		GlobalName:        storedString(merged["globalName"]),
		LocalizeVar:       storedString(merged["localizeVar"]),
		TextDomain:        storedString(merged["textDomain"]),
		HookPrefix:        storedString(merged["hookPrefix"]),
		NPMScope:          storedString(merged["npmScope"]),
		DepsBundle:        storedString(merged["depsBundle"]),
		PHPFunctionPrefix: storedString(merged["phpFunctionPrefix"]),
		UIFramework:       storedString(merged["uiFramework"]),
		RESTNamespace:     storedString(merged["restNamespace"]),
		VendorPrefix:      storedString(merged["vendorPrefix"]),
		PHPMinVersion:     storedString(merged["phpMinVersion"]),
		PHPSourceVersion:  storedString(merged["phpSourceVersion"]),
		BatchEndpoint:     storedString(merged["batchEndpoint"]),
		NullFields:        map[string]bool{},
		Extra:             map[string]any{},
	}
	for k, v := range obj {
		if v == nil {
			cfg.NullFields[k] = true
		}
	}
	if cfg.NullFields["vendorPrefix"] {
		cfg.VendorPrefixNull = true
		cfg.VendorPrefix = ""
	}
	for k, v := range obj {
		if _, known := knownFields[k]; !known {
			cfg.Extra[k] = v
			continue
		}
		// R-001 / §1.3: Extra keeps the raw JSON value so MarshalJSON emits
		// the number/object, not a coerced string. The typed field holds
		// the JS template-literal spelling (storedString) for callers.
		if v != nil {
			if _, isStr := v.(string); !isStr {
				cfg.Extra[k] = v
			}
		}
	}
	return cfg, nil
}

func (c Config) MarshalJSON() ([]byte, error) {
	m := map[string]any{
		"slug":              c.Slug,
		"globalName":        c.GlobalName,
		"localizeVar":       c.LocalizeVar,
		"textDomain":        c.TextDomain,
		"hookPrefix":        c.HookPrefix,
		"npmScope":          c.NPMScope,
		"depsBundle":        c.DepsBundle,
		"phpFunctionPrefix": c.PHPFunctionPrefix,
		"uiFramework":       c.UIFramework,
		"restNamespace":     c.RESTNamespace,
		"vendorPrefix":      c.VendorPrefix,
		"phpMinVersion":     c.PHPMinVersion,
		"phpSourceVersion":  c.PHPSourceVersion,
		"batchEndpoint":     c.BatchEndpoint,
	}
	if c.VendorPrefixNull || c.NullFields["vendorPrefix"] {
		m["vendorPrefix"] = nil
	}
	for k := range c.NullFields {
		m[k] = nil
	}
	for k, v := range c.Extra {
		m[k] = v
	}
	return json.Marshal(m)
}

func findWPDevJSON(start string) (string, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for i := 0; i < 12; i++ {
		candidate := filepath.Join(dir, "wpdev.json")
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", fmt.Errorf("wpdev.json not found at: %s", filepath.Join(start, "wpdev.json"))
}

func truthy(v any) bool {
	if v == nil {
		return false
	}
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return t != ""
	case float64:
		return !math.IsNaN(t) && t != 0
	case float32:
		return !math.IsNaN(float64(t)) && t != 0
	case int:
		return t != 0
	case int8:
		return t != 0
	case int16:
		return t != 0
	case int32:
		return t != 0
	case int64:
		return t != 0
	case uint:
		return t != 0
	case uint8:
		return t != 0
	case uint16:
		return t != 0
	case uint32:
		return t != 0
	case uint64:
		return t != 0
	case json.Number:
		if f, err := t.Float64(); err == nil {
			return !math.IsNaN(f) && f != 0
		}
		return false
	default:
		return true
	}
}

// storedString keeps a real string as itself. Null stays "" (NullFields
// records the null). Any other JSON value is stored as its JS template
// coercion so callers do not see a silent empty string; MarshalJSON still
// emits the raw value from Extra.
func storedString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return jsString(v)
}

// jsString replicates JS template-literal coercion `${v}` used by the source
// for derived strings and error messages (R-001): null → "null", numbers via
// JS Number toString, booleans literally, arrays joined with ",", plain
// objects → "[object Object]".
func jsString(v any) string {
	return jsish(v)
}

func jsish(v any) string {
	if v == nil {
		return "null"
	}
	switch t := v.(type) {
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		return jsFloat(t)
	case float32:
		return jsFloat(float64(t))
	case int:
		return strconv.Itoa(t)
	case int8:
		return strconv.FormatInt(int64(t), 10)
	case int16:
		return strconv.FormatInt(int64(t), 10)
	case int32:
		return strconv.FormatInt(int64(t), 10)
	case int64:
		return strconv.FormatInt(t, 10)
	case uint:
		return strconv.FormatUint(uint64(t), 10)
	case uint8:
		return strconv.FormatUint(uint64(t), 10)
	case uint16:
		return strconv.FormatUint(uint64(t), 10)
	case uint32:
		return strconv.FormatUint(uint64(t), 10)
	case uint64:
		return strconv.FormatUint(t, 10)
	case json.Number:
		if f, err := t.Float64(); err == nil {
			return jsFloat(f)
		}
		return t.String()
	case []any:
		parts := make([]string, 0, len(t))
		for _, item := range t {
			parts = append(parts, jsish(item))
		}
		return strings.Join(parts, ",")
	default:
		return "[object Object]"
	}
}

// jsFloat renders a float64 with JS Number.prototype.toString rules.
// Shared implementation lives in internal/jsnum (R-005e).
func jsFloat(f float64) string {
	return jsnum.NumberString(f)
}

// typeofJS replicates JS typeof for values decoded from JSON, used in
// validation error messages so fragments match the source (R-007).
func typeofJS(v any) string {
	switch v.(type) {
	case string:
		return "string"
	case bool:
		return "boolean"
	case float64, float32,
		int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64,
		json.Number:
		return "number"
	default:
		return "object"
	}
}

func validateV2(field string, value any) error {
	if value == nil {
		return nil
	}
	s, ok := value.(string)
	if !ok {
		return fmt.Errorf("wpdev.json %s must be a string (got: %s)", field, typeofJS(value))
	}
	switch field {
	case "vendorPrefix":
		if !reVendorPrefix.MatchString(s) {
			return fmt.Errorf(
				`wpdev.json vendorPrefix must start with an uppercase letter and contain only [A-Za-z0-9_] (got: "%s")`,
				s,
			)
		}
	case "restNamespace":
		if !reRESTNamespace.MatchString(s) {
			return fmt.Errorf(
				`wpdev.json restNamespace must look like "vendor/v1" (letters, digits, dashes, underscores, one slash) (got: "%s")`,
				s,
			)
		}
	case "phpMinVersion", "phpSourceVersion":
		if !rePHPVersion.MatchString(s) {
			return fmt.Errorf(`wpdev.json %s must look like "X.Y" or "X.Y.Z" (got: "%s")`, field, s)
		}
	case "batchEndpoint":
		if !strings.HasPrefix(s, "/") {
			return fmt.Errorf(`wpdev.json batchEndpoint must start with "/" (got: "%s")`, s)
		}
	}
	return nil
}
