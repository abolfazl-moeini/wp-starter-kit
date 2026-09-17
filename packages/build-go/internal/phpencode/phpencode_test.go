package phpencode_test

import (
	"encoding/json"
	"math"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/phpencode"
)

func TestFileContent_MatchesJson2PHPOracle(t *testing.T) {
	cases := []struct {
		name  string
		input any
		want  string
	}{
		{
			name:  "hash only",
			input: phpencode.Object{{Key: "hash", Value: "abc"}},
			want:  "<?php return array('hash' => 'abc');\n",
		},
		{
			name: "asset sidecar",
			input: phpencode.Object{
				{Key: "dependencies", Value: []any{"wp-element", "jquery"}},
				{Key: "internal_packages", Value: []any{}},
				{Key: "hash", Value: "deadbeef"},
			},
			want: "<?php return array('dependencies' => array('wp-element', 'jquery'), 'internal_packages' => array(), 'hash' => 'deadbeef');\n",
		},
		{
			name:  "escaped quote",
			input: phpencode.Object{{Key: "hash", Value: "a'b"}},
			want:  "<?php return array('hash' => 'a\\'b');\n",
		},
		{
			name:  "escaped backslash",
			input: phpencode.Object{{Key: "hash", Value: "a\\b"}},
			want:  "<?php return array('hash' => 'a\\\\b');\n",
		},
		{
			name: "bools and null",
			input: phpencode.Object{
				{Key: "ok", Value: true},
				{Key: "no", Value: false},
				{Key: "z", Value: nil},
			},
			want: "<?php return array('ok' => true, 'no' => false, 'z' => null);\n",
		},
		{
			name: "numbers",
			input: phpencode.Object{
				{Key: "n", Value: 1},
				{Key: "f", Value: 1.5},
			},
			want: "<?php return array('n' => 1, 'f' => 1.5);\n",
		},
		{
			name:  "unicode",
			input: phpencode.Object{{Key: "hash", Value: "یونیکد"}},
			want:  "<?php return array('hash' => 'یونیکد');\n",
		},
		{
			name: "nested",
			input: phpencode.Object{
				{Key: "nested", Value: phpencode.Object{
					{Key: "a", Value: 1},
					{Key: "b", Value: []any{"x", "y"}},
				}},
			},
			want: "<?php return array('nested' => array('a' => 1, 'b' => array('x', 'y')));\n",
		},
		{
			name:  "empty object",
			input: phpencode.Object{},
			want:  "<?php return array();\n",
		},
		{
			name:  "string slice",
			input: []string{"a", "b"},
			want:  "<?php return array('a', 'b');\n",
		},
		{
			name:  "int64",
			input: phpencode.Object{{Key: "n", Value: int64(7)}},
			want:  "<?php return array('n' => 7);\n",
		},
		{
			name:  "int32",
			input: phpencode.Object{{Key: "n", Value: int32(8)}},
			want:  "<?php return array('n' => 8);\n",
		},
		{
			name:  "float integer-valued",
			input: phpencode.Object{{Key: "n", Value: float64(2)}},
			want:  "<?php return array('n' => 2);\n",
		},
		{
			name:  "large float uses JS exponent",
			input: phpencode.Object{{Key: "n", Value: float64(1e21)}},
			want:  "<?php return array('n' => 1e+21);\n",
		},
		{
			name:  "small float uses JS exponent",
			input: phpencode.Object{{Key: "n", Value: 1e-7}},
			want:  "<?php return array('n' => 1e-7);\n",
		},
		{
			name:  "1e-6 stays decimal like JS",
			input: phpencode.Object{{Key: "n", Value: 1e-6}},
			want:  "<?php return array('n' => 0.000001);\n",
		},
		{
			name:  "long decimal round-trips like JS",
			input: phpencode.Object{{Key: "n", Value: 0.30000000000000004}},
			want:  "<?php return array('n' => 0.30000000000000004);\n",
		},
		{
			name:  "big integral float keeps digits like JS",
			input: phpencode.Object{{Key: "n", Value: float64(1e19)}},
			want:  "<?php return array('n' => 10000000000000000000);\n",
		},
		{
			name:  "map encodes with sorted keys",
			input: map[string]any{"b": 1, "a": "x"},
			want:  "<?php return array('a' => 'x', 'b' => 1);\n",
		},
		{
			name:  "nested map inside array",
			input: []any{map[string]any{"k": true}},
			want:  "<?php return array(array('k' => true));\n",
		},
		{
			name:  "empty map",
			input: map[string]any{},
			want:  "<?php return array();\n",
		},
		{
			name:  "negative small exponent",
			input: phpencode.Object{{Key: "n", Value: -1e-7}},
			want:  "<?php return array('n' => -1e-7);\n",
		},
		{
			name:  "NaN like json2php",
			input: phpencode.Object{{Key: "n", Value: math.NaN()}},
			want:  "<?php return array('n' => NaN);\n",
		},
		{
			name:  "Infinity like json2php",
			input: phpencode.Object{{Key: "n", Value: math.Inf(1)}},
			want:  "<?php return array('n' => Infinity);\n",
		},
		{
			name:  "negative Infinity like json2php",
			input: phpencode.Object{{Key: "n", Value: math.Inf(-1)}},
			want:  "<?php return array('n' => -Infinity);\n",
		},
		{
			name:  "json.Number int",
			input: phpencode.Object{{Key: "n", Value: json.Number("42")}},
			want:  "<?php return array('n' => 42);\n",
		},
		{
			name:  "json.Number float",
			input: phpencode.Object{{Key: "n", Value: json.Number("42.5")}},
			want:  "<?php return array('n' => 42.5);\n",
		},
		{
			name:  "float32",
			input: phpencode.Object{{Key: "n", Value: float32(1.5)}},
			want:  "<?php return array('n' => 1.5);\n",
		},
		{
			name: "uint and int kinds",
			input: phpencode.Object{
				{Key: "u", Value: uint(10)},
				{Key: "u8", Value: uint8(8)},
				{Key: "u16", Value: uint16(16)},
				{Key: "u32", Value: uint32(32)},
				{Key: "u64", Value: uint64(64)},
				{Key: "i8", Value: int8(8)},
				{Key: "i16", Value: int16(16)},
			},
			want: "<?php return array('u' => 10, 'u8' => 8, 'u16' => 16, 'u32' => 32, 'u64' => 64, 'i8' => 8, 'i16' => 16);\n",
		},
		{
			name:  "map[string]string sorted keys",
			input: map[string]string{"b": "beta", "a": "alpha"},
			want:  "<?php return array('a' => 'alpha', 'b' => 'beta');\n",
		},
		{
			name:  "int slice",
			input: []int{1, 2, 3},
			want:  "<?php return array(1, 2, 3);\n",
		},
		{
			name:  "negative zero float64 matches JS 0",
			input: phpencode.Object{{Key: "z", Value: -0.0}},
			want:  "<?php return array('z' => 0);\n",
		},
		{
			name:  "negative zero float32 matches JS 0",
			input: phpencode.Object{{Key: "z", Value: float32(-0.0)}},
			want:  "<?php return array('z' => 0);\n",
		},
		{
			name:  "negative zero json.Number matches JS 0",
			input: phpencode.Object{{Key: "z", Value: json.Number("-0.0")}},
			want:  "<?php return array('z' => 0);\n",
		},
		{
			name:  "uint64 json.Number preserved",
			input: phpencode.Object{{Key: "max", Value: json.Number("18446744073709551615")}},
			want:  "<?php return array('max' => 18446744073709551615);\n",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := phpencode.FileContent(tc.input)
			if err != nil {
				t.Fatal(err)
			}
			if got != tc.want {
				t.Fatalf("got  %q\nwant %q", got, tc.want)
			}
		})
	}
}

func TestFileContent_UnsupportedType(t *testing.T) {
	_, err := phpencode.FileContent(struct{ X int }{1})
	if err == nil {
		t.Fatal("expected error")
	}
	_, err = phpencode.FileContent(phpencode.Object{{Key: "x", Value: struct{}{}}})
	if err == nil {
		t.Fatal("expected object value error")
	}
	_, err = phpencode.FileContent([]any{struct{}{}})
	if err == nil {
		t.Fatal("expected array value error")
	}
	_, err = phpencode.FileContent(json.Number("not-a-number"))
	if err == nil {
		t.Fatal("expected invalid json.Number error")
	}
}
