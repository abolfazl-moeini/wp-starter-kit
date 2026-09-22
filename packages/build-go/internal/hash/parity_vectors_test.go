package hash_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash"
)

// TestParityVectors_CanonicalJSONMatchesFrozenNodeSource asserts the Go JSON-text
// canonicalizer against `canonicalJson` output from the frozen Node source,
// captured in testdata/parity-vectors.json by
// migration/fixtures/emit-parity-vectors.mjs.
//
// Node's canonicalJson takes a VALUE; Go's CanonicalJSON takes JSON TEXT. The
// vectors therefore carry `json` (JSON.stringify of the input) and `want`
// (canonicalJson of the value). They agree only for inputs that survive a JSON
// text round-trip, which is why the sparse-array case is recorded separately
// rather than asserted here.
func TestParityVectors_CanonicalJSONMatchesFrozenNodeSource(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "parity-vectors.json"))
	if err != nil {
		t.Fatalf("read parity vectors: %v", err)
	}
	var file struct {
		Oracle        string `json:"oracle"`
		CanonicalJSON []struct {
			Name string `json:"name"`
			JSON string `json:"json"`
			Want string `json:"want"`
		} `json:"canonicalJson"`
		SparseArrayFinding struct {
			Input         string `json:"input"`
			CanonicalJSON string `json:"canonicalJson"`
			JSONStringify string `json:"jsonStringify"`
			Parses        bool   `json:"parses"`
		} `json:"sparseArrayFinding"`
		ValueOnlyFindings []struct {
			Name          string `json:"name"`
			Input         string `json:"input"`
			CanonicalJSON string `json:"canonicalJson"`
			JSONStringify string `json:"jsonStringify"`
			Parses        bool   `json:"parses"`
		} `json:"valueOnlyFindings"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatalf("decode parity vectors: %v", err)
	}
	if len(file.CanonicalJSON) == 0 {
		t.Fatal("parity vector file has no canonicalJson vectors; a suite that asserts nothing must not pass")
	}
	t.Logf("oracle=%s canonicalJson=%d", file.Oracle, len(file.CanonicalJSON))

	for _, tc := range file.CanonicalJSON {
		t.Run(tc.Name, func(t *testing.T) {
			got, err := hash.CanonicalJSON([]byte(tc.JSON))
			if err != nil {
				t.Fatalf("CanonicalJSON(%s): %v", tc.JSON, err)
			}
			if string(got) != tc.Want {
				t.Errorf("canonicalJson mismatch (oracle %s)\n input: %s\n   got: %s\n  want: %s",
					file.Oracle, tc.JSON, got, tc.Want)
			}
		})
	}

	// Documented divergences, asserted rather than assumed. Node's canonicalJson is
	// a VALUE function, so it can see inputs JSON text cannot carry. Go's entry
	// point accepts []byte, so both cases below are unreachable on the Go side and
	// must be handled explicitly by the U02 port. The test fails if either
	// divergence disappears from the recorded vector file, so a future reader
	// cannot delete the note while the JS behaviour still differs.
	if len(file.ValueOnlyFindings) == 0 {
		t.Fatal("valueOnlyFindings missing from the vector file")
	}
	for _, f := range file.ValueOnlyFindings {
		t.Run("value-only/"+f.Name, func(t *testing.T) {
			if f.CanonicalJSON == "" || f.Input == "" {
				t.Fatal("incomplete value-only finding")
			}
			// The whole point: the value function and the text serializer disagree,
			// so no JSON-text round-trip can carry this case into the Go entry point.
			if f.CanonicalJSON == f.JSONStringify {
				t.Fatalf("Node canonicalJson(%s) == JSON.stringify(%s); the divergence no longer exists and this note should be removed", f.Input, f.Input)
			}
			// Only the unparseable variant must be rejected by the text entry point.
			// The undefined-object variant is valid JSON; it is simply unreachable.
			if !f.Parses {
				if _, err := hash.CanonicalJSON([]byte(f.CanonicalJSON)); err == nil {
					t.Errorf("Go CanonicalJSON accepted %q, which is not valid JSON", f.CanonicalJSON)
				}
			}
		})
	}

	// The undefined-object case is a different shape from the sparse array: the
	// canonical text IS valid JSON, but JSON.stringify never produces a document
	// that could carry it. Pinned separately because U02 depends on the rule.
	t.Run("undefined-object-value-is-recorded", func(t *testing.T) {
		var found bool
		for _, f := range file.ValueOnlyFindings {
			if f.Name != "undefined-object-value" {
				continue
			}
			found = true
			if !f.Parses {
				t.Fatalf("expected %q to be valid JSON, got unparseable", f.CanonicalJSON)
			}
			if !strings.Contains(f.CanonicalJSON, "null") {
				t.Errorf("expected canonicalJson to keep the key as null, got %q", f.CanonicalJSON)
			}
			if f.JSONStringify != "{}" {
				t.Errorf("expected JSON.stringify to drop the undefined key, got %q", f.JSONStringify)
			}
		}
		if !found {
			t.Fatal("undefined-object-value finding missing; U02's absent-field rule is unrecorded")
		}
	})
}

// TestParityVectors_PlanFingerprintsAreRecorded pins the computePlanFingerprint
// digests recorded from the frozen Node source. Go has no BuildPlan yet (U02 is
// `pending`), so this test does not assert a Go implementation — it fails if the
// recorded vectors are dropped, which is the guard against a future U02 port
// being validated against nothing.
func TestParityVectors_PlanFingerprintsAreRecorded(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "parity-vectors.json"))
	if err != nil {
		t.Fatalf("read parity vectors: %v", err)
	}
	var file struct {
		Fingerprints []struct {
			Input  json.RawMessage `json:"input"`
			SHA256 string          `json:"sha256"`
		} `json:"fingerprints"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatalf("decode parity vectors: %v", err)
	}
	if len(file.Fingerprints) == 0 {
		t.Fatal("no plan fingerprint vectors recorded; U02 would have no oracle")
	}
	for i, fp := range file.Fingerprints {
		if len(fp.SHA256) != 64 {
			t.Errorf("fingerprint %d is not a sha256 hex digest: %q", i, fp.SHA256)
		}
		if len(fp.Input) == 0 {
			t.Errorf("fingerprint %d has no input recorded", i)
		}
	}
	t.Logf("recorded %d plan fingerprint vectors for U02", len(file.Fingerprints))
}
