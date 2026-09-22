package sidecar_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/sidecar"
)

// TestParityVectors_MatchesFrozenNodeSource asserts AssetPath and MD5 against
// bytes and strings produced by the frozen Node sources, captured in
// testdata/parity-vectors.json by migration/fixtures/emit-parity-vectors.mjs.
//
// Error cases assert only the error/no-error split: Node raises a TypeError
// where Go returns a formatted error, and the two message texts are not a
// parity contract.
func TestParityVectors_MatchesFrozenNodeSource(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "parity-vectors.json"))
	if err != nil {
		t.Fatalf("read parity vectors: %v", err)
	}
	var file struct {
		Oracle    string `json:"oracle"`
		AssetPath []struct {
			Input string `json:"input"`
			Want  string `json:"want"`
			Err   bool   `json:"err"`
		} `json:"assetPath"`
		MD5 []struct {
			Input string `json:"input"`
			Want  string `json:"want"`
		} `json:"md5"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatalf("decode parity vectors: %v", err)
	}
	if len(file.AssetPath) == 0 || len(file.MD5) == 0 {
		t.Fatal("parity vector file is missing sections; a suite that asserts nothing must not pass")
	}
	t.Logf("oracle=%s assetPath=%d md5=%d", file.Oracle, len(file.AssetPath), len(file.MD5))

	for _, tc := range file.AssetPath {
		t.Run("assetPath/"+tc.Input, func(t *testing.T) {
			got, err := sidecar.AssetPath(tc.Input)
			if tc.Err {
				if err == nil {
					t.Fatalf("expected an error for %q (Node raised TypeError), got %q", tc.Input, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("AssetPath(%q): %v", tc.Input, err)
			}
			if got != tc.Want {
				t.Errorf("AssetPath(%q)\n got: %q\nwant: %q", tc.Input, got, tc.Want)
			}
		})
	}

	for _, tc := range file.MD5 {
		t.Run("md5/"+tc.Input, func(t *testing.T) {
			got := hash.MD5String(tc.Input)
			if got != tc.Want {
				t.Errorf("MD5String(%q)\n got: %q\nwant: %q", tc.Input, got, tc.Want)
			}
		})
	}
}
