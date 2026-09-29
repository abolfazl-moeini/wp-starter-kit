package hash

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"
	"unicode/utf8"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/jsnum"
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
	if !json.Valid(raw) {
		return nil, fmt.Errorf("canonical json: invalid JSON")
	}
	parser := canonicalParser{raw: raw}
	v, err := parser.value()
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	writeCanonical(&buf, v)
	return buf.Bytes(), nil
}

type canonicalString string

type canonicalParser struct {
	raw []byte
	pos int
}

func (p *canonicalParser) eof() error {
	return fmt.Errorf("canonical json: unexpected end of input")
}

func (p *canonicalParser) peek() (byte, error) {
	if p.pos >= len(p.raw) {
		return 0, p.eof()
	}
	return p.raw[p.pos], nil
}

func (p *canonicalParser) next() (byte, error) {
	c, err := p.peek()
	if err != nil {
		return 0, err
	}
	p.pos++
	return c, nil
}

func (p *canonicalParser) space() {
	for p.pos < len(p.raw) && strings.ContainsRune(" \t\r\n", rune(p.raw[p.pos])) {
		p.pos++
	}
}

func (p *canonicalParser) value() (any, error) {
	p.space()
	c, err := p.peek()
	if err != nil {
		return nil, err
	}
	switch c {
	case '"':
		return p.stringValue()
	case '{':
		p.pos++
		p.space()
		object := make(map[canonicalString]any)
		for {
			c, err := p.peek()
			if err != nil {
				return nil, err
			}
			if c == '}' {
				break
			}
			key, err := p.stringValue()
			if err != nil {
				return nil, err
			}
			p.space()
			if _, err := p.next(); err != nil { // ':'
				return nil, err
			}
			val, err := p.value()
			if err != nil {
				return nil, err
			}
			object[key] = val
			p.space()
			c2, err := p.peek()
			if err != nil {
				return nil, err
			}
			if c2 != ',' {
				break
			}
			p.pos++
			p.space()
		}
		if _, err := p.next(); err != nil { // '}'
			return nil, err
		}
		return object, nil
	case '[':
		p.pos++
		p.space()
		array := make([]any, 0)
		for {
			c, err := p.peek()
			if err != nil {
				return nil, err
			}
			if c == ']' {
				break
			}
			val, err := p.value()
			if err != nil {
				return nil, err
			}
			array = append(array, val)
			p.space()
			c2, err := p.peek()
			if err != nil {
				return nil, err
			}
			if c2 != ',' {
				break
			}
			p.pos++
			p.space()
		}
		if _, err := p.next(); err != nil { // ']'
			return nil, err
		}
		return array, nil
	case 'n':
		if p.pos+4 > len(p.raw) {
			return nil, p.eof()
		}
		p.pos += 4
		return nil, nil
	case 't':
		if p.pos+4 > len(p.raw) {
			return nil, p.eof()
		}
		p.pos += 4
		return true, nil
	case 'f':
		if p.pos+5 > len(p.raw) {
			return nil, p.eof()
		}
		p.pos += 5
		return false, nil
	default:
		start := p.pos
		for p.pos < len(p.raw) && strings.ContainsRune("-+0123456789.eE", rune(p.raw[p.pos])) {
			p.pos++
		}
		number, _ := strconv.ParseFloat(string(p.raw[start:p.pos]), 64)
		return number, nil
	}
}

func (p *canonicalParser) stringValue() (canonicalString, error) {
	if _, err := p.next(); err != nil { // opening '"'
		return "", err
	}
	var units []byte
	appendUnit := func(u uint16) {
		units = append(units, byte(u>>8), byte(u))
	}
	for {
		c, err := p.peek()
		if err != nil {
			return "", err
		}
		if c == '"' {
			break
		}
		if c == '\\' {
			p.pos++
			escape, err := p.next()
			if err != nil {
				return "", err
			}
			switch escape {
			case 'u':
				if p.pos+4 > len(p.raw) {
					return "", p.eof()
				}
				u, _ := strconv.ParseUint(string(p.raw[p.pos:p.pos+4]), 16, 16)
				appendUnit(uint16(u))
				p.pos += 4
			case 'b':
				appendUnit('\b')
			case 'f':
				appendUnit('\f')
			case 'n':
				appendUnit('\n')
			case 'r':
				appendUnit('\r')
			case 't':
				appendUnit('\t')
			default:
				appendUnit(uint16(escape))
			}
			continue
		}
		r, size := utf8.DecodeRune(p.raw[p.pos:])
		p.pos += size
		if r > 0xffff {
			hi, lo := utf16.EncodeRune(r)
			appendUnit(uint16(hi))
			appendUnit(uint16(lo))
		} else {
			appendUnit(uint16(r))
		}
	}
	p.pos++
	return canonicalString(units), nil
}

func writeCanonical(buf *bytes.Buffer, value any) {
	switch v := value.(type) {
	case nil:
		buf.WriteString("null")
	case bool:
		buf.WriteString(strconv.FormatBool(v))
	case float64:
		buf.WriteString(jsnum.JSONNumber(v))
	case canonicalString:
		writeCanonicalString(buf, v)
	case []any:
		buf.WriteByte('[')
		for i, item := range v {
			if i > 0 {
				buf.WriteByte(',')
			}
			writeCanonical(buf, item)
		}
		buf.WriteByte(']')
	case map[canonicalString]any:
		keys := make([]canonicalString, 0, len(v))
		for key := range v {
			keys = append(keys, key)
		}
		sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
		buf.WriteByte('{')
		for i, key := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			writeCanonicalString(buf, key)
			buf.WriteByte(':')
			writeCanonical(buf, v[key])
		}
		buf.WriteByte('}')
	}
}

func writeCanonicalString(buf *bytes.Buffer, value canonicalString) {
	const digits = "0123456789abcdef"
	buf.WriteByte('"')
	for i := 0; i < len(value); i += 2 {
		u := uint16(value[i])<<8 | uint16(value[i+1])
		switch u {
		case '"', '\\':
			buf.WriteByte('\\')
			buf.WriteByte(byte(u))
		case '\b':
			buf.WriteString(`\b`)
		case '\f':
			buf.WriteString(`\f`)
		case '\n':
			buf.WriteString(`\n`)
		case '\r':
			buf.WriteString(`\r`)
		case '\t':
			buf.WriteString(`\t`)
		default:
			if u >= 0xd800 && u <= 0xdbff && i+3 < len(value) {
				lo := uint16(value[i+2])<<8 | uint16(value[i+3])
				if lo >= 0xdc00 && lo <= 0xdfff {
					buf.WriteRune(utf16.DecodeRune(rune(u), rune(lo)))
					i += 2
					continue
				}
			}
			if u < 0x20 || u >= 0xd800 && u <= 0xdfff {
				buf.WriteString(`\u`)
				buf.WriteByte(digits[u>>12])
				buf.WriteByte(digits[u>>8&15])
				buf.WriteByte(digits[u>>4&15])
				buf.WriteByte(digits[u&15])
			} else {
				buf.WriteRune(rune(u))
			}
		}
	}
	buf.WriteByte('"')
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
