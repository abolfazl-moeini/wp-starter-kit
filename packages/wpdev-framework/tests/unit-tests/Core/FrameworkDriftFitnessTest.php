<?php
/**
 * Fitness Test: Verifies zero architectural drift between Canonical WPDev (A)
 * and Packaged Framework in wp-starter-kit (B).
 *
 * @package WPDev\Tests
 */

declare( strict_types=1 );

namespace WPDevTest\Framework\Core;

use PHPUnit\Framework\TestCase;

class FrameworkDriftFitnessTest extends TestCase {

	/**
	 * @var string
	 */
	private $canonical_root;

	/**
	 * @var string
	 */
	private $starter_kit_pkg_root;

	protected function setUp(): void {
		parent::setUp();
		$this->canonical_root       = dirname( __DIR__, 3 );
		$this->starter_kit_pkg_root = '/Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/packages/wpdev-framework';
	}

	protected function tearDown(): void {
		parent::tearDown();
	}

	/**
	 * @test
	 */
	public function itShouldHaveZeroDriftBetweenCanonicalAndPackagedFramework(): void {
		if ( ! is_dir( $this->starter_kit_pkg_root ) ) {
			$this->markTestSkipped( 'wp-starter-kit packages/wpdev-framework directory is not available.' );
		}

		// 1. Settings_Write_Lock must be present in both canonical (A) and packaged (B).
		$canonical_write_lock = $this->canonical_root . '/modules/settings-panel-builder/src/class-settings-write-lock.php';
		$packaged_write_lock  = $this->starter_kit_pkg_root . '/modules/settings-panel-builder/src/class-settings-write-lock.php';

		$this->assertFileExists( $canonical_write_lock, 'Canonical framework (A) must have class-settings-write-lock.php' );
		$this->assertFileExists( $packaged_write_lock, 'Packaged framework (B) must have class-settings-write-lock.php' );

		// 2. Dead code replace_registered must NOT exist in either canonical or packaged Settings_Storage.
		$canonical_storage = file_get_contents( $this->canonical_root . '/modules/settings-panel-builder/src/class-settings-storage.php' );
		$packaged_storage  = file_get_contents( $this->starter_kit_pkg_root . '/modules/settings-panel-builder/src/class-settings-storage.php' );

		$this->assertStringNotContainsString(
			'function replace_registered',
			$canonical_storage,
			'Canonical Settings_Storage must not contain dead replace_registered'
		);
		$this->assertStringNotContainsString(
			'function replace_registered',
			$packaged_storage,
			'Packaged Settings_Storage must not contain dead replace_registered'
		);

		// 3. Both must have wpdev_with_option_lock defined in functions/options.php.
		$canonical_options = file_get_contents( $this->canonical_root . '/modules/settings-panel-builder/src/functions/options.php' );
		$packaged_options  = file_get_contents( $this->starter_kit_pkg_root . '/modules/settings-panel-builder/src/functions/options.php' );

		$this->assertStringContainsString(
			'function wpdev_with_option_lock',
			$canonical_options,
			'Canonical options.php must define wpdev_with_option_lock'
		);
		$this->assertStringContainsString(
			'function wpdev_with_option_lock',
			$packaged_options,
			'Packaged options.php must define wpdev_with_option_lock'
		);

		// 4. Empty-state icon handling in field-repeater.php must not render dashicons when empty.
		$canonical_repeater = file_get_contents( $this->canonical_root . '/modules/field-builder/views/admin-pages/fields/field-repeater.php' );
		$packaged_repeater  = file_get_contents( $this->starter_kit_pkg_root . '/modules/field-builder/views/admin-pages/fields/field-repeater.php' );

		$this->assertStringContainsString(
			"! empty( \$empty_icon )",
			$canonical_repeater,
			'Canonical field-repeater.php must guard empty state icon with ! empty($empty_icon)'
		);
		$this->assertStringContainsString(
			"! empty( \$empty_icon )",
			$packaged_repeater,
			'Packaged field-repeater.php must guard empty state icon with ! empty($empty_icon)'
		);

		// 5. Meta_Store must exist in both A and B with identical content.
		$canonical_meta_store = $this->canonical_root . '/modules/field-builder/src/class-meta-store.php';
		$packaged_meta_store  = $this->starter_kit_pkg_root . '/modules/field-builder/src/class-meta-store.php';
		$this->assertFileExists( $canonical_meta_store, 'Canonical framework (A) must have class-meta-store.php' );
		$this->assertFileExists( $packaged_meta_store, 'Packaged framework (B) must have class-meta-store.php' );
		$this->assertFileEquals( $canonical_meta_store, $packaged_meta_store, 'Meta_Store must be identical between A and B' );

		// 6. Non-destructive recursive sanitizer in Field must exist in both A and B.
		$canonical_field = file_get_contents( $this->canonical_root . '/modules/field-builder/src/field/class-field.php' );
		$packaged_field  = file_get_contents( $this->starter_kit_pkg_root . '/modules/field-builder/src/field/class-field.php' );
		$this->assertStringContainsString( 'sanitize_recursive', $canonical_field, 'Canonical Field must have sanitize_recursive' );
		$this->assertStringContainsString( 'sanitize_recursive', $packaged_field, 'Packaged Field must have sanitize_recursive' );

		// 7. Early Settings Registration Queue (Postmortem 03 / Anti-pattern 25 & 95).
		$canonical_settings_fn = file_get_contents( $this->canonical_root . '/modules/settings-panel-builder/src/functions/settings.php' );
		$packaged_settings_fn  = file_get_contents( $this->starter_kit_pkg_root . '/modules/settings-panel-builder/src/functions/settings.php' );
		$this->assertStringContainsString( 'wpdev_get_early_registration_queue', $canonical_settings_fn, 'Canonical settings.php must have early queue' );
		$this->assertStringContainsString( 'wpdev_get_early_registration_queue', $packaged_settings_fn, 'Packaged settings.php must have early queue' );

		// 8. AJAX Table Two-Gate Nonce Verification (DEF-2026-0042 / PREC-0003).
		$canonical_ajax = file_get_contents( $this->canonical_root . '/modules/core/src/ajax/class-ajax.php' );
		$packaged_ajax  = file_get_contents( $this->starter_kit_pkg_root . '/modules/core/src/ajax/class-ajax.php' );
		$this->assertStringContainsString( 'wpdev_list_table_aliases', $canonical_ajax, 'Canonical Ajax must support table aliases' );
		$this->assertStringContainsString( 'wpdev_list_table_aliases', $packaged_ajax, 'Packaged Ajax must support table aliases' );

		// 9. Scoped Metabox Tabs CSS wrapper (DEF-2026-0057 / Anti-pattern 75).
		$canonical_widget_tabs = file_get_contents( $this->canonical_root . '/modules/metabox-builder/views/metabox/widget-tabs.php' );
		$packaged_widget_tabs  = file_get_contents( $this->starter_kit_pkg_root . '/modules/metabox-builder/views/metabox/widget-tabs.php' );
		$this->assertStringContainsString( 'class="wpdev-styling"', $canonical_widget_tabs, 'Canonical widget-tabs.php must have wpdev-styling wrapper' );
		$this->assertStringContainsString( 'class="wpdev-styling"', $packaged_widget_tabs, 'Packaged widget-tabs.php must have wpdev-styling wrapper' );
	}
}
