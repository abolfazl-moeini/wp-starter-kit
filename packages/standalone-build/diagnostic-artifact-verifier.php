<?php
declare(strict_types=1);

namespace WPDev\Core;

/**
 * Diagnostic Read-Only Artifact Integrity Verifier (Tamper Resistance Phase 1)
 * 
 * Safely inspects local plugin files against canonical artifact-manifest.json.
 * Strict non-fatal behavior: never calls wp_die(), never throws unhandled exceptions.
 */
final class ArtifactIntegrityVerifier
{
    /**
     * Verifies the integrity of a plugin directory against its artifact-manifest.json.
     *
     * @param string $pluginDir Absolute path to plugin directory.
     * @return array{
     *   status: string,
     *   severity: string,
     *   fatal: bool,
     *   manifestDigest: ?string,
     *   signingStatus: string,
     *   missingFiles: array<string>,
     *   unexpectedFiles: array<string>,
     *   modifiedFiles: array<array{path: string, expectedSha: string, actualSha: string}>,
     *   blockers: array<string>
     * }
     */
    public static function verify(string $pluginDir): array
    {
        $pluginDir = rtrim($pluginDir, '/\\');
        $manifestPath = $pluginDir . DIRECTORY_SEPARATOR . 'artifact-manifest.json';

        $missingFiles = [];
        $unexpectedFiles = [];
        $modifiedFiles = [];
        $blockers = [];

        if (!file_exists($manifestPath) || is_link($manifestPath) || !is_file($manifestPath)) {
            return [
                'status'          => 'invalid_manifest',
                'severity'        => 'high',
                'fatal'           => false,
                'manifestDigest'  => null,
                'signingStatus'   => 'not-configured',
                'missingFiles'    => [],
                'unexpectedFiles' => [],
                'modifiedFiles'   => [],
                'blockers'        => ['artifact-manifest.json is missing or not a regular file'],
            ];
        }

        $raw = @file_get_contents($manifestPath);
        if ($raw === false) {
            return [
                'status'          => 'invalid_manifest',
                'severity'        => 'high',
                'fatal'           => false,
                'manifestDigest'  => null,
                'signingStatus'   => 'not-configured',
                'missingFiles'    => [],
                'unexpectedFiles' => [],
                'modifiedFiles'   => [],
                'blockers'        => ['Cannot read artifact-manifest.json'],
            ];
        }

        $manifest = @json_decode($raw, true);
        if (!is_array($manifest) || !isset($manifest['schemaVersion']) || $manifest['schemaVersion'] !== 1 || !isset($manifest['files']) || !is_array($manifest['files'])) {
            return [
                'status'          => 'invalid_manifest',
                'severity'        => 'high',
                'fatal'           => false,
                'manifestDigest'  => null,
                'signingStatus'   => 'not-configured',
                'missingFiles'    => [],
                'unexpectedFiles' => [],
                'modifiedFiles'   => [],
                'blockers'        => ['artifact-manifest.json schema is invalid or corrupted'],
            ];
        }

        $manifestDigest = $manifest['manifestDigest'] ?? null;
        $signingStatus = $manifest['signingStatus'] ?? 'not-configured';
        $manifestFiles = [];

        foreach ($manifest['files'] as $f) {
            if (!is_array($f) || !isset($f['path']) || !is_string($f['path'])) {
                $blockers[] = 'Corrupted file record in manifest';
                continue;
            }
            $rel = str_replace('\\', '/', $f['path']);
            if (strpos($rel, '../') !== false || strpos($rel, '..\\') !== false || $rel[0] === '/' || strpos($rel, "\0") !== false) {
                $blockers[] = "Unsafe path in manifest: {$rel}";
                continue;
            }
            $manifestFiles[$rel] = $f['sha256'] ?? '';

            $physical = $pluginDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
            if (!file_exists($physical) || is_link($physical) || !is_file($physical)) {
                $missingFiles[] = $rel;
                continue;
            }

            $actualSha = @hash_file('sha256', $physical);
            if ($actualSha !== ($f['sha256'] ?? '')) {
                $modifiedFiles[] = [
                    'path'        => $rel,
                    'expectedSha' => (string)($f['sha256'] ?? ''),
                    'actualSha'   => (string)$actualSha,
                ];
            }
        }

        $realBase = realpath($pluginDir);
        if ($realBase === false) {
            return [
                'status'          => 'invalid_manifest',
                'severity'        => 'high',
                'fatal'           => false,
                'manifestDigest'  => null,
                'signingStatus'   => 'not-configured',
                'missingFiles'    => [],
                'unexpectedFiles' => [],
                'modifiedFiles'   => [],
                'blockers'        => ['Cannot resolve realpath for plugin directory'],
            ];
        }

        // Check for unlisted files on disk
        $scanDisk = function (string $dir, string $base, string $realBase) use (&$scanDisk, &$unexpectedFiles, &$blockers, $manifestFiles) {
            $items = @scandir($dir);
            if ($items === false) return;
            foreach ($items as $item) {
                if ($item === '.' || $item === '..' || $item === '.DS_Store') continue;
                $full = $dir . DIRECTORY_SEPARATOR . $item;
                $st = @lstat($full);
                if ($st === false) continue;

                $isLink = ($st['mode'] & 0120000) === 0120000;
                $rel = trim(str_replace('\\', '/', substr($full, strlen($base))), '/');

                if ($isLink) {
                    $blockers[] = "Forbidden symbolic link on disk: {$rel}";
                    continue;
                }

                $realFull = realpath($full);
                if ($realFull === false || strpos($realFull, $realBase) !== 0) {
                    $blockers[] = "Path traversal detected outside plugin root: {$rel}";
                    continue;
                }

                if ($rel === 'artifact-manifest.json' || $rel === 'release-manifest.json' || $rel === 'release-manifest.sig') {
                    continue;
                }

                if (is_dir($full)) {
                    $scanDisk($full, $base, $realBase);
                } elseif (is_file($full)) {
                    if (!isset($manifestFiles[$rel])) {
                        $unexpectedFiles[] = $rel;
                    }
                }
            }
        };
        $scanDisk($pluginDir, $pluginDir, $realBase);

        $status = 'valid';
        if (!empty($blockers)) {
            $status = 'invalid_manifest';
        } elseif (!empty($modifiedFiles)) {
            $status = 'modified';
        } elseif (!empty($missingFiles)) {
            $status = 'missing';
        } elseif (!empty($unexpectedFiles)) {
            $status = 'unexpected';
        }

        return [
            'status'          => $status,
            'severity'        => $status === 'valid' ? 'none' : 'high',
            'fatal'           => false,
            'manifestDigest'  => $manifestDigest,
            'signingStatus'   => $signingStatus,
            'missingFiles'    => $missingFiles,
            'unexpectedFiles' => $unexpectedFiles,
            'modifiedFiles'   => $modifiedFiles,
            'blockers'        => $blockers,
        ];
    }
}
