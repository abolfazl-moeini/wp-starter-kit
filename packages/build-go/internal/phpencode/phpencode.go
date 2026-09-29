package phpencode

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/jsnum"
)

type Pair struct {
	Key   string
	Value any
}

type Object []Pair

func FileContent(v any) (string, error) {
	inner, err := encode(v)
	if err != nil {
		return "", err
	}
	return "<?php return " + inner + ";\n", nil
}

func encode(v any) (string, error) {
	if v == nil {
		return "null", nil
	}
	switch t := v.(type) {
	case bool:
		if t {
			return "true", nil
		}
		return "false", nil
	case int:
		return encodeSigned(int64(t))
	case int8:
		return encodeSigned(int64(t))
	case int16:
		return encodeSigned(int64(t))
	case int32:
		return encodeSigned(int64(t))
	case int64:
		return encodeSigned(t)
	case uint:
		return encodeUnsigned(uint64(t))
	case uint8:
		return encodeUnsigned(uint64(t))
	case uint16:
		return encodeUnsigned(uint64(t))
	case uint32:
		return encodeUnsigned(uint64(t))
	case uint64:
		return encodeUnsigned(t)
	case float32:
		return jsNumber(float64(t)), nil
	case float64:
		return jsNumber(t), nil
	case json.Number:
		// R-004e: JSON numbers follow phpFileContent = json2php(JSON.parse(JSON.stringify(v))).
		// JSON.parse rounds to binary64 first. Overflow (1e400) is Infinity there,
		// and json2php prints that as null. ParseFloat reports ErrRange for the
		// same overflow and still returns ±Inf; that is null, not an error.
		f, err := t.Float64()
		if err != nil {
			if ne, ok := err.(*strconv.NumError); !ok || ne.Err != strconv.ErrRange {
				return "", fmt.Errorf("phpencode: invalid json.Number %q", t.String())
			}
		}
		return jsNumber(f), nil
	case string:
		escaped := strings.ReplaceAll(t, `\`, `\\`)
		escaped = strings.ReplaceAll(escaped, `'`, `\'`)
		return "'" + escaped + "'", nil
	case Object:
		return encodeObject(t)
	case map[string]any:
		return "", fmt.Errorf("phpencode: map[string]any is not a sidecar encoder; use phpencode.Object to preserve insertion order (R-002)")
	case map[string]string:
		return "", fmt.Errorf("phpencode: map[string]string is not a sidecar encoder; use phpencode.Object to preserve insertion order (R-002)")
	case []any:
		return encodeArray(t)
	case []string:
		items := make([]any, len(t))
		for i, s := range t {
			items[i] = s
		}
		return encodeArray(items)
	case []int:
		items := make([]any, len(t))
		for i, n := range t {
			items[i] = n
		}
		return encodeArray(items)
	default:
		return "", fmt.Errorf("phpencode: unsupported type %T", v)
	}
}

// encodeSigned prints a Go integer only when binary64 can represent it
// exactly. A non-exact int64 is not a JSON sidecar input: phpFileContent
// would have rounded it, and printing the full integer would diverge (R-004e).
func encodeSigned(n int64) (string, error) {
	f := float64(n)
	if int64(f) != n {
		return "", fmt.Errorf("phpencode: integer %d is not an exact binary64 value and is not a sidecar input", n)
	}
	return jsNumber(f), nil
}

// twoTo64 is 2^64. float64(math.MaxUint64) rounds up to this value, which
// does not fit back into uint64, so it is the exactness ceiling.
const twoTo64 = 18446744073709551616.0

func encodeUnsigned(n uint64) (string, error) {
	f := float64(n)
	if math.IsInf(f, 0) || f >= twoTo64 || uint64(f) != n {
		return "", fmt.Errorf("phpencode: integer %d is not an exact binary64 value and is not a sidecar input", n)
	}
	return jsNumber(f), nil
}

// jsNumber replicates JS Number.prototype.toString as used by json2php:
// integral values below 1e21 print as plain digits, values with absolute
// magnitude >= 1e21 or (non-zero) < 1e-6 use unpadded exponent form,
// everything else uses shortest round-trip decimal (R-005).
// Shared implementation lives in internal/jsnum (R-005e).
func jsNumber(t float64) string {
	return jsnum.JSONNumber(t)
}

func encodeObject(obj Object) (string, error) {
	if len(obj) == 0 {
		return "array()", nil
	}
	ordered := make(Object, 0, len(obj))
	positions := make(map[string]int, len(obj))
	for _, p := range obj {
		if i, ok := positions[p.Key]; ok {
			ordered[i].Value = p.Value
		} else {
			positions[p.Key] = len(ordered)
			ordered = append(ordered, p)
		}
	}
	sort.SliceStable(ordered, func(i, j int) bool {
		left, leftOK := arrayIndex(ordered[i].Key)
		right, rightOK := arrayIndex(ordered[j].Key)
		if leftOK != rightOK {
			return leftOK
		}
		return leftOK && left < right
	})
	parts := make([]string, 0, len(ordered))
	for _, p := range ordered {
		k, err := encode(p.Key)
		if err != nil {
			return "", err
		}
		val, err := encode(p.Value)
		if err != nil {
			return "", err
		}
		parts = append(parts, k+" => "+val)
	}
	return "array(" + strings.Join(parts, ", ") + ")", nil
}

func arrayIndex(key string) (uint64, bool) {
	index, err := strconv.ParseUint(key, 10, 32)
	return index, err == nil && index < math.MaxUint32 && strconv.FormatUint(index, 10) == key
}

func encodeArray(items []any) (string, error) {
	if len(items) == 0 {
		return "array()", nil
	}
	parts := make([]string, 0, len(items))
	for _, item := range items {
		s, err := encode(item)
		if err != nil {
			return "", err
		}
		parts = append(parts, s)
	}
	return "array(" + strings.Join(parts, ", ") + ")", nil
}
