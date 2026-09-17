package phpencode

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
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
		return strconv.Itoa(t), nil
	case int8:
		return strconv.FormatInt(int64(t), 10), nil
	case int16:
		return strconv.FormatInt(int64(t), 10), nil
	case int32:
		return strconv.FormatInt(int64(t), 10), nil
	case int64:
		return strconv.FormatInt(t, 10), nil
	case uint:
		return strconv.FormatUint(uint64(t), 10), nil
	case uint8:
		return strconv.FormatUint(uint64(t), 10), nil
	case uint16:
		return strconv.FormatUint(uint64(t), 10), nil
	case uint32:
		return strconv.FormatUint(uint64(t), 10), nil
	case uint64:
		return strconv.FormatUint(t, 10), nil
	case float32:
		return jsNumber(float64(t)), nil
	case float64:
		return jsNumber(t), nil
	case json.Number:
		if i, err := t.Int64(); err == nil {
			return strconv.FormatInt(i, 10), nil
		}
		if u, err := strconv.ParseUint(t.String(), 10, 64); err == nil {
			return strconv.FormatUint(u, 10), nil
		}
		if f, err := t.Float64(); err == nil {
			return jsNumber(f), nil
		}
		return "", fmt.Errorf("phpencode: invalid json.Number %q", t.String())
	case string:
		escaped := strings.ReplaceAll(t, `\`, `\\`)
		escaped = strings.ReplaceAll(escaped, `'`, `\'`)
		return "'" + escaped + "'", nil
	case Object:
		return encodeObject(t)
	case map[string]any:
		return encodeMap(t)
	case map[string]string:
		m := make(map[string]any, len(t))
		for k, val := range t {
			m[k] = val
		}
		return encodeMap(m)
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

// jsNumber replicates JS Number.prototype.toString as used by json2php:
// integral values below 1e21 print as plain digits, values with absolute
// magnitude >= 1e21 or (non-zero) < 1e-6 use unpadded exponent form,
// everything else uses shortest round-trip decimal (R-005).
func jsNumber(t float64) string {
	if math.IsNaN(t) {
		return "NaN"
	}
	if math.IsInf(t, 1) {
		return "Infinity"
	}
	if math.IsInf(t, -1) {
		return "-Infinity"
	}
	if t == 0 {
		return "0"
	}
	abs := math.Abs(t)
	if t == math.Trunc(t) && abs < 1e21 {
		return strconv.FormatFloat(t, 'f', -1, 64)
	}
	if abs >= 1e21 || abs < 1e-6 {
		s := strconv.FormatFloat(t, 'e', -1, 64)
		if i := strings.LastIndexByte(s, 'e'); i >= 0 {
			mant, exp := s[:i], s[i+1:]
			exp = strings.TrimPrefix(exp, "+")
			exp = strings.TrimPrefix(exp, "-")
			exp = strings.TrimLeft(exp, "0")
			if exp == "" {
				exp = "0"
			}
			sign := "+"
			if s[i+1] == '-' {
				sign = "-"
			}
			s = mant + "e" + sign + exp
		}
		return s
	}
	return strconv.FormatFloat(t, 'f', -1, 64)
}

// encodeMap encodes a plain Go map with sorted keys for determinism.
// Ordered Object preserves source order (R-002); maps only arise from
// decoded JSON where insertion order is unavailable.
func encodeMap(m map[string]any) (string, error) {
	if len(m) == 0 {
		return "array()", nil
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	obj := make(Object, 0, len(keys))
	for _, k := range keys {
		obj = append(obj, Pair{Key: k, Value: m[k]})
	}
	return encodeObject(obj)
}

func encodeObject(obj Object) (string, error) {
	if len(obj) == 0 {
		return "array()", nil
	}
	parts := make([]string, 0, len(obj))
	for _, p := range obj {
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
