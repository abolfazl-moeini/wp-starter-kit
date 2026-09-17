package main

import (
	"bytes"
	"strings"
	"testing"
)

func TestMain_Version(t *testing.T) {
	var out, errBuf bytes.Buffer
	exitCode := -1
	origExit, origOut, origErr, origArgs := osExit, stdout, stderr, args
	t.Cleanup(func() {
		osExit, stdout, stderr, args = origExit, origOut, origErr, origArgs
	})
	osExit = func(code int) { exitCode = code }
	stdout = &out
	stderr = &errBuf
	args = []string{"wpdev-build", "--version"}
	main()
	if exitCode != 0 {
		t.Fatalf("exit %d %s", exitCode, errBuf.String())
	}
	if !strings.Contains(out.String(), "0.1.0-w1-pilot") {
		t.Fatalf("out=%s", out.String())
	}
}
