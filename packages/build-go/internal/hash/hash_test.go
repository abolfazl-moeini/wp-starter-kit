package hash_test

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash"
)

func TestMD5String_MatchesNodeCrypto(t *testing.T) {
	cases := map[string]string{
		"":      "d41d8cd98f00b204e9800998ecf8427e",
		"hello": "5d41402abc4b2a76b9719d911017c592",
		"سلام":  "78903c575b0dda53c4a7644a2dd36d0e",
	}
	for in, want := range cases {
		got := hash.MD5String(in)
		if got != want {
			t.Fatalf("MD5String(%q)=%q want %q", in, got, want)
		}
	}
}

func TestSHA256Bytes_OneByteChange(t *testing.T) {
	a := hash.SHA256Bytes([]byte("payload"))
	b := hash.SHA256Bytes([]byte("payloax"))
	if a == b {
		t.Fatal("expected distinct SHA-256 for one-byte change")
	}
	if len(a) != 64 || len(b) != 64 {
		t.Fatalf("hex length a=%d b=%d", len(a), len(b))
	}
}

func TestFileMD5_MatchesStringOfFileContents(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "style.css")
	body := []byte("body { color: red; }\n")
	if err := os.WriteFile(path, body, 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := hash.FileMD5(path)
	if err != nil {
		t.Fatal(err)
	}
	want := hash.MD5String(string(body))
	if got != want {
		t.Fatalf("FileMD5=%q want %q", got, want)
	}
}

func TestFileMD5_Missing(t *testing.T) {
	_, err := hash.FileMD5(filepath.Join(t.TempDir(), "nope.css"))
	if err == nil {
		t.Fatal("expected error")
	}
}

// Ground truth pinned from Node (crypto/md5 over Buffer.toString()):
// node -e with buffers [0xff], [0xff,0xff], [0xc3], [0xe2,0x82],
// [0xc0,0xaf], "hi"+[0xff]+"!". Node replaces each invalid starter byte
// with U+FFFD but consumes a truncated valid starter plus its bytes as one.
func TestFileMD5_LossyUTF8MatchesNode(t *testing.T) {
	cases := map[string]struct {
		bytes []byte
		want  string
	}{
		"single invalid byte":          {[]byte{0xff}, "9b759040321a408a5c7768b4511287a6"},
		"two invalid bytes":            {[]byte{0xff, 0xff}, "1e034b66363e5a081874ae022767f685"},
		"truncated 2-byte seq":         {[]byte{0xc3}, "9b759040321a408a5c7768b4511287a6"},
		"truncated 3-byte seq":         {[]byte{0xe2, 0x82}, "9b759040321a408a5c7768b4511287a6"},
		"overlong sequence":            {[]byte{0xc0, 0xaf}, "1e034b66363e5a081874ae022767f685"},
		"mixed valid + invalid":        {[]byte{0x68, 0x69, 0xff, 0x21}, "41c3a42eeaa05d3a05b2d6dac7806210"},
		"bad continuation reprocessed": {[]byte{0xe2, 0x28, 0x61}, "efc54f83dcf1358ba03cf766b8cd5406"},
		"lone continuation":            {[]byte{0x80}, "9b759040321a408a5c7768b4511287a6"},
		"invalid f5 starter":           {[]byte{0xf5}, "9b759040321a408a5c7768b4511287a6"},
		"surrogate-range rejected":     {[]byte{0xed, 0xa0, 0x80}, "3eb91feed010d84682979a9a79004710"},
		"whatwg subpart e0_28":         {[]byte{0xe0, 0x28}, "2bf8347c2957bb54c1b763787e30539b"},
		"whatwg subpart 3byte 2nd bad": {[]byte{0xe2, 0x82, 0x28, 0x61}, "efc54f83dcf1358ba03cf766b8cd5406"},
		"whatwg subpart 4byte 3rd bad": {[]byte{0xf0, 0x90, 0x80, 0x28}, "2bf8347c2957bb54c1b763787e30539b"},
		"whatwg subpart 4byte 2nd bad": {[]byte{0xf0, 0x90, 0x28}, "2bf8347c2957bb54c1b763787e30539b"},
	}
	for name, tc := range cases {
		path := filepath.Join(t.TempDir(), "case.bin")
		if err := os.WriteFile(path, tc.bytes, 0o644); err != nil {
			t.Fatal(err)
		}
		got, err := hash.FileMD5(path)
		if err != nil {
			t.Fatal(err)
		}
		if got != tc.want {
			t.Fatalf("%s: FileMD5=%q want Node %q", name, got, tc.want)
		}
	}
}

func TestFileMD5_ValidMultibyteRoundTrips(t *testing.T) {
	// Valid UTF-8 is unaffected by the lossy decode: FileMD5 must equal
	// MD5String of the same text (pins: Node md5 of identical strings).
	cases := map[string]string{
		"café":   "07117fe4a1ebd544965dc19573183da2",
		"日本":     "4dbed2e657457884e67137d3514119b3",
		"😀":      "2a02eac39d716a70ecf37579185927b6",
		"\u0800": "735e3d47042a26d827aafa2fde7bc1be",
		"𐀀":      "3f2c52534ddf1119acf0e6f46145b0df",
		"􏿿":      "317291ce605601732d9d1fe361ca887e",
	}
	for text, want := range cases {
		path := filepath.Join(t.TempDir(), "text.txt")
		if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
			t.Fatal(err)
		}
		got, err := hash.FileMD5(path)
		if err != nil {
			t.Fatal(err)
		}
		if got != want || got != hash.MD5String(text) {
			t.Fatalf("%q: FileMD5=%q MD5String=%q want %q", text, got, hash.MD5String(text), want)
		}
	}
}

func TestCanonicalJSON_Invalid(t *testing.T) {
	_, err := hash.CanonicalJSON([]byte("{"))
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestCanonicalJSON_ObjectKeyOrderStable(t *testing.T) {
	raw := []byte(`{"b":2,"a":1}`)
	got, err := hash.CanonicalJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != `{"a":1,"b":2}` {
		t.Fatalf("canonical=%s", got)
	}
	d1 := hash.SHA256Bytes(got)
	d2 := hash.SHA256Bytes(got)
	if d1 != d2 {
		t.Fatal("canonical digest must be stable")
	}
}

func TestCanonicalJSON_DoesNotEscapeHTMLLikeNode(t *testing.T) {
	// Go json.Marshal escapes <, >, & by default; JSON.stringify does not.
	// Digests over canonical bytes must match Node.
	raw := []byte(`{"a":"x<y>&z"}`)
	got, err := hash.CanonicalJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != `{"a":"x<y>&z"}` {
		t.Fatalf("canonical=%s", got)
	}
}

func TestCanonicalJSON_LargeNumbersMatchJSNumber(t *testing.T) {
	raw := []byte(`{"id":9007199254740993,"ratio":1.5}`)
	got, err := hash.CanonicalJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != `{"id":9007199254740992,"ratio":1.5}` {
		t.Fatalf("number differs from JS Number: %s", got)
	}
}

func TestCanonicalJSON_SourceRegressions(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want string
	}{
		{"spellings", `[1.0,1e0,1E+02,-0,-0.0,0e10]`, `[1,1,100,0,0,0]`},
		{"precision", `[9007199254740993,18446744073709551615,1.234567890123456789]`, `[9007199254740992,18446744073709552000,1.2345678901234567]`},
		{"notation boundaries", `[1e-7,1e-6,1e20,1e21,-1e21,1.23e-7]`, `[1e-7,0.000001,100000000000000000000,1e+21,-1e+21,1.23e-7]`},
		{"range", `[1e400,-1e400,1e-400,-1e-400,5e-324,1.7976931348623157e308]`, `[null,null,0,0,5e-324,1.7976931348623157e+308]`},
		{"utf16 order", `{"\ue000":1,"\ud800\udc00":2,"a":3,"\uffff":4}`, "{\"a\":3,\"𐀀\":2,\"\ue000\":1,\"\uffff\":4}"},
		{"numeric keys", `{"2":2,"10":10,"1":1,"01":0}`, `{"01":0,"1":1,"10":10,"2":2}`},
		{"separators", `{"\u2029":"\u2028\u2029<>&","literal":"\\u2028"}`, "{\"literal\":\"\\\\u2028\",\"\u2029\":\"\u2028\u2029<>&\"}"},
		{"escapes", `["\u0000\u0001\b\t\n\f\r\u001f","\"\\\/","café😀"]`, `["\u0000\u0001\b\t\n\f\r\u001f","\"\\/","café😀"]`},
		{"surrogates", `{"\udfff":1,"\ud800":2,"\ud800\udc00":3,"v":["\ud800x","\udfff","\ud800\udc00"]}`, `{"v":["\ud800x","\udfff","𐀀"],"\ud800":2,"𐀀":3,"\udfff":1}`},
		{"nested duplicates", ` { "z": [true, null, {"b":1.00,"a":false}], "a":1,"\u0061":2 } `, `{"a":2,"z":[true,null,{"a":false,"b":1}]}`},
		{"empty containers", `[{},{"":[]},"",null,false]`, `[{},{"":[]},"",null,false]`},
	}
	inputs := make([]string, len(cases))
	for i, tc := range cases {
		inputs[i] = tc.raw
	}
	input, err := json.Marshal(inputs)
	if err != nil {
		t.Fatal(err)
	}
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate source oracle")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "node", "--input-type=module", "-e", `
import { canonicalJson } from "./packages/standalone-build/build-plan.mjs";
let input = "";
for await (const chunk of process.stdin) input += chunk;
process.stdout.write(JSON.stringify(JSON.parse(input).map(raw => canonicalJson(JSON.parse(raw)))));
`)
	cmd.Dir = filepath.Clean(filepath.Join(filepath.Dir(file), "../../../.."))
	cmd.Stdin = bytes.NewReader(input)
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("source oracle: %v", err)
	}
	var source []string
	if err := json.Unmarshal(output, &source); err != nil {
		t.Fatal(err)
	}
	if len(source) != len(cases) {
		t.Fatalf("source returned %d cases, want %d", len(source), len(cases))
	}
	for i, tc := range cases {
		if source[i] != tc.want {
			t.Fatalf("%s: source=%q pinned=%q", tc.name, source[i], tc.want)
		}
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := hash.CanonicalJSON([]byte(tc.raw))
			if err != nil {
				t.Fatal(err)
			}
			if string(got) != tc.want {
				t.Fatalf("canonical=%q source=%q", got, tc.want)
			}
			again, err := hash.CanonicalJSON(got)
			if err != nil || !bytes.Equal(again, got) {
				t.Fatalf("not idempotent: %q, %v", again, err)
			}
		})
	}
}

func TestCanonicalJSON_TrailingDataRejected(t *testing.T) {
	raw := []byte(`{"a":1} trailing`)
	_, err := hash.CanonicalJSON(raw)
	if err == nil {
		t.Fatal("expected trailing data error")
	}
}
