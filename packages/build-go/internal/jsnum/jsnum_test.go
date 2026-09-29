package jsnum_test

import (
	"math"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/jsnum"
)

func TestVectors(t *testing.T) {
	cases := []struct {
		in   float64
		str  string
		json string
	}{
		{0, "0", "0"},
		{1e21, "1e+21", "1e+21"},
		{1e-7, "1e-7", "1e-7"},
		{1e-6, "0.000001", "0.000001"},
		{1.5, "1.5", "1.5"},
		{math.NaN(), "NaN", "null"},
		{math.Inf(1), "Infinity", "null"},
		{math.Inf(-1), "-Infinity", "null"},
		{9007199254740992, "9007199254740992", "9007199254740992"},
	}
	for _, tc := range cases {
		if got := jsnum.NumberString(tc.in); got != tc.str {
			t.Fatalf("NumberString(%v)=%q want %q", tc.in, got, tc.str)
		}
		if got := jsnum.JSONNumber(tc.in); got != tc.json {
			t.Fatalf("JSONNumber(%v)=%q want %q", tc.in, got, tc.json)
		}
	}
	if got := jsnum.NumberString(math.Copysign(0, -1)); got != "0" {
		t.Fatalf("negative zero=%q", got)
	}
}
