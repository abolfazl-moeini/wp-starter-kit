package jsnum

import (
	"math"
	"strconv"
	"strings"
)

// NumberString replicates JS Number.prototype.toString for finite values
// and preserves NaN/Infinity spellings for coercion contexts
// (config error text, template literals). R-005e.
func NumberString(f float64) string {
	if math.IsNaN(f) {
		return "NaN"
	}
	if math.IsInf(f, 1) {
		return "Infinity"
	}
	if math.IsInf(f, -1) {
		return "-Infinity"
	}
	if f == 0 {
		return "0"
	}
	abs := math.Abs(f)
	if f == math.Trunc(f) && abs < 1e21 {
		return strconv.FormatFloat(f, 'f', -1, 64)
	}
	if abs >= 1e21 || abs < 1e-6 {
		return withExponent(f)
	}
	return strconv.FormatFloat(f, 'f', -1, 64)
}

// JSONNumber formats a float64 the way JSON.stringify / json2php see it:
// non-finite becomes "null", otherwise identical to NumberString. R-004e/R-005e.
func JSONNumber(f float64) string {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "null"
	}
	return NumberString(f)
}

func withExponent(f float64) string {
	s := strconv.FormatFloat(f, 'e', -1, 64)
	i := strings.LastIndexByte(s, 'e')
	if i < 0 || i+2 >= len(s) {
		return s
	}
	mant, exp := s[:i], s[i+1:]
	sign := "+"
	if strings.HasPrefix(exp, "-") {
		sign = "-"
	}
	digits := strings.TrimLeft(strings.TrimPrefix(strings.TrimPrefix(exp, "+"), "-"), "0")
	if digits == "" {
		digits = "0"
	}
	return mant + "e" + sign + digits
}
