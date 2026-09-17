package config

import (
	"encoding/json"
	"math"
	"testing"
)

// Contract matrix for JS coercion helpers. JSON-decodable kinds are also
// covered behaviorally through Read in config_test.go; Go-only numeric
// kinds and non-finite floats are pinned here (R-001, R-005, R-007).
func TestJSSish_CoercionTable(t *testing.T) {
	cases := []struct {
		name  string
		value any
		want  string
	}{
		{"nil", nil, "null"},
		{"string", "a", "a"},
		{"true", true, "true"},
		{"false", false, "false"},
		{"float integral", 1.0, "1"},
		{"float frac", 1.5, "1.5"},
		{"float32", float32(2.5), "2.5"},
		{"int", int(-3), "-3"},
		{"int8", int8(8), "8"},
		{"int16", int16(-16), "-16"},
		{"int32", int32(32), "32"},
		{"int64", int64(-64), "-64"},
		{"uint", uint(7), "7"},
		{"uint8", uint8(8), "8"},
		{"uint16", uint16(16), "16"},
		{"uint32", uint32(32), "32"},
		{"uint64", uint64(64), "64"},
		{"json.Number", json.Number("12"), "12"},
		{"json.Number 1.0", json.Number("1.0"), "1"},
		{"json.Number 1e5", json.Number("1e5"), "100000"},
		{"json.Number -0", json.Number("-0"), "0"},
		{"negative zero float", -0.0, "0"},
		{"negative zero float32", float32(-0.0), "0"},
		{"array joins", []any{1.0, "a", true}, "1,a,true"},
		{"empty array", []any{}, ""},
		{"map object", map[string]any{"x": 1}, "[object Object]"},
		{"struct object", struct{ X int }{1}, "[object Object]"},
		{"NaN", math.NaN(), "NaN"},
		{"+Inf", math.Inf(1), "Infinity"},
		{"-Inf", math.Inf(-1), "-Infinity"},
		{"exponent", 1e21, "1e+21"},
		{"small exponent", 1e-7, "1e-7"},
	}
	for _, tc := range cases {
		if got := jsish(tc.value); got != tc.want {
			t.Fatalf("%s: jsish=%q want %q", tc.name, got, tc.want)
		}
		if got := jsString(tc.value); got != tc.want {
			t.Fatalf("%s: jsString=%q want %q", tc.name, got, tc.want)
		}
	}
}

func TestTypeofJS_Table(t *testing.T) {
	cases := []struct {
		value any
		want  string
	}{
		{"s", "string"},
		{true, "boolean"},
		{1.0, "number"},
		{float32(1), "number"},
		{1, "number"},
		{int64(1), "number"},
		{uint(1), "number"},
		{json.Number("1"), "number"},
		{map[string]any{}, "object"},
		{[]any{}, "object"},
		{nil, "object"},
	}
	for _, tc := range cases {
		if got := typeofJS(tc.value); got != tc.want {
			t.Fatalf("%T: typeofJS=%q want %q", tc.value, got, tc.want)
		}
	}
}

func TestTruthy_NumericKinds(t *testing.T) {
	truthyCases := []any{
		1.0, float32(1), 1, int8(1), int16(1), int32(1), int64(1),
		uint(1), uint8(1), uint16(1), uint32(1), uint64(1),
		"a", true, map[string]any{}, []any{}, json.Number("1"), json.Number("0.1"),
	}
	for _, v := range truthyCases {
		if !truthy(v) {
			t.Fatalf("%T(%v) should be truthy", v, v)
		}
	}
	falsyCases := []any{
		nil, false, "", 0.0, -0.0, float32(0), float32(-0.0), 0, int8(0), int16(0),
		int32(0), int64(0), uint(0), uint8(0), uint16(0), uint32(0),
		uint64(0), json.Number("0"), json.Number("-0"), json.Number("0.0"), json.Number("0.00"), json.Number(""),
		math.NaN(), float32(math.NaN()),
	}
	for _, v := range falsyCases {
		if truthy(v) {
			t.Fatalf("%T(%v) should be falsy", v, v)
		}
	}
}
