package hash

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

func MD5String(s string) string {
	sum := md5.Sum([]byte(s))
	return hex.EncodeToString(sum[:])
}

func SHA256Bytes(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func FileMD5(path string) (string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	// R-016: Node hashes string(fileBytes) — Buffer.toString() is a LOSSY
	// UTF-8 decode — then re-encodes as UTF-8 for the digest. Go string(raw)
	// is lossless, so replicate the lossy decode explicitly.
	return MD5String(lossyUTF8(raw)), nil
}

func CanonicalJSON(raw []byte) ([]byte, error) {
	var v any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("canonical json: trailing data")
	}
	// R-002: encoding/json sorts map keys (canonical) but escapes <, >, &
	// by default while JSON.stringify does not. Disable HTML escaping so
	// digests over canonical bytes match Node.
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return []byte(strings.TrimSuffix(buf.String(), "\n")), nil
}

// lossyUTF8 replicates Node Buffer.toString("utf8") per WHATWG Encoding Standard:
// ASCII passes through, valid multi-byte sequences decode, an invalid starter byte
// emits one U+FFFD and consumes one byte. When an invalid continuation byte is
// encountered in a multi-byte sequence, the maximal subpart (starter plus any preceding
// valid continuation bytes) is consumed as one U+FFFD, and the invalid byte begins the
// next sequence. If a sequence is truncated at end of input with valid continuation
// bytes so far, all remaining bytes are consumed as one U+FFFD.
func lossyUTF8(b []byte) string {
	const repl = "\uFFFD"
	var out strings.Builder
	out.Grow(len(b))
	i := 0
	for i < len(b) {
		c := b[i]
		if c < 0x80 {
			out.WriteByte(c)
			i++
			continue
		}
		var need int
		lower, upper := 0x80, 0xBF
		switch {
		case c >= 0xC2 && c <= 0xDF:
			need = 1
		case c >= 0xE0 && c <= 0xEF:
			need = 2
			if c == 0xE0 {
				lower = 0xA0
			} else if c == 0xED {
				upper = 0x9F
			}
		case c >= 0xF0 && c <= 0xF4:
			need = 3
			if c == 0xF0 {
				lower = 0x90
			} else if c == 0xF4 {
				upper = 0x8F
			}
		default:
			out.WriteString(repl)
			i++
			continue
		}

		validPrefix := true
		for k := 1; k <= need; k++ {
			if i+k >= len(b) {
				out.WriteString(repl)
				i = len(b)
				validPrefix = false
				break
			}
			lo, hi := 0x80, 0xBF
			if k == 1 {
				lo, hi = lower, upper
			}
			if b[i+k] < byte(lo) || b[i+k] > byte(hi) {
				out.WriteString(repl)
				i += k
				validPrefix = false
				break
			}
		}
		if !validPrefix {
			continue
		}

		switch need {
		case 1:
			out.WriteRune(rune(c&0x1F)<<6 | rune(b[i+1]&0x3F))
		case 2:
			out.WriteRune(rune(c&0x0F)<<12 | rune(b[i+1]&0x3F)<<6 | rune(b[i+2]&0x3F))
		default:
			out.WriteRune(rune(c&0x07)<<18 | rune(b[i+1]&0x3F)<<12 | rune(b[i+2]&0x3F)<<6 | rune(b[i+3]&0x3F))
		}
		i += 1 + need
	}
	return out.String()
}
