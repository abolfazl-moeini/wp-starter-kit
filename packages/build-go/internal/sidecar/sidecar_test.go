package sidecar_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/sidecar"
)

func TestAssetPath(t *testing.T) {
	// Parity with JS assetFilePath (case-sensitive .js/.css strip).
	for _, tc := range []struct{ in, want string }{
		{"assets/bundles/wpdev-starter-deps.js", "assets/bundles/wpdev-starter-deps.asset.php"},
		{"assets/bundles/style.css", "assets/bundles/style.asset.php"},
		{"style.css/", "style.asset.php"},
		{"dir/bundle.js/", filepath.Join("dir", "bundle.asset.php")},
		{"./style.css", "style.asset.php"},
		{"/bundle.js", filepath.Join("/", "bundle.asset.php")},
		{"a/b/c.min.js", filepath.Join("a", "b", "c.min.asset.php")},
	} {
		got, err := sidecar.AssetPath(tc.in)
		if err != nil {
			t.Fatal(err)
		}
		if got != tc.want {
			t.Fatalf("AssetPath(%q)=%q want %q", tc.in, got, tc.want)
		}
	}
}

func TestAssetPath_RejectsUnsupportedLikeJSThrow(t *testing.T) {
	// JS assetFilePath throws TypeError (null regex match) for anything
	// without a lowercase .js/.css suffix; Go returns an error (R-007).
	for _, in := range []string{"Bundle.JS", "notes.txt", ".js", ".css", "dir/.js", "dir/.css", "style.CSS", "/", "///"} {
		if _, err := sidecar.AssetPath(in); err == nil {
			t.Fatalf("AssetPath(%q) should error", in)
		}
	}
}

func TestStyleAssetPath_MatchesBuildStyleAssetFile(t *testing.T) {
	// JS buildStyleAssetFile strips /\.css$/i else appends ".asset.php".
	for _, tc := range []struct{ in, want string }{
		{"style.css", "style.asset.php"},
		{"STYLE.CSS", "STYLE.asset.php"},
		{"x.js", "x.js.asset.php"},
		{"notes.txt", "notes.txt.asset.php"},
	} {
		if got := sidecar.StyleAssetPath(tc.in); got != tc.want {
			t.Fatalf("StyleAssetPath(%q)=%q want %q", tc.in, got, tc.want)
		}
	}
}

func TestWriteStyle_WritesPHPWithMD5(t *testing.T) {
	dir := t.TempDir()
	css := filepath.Join(dir, "style.css")
	body := []byte("body{color:red}")
	if err := os.WriteFile(css, body, 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := sidecar.WriteStyle(css)
	if err != nil {
		t.Fatal(err)
	}
	if out != filepath.Join(dir, "style.asset.php") {
		t.Fatalf("out=%q", out)
	}
	got, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	text := string(got)
	if !strings.HasPrefix(text, "<?php return array('hash' => '") {
		t.Fatalf("prefix=%q", text)
	}
	if !strings.HasSuffix(text, "');\n") {
		t.Fatalf("suffix=%q", text)
	}
}

func TestWriteStyle_MissingSource(t *testing.T) {
	_, err := sidecar.WriteStyle(filepath.Join(t.TempDir(), "missing.css"))
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestWriteStyle_EmptyPathRejected(t *testing.T) {
	_, err := sidecar.WriteStyle("")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestWriteStyle_NonNotExistError(t *testing.T) {
	_, err := sidecar.WriteStyle(t.TempDir())
	if err == nil {
		t.Fatal("expected error reading a directory")
	}
}

func TestWriteStyle_WriteFailure(t *testing.T) {
	dir := t.TempDir()
	css := filepath.Join(dir, "style.css")
	if err := os.WriteFile(css, []byte("body{}"), 0o644); err != nil {
		t.Fatal(err)
	}
	block := filepath.Join(dir, "style.asset.php")
	if err := os.Mkdir(block, 0o755); err != nil {
		t.Fatal(err)
	}
	_, err := sidecar.WriteStyle(css)
	if err == nil {
		t.Fatal("expected write failure when sidecar path is a directory")
	}
}

func TestWriteStyle_NonCSSAppendsLikeJS(t *testing.T) {
	// JS buildStyleAssetFile("x.js") writes "x.js.asset.php".
	dir := t.TempDir()
	js := filepath.Join(dir, "bundle.js")
	if err := os.WriteFile(js, []byte("console.log(1)"), 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := sidecar.WriteStyle(js)
	if err != nil {
		t.Fatal(err)
	}
	if out != js+".asset.php" {
		t.Fatalf("out=%q", out)
	}
	if _, err := os.Stat(out); err != nil {
		t.Fatalf("sidecar not written: %v", err)
	}
}
