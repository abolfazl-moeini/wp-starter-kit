<?php
/**
 * Compatibility module for external security firewalls (e.g. Wordfence WAF).
 *
 * @package WPDevFramework\Modules\Compat
 * @since   2.14.0
 */

namespace WPDevFramework\Modules\Compat;

defined( 'ABSPATH' ) || exit;

/**
 * Class Compat
 *
 * Provides safe transport encoding and Two-Gate server-side decoding to prevent
 * Wordfence WAF false-positive 403 Forbidden blocks on raw embed/HTML code submissions.
 */
class Compat {

	/**
	 * Safe transport envelope prefix.
	 */
	const ENVELOPE_PREFIX = '__WPB64__:';

	/**
	 * Maximum payload size allowed for safe transport decoding (64 KB).
	 * Protects against memory DoS exhaustion.
	 */
	const MAX_PAYLOAD_BYTES = 65536;

	/**
	 * Determine if Wordfence is installed and active in O(1) time without DB queries or autoloader hits.
	 *
	 * @return bool
	 */
	public static function is_active(): bool {
		return defined( 'WORDFENCE_VERSION' ) || class_exists( 'wordfence', false ) || class_exists( 'wfWAF', false );
	}

	/**
	 * Initialize compatibility filters and scripts.
	 * Bails immediately if Wordfence is not active (zero cold-boot overhead).
	 *
	 * @return void
	 */
	public static function init(): void {
		add_filter( 'wpdev_field_save_value', array( __CLASS__, 'decode_safe_transport' ), 5, 3 );

		if ( function_exists( 'is_admin' ) && is_admin() ) {
			add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_safe_transport_script' ), 20 );
		}
	}

	/**
	 * Encode raw content into safe transport envelope.
	 *
	 * @param string $value Content to encode.
	 * @return string
	 */
	public static function encode( string $value ): string {
		return self::ENVELOPE_PREFIX . base64_encode( $value );
	}

	/**
	 * Decode safe transport envelope with Two-Gate capability verification and length protection.
	 * Can be used as a filter callback for `wpdev_field_save_value` or called directly.
	 *
	 * @param mixed  $value    Payload to decode (string or nested array).
	 * @param string $id       Field identifier.
	 * @param array  $atts     Field attributes.
	 * @return mixed
	 */
	public static function decode_safe_transport( $value, $id = '', $atts = array(), int $depth = 0 ) {
		if ( $depth > 5 ) {
			return $value;
		}

		if ( is_array( $value ) ) {
			foreach ( $value as $k => $item ) {
				$value[ $k ] = self::decode_safe_transport( $item, $id, $atts, $depth + 1 );
			}
			return $value;
		}

		if ( ! is_string( $value ) || strpos( $value, self::ENVELOPE_PREFIX ) !== 0 ) {
			return $value;
		}

		// Enforce safe_transport opt-in when attributes are provided.
		if ( ! empty( $atts ) && is_array( $atts ) && empty( $atts['safe_transport'] ) ) {
			return $value;
		}

		// Length cap guard (Memory DoS prevention). If exceeded, preserve raw value to avoid silent data loss.
		if ( strlen( $value ) > self::MAX_PAYLOAD_BYTES ) {
			return $value;
		}

		$raw_base64 = substr( $value, strlen( self::ENVELOPE_PREFIX ) );
		$decoded    = base64_decode( $raw_base64, true );

		if ( false === $decoded ) {
			return $value;
		}

		// Normalize magic quotes unslashing on decoded content.
		$decoded = stripslashes( $decoded );

		// Capability check: If a specific capability is configured on the field, enforce it.
		if ( ! empty( $atts['capability'] ) && function_exists( 'current_user_can' ) ) {
			if ( ! current_user_can( (string) $atts['capability'] ) && ! current_user_can( 'unfiltered_html' ) ) {
				return function_exists( 'sanitize_text_field' ) ? sanitize_text_field( $decoded ) : strip_tags( $decoded );
			}
		}

		// Post-Decode Sanitization:
		// Base64 is a transport mechanism, not a security boundary.
		// If user has unfiltered_html, return decoded payload directly.
		if ( function_exists( 'current_user_can' ) && current_user_can( 'unfiltered_html' ) ) {
			return $decoded;
		}

		// All other roles (Editor, Shop Manager, Author) must be sanitized.
		// wpdev_sanitize_embed_html() preserves safe iframes (Aparat, YouTube) while stripping scripts/handlers/unsafe hosts.
		if ( function_exists( 'wpdev_sanitize_embed_html' ) ) {
			return wpdev_sanitize_embed_html( $decoded );
		}

		if ( function_exists( 'wp_kses_post' ) ) {
			return wp_kses_post( $decoded );
		}

		return function_exists( 'sanitize_text_field' ) ? sanitize_text_field( $decoded ) : strip_tags( $decoded );
	}

	/**
	 * Allowlist a parameter in Wordfence WAF with an option guard to prevent repeated disk writes.
	 * Requires manage_options capability and validates admin path boundaries.
	 *
	 * @param string $path      URL path (e.g. '/wp-admin/post.php').
	 * @param string $param_key Scoped param key (e.g. 'request.body[content]').
	 * @param string $rules     WAF rule ID or 'all'.
	 * @return bool True if registered or already allowlisted.
	 */
	public static function allowlist_param( string $path, string $param_key, string $rules = 'all' ): bool {
		// Capability and path boundary verification (P1-4).
		if ( function_exists( 'current_user_can' ) && ! current_user_can( 'manage_options' ) ) {
			return false;
		}

		if ( strpos( $path, '/wp-admin/' ) !== 0 ) {
			return false;
		}

		$hash = md5( $path . '|' . $param_key . '|' . $rules );
		$opt  = 'wpdev_wf_al_' . $hash;

		if ( function_exists( 'get_option' ) && get_option( $opt ) ) {
			return true;
		}

		if ( class_exists( 'wfWAF', false ) && ( $waf = \wfWAF::getInstance() ) ) {
			$waf->whitelistRuleForParam( $path, $param_key, $rules, 'Allowlisted via WPDev Compat Module' );

			if ( function_exists( 'update_option' ) ) {
				update_option( $opt, 1, false );
			}

			return true;
		}

		return false;
	}

	/**
	 * Enqueue minimal vanilla JS client-side encoder on admin edit pages.
	 *
	 * @param string $hook Admin screen hook.
	 * @return void
	 */
	public static function enqueue_safe_transport_script( string $hook = '' ): void {
		global $pagenow;
		$current_page = isset( $pagenow ) ? (string) $pagenow : (string) $hook;
		if ( ! in_array( $current_page, array( 'post.php', 'post-new.php', 'admin.php', 'options.php' ), true ) ) {
			return;
		}

		$script = <<<'JS'
(function() {
    'use strict';
    if (window._wpdevSafeTransportBound) return;
    window._wpdevSafeTransportBound = true;

    function encodeToWpB64(str) {
        if (!str || typeof str !== 'string' || (str.indexOf('<') === -1 && str.indexOf('>') === -1)) return str;
        if (str.indexOf('__WPB64__:') === 0) return str;
        try {
            var bytes = new TextEncoder().encode(str);
            var bin = '';
            for (var i = 0; i < bytes.length; i++) {
                bin += String.fromCharCode(bytes[i]);
            }
            return '__WPB64__:' + btoa(bin);
        } catch (e) {
            return str;
        }
    }

    var supportsFormDataEvent = ('FormDataEvent' in window) || (typeof window.FormDataEvent !== 'undefined');

    // 1. Modern FormData interceptor (Gutenberg / fetch / native browser form submit).
    // Modifies values strictly within outgoing payload without touching DOM inputs (Anti-Pattern #117).
    document.addEventListener('formdata', function(e) {
        var form = e.target;
        if (!form || !e.formData) return;
        var fields = form.querySelectorAll('[data-safe-transport="base64"], textarea.wpdev-safe-transport');
        var processedNames = {};
        for (var i = 0; i < fields.length; i++) {
            var name = fields[i].name;
            if (!name || processedNames[name] || !e.formData.has(name)) continue;
            processedNames[name] = true;

            var values = e.formData.getAll(name);
            var modified = false;
            var newValues = [];
            for (var j = 0; j < values.length; j++) {
                var v = values[j];
                if (typeof v === 'string') {
                    var enc = encodeToWpB64(v);
                    if (enc !== v) modified = true;
                    newValues.push(enc);
                } else {
                    newValues.push(v);
                }
            }
            if (modified) {
                e.formData.delete(name);
                for (var k = 0; k < newValues.length; k++) {
                    e.formData.append(name, newValues[k]);
                }
            }
        }
    });

    // 2. Synchronous form submit fallback for legacy environments without FormDataEvent.
    document.addEventListener('submit', function(e) {
        if (supportsFormDataEvent) return; // Handled safely via formdata event without touching DOM
        var form = e.target;
        if (!form || !form.elements) return;
        var fields = form.querySelectorAll('[data-safe-transport="base64"], textarea.wpdev-safe-transport');
        var restores = [];
        for (var i = 0; i < fields.length; i++) {
            var el = fields[i];
            if (el.value) {
                var enc = encodeToWpB64(el.value);
                if (enc !== el.value) {
                    restores.push({ el: el, val: el.value });
                    el.value = enc;
                }
            }
        }
        if (restores.length > 0) {
            setTimeout(function() {
                for (var j = 0; j < restores.length; j++) {
                    restores[j].el.value = restores[j].val;
                }
            }, 0);
        }
    }, true);
})();
JS;

		if ( function_exists( 'wp_register_script' ) && function_exists( 'wp_enqueue_script' ) && function_exists( 'wp_add_inline_script' ) ) {
			wp_register_script( 'wpdev-compat-safe-transport', false, array(), false, false );
			wp_enqueue_script( 'wpdev-compat-safe-transport' );
			wp_add_inline_script( 'wpdev-compat-safe-transport', $script );
		} elseif ( function_exists( 'add_action' ) ) {
			add_action( 'admin_head', static function() use ( $script ) {
				echo '<script type="text/javascript">' . $script . '</script>';
			}, 99 );
		}
	}
}
