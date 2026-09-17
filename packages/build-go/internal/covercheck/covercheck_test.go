package covercheck_test

import (
	"strings"
	"testing"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/covercheck"
)

func TestEvaluate_FailsBelowThreshold(t *testing.T) {
	profile := strings.Join([]string{
		"mode: atomic",
		"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config/config.go:1.1,2.2 5 1",
		"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config/config.go:3.1,4.2 5 0",
		"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash/hash.go:1.1,2.2 10 1",
	}, "\n") + "\n"
	rep, err := covercheck.Evaluate([]byte(profile), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err != nil {
		t.Fatal(err)
	}
	if rep.Pass {
		t.Fatalf("expected fail, total=%v pkgs=%v", rep.Total, rep.Packages)
	}
	if rep.Total >= 0.95 {
		t.Fatalf("total=%v", rep.Total)
	}
}

func TestEvaluate_PassesHighCoverage(t *testing.T) {
	profile := strings.Join([]string{
		"mode: atomic",
		"",
		"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config/config.go:1.1,2.2 96 1",
		"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config/config.go:3.1,4.2 4 0",
		"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash/hash.go:1.1,2.2 100 1",
	}, "\n") + "\n"
	rep, err := covercheck.Evaluate([]byte(profile), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err != nil {
		t.Fatal(err)
	}
	if !rep.Pass {
		t.Fatalf("expected pass: %+v", rep)
	}
}

func TestEvaluate_ZeroProfileFails(t *testing.T) {
	_, err := covercheck.Evaluate([]byte("mode: atomic\n"), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("empty profile must error")
	}
}

func TestEvaluate_MalformedLineFails(t *testing.T) {
	_, err := covercheck.Evaluate([]byte("mode: atomic\nnot-a-profile-line\n"), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("expected error")
	}
	_, err = covercheck.Evaluate([]byte("mode: atomic\n:1.1,2.2 1 1\n"), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("expected colon-at-start error")
	}
}

func TestEvaluate_MissingMode(t *testing.T) {
	_, err := covercheck.Evaluate([]byte("nope\n"), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestEvaluate_Empty(t *testing.T) {
	_, err := covercheck.Evaluate(nil, covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestEvaluate_PackageBelowThresholdFailsEvenIfTotalPasses(t *testing.T) {
	profile := strings.Join([]string{
		"mode: atomic",
		"github.com/example/config/config.go:1.1,2.2 100 1",
		"github.com/example/hash/hash.go:1.1,2.2 94 1",
		"github.com/example/hash/hash.go:3.1,4.2 6 0",
	}, "\n") + "\n"
	rep, err := covercheck.Evaluate([]byte(profile), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err != nil {
		t.Fatal(err)
	}
	if rep.Pass {
		t.Fatalf("hash package 94%% must fail: %+v", rep)
	}
}

func TestEvaluate_BadCounts(t *testing.T) {
	_, err := covercheck.Evaluate([]byte("mode: atomic\nfile.go:1.1,2.2 x 1\n"), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("expected stmt parse error")
	}
	_, err = covercheck.Evaluate([]byte("mode: atomic\nfile.go:1.1,2.2 1 y\n"), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err == nil {
		t.Fatal("expected hit parse error")
	}
}

func TestEvaluate_WindowsDrivePath(t *testing.T) {
	profile := strings.Join([]string{
		"mode: atomic",
		"C:/Users/dev/project/file.go:1.1,2.2 10 1",
	}, "\n") + "\n"
	rep, err := covercheck.Evaluate([]byte(profile), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err != nil {
		t.Fatalf("unexpected error parsing Windows drive path: %v", err)
	}
	if !rep.Pass || rep.Total != 1.0 {
		t.Fatalf("expected 100%% pass, got %+v", rep)
	}
	if rep.Packages["C:/Users/dev/project"] != 1.0 {
		t.Fatalf("expected package key C:/Users/dev/project, got %v", rep.Packages)
	}
}

func TestEvaluate_WindowsBackslashPath(t *testing.T) {
	profile := strings.Join([]string{
		"mode: atomic",
		`C:\Users\dev\project\file.go:1.1,2.2 10 1`,
	}, "\n") + "\n"
	rep, err := covercheck.Evaluate([]byte(profile), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err != nil {
		t.Fatalf("unexpected error parsing Windows backslash path: %v", err)
	}
	if !rep.Pass || rep.Total != 1.0 {
		t.Fatalf("expected 100%% pass, got %+v", rep)
	}
	if rep.Packages["C:/Users/dev/project"] != 1.0 {
		t.Fatalf("expected package key C:/Users/dev/project, got %v", rep.Packages)
	}
}

func TestEvaluate_PathWithSpaces(t *testing.T) {
	profile := strings.Join([]string{
		"mode: atomic",
		"/Users/dev/My Projects/wp starter/internal/config/config.go:1.1,2.2 15 1",
	}, "\n") + "\n"
	rep, err := covercheck.Evaluate([]byte(profile), covercheck.Thresholds{Total: 0.95, Package: 0.95})
	if err != nil {
		t.Fatalf("unexpected error parsing path with spaces: %v", err)
	}
	if !rep.Pass || rep.Total != 1.0 {
		t.Fatalf("expected 100%% pass, got %+v", rep)
	}
	if rep.Packages["/Users/dev/My Projects/wp starter/internal/config"] != 1.0 {
		t.Fatalf("expected package key with spaces, got %v", rep.Packages)
	}
}
