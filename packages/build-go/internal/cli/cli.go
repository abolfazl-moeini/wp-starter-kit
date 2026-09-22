package cli

import (
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/jsnum"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/sidecar"
)

const Version = "0.1.0-w1-pilot"

func Run(args []string, stdout, stderr io.Writer) int {
	if len(args) < 2 {
		printHelp(stdout)
		return 0
	}
	switch args[1] {
	case "--help", "-h", "help":
		printHelp(stdout)
		return 0
	case "--version", "-v", "version":
		fmt.Fprintln(stdout, Version)
		return 0
	case "config":
		return runConfig(args[2:], stdout, stderr)
	case "hash":
		return runHash(args[2:], stdout, stderr)
	case "sidecar":
		return runSidecar(args[2:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "unknown command %s\n", args[1])
		return 2
	}
}

func printHelp(w io.Writer) {
	fmt.Fprint(w, `wpdev-build — kit-proprietary build tooling (Go W1 pilot)

Usage:
  wpdev-build --help
  wpdev-build --version
  wpdev-build config --path <wpdev.json>
  wpdev-build hash --file <path>
  wpdev-build sidecar --file <file.css>

Flags use --name value or --name=value. A value starting with "-"
is rejected as missing (exit 2); use --name=-foo or --name=-foo.css
for dash-leading paths.

This pilot does not deploy. Deploy remains a later wave with WAL gates.
`)
}

func runConfig(args []string, stdout, stderr io.Writer) int {
	path, err := flagValue(args, "--path")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	cfg, err := config.Read(config.Options{Path: path})
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	// R-007c: JSON.stringify-compatible output. Key order is the Go
	// sorted-key contract (documented divergence: JS uses insertion order;
	// no Node print command exists). String escaping matches JSON.stringify
	// (no <, >, & or U+2028/U+2029 escaping); Go's Encoder always escapes
	// U+2028, so a custom writer is used.
	raw, err := json.Marshal(cfg)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	fmt.Fprintln(stdout, stringifySorted(decoded, ""))
	return 0
}

// stringifySorted renders decoded JSON with sorted object keys and
// JSON.stringify string escaping (only '"', '\\', \b\f\n\r\t and
// control chars <0x20 escaped; U+2028/U+2029 and <>& pass through raw).
func stringifySorted(v any, indent string) string {
	next := indent + "  "
	switch t := v.(type) {
	case nil:
		return "null"
	case bool:
		if t {
			return "true"
		}
		return "false"
	case string:
		return stringifyString(t)
	case float64:
		return jsnum.NumberString(t)
	case json.Number:
		if f, err := t.Float64(); err == nil {
			return jsnum.NumberString(f)
		}
		return t.String()
	case []any:
		if len(t) == 0 {
			return "[]"
		}
		parts := make([]string, 0, len(t))
		for _, item := range t {
			parts = append(parts, next+stringifySorted(item, next))
		}
		return "[\n" + strings.Join(parts, ",\n") + "\n" + indent + "]"
	case map[string]any:
		if len(t) == 0 {
			return "{}"
		}
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		parts := make([]string, 0, len(keys))
		for _, k := range keys {
			parts = append(parts, next+stringifyString(k)+": "+stringifySorted(t[k], next))
		}
		return "{\n" + strings.Join(parts, ",\n") + "\n" + indent + "}"
	default:
		return stringifySortedJSONFallback(v)
	}
}

func stringifyString(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString("\\\"")
		case '\\':
			b.WriteString("\\\\")
		case '\b':
			b.WriteString("\\b")
		case '\f':
			b.WriteString("\\f")
		case '\n':
			b.WriteString("\\n")
		case '\r':
			b.WriteString("\\r")
		case '\t':
			b.WriteString("\\t")
		default:
			if r < 0x20 {
				fmt.Fprintf(&b, "\\u%04x", r)
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
	return b.String()
}

func stringifySortedJSONFallback(v any) string {
	switch t := v.(type) {
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case uint64:
		return strconv.FormatUint(t, 10)
	case float32:
		return jsnum.NumberString(float64(t))
	}
	return "null"
}

func runHash(args []string, stdout, stderr io.Writer) int {
	file, err := flagValue(args, "--file")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	sum, err := hash.FileMD5(file)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	fmt.Fprintln(stdout, sum)
	return 0
}

func runSidecar(args []string, stdout, stderr io.Writer) int {
	file, err := flagValue(args, "--file")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	out, err := sidecar.WriteStyle(file)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	fmt.Fprintln(stdout, out)
	return 0
}

func flagValue(args []string, name string) (string, error) {
	var value string
	seen := false
	for i := 0; i < len(args); i++ {
		arg := args[i]
		key, inline, hasEquals := strings.Cut(arg, "=")
		if key != name {
			if strings.HasPrefix(arg, "-") {
				return "", fmt.Errorf("unknown flag %q", arg)
			}
			return "", fmt.Errorf("unexpected argument %q", arg)
		}
		if seen {
			return "", fmt.Errorf("duplicate flag %s", name)
		}
		seen = true
		if hasEquals {
			value = inline
		} else {
			if i+1 >= len(args) || strings.HasPrefix(args[i+1], "-") {
				return "", fmt.Errorf("missing value for %s", name)
			}
			i++
			value = args[i]
		}
		if value == "" {
			return "", fmt.Errorf("empty value for %s", name)
		}
	}
	if !seen && name != "--path" {
		return "", fmt.Errorf("missing %s", name)
	}
	return value, nil
}
