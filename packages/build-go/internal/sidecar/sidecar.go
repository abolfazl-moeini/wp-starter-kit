package sidecar

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/hash"
	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/phpencode"
)

// AssetPath replicates JS assetFilePath for bundle outputs: it strips a
// case-sensitive trailing .js/.css suffix from the basename and returns an
// error for anything else (matching the JS match(/(.+)\.(?:js|css)$/) which
// requires at least one character in the basename before .js or .css).
func AssetPath(bundle string) (string, error) {
	trimmed := strings.TrimRight(bundle, "/\\")
	if trimmed == "" && (strings.HasPrefix(bundle, "/") || strings.HasPrefix(bundle, "\\")) {
		trimmed = "/"
	}
	dir := filepath.Dir(trimmed)
	base := filepath.Base(trimmed)
	for _, ext := range []string{".js", ".css"} {
		if len(base) > len(ext) && strings.HasSuffix(base, ext) {
			stem := base[:len(base)-len(ext)]
			if dir == "." {
				return stem + ".asset.php", nil
			}
			return filepath.Join(dir, stem+".asset.php"), nil
		}
	}
	return "", fmt.Errorf("assetFilePath: unsupported extension for %q (expected .js or .css)", bundle)
}

// StyleAssetPath replicates JS buildStyleAssetFile path derivation: a
// case-insensitive trailing .css is stripped, otherwise ".asset.php" is
// appended (so "x.js" → "x.js.asset.php", matching the source).
func StyleAssetPath(cssPath string) string {
	lower := strings.ToLower(cssPath)
	if strings.HasSuffix(lower, ".css") {
		return cssPath[:len(cssPath)-len(".css")] + ".asset.php"
	}
	return cssPath + ".asset.php"
}

func WriteStyle(cssPath string) (string, error) {
	if strings.TrimSpace(cssPath) == "" {
		return "", fmt.Errorf("buildStyleAssetFile: cssFilePath must be a non-empty string")
	}
	sum, err := hash.FileMD5(cssPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("buildStyleAssetFile: source CSS file not found at %s", cssPath)
		}
		return "", err
	}
	// MD5 hex cannot fail json2php encoding; FileContent is still used so
	// sidecar bytes stay on the same encoder as the U06 oracle.
	body, _ := phpencode.FileContent(phpencode.Object{{Key: "hash", Value: sum}})
	out := StyleAssetPath(cssPath)
	if err := os.WriteFile(out, []byte(body), 0o644); err != nil {
		return "", err
	}
	return out, nil
}
