package main_test

import (
	"bytes"
	"strings"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/cli"
)

// main() is a three-line call with no seam (skill forbids global function
// pointers); exercise the same path via cli.Run.
func TestMain_Version(t *testing.T) {
	var out, errBuf bytes.Buffer
	if code := cli.Run([]string{"wpdev-build", "--version"}, &out, &errBuf); code != 0 {
		t.Fatalf("exit %d %s", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "0.1.0-w1-pilot") {
		t.Fatalf("out=%s", out.String())
	}
}
