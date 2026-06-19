<?php
/**
 * Tests for `packages/translation/src/index.js` (the JS helpers ported
 * from mrlogistic/dev/translation/bootstrap.php). These are unit tests for
 * the pure data layer — wp-cli invocations are tested separately via the
 * PHP shell scripts (see tests/dev/ for those).
 *
 * The pure helpers in `packages/translation/src/index.js`:
 *   - parseMapFile(potContents, bundleName)
 *   - extractTranslation(json | php-array)
 *   - updateTranslation(existing, additions, format = 'json' | 'php')
 *   - mergeTranslationFiles(mainPath, otherPaths, format)
 *   - isTranslationValid(label)
 *   - extractInternalPackages(assetPhpPath)
 *
 * The shell wrappers (generate-script / build-script) live in
 * dev/translation/*.php and call these via a small Node bridge.
 */

declare(strict_types=1);


final class TranslationPipelineTest extends \WPDevTest\TestCases\TestCase
{
    private string $tmp;

    public function setUp(): void
    {
        parent::setUp();
        $this->tmp = sys_get_temp_dir() . '/wpdev-translation-' . uniqid('', true);
        mkdir($this->tmp, 0777, true);
    }

    public function tearDown(): void
    {
        $this->wpdevRrmdir($this->tmp);
        parent::tearDown();
    }

    private function wpdevRrmdir(string $dir): void
    {
        if (!is_dir($dir)) return;
        foreach (scandir($dir) as $e) {
            if ($e === '.' || $e === '..') continue;
            $p = $dir . '/' . $e;
            if (is_dir($p)) $this->wpdevRrmdir($p);
            else unlink($p);
        }
        rmdir($dir);
    }

    /**
     * Run the Node helpers (single-process) and return the JSON they emit.
     * The script accepts a payload via argv, performs the named operation,
     * and prints `{"ok": true, "result": ...}` (or `{"ok": false, "error": ...}`)
     * to stdout.
     */
    private function runNode(string $op, array $payload): array
    {
        $script = realpath(__DIR__ . '/../../packages/translation/src/index.js');
        $this->assertNotFalse($script, 'packages/translation/src/index.js must exist');

        $args = [$op, base64_encode(json_encode($payload))];
        $cmd  = ['node', $script, ...$args];
        $env  = ['WPDEV_TMP_ROOT' => $this->tmp];
        $proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname($script), $env);
        $this->assertIsResource($proc, 'proc_open must succeed');
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($proc);
        if ($exit !== 0) {
            $this->fail(sprintf('node exited %d: %s', $exit, $stderr));
        }
        $decoded = json_decode(trim($stdout), true);
        $this->assertIsArray($decoded, 'node output must be JSON: ' . $stdout);
        return $decoded;
    }

    /* -------------------------------------------------------------------- */
    /* parseMapFile                                                          */
    /* -------------------------------------------------------------------- */

    public function test_parse_map_file_extracts_references_to_bundle(): void
    {
        // mrlogistic `generate_map_file` regex: /^\#: (.*?)\:\d+$/m
        $pot = <<<'POT'
# Copyright
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"

#: components/foo/script.js:42
msgid "Hello"
msgstr ""

#: components/foo/script.js:84
msgid "World"
msgstr ""

#: components/bar/script.js:1
msgid "Bye"
msgstr ""
POT;

        $res = $this->runNode('parseMapFile', ['potContents' => $pot, 'bundleName' => 'foo.js']);
        $this->assertTrue($res['ok']);
        $this->assertSame(
            [
                'components/foo/script.js' => 'foo.js',
                'components/bar/script.js' => 'foo.js',
            ],
            $res['result']
        );
    }

    public function test_parse_map_file_handles_empty_pot(): void
    {
        $res = $this->runNode('parseMapFile', ['potContents' => '', 'bundleName' => 'foo.js']);
        $this->assertTrue($res['ok']);
        $this->assertSame([], $res['result']);
    }

    /* -------------------------------------------------------------------- */
    /* isTranslationValid                                                   */
    /* -------------------------------------------------------------------- */

    public function test_is_translation_valid_filters_empty_and_whitespace(): void
    {
        // The JS helper takes a single value (boolean return). Test each one.
        $cases = [
            ['Hello', true],
            ['',      false],
            ['   ',   false],
            ["0",     true],
            [null,    false],
            ['World', true],
        ];
        foreach ($cases as [$input, $expected]) {
            $res = $this->runNode('isTranslationValid', ['value' => $input]);
            $this->assertTrue($res['ok'], 'isTranslationValid(' . var_export($input, true) . ') must succeed');
            $this->assertSame(
                $expected,
                $res['result'],
                'isTranslationValid(' . var_export($input, true) . ') must return ' . var_export($expected, true)
            );
        }
    }

    /* -------------------------------------------------------------------- */
    /* extractTranslation (JSON)                                            */
    /* -------------------------------------------------------------------- */

    public function test_extract_translation_from_json(): void
    {
        $json = json_encode([
            'locale_data' => [
                'messages' => [
                    'Hello' => 'Hola',
                    ''      => ['plural-forms' => 'nplurals=2;'],
                ],
            ],
        ]);

        $res = $this->runNode('extractTranslation', ['jsonString' => $json, 'format' => 'json']);
        $this->assertTrue($res['ok']);
        $this->assertSame(['Hello' => 'Hola'], $res['result']);
    }

    /* -------------------------------------------------------------------- */
    /* updateTranslation (JSON)                                             */
    /* -------------------------------------------------------------------- */

    public function test_update_translation_merges_and_filters_json(): void
    {
        $existing = json_encode([
            'locale_data' => [
                'messages' => ['Hello' => 'Hola'],
            ],
        ]);
        $additions = ['World' => 'Mundo', '' => '   ', 'Foo' => 'Bar'];

        $res = $this->runNode('updateTranslation', [
            'existingJsonString' => $existing,
            'additions'          => $additions,
            'format'             => 'json',
        ]);
        $this->assertTrue($res['ok']);
        $decoded = json_decode($res['result'], true);
        $this->assertSame(
            ['Hello' => 'Hola', 'World' => 'Mundo', 'Foo' => 'Bar'],
            $decoded['locale_data']['messages']
        );
    }

    /* -------------------------------------------------------------------- */
    /* extractInternalPackages                                              */
    /* -------------------------------------------------------------------- */

    public function test_extract_internal_packages_from_asset_php(): void
    {
        $asset = <<<'PHP'
<?php return [
  'dependencies' => ['wp-i18n', 'wp-api-fetch'],
  'internal_packages' => ['hooks', 'utils', 'ui-components'],
  'hash' => 'abc123',
];
PHP;

        $res = $this->runNode('extractInternalPackages', ['assetPhpContents' => $asset]);
        $this->assertTrue($res['ok']);
        $this->assertSame(['hooks', 'utils', 'ui-components'], $res['result']);
    }

    public function test_extract_internal_packages_returns_empty_for_missing_key(): void
    {
        $asset = "<?php return ['dependencies' => ['wp-i18n']];\n";
        $res = $this->runNode('extractInternalPackages', ['assetPhpContents' => $asset]);
        $this->assertTrue($res['ok']);
        $this->assertSame([], $res['result']);
    }

    /* -------------------------------------------------------------------- */
    /* mergeTranslationFiles (JSON files on disk)                           */
    /* -------------------------------------------------------------------- */

    public function test_merge_translation_files_writes_combined_json(): void
    {
        $main = $this->tmp . '/main-fa_IR.json';
        $a    = $this->tmp . '/a-fa_IR.json';
        $b    = $this->tmp . '/b-fa_IR.json';

        file_put_contents($main, json_encode([
            'locale_data' => ['messages' => ['Hello' => 'Hola', 'Keep' => 'KEEP']],
        ]));
        file_put_contents($a, json_encode([
            'locale_data' => ['messages' => ['World' => 'Mundo', 'Hello' => 'replaced-by-main']],
        ]));
        file_put_contents($b, json_encode([
            'locale_data' => ['messages' => ['Foo' => 'Bar']],
        ]));

        $res = $this->runNode('mergeTranslationFiles', [
            'mainPath'    => $main,
            'otherPaths'  => [$a, $b],
            'format'      => 'json',
        ]);
        $this->assertTrue($res['ok'], json_encode($res));
        $merged = json_decode(file_get_contents($main), true);
        // main wins for the 'Hello' key, others accumulate.
        $this->assertSame('KEEP', $merged['locale_data']['messages']['Keep']);
        $this->assertSame('Hola', $merged['locale_data']['messages']['Hello']);
        $this->assertSame('Mundo', $merged['locale_data']['messages']['World']);
        $this->assertSame('Bar', $merged['locale_data']['messages']['Foo']);
    }

    public function test_wpdev_list_components_finds_example_feature_entry(): void
    {
        require_once dirname(__DIR__, 2) . '/dev/translation/bootstrap.php';
        $components = wpdev_list_components();
        $this->assertContains('ExampleFeature-admin', $components);
    }
}
