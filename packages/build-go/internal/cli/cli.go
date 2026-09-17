package cli

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/config"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/sidecar"
)

const Version = "0.1.0-w1-pilot"

func Run(args []string, stdout, stderr io.Writer) int {
	if len(args) < 2 {
		printHelp(stdout)
		return 0
	}
	switch args[1] {
	case "--help", "-h", "help":
		printHelp(stdout)
		return 0
	case "--version", "-v", "version":
		fmt.Fprintln(stdout, Version)
		return 0
	case "config":
		return runConfig(args[2:], stdout, stderr)
	case "hash":
		return runHash(args[2:], stdout, stderr)
	case "sidecar":
		return runSidecar(args[2:], stdout, stderr)
	default:
		fmt.Fprintf(stderr, "unknown command %s\n", args[1])
		return 2
	}
}

func printHelp(w io.Writer) {
	fmt.Fprint(w, `wpdev-build — kit-proprietary build tooling (Go W1 pilot)

Usage:
  wpdev-build --help
  wpdev-build --version
  wpdev-build config --path <wpdev.json>
  wpdev-build hash --file <path>
  wpdev-build sidecar --file <file.css>

This pilot does not deploy. Deploy remains a later wave with WAL gates.
`)
}

func runConfig(args []string, stdout, stderr io.Writer) int {
	path, err := flagValue(args, "--path")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	cfg, err := config.Read(config.Options{Path: path})
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	raw, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	fmt.Fprintln(stdout, string(raw))
	return 0
}

func runHash(args []string, stdout, stderr io.Writer) int {
	file, err := flagValue(args, "--file")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	sum, err := hash.FileMD5(file)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	fmt.Fprintln(stdout, sum)
	return 0
}

func runSidecar(args []string, stdout, stderr io.Writer) int {
	file, err := flagValue(args, "--file")
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	out, err := sidecar.WriteStyle(file)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	fmt.Fprintln(stdout, out)
	return 0
}

func flagValue(args []string, name string) (string, error) {
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == name {
			if i+1 >= len(args) {
				return "", fmt.Errorf("missing value for %s", name)
			}
			return args[i+1], nil
		}
		prefix := name + "="
		if strings.HasPrefix(arg, prefix) {
			return strings.TrimPrefix(arg, prefix), nil
		}
	}
	if name == "--path" {
		return "", nil
	}
	return "", fmt.Errorf("missing %s", name)
}
