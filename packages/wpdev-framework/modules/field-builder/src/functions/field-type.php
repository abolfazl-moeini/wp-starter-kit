<?php
/**
 * Field type public API (uniform wpdev_register_* facade).
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\FieldBuilder\Field_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a custom field type.
 *
 * @since 2.7.0
 *
 * @param string               $type    Field type slug.
 * @param array<string, mixed> $config  Optional sanitize/validate config.
 * @param bool                 $replace Replace existing type. Default true.
 * @return bool
 */
if (!function_exists('wpdev_register_field_type')) {
function wpdev_register_field_type( $type, array $config = array(), $replace = true ) {

	return Field_Type_Registry::register( $type, $config, $replace );

}
}
 // end wpdev_register_field_type;

/**
 * Get a field type config.
 *
 * @since 2.7.0
 *
 * @param string $type Field type slug.
 * @return array<string, mixed>|null
 */
if (!function_exists('wpdev_get_field_type')) {
function wpdev_get_field_type( $type ) {

	return Field_Type_Registry::get( $type );

}
}
 // end wpdev_get_field_type;

/**
 * Whether a field type is registered.
 *
 * @since 2.7.0
 *
 * @param string $type Field type slug.
 * @return bool
 */
if (!function_exists('wpdev_has_field_type')) {
function wpdev_has_field_type( $type ) {

	return Field_Type_Registry::has( $type );

}
}
 // end wpdev_has_field_type;

/**
 * List all registered field types.
 *
 * @since 2.7.0
 *
 * @return array<string, array<string, mixed>>
 */
if (!function_exists('wpdev_list_field_types')) {
function wpdev_list_field_types() {

	return Field_Type_Registry::all();

}
}
 // end wpdev_list_field_types;

/**
 * Unregister a field type.
 *
 * @since 2.7.0
 *
 * @param string $type Field type slug.
 * @return void
 */
if (!function_exists('wpdev_unregister_field_type')) {
function wpdev_unregister_field_type( $type ) {

	Field_Type_Registry::unregister( $type );

}
}
 // end wpdev_unregister_field_type;

/**
 * Sanitize an image/file/upload field value (attachment ID or URL).
 *
 * @since 2.7.1
 *
 * @param mixed $value
 * @return int|string
 */
if (!function_exists('wpdev_sanitize_media_field')) {
function wpdev_sanitize_media_field( $value ) {

	if ( is_numeric( $value ) ) {
		$id = (int) $value;
		return $id > 0 ? $id : '';
	}

	if ( is_string( $value ) ) {
		$trimmed = trim( $value );
		if ( '' === $trimmed ) {
			return '';
		}
		if ( ctype_digit( $trimmed ) ) {
			$id = (int) $trimmed;
			return $id > 0 ? $id : '';
		}
		return esc_url_raw( $trimmed );
	}

	if ( is_array( $value ) ) {
		$id = isset( $value['ID'] ) ? (int) $value['ID'] : (int) ( $value['id'] ?? 0 );
		if ( $id > 0 ) {
			return $id;
		}
		$url = isset( $value['url'] ) && is_string( $value['url'] ) ? esc_url_raw( $value['url'] ) : '';
		return $url;
	}

	return '';

}
}
 // end wpdev_sanitize_media_field;

/**
 * Sanitize embed HTML markup (e.g. Aparat, YouTube, Vimeo, iframe, HTML5 video).
 *
 * Converts script-based embeds (such as Aparat) into responsive safe iframes
 * before removing scripts and event handlers, preventing silent data loss.
 *
 * @since 2.13.7
 *
 * @param mixed $value Raw HTML string or embed snippet.
 * @return string Sanitized HTML markup.
 */
if (!function_exists('wpdev_sanitize_embed_html')) {
function wpdev_sanitize_embed_html( $value ) {

	if ( ! is_string( $value ) ) {
		return '';
	}

	$value = trim( $value );
	if ( '' === $value ) {
		return '';
	}

	// 1. Convert Aparat script embed to safe responsive iframe before stripping scripts.
	if ( stripos( $value, 'aparat.com' ) !== false && stripos( $value, '<script' ) !== false ) {
		$value = (string) preg_replace_callback(
			'#(?:<div\b[^>]*>\s*)?<script\b[^>]*src=["\'](?:https?:)?//(?:www\.)?aparat\.com/embed/([a-zA-Z0-9_-]+)[^"\']*["\'][^>]*>.*?</script>(?:\s*</div>)?#is',
			static function ( array $matches ): string {
				$hash     = $matches[1];
				$esc_hash = function_exists( 'esc_attr' ) ? esc_attr( $hash ) : htmlspecialchars( $hash, ENT_QUOTES, 'UTF-8' );
				return '<div class="h_iframe-aparat_embed_frame" style="position:relative;width:100%;padding-top:56.25%;"><iframe src="https://www.aparat.com/video/video/embed/videohash/' . $esc_hash . '/vt/frame" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>';
			},
			$value
		);
	}

	// 2. Normalize Aparat iframe embed snippets that contain legacy style/span wrappers, preserving surrounding markup.
	if ( stripos( $value, 'aparat.com' ) !== false && stripos( $value, 'h_iframe-aparat_embed_frame' ) !== false ) {
		$value = (string) preg_replace_callback(
			'#<div\b[^>]*class=["\'][^"\']*h_iframe-aparat_embed_frame[^"\']*["\'][^>]*>(?:<span\b[^>]*>.*?</span>\s*)?<iframe\b[^>]*src=["\'](?:https?:)?//(?:www\.)?aparat\.com/video/video/embed/videohash/([a-zA-Z0-9_-]+)[^"\']*["\'][^>]*>.*?</iframe>\s*</div>#is',
			static function ( array $matches ): string {
				$hash     = $matches[1];
				$esc_hash = function_exists( 'esc_attr' ) ? esc_attr( $hash ) : htmlspecialchars( $hash, ENT_QUOTES, 'UTF-8' );
				return '<div class="h_iframe-aparat_embed_frame" style="position:relative;width:100%;padding-top:56.25%;"><iframe src="https://www.aparat.com/video/video/embed/videohash/' . $esc_hash . '/vt/frame" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>';
			},
			$value
		);
	}

	// 3. Remove style and script blocks (including their body contents) and inline event handlers before KSES.
	// Stripping style tags with regex prevents raw CSS rules from leaking onto the rendered page as visible text.
	$value = (string) preg_replace( '#<style\b[^>]*>.*?</style>#is', '', $value );
	$value = (string) preg_replace( '#<style\b[^>]*>#is', '', $value );
	$value = (string) preg_replace( '#<script\b[^>]*>.*?</script>#is', '', $value );
	$value = (string) preg_replace( '#<script\b[^>]*>#is', '', $value );
	$value = (string) preg_replace( '/\s*on[a-z0-9_-]+\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+)/i', '', $value );

	// Drop javascript: / data: / vbscript: URLs on src attributes before KSES to prevent protocol-mangling leakage.
	$value = (string) preg_replace_callback(
		'/\s(src)\s*=\s*(["\'])(.*?)\2/i',
		static function ( array $matches ): string {
			$url   = html_entity_decode( $matches[3], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			$url   = trim( $url );
			$lower = strtolower( $url );
			if ( '' === $url || 0 === strpos( $lower, 'javascript:' ) || 0 === strpos( $lower, 'data:' ) || 0 === strpos( $lower, 'vbscript:' ) ) {
				return '';
			}
			return $matches[0];
		},
		$value
	);

	$allowed = array(
		'iframe' => array(
			'src'                   => true,
			'width'                 => true,
			'height'                => true,
			'frameborder'           => true,
			'allowfullscreen'       => true,
			'webkitallowfullscreen' => true,
			'mozallowfullscreen'    => true,
			'allow'                 => true,
			'referrerpolicy'        => true,
			'loading'               => true,
			'title'                 => true,
			'class'                 => true,
			'style'                 => true,
		),
		'video'  => array(
			'src'         => true,
			'controls'    => true,
			'poster'      => true,
			'preload'     => true,
			'width'       => true,
			'height'      => true,
			'class'       => true,
			'style'       => true,
			'playsinline' => true,
			'muted'       => true,
			'autoplay'    => true,
			'loop'        => true,
		),
		'source' => array(
			'src'  => true,
			'type' => true,
		),
		'div'    => array(
			'class' => true,
			'style' => true,
			'id'    => true,
		),
		'span'   => array(
			'class' => true,
			'style' => true,
			'id'    => true,
		),
		'p'      => array(
			'class' => true,
			'style' => true,
		),
		'a'      => array(
			'href'   => true,
			'title'  => true,
			'target' => true,
			'rel'    => true,
			'class'  => true,
			'style'  => true,
		),
		'em'     => array(
			'class' => true,
			'style' => true,
		),
		'strong' => array(
			'class' => true,
			'style' => true,
		),
		'b'      => array(
			'class' => true,
			'style' => true,
		),
		'i'      => array(
			'class' => true,
			'style' => true,
		),
		'code'   => array(
			'class' => true,
			'style' => true,
		),
	);

	$clean = function_exists( 'wp_kses' ) ? (string) wp_kses( $value, $allowed ) : $value;

	// Defense in depth: drop javascript: / data: URLs on src attributes.
	$clean = (string) preg_replace_callback(
		'/\s(src)\s*=\s*(["\'])(.*?)\2/i',
		static function ( array $matches ): string {
			$url   = html_entity_decode( $matches[3], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			$url   = trim( $url );
			$lower = strtolower( $url );
			if ( '' === $url || 0 === strpos( $lower, 'javascript:' ) || 0 === strpos( $lower, 'data:' ) ) {
				return '';
			}
			$safe = function_exists( 'esc_url' ) ? esc_url( $url ) : $url;
			if ( '' === $safe || '#' === $safe ) {
				return '';
			}

			return ' src=' . $matches[2] . $safe . $matches[2];
		},
		$clean
	);

	// Neutralize UI redressing in style attributes (fixed positioning, high z-index, viewport units).
	$clean = (string) preg_replace_callback(
		'/\sstyle\s*=\s*(["\'])(.*?)\1/i',
		static function ( array $matches ): string {
			$style = $matches[2];
			$style = (string) preg_replace( '/position\s*:\s*fixed\s*;?/i', '', $style );
			$style = (string) preg_replace( '/z-index\s*:\s*[^;]*;?/i', '', $style );
			$style = (string) preg_replace( '/(?:width|height|top|left|right|bottom|max-width|max-height)\s*:\s*[^;]*\d+v[wh][^;]*;?/i', '', $style );
			$style = trim( $style );
			return '' !== $style ? ' style="' . htmlspecialchars( $style, ENT_QUOTES, 'UTF-8' ) . '"' : '';
		},
		$clean
	);

	// Host allowlist enforcement for <iframe> embeds (P2-4).
	$allowed_hosts = array(
		'aparat.com',
		'youtube.com',
		'youtu.be',
		'vimeo.com',
		'player.vimeo.com',
		'soundcloud.com',
		'w.soundcloud.com',
		'arvancloud.ir',
		'arvancloud.com',
	);
	if ( function_exists( 'apply_filters' ) ) {
		$allowed_hosts = (array) apply_filters( 'wpdev_allowed_embed_hosts', $allowed_hosts );
	}

	$clean = (string) preg_replace_callback(
		'#<iframe\b[^>]*>(?:.*?</iframe>)?#is',
		static function ( array $matches ) use ( $allowed_hosts ): string {
			$iframe = $matches[0];
			if ( ! preg_match( '/\ssrc\s*=\s*(["\'])(.*?)\1/i', $iframe, $src_match ) ) {
				return '';
			}
			$src  = html_entity_decode( $src_match[2], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			$host = strtolower( (string) parse_url( $src, PHP_URL_HOST ) );
			if ( '' === $host ) {
				return '';
			}
			$is_allowed = false;
			foreach ( $allowed_hosts as $allowed_host ) {
				$allowed_host = strtolower( (string) $allowed_host );
				if ( $host === $allowed_host || ( strlen( $host ) > strlen( $allowed_host ) && substr( $host, -strlen( '.' . $allowed_host ) ) === '.' . $allowed_host ) ) {
					$is_allowed = true;
					break;
				}
			}
			return $is_allowed ? $iframe : '';
		},
		$clean
	);

	return is_string( $clean ) ? $clean : '';

}
}
 // end wpdev_sanitize_embed_html;

if ( ! function_exists( 'wpdev_render_video' ) ) {
	/**
	 * Render a video embed or HTML5 player for Aparat, YouTube, Vimeo, direct video files, or iframes.
	 *
	 * Solves Anti-Pattern 93 ("raw MP4 assumption") by validating actual video file extensions
	 * before generating native <video> elements and providing responsive 16:9 iframe embeds
	 * for video platforms (Aparat, YouTube, Vimeo).
	 *
	 * @since 2.13.7
	 *
	 * @param mixed  $video      Video URL, embed snippet, or direct media link.
	 * @param string $poster_url Optional poster image URL for HTML5 player.
	 * @return string Rendered HTML markup or empty string.
	 */
	function wpdev_render_video( $video, $poster_url = '' ) {

		if ( ! is_string( $video ) ) {
			return '';
		}

		$video = trim( $video );
		if ( '' === $video ) {
			return '';
		}

		$poster_url = is_string( $poster_url ) ? trim( $poster_url ) : '';

		// 1. Detect Aparat video hash from URL, iframe src, or script src.
		if ( preg_match( '#aparat\.com/(?:v/|video/video/embed/videohash/|embed/)([a-zA-Z0-9_-]+)#i', $video, $matches ) ) {
			$hash     = $matches[1];
			$esc_hash = function_exists( 'esc_attr' ) ? esc_attr( $hash ) : htmlspecialchars( $hash, ENT_QUOTES, 'UTF-8' );
			return '<div class="h_iframe-aparat_embed_frame" style="position:relative;width:100%;padding-top:56.25%;"><iframe src="https://www.aparat.com/video/video/embed/videohash/' . $esc_hash . '/vt/frame" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>';
		}

		// 2. Detect YouTube video ID from URL (watch?v=, embed/, shorts/, youtu.be/).
		if ( preg_match( '#(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|v/)|youtu\.be/)([a-zA-Z0-9_-]{11})#i', $video, $matches ) ) {
			$yt_id     = $matches[1];
			$esc_yt_id = function_exists( 'esc_attr' ) ? esc_attr( $yt_id ) : htmlspecialchars( $yt_id, ENT_QUOTES, 'UTF-8' );
			return '<div class="h_iframe-youtube_embed_frame" style="position:relative;width:100%;padding-top:56.25%;"><iframe src="https://www.youtube.com/embed/' . $esc_yt_id . '" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>';
		}

		// 3. Detect Vimeo video ID from URL.
		if ( preg_match( '#(?:vimeo\.com/(?:channels/(?:\w+/)?|groups/[^/]+/videos/|album/(?:\d+/)?video/|video/|)(\d+)|player\.vimeo\.com/video/(\d+))#i', $video, $matches ) ) {
			$vimeo_id     = ! empty( $matches[1] ) ? $matches[1] : ( ! empty( $matches[2] ) ? $matches[2] : '' );
			$esc_vimeo_id = function_exists( 'esc_attr' ) ? esc_attr( $vimeo_id ) : htmlspecialchars( $vimeo_id, ENT_QUOTES, 'UTF-8' );
			return '<div class="h_iframe-vimeo_embed_frame" style="position:relative;width:100%;padding-top:56.25%;"><iframe src="https://player.vimeo.com/video/' . $esc_vimeo_id . '" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>';
		}

		// 4. Direct video file URL (only wrap explicit video binary extensions in native <video> tags).
		if ( filter_var( $video, FILTER_VALIDATE_URL ) ) {
			$path = (string) parse_url( $video, PHP_URL_PATH );
			$ext  = strtolower( pathinfo( $path, PATHINFO_EXTENSION ) );
			$mime_map = array(
				'mp4'  => 'video/mp4',
				'm4v'  => 'video/mp4',
				'webm' => 'video/webm',
				'ogv'  => 'video/ogg',
				'ogg'  => 'video/ogg',
				'mov'  => 'video/quicktime',
				'm3u8' => 'application/x-mpegURL',
			);

			if ( isset( $mime_map[ $ext ] ) ) {
				$mime_type   = $mime_map[ $ext ];
				$esc_video   = function_exists( 'esc_url' ) ? esc_url( $video ) : htmlspecialchars( $video, ENT_QUOTES, 'UTF-8' );
				$poster_attr = '';
				if ( '' !== $poster_url ) {
					$esc_poster  = function_exists( 'esc_url' ) ? esc_url( $poster_url ) : htmlspecialchars( $poster_url, ENT_QUOTES, 'UTF-8' );
					$poster_attr = ' poster="' . $esc_poster . '"';
				}
				return '<video controls preload="metadata"' . $poster_attr . ' style="max-width:100%;width:100%;height:auto;display:block;"><source src="' . $esc_video . '" type="' . $mime_type . '">Your browser does not support the HTML5 video tag.</video>';
			}

			// Web URL without video extension and without recognized provider: do NOT wrap in broken <video>.
			return '';
		}

		// 5. Generic iframe embed (e.g. custom embed or service).
		if ( stripos( $video, '<iframe' ) !== false ) {
			$sanitized = wpdev_sanitize_embed_html( $video );
			if ( '' === $sanitized ) {
				return '';
			}
			if ( stripos( $sanitized, 'padding-top' ) !== false || stripos( $sanitized, 'h_iframe-' ) !== false ) {
				return $sanitized;
			}
			return '<div class="h_iframe-generic_embed_frame" style="position:relative;width:100%;padding-top:56.25%;">' . $sanitized . '</div>';
		}

		// 6. Raw HTML5 video markup.
		if ( stripos( $video, '<video' ) !== false ) {
			return wpdev_sanitize_embed_html( $video );
		}

		// 7. Clean up empty containers (e.g. leftover <div id="..."></div> from legacy stripped scripts).
		$stripped = trim( strip_tags( $video ) );
		if ( '' === $stripped ) {
			return '';
		}

		return wpdev_sanitize_embed_html( $video );

	} // end wpdev_render_video;
}

