package cli_test

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/cli"
)

func TestRun_HelpAndVersion(t *testing.T) {
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build", "--help"}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("help exit %d stderr=%s", code, errBuf.String())
	}
	if !strings.Contains(out.String(), "wpdev-build") {
		t.Fatalf("help=%s", out.String())
	}

	out.Reset()
	code = cli.Run([]string{"wpdev-build", "--version"}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("version exit %d", code)
	}
	if !strings.Contains(out.String(), cli.Version) {
		t.Fatalf("version=%s", out.String())
	}
}

func TestRun_UnknownCommand(t *testing.T) {
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build", "explode"}, &out, &errBuf)
	if code == 0 {
		t.Fatal("expected non-zero")
	}
	if !strings.Contains(errBuf.String(), "unknown") {
		t.Fatalf("stderr=%s", errBuf.String())
	}
}

func TestRun_ConfigJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "wpdev.json")
	body := `{
  "slug": "pilot",
  "globalName": "Pilot",
  "localizeVar": "PilotLoc",
  "textDomain": "pilot",
  "hookPrefix": "pilot",
  "npmScope": "@pilot"
}`
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build", "config", "--path", path}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("exit %d stderr=%s", code, errBuf.String())
	}
	if !strings.Contains(out.String(), `"slug": "pilot"`) {
		t.Fatalf("stdout=%s", out.String())
	}
	if strings.Contains(out.String(), "node_modules") {
		t.Fatal("config output must not mention node_modules")
	}
}

func TestRun_HashFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "a.txt")
	if err := os.WriteFile(path, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build", "hash", "--file", path}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("exit %d stderr=%s", code, errBuf.String())
	}
	if strings.TrimSpace(out.String()) != "5d41402abc4b2a76b9719d911017c592" {
		t.Fatalf("hash=%q", out.String())
	}
}

func TestRun_Sidecar(t *testing.T) {
	dir := t.TempDir()
	css := filepath.Join(dir, "style.css")
	if err := os.WriteFile(css, []byte("body{}"), 0o644); err != nil {
		t.Fatal(err)
	}
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build", "sidecar", "--file", css}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("exit %d stderr=%s", code, errBuf.String())
	}
	asset := filepath.Join(dir, "style.asset.php")
	if _, err := os.Stat(asset); err != nil {
		t.Fatalf("sidecar not written: %v stdout=%s", err, out.String())
	}
}

func TestRun_FlagEqualsAndErrors(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "wpdev.json")
	body := `{"slug":"pilot","globalName":"Pilot","localizeVar":"PilotLoc","textDomain":"pilot","hookPrefix":"pilot","npmScope":"@pilot"}`
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build", "config", "--path=" + path}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("equals-path exit %d %s", code, errBuf.String())
	}

	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "hash"}, &out, &errBuf)
	if code == 0 || !strings.Contains(errBuf.String(), "--file") {
		t.Fatalf("missing file: %d %s", code, errBuf.String())
	}

	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "hash", "--file"}, &out, &errBuf)
	if code == 0 {
		t.Fatal("expected missing value")
	}

	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "hash", "--file", filepath.Join(dir, "nope.txt")}, &out, &errBuf)
	if code == 0 {
		t.Fatal("expected hash error")
	}

	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "sidecar", "--file", filepath.Join(dir, "nope.css")}, &out, &errBuf)
	if code == 0 {
		t.Fatal("expected sidecar error")
	}

	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "config", "--path", filepath.Join(dir, "nope.json")}, &out, &errBuf)
	if code == 0 {
		t.Fatal("expected config error")
	}

	out.Reset()
	errBuf.Reset()
	if cli.Run([]string{"wpdev-build", "-h"}, &out, &errBuf) != 0 {
		t.Fatal("help -h")
	}
	out.Reset()
	if cli.Run([]string{"wpdev-build", "-v"}, &out, &errBuf) != 0 {
		t.Fatal("version -v")
	}

	errBuf.Reset()
	out.Reset()
	code = cli.Run([]string{"wpdev-build", "sidecar"}, &out, &errBuf)
	if code == 0 {
		t.Fatal("sidecar missing --file")
	}

	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "config", "--path"}, &out, &errBuf)
	if code == 0 {
		t.Fatal("config --path without value")
	}

	out.Reset()
	errBuf.Reset()
	code = cli.Run([]string{"wpdev-build", "config"}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("config without --path should walk to repo wpdev.json, got %d %s", code, errBuf.String())
	}
	if !strings.Contains(out.String(), `"slug"`) {
		t.Fatalf("walked config=%s", out.String())
	}
}

func TestRun_UsageErrorsBeforeIO(t *testing.T) {
	for _, command := range []string{"config", "hash", "sidecar"} {
		t.Run(command, func(t *testing.T) {
			flag := "--file"
			if command == "config" {
				flag = "--path"
			}
			missing := filepath.Join(t.TempDir(), "missing.css")
			tests := []struct {
				name string
				args []string
				want string
			}{
				{"empty-separated", []string{flag, ""}, "empty value for " + flag},
				{"empty-equals", []string{flag + "="}, "empty value for " + flag},
				{"missing-value", []string{flag}, "missing value for " + flag},
				{"next-long-flag", []string{flag, "--unknown"}, "missing value for " + flag},
				{"next-short-flag", []string{flag, "-x"}, "missing value for " + flag},
				{"unknown-only", []string{"--unknown"}, "unknown flag \"--unknown\""},
				{"unknown-before", []string{"--unknown", flag, missing}, "unknown flag \"--unknown\""},
				{"unknown-after", []string{flag, missing, "--unknown"}, "unknown flag \"--unknown\""},
				{"unknown-equals", []string{flag + "=" + missing, "--unknown=value"}, "unknown flag \"--unknown=value\""},
				{"positional-only", []string{"extra"}, "unexpected argument \"extra\""},
				{"positional-before", []string{"extra", flag, missing}, "unexpected argument \"extra\""},
				{"positional-after", []string{flag, missing, "extra"}, "unexpected argument \"extra\""},
				{"empty-positional", []string{flag, missing, ""}, "unexpected argument \"\""},
				{"duplicate-separated", []string{flag, missing, flag, missing}, "duplicate flag " + flag},
				{"duplicate-equals", []string{flag + "=" + missing, flag + "=" + missing}, "duplicate flag " + flag},
				{"duplicate-mixed", []string{flag, missing, flag + "=" + missing}, "duplicate flag " + flag},
				{"duplicate-reverse-mixed", []string{flag + "=" + missing, flag, missing}, "duplicate flag " + flag},
				{"duplicate-missing-value", []string{flag, missing, flag}, "duplicate flag " + flag},
				{"first-error", []string{flag, missing, "extra", "--unknown"}, "unexpected argument \"extra\""},
			}
			if command != "config" {
				tests = append(tests, struct {
					name string
					args []string
					want string
				}{"absent-required-flag", nil, "missing " + flag})
			}
			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					var out, errBuf bytes.Buffer
					args := append([]string{"wpdev-build", command}, tt.args...)
					code := cli.Run(args, &out, &errBuf)
					if code != 2 || out.Len() != 0 || errBuf.String() != tt.want+"\n" {
						t.Fatalf("exit=%d stdout=%q stderr=%q; want exit=2, empty stdout, stderr=%q", code, out.String(), errBuf.String(), tt.want+"\n")
					}
				})
			}
		})
	}
}

func TestRun_InvalidSidecarDoesNotWrite(t *testing.T) {
	for _, extra := range [][]string{{"--unknown"}, {"extra"}, {"--file=other.css"}} {
		t.Run(strings.Join(extra, " "), func(t *testing.T) {
			dir := t.TempDir()
			css := filepath.Join(dir, "style.css")
			asset := filepath.Join(dir, "style.asset.php")
			if err := os.WriteFile(css, []byte("body{}"), 0o644); err != nil {
				t.Fatal(err)
			}
			for _, exists := range []bool{false, true} {
				if exists {
					if err := os.WriteFile(asset, []byte("unchanged"), 0o644); err != nil {
						t.Fatal(err)
					}
				}
				var out, errBuf bytes.Buffer
				args := append([]string{"wpdev-build", "sidecar", "--file", css}, extra...)
				if code := cli.Run(args, &out, &errBuf); code != 2 || out.Len() != 0 {
					t.Errorf("exit=%d stdout=%q stderr=%q", code, out.String(), errBuf.String())
				}
				body, err := os.ReadFile(asset)
				if exists {
					if err != nil || string(body) != "unchanged" {
						t.Errorf("sidecar changed: body=%q err=%v", body, err)
					}
				} else if !os.IsNotExist(err) {
					t.Errorf("sidecar unexpectedly created: err=%v", err)
				}
			}
		})
	}
}

func TestRun_FileEquals(t *testing.T) {
	for _, command := range []string{"hash", "sidecar"} {
		t.Run(command, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "style=pilot.css")
			if err := os.WriteFile(path, []byte("hello"), 0o644); err != nil {
				t.Fatal(err)
			}
			var out, errBuf bytes.Buffer
			code := cli.Run([]string{"wpdev-build", command, "--file=" + path}, &out, &errBuf)
			if code != 0 || errBuf.Len() != 0 {
				t.Fatalf("exit=%d stderr=%q", code, errBuf.String())
			}
			want := "5d41402abc4b2a76b9719d911017c592\n"
			if command == "sidecar" {
				asset := strings.TrimSuffix(path, ".css") + ".asset.php"
				want = asset + "\n"
				if _, err := os.Stat(asset); err != nil {
					t.Fatal(err)
				}
			}
			if out.String() != want {
				t.Fatalf("stdout=%q want=%q", out.String(), want)
			}
		})
	}
}

func TestRun_NoAccidentalDeploy(t *testing.T) {
	var out, errBuf bytes.Buffer
	code := cli.Run([]string{"wpdev-build"}, &out, &errBuf)
	if code != 0 {
		t.Fatalf("bare invocation should print help, exit 0, got %d %s", code, errBuf.String())
	}
	if strings.Contains(out.String(), "deploy") && strings.Contains(out.String(), "running deploy") {
		t.Fatal("bare invocation must not deploy")
	}
}
