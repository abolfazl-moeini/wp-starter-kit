package phpencode_test

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/phpencode"
)

// TestParityVectors_MatchesFrozenNodeSource asserts the encoder against bytes
// produced by the frozen Node source (`phpFileContent`), captured in
// testdata/parity-vectors.json by migration/fixtures/emit-parity-vectors.mjs.
//
// This exists because the previous contract was a hand-written `want` string in
// the Go test plus a separately hand-written string in the Node oracle. Two
// hand-written strings can drift silently; a recorded oracle output cannot.
// The vector file is committed, so `go test ./...` needs neither Node nor the
// monorepo layout.
func TestParityVectors_MatchesFrozenNodeSource(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "parity-vectors.json"))
	if err != nil {
		t.Fatalf("read parity vectors: %v", err)
	}
	var file struct {
		Oracle  string `json:"oracle"`
		Rule    string `json:"rule"`
		Vectors []struct {
			Name   string          `json:"name"`
			Object json.RawMessage `json:"object"`
			Want   string          `json:"want"`
		} `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatalf("decode parity vectors: %v", err)
	}
	if len(file.Vectors) == 0 {
		t.Fatal("parity vector file is empty; a suite that asserts nothing must not pass")
	}
	t.Logf("oracle=%s rule=%s vectors=%d", file.Oracle, file.Rule, len(file.Vectors))

	for _, tc := range file.Vectors {
		t.Run(tc.Name, func(t *testing.T) {
			var payload struct {
				Pairs []struct {
					Key   string          `json:"-"`
					Value json.RawMessage `json:"-"`
				} `json:"pairs"`
			}
			// pairs is an array of [key, taggedValue] tuples.
			var tuples [][]json.RawMessage
			if err := json.Unmarshal(mustField(t, tc.Object, "pairs"), &tuples); err != nil {
				t.Fatalf("decode pairs: %v", err)
			}
			_ = payload

			obj := make(phpencode.Object, 0, len(tuples))
			for _, tuple := range tuples {
				if len(tuple) != 2 {
					t.Fatalf("pair arity: got %d", len(tuple))
				}
				var key string
				if err := json.Unmarshal(tuple[0], &key); err != nil {
					t.Fatalf("decode key: %v", err)
				}
				obj = append(obj, phpencode.Pair{Key: key, Value: decodeTagged(t, tuple[1])})
			}

			got, err := phpencode.FileContent(obj)
			if err != nil {
				t.Fatalf("FileContent: %v", err)
			}
			if got != tc.Want {
				t.Errorf("phpFileContent mismatch (oracle %s)\n got: %q\nwant: %q", file.Oracle, got, tc.Want)
			}
		})
	}
}

func mustField(t *testing.T, obj json.RawMessage, field string) json.RawMessage {
	t.Helper()
	var m map[string]json.RawMessage
	if err := json.Unmarshal(obj, &m); err != nil {
		t.Fatalf("decode object: %v", err)
	}
	v, ok := m[field]
	if !ok {
		t.Fatalf("missing field %q", field)
	}
	return v
}

// decodeTagged rebuilds a Go value from the emitter's tagged encoding.
func decodeTagged(t *testing.T, raw json.RawMessage) any {
	t.Helper()
	var tv struct {
		T string          `json:"t"`
		V json.RawMessage `json:"v"`
	}
	if err := json.Unmarshal(raw, &tv); err != nil {
		t.Fatalf("decode tagged value: %v", err)
	}
	switch tv.T {
	case "s":
		var s string
		if err := json.Unmarshal(tv.V, &s); err != nil {
			t.Fatalf("decode string: %v", err)
		}
		return s
	case "f":
		var f float64
		if err := json.Unmarshal(tv.V, &f); err != nil {
			t.Fatalf("decode float: %v", err)
		}
		return f
	case "n":
		var s string
		if err := json.Unmarshal(tv.V, &s); err != nil {
			t.Fatalf("decode number literal: %v", err)
		}
		return json.Number(s)
	case "b":
		var b bool
		if err := json.Unmarshal(tv.V, &b); err != nil {
			t.Fatalf("decode bool: %v", err)
		}
		return b
	case "null":
		return nil
	case "nan":
		return math.NaN()
	case "inf":
		return math.Inf(1)
	case "ninf":
		return math.Inf(-1)
	case "arr":
		var items []json.RawMessage
		if err := json.Unmarshal(tv.V, &items); err != nil {
			t.Fatalf("decode array: %v", err)
		}
		out := make([]any, 0, len(items))
		for _, item := range items {
			out = append(out, decodeTagged(t, item))
		}
		return out
	default:
		t.Fatalf("unknown tag %q", tv.T)
		return nil
	}
}
