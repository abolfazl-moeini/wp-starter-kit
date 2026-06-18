<?php
/**
 * Markup Helper Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Converts an array to a vue data-state parameter.
 *
 * @since 2.0.0
 *
 * @param array $state_array The array to convert.
 * @return string
 */
function wpdev_convert_to_state($state_array = array()) {

	$object = (object) $state_array; // Force object to prevent issues with Vue.

	return json_encode($object);

} // end wpdev_convert_to_state;

/**
 * Clean up p tags around block elements.
 *
 * @since 2.0.0
 *
 * @param string $content The content.
 * @return string
 */
function wpdev_remove_empty_p($content): ?string {

	$content = preg_replace(array(
		'#<p>\s*<(div|aside|section|article|header|footer)#',
		'#</(div|aside|section|article|header|footer)>\s*</p>#',
		'#</(div|aside|section|article|header|footer)>\s*<br ?/?>#',
		'#<(div|aside|section|article|header|footer)(.*?)>\s*</p>#',
		'#<p>\s*</(div|aside|section|article|header|footer)#',
	), array(
		'<$1',
		'</$1>',
		'</$1>',
		'<$1$2>',
		'</$1',
	), $content);

	return preg_replace('#<p>(\s|&nbsp;)*+(<br\s*/*>)*(\s|&nbsp;)*</p>#i', '', $content);

} // end wpdev_remove_empty_p;
/**
 * Generates a string containing html attributes to be used inside html tags.
 *
 * This function takes an array of attributes => value and returns
 * a string of concatenated html attributes ready to be echoed inside
 * a HTML element.
 *
 * Example input:
 * array(
 *   'id'    => 'my-element-id',
 *   'class' => 'my-class my-class-2',
 * );
 *
 * Output: id="my-element-id" class="my-class my-class-2"
 *
 * @since 2.0.7
 *
 * @param array $attributes The list of attributes.
 */
function wpdev_array_to_html_attrs($attributes = array()): string {

	$attributes = array_map(fn($key, $value) => $key . '="' . htmlspecialchars((string) $value) . '"', array_keys($attributes), $attributes);

	return implode(' ', $attributes);

} // end wpdev_array_to_html_attrs;

/**
 * Adds a tooltip icon.
 *
 * @since 2.0.0
 *
 * @param string $tooltip Message to display.
 * @param string $icon Dashicon to display as the icon.
 * @return string
 */
function wpdev_tooltip($tooltip, $icon = 'dashicons-editor-help') {

	if (empty($tooltip)) {

		return '';

	} // end if;

	$markup = sprintf('<span class="wpdev-styling" role="tooltip" aria-label="%s">', esc_attr($tooltip));

	if (!is_admin()) {

		$markup .= '<svg style="width:11px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 122.88 122.88" xml:space="preserve"><g><path class="st0" d="M122.88,61.44C122.88,27.51,95.37,0,61.44,0C27.51,0,0,27.51,0,61.44c0,33.93,27.51,61.44,61.44,61.44 C95.37,122.88,122.88,95.37,122.88,61.44L122.88,61.44z M68.79,74.58H51.3v-1.75c0-2.97,0.32-5.39,1-7.25 c0.68-1.87,1.68-3.55,3.01-5.1c1.34-1.54,4.35-4.23,9.01-8.11c2.48-2.03,3.73-3.88,3.73-5.56c0-1.71-0.51-3.01-1.5-3.95 c-1-0.93-2.51-1.4-4.54-1.4c-2.19,0-3.98,0.73-5.4,2.16c-1.43,1.44-2.34,3.97-2.74,7.56l-17.88-2.22c0.61-6.57,3-11.86,7.15-15.85 c4.17-4.02,10.55-6.01,19.14-6.01c6.7,0,12.1,1.4,16.21,4.19c5.6,3.78,8.38,8.82,8.38,15.1c0,2.62-0.73,5.14-2.16,7.56 c-1.44,2.44-4.39,5.39-8.85,8.88c-3.09,2.48-5.05,4.44-5.86,5.93C69.19,70.24,68.79,72.19,68.79,74.58L68.79,74.58z M50.68,79.25 h18.76v16.53H50.68V79.25L50.68,79.25z"></path></g></svg>';

	} else {

		$markup .= sprintf('<span class="dashicons wpdev-text-xs wpdev-w-auto wpdev-h-auto wpdev-align-text-bottom %s"></span>', esc_attr($icon));

	} // end if;

	$markup .= '</span>';

	return $markup;

} // end wpdev_tooltip;
/**
 * Adds a tooltip to a HTML element. Needs to be echo'ed.
 *
 * @since 2.0.0
 *
 * @param string $tooltip Message to display.
 */
function wpdev_tooltip_text($tooltip): string {

	return sprintf('role="tooltip" aria-label="%s"', esc_attr($tooltip));

} // end wpdev_tooltip_text;
/**
 * Adds a preview tag that displays the image passed on hover.
 *
 * @since 2.0.0
 *
 * @param string  $image_url The image URL.
 * @param boolean $label The label for the preview tag. Defaults to Preview.
 */
function wpdev_preview_image($image_url, $label = false): string {

	if (empty($label)) {

		$label = __('Preview', 'wpdev');

	} // end if;

	return sprintf(' <span class="wpdev-image-preview wpdev-text-gray-600 wpdev-bg-gray-200 wpdev-p-1 wpdev-px-2 wpdev-ml-1 wpdev-inline-block wpdev-text-2xs wpdev-uppercase wpdev-font-bold wpdev-rounded wpdev-cursor-pointer wpdev-border-gray-300 wpdev-border wpdev-border-solid" data-image="%s">%s %s</span>', $image_url, "<span class='dashicons-wpdev-image wpdev-align-middle wpdev-mr-1'></span>", $label);

} // end wpdev_preview_image;

/**
 * Returns the list of available icons. To add more icons you need use the filter
 * wpdev_icons_list, and new array using the Key as the optgroup label and the value
 * as the array with all the icons you want to make available.
 *
 * Don't forget to add the css as well.
 *
 * @since 2.0.0
 *
 * @return array With all available icons.
 */
function wpdev_get_icons_list() {

	$all_icons = array();

	$all_icons['WPDev Icons'] = array(
		'dashicons-wpdev-add_task',
		'dashicons-wpdev-address',
		'dashicons-wpdev-add-to-list',
		'dashicons-wpdev-add-user',
		'dashicons-wpdev-adjust',
		'dashicons-wpdev-air',
		'dashicons-wpdev-aircraft',
		'dashicons-wpdev-aircraft-landing',
		'dashicons-wpdev-aircraft-take-off',
		'dashicons-wpdev-align-bottom',
		'dashicons-wpdev-align-horizontal-middle',
		'dashicons-wpdev-align-left',
		'dashicons-wpdev-align-right',
		'dashicons-wpdev-align-top',
		'dashicons-wpdev-align-vertical-middle',
		'dashicons-wpdev-archive',
		'dashicons-wpdev-area-graph',
		'dashicons-wpdev-arrow-bold-down',
		'dashicons-wpdev-arrow-bold-left',
		'dashicons-wpdev-arrow-bold-right',
		'dashicons-wpdev-arrow-bold-up',
		'dashicons-wpdev-arrow-down',
		'dashicons-wpdev-arrow-left',
		'dashicons-wpdev-arrow-long-down',
		'dashicons-wpdev-arrow-long-left',
		'dashicons-wpdev-arrow-long-right',
		'dashicons-wpdev-arrow-long-up',
		'dashicons-wpdev-arrow-right',
		'dashicons-wpdev-arrow-up',
		'dashicons-wpdev-arrow-with-circle-down',
		'dashicons-wpdev-arrow-with-circle-left',
		'dashicons-wpdev-arrow-with-circle-right',
		'dashicons-wpdev-arrow-with-circle-up',
		'dashicons-wpdev-attachment',
		'dashicons-wpdev-awareness-ribbon',
		'dashicons-wpdev-back',
		'dashicons-wpdev-back-in-time',
		'dashicons-wpdev-bar-graph',
		'dashicons-wpdev-battery',
		'dashicons-wpdev-beamed-note',
		'dashicons-wpdev-bell',
		'dashicons-wpdev-blackboard',
		'dashicons-wpdev-block',
		'dashicons-wpdev-book',
		'dashicons-wpdev-bookmark',
		'dashicons-wpdev-bookmarks',
		'dashicons-wpdev-bowl',
		'dashicons-wpdev-box',
		'dashicons-wpdev-briefcase',
		'dashicons-wpdev-browser',
		'dashicons-wpdev-brush',
		'dashicons-wpdev-bucket',
		'dashicons-wpdev-cake',
		'dashicons-wpdev-calculator',
		'dashicons-wpdev-calendar',
		'dashicons-wpdev-camera',
		'dashicons-wpdev-ccw',
		'dashicons-wpdev-chat',
		'dashicons-wpdev-check',
		'dashicons-wpdev-checkbox-checked',
		'dashicons-wpdev-checkbox-unchecked',
		'dashicons-wpdev-chevron-down',
		'dashicons-wpdev-chevron-left',
		'dashicons-wpdev-chevron-right',
		'dashicons-wpdev-chevron-small-down',
		'dashicons-wpdev-chevron-small-left',
		'dashicons-wpdev-chevron-small-right',
		'dashicons-wpdev-chevron-small-up',
		'dashicons-wpdev-chevron-thin-down',
		'dashicons-wpdev-chevron-thin-left',
		'dashicons-wpdev-chevron-thin-right',
		'dashicons-wpdev-chevron-thin-up',
		'dashicons-wpdev-chevron-up',
		'dashicons-wpdev-chevron-with-circle-down',
		'dashicons-wpdev-chevron-with-circle-left',
		'dashicons-wpdev-chevron-with-circle-right',
		'dashicons-wpdev-chevron-with-circle-up',
		'dashicons-wpdev-circle',
		'dashicons-wpdev-circle-with-cross',
		'dashicons-wpdev-circle-with-minus',
		'dashicons-wpdev-circle-with-plus',
		'dashicons-wpdev-circular-graph',
		'dashicons-wpdev-clapperboard',
		'dashicons-wpdev-classic-computer',
		'dashicons-wpdev-clipboard',
		'dashicons-wpdev-clock',
		'dashicons-wpdev-cloud',
		'dashicons-wpdev-code',
		'dashicons-wpdev-cog',
		'dashicons-wpdev-coin-dollar',
		'dashicons-wpdev-coin-euro',
		'dashicons-wpdev-coin-pound',
		'dashicons-wpdev-coin-yen',
		'dashicons-wpdev-colours',
		'dashicons-wpdev-compass',
		'dashicons-wpdev-controller-fast-forward',
		'dashicons-wpdev-controller-jump-to-start',
		'dashicons-wpdev-controller-next',
		'dashicons-wpdev-controller-paus',
		'dashicons-wpdev-controller-play',
		'dashicons-wpdev-controller-record',
		'dashicons-wpdev-controller-stop',
		'dashicons-wpdev-controller-volume',
		'dashicons-wpdev-copy',
		'dashicons-wpdev-credit',
		'dashicons-wpdev-credit-card',
		'dashicons-wpdev-credit-card1',
		'dashicons-wpdev-cross',
		'dashicons-wpdev-cup',
		'dashicons-wpdev-cw',
		'dashicons-wpdev-cycle',
		'dashicons-wpdev-database',
		'dashicons-wpdev-dial-pad',
		'dashicons-wpdev-direction',
		'dashicons-wpdev-document',
		'dashicons-wpdev-document-landscape',
		'dashicons-wpdev-documents',
		'dashicons-wpdev-done',
		'dashicons-wpdev-done_all',
		'dashicons-wpdev-dot-single',
		'dashicons-wpdev-dots-three-horizontal',
		'dashicons-wpdev-dots-three-vertical',
		'dashicons-wpdev-dots-two-horizontal',
		'dashicons-wpdev-dots-two-vertical',
		'dashicons-wpdev-download',
		'dashicons-wpdev-drink',
		'dashicons-wpdev-drive',
		'dashicons-wpdev-drop',
		'dashicons-wpdev-edit',
		'dashicons-wpdev-email',
		'dashicons-wpdev-emoji-flirt',
		'dashicons-wpdev-emoji-happy',
		'dashicons-wpdev-emoji-neutral',
		'dashicons-wpdev-emoji-sad',
		'dashicons-wpdev-erase',
		'dashicons-wpdev-eraser',
		'dashicons-wpdev-export',
		'dashicons-wpdev-eye',
		'dashicons-wpdev-feather',
		'dashicons-wpdev-filter_1',
		'dashicons-wpdev-filter_2',
		'dashicons-wpdev-filter_3',
		'dashicons-wpdev-filter_4',
		'dashicons-wpdev-filter_5',
		'dashicons-wpdev-filter_6',
		'dashicons-wpdev-filter_7',
		'dashicons-wpdev-filter_8',
		'dashicons-wpdev-filter_9',
		'dashicons-wpdev-filter_9_plus',
		'dashicons-wpdev-flag',
		'dashicons-wpdev-flash',
		'dashicons-wpdev-flashlight',
		'dashicons-wpdev-flat-brush',
		'dashicons-wpdev-flow-branch',
		'dashicons-wpdev-flow-cascade',
		'dashicons-wpdev-flow-line',
		'dashicons-wpdev-flow-parallel',
		'dashicons-wpdev-flow-tree',
		'dashicons-wpdev-folder',
		'dashicons-wpdev-folder-images',
		'dashicons-wpdev-folder-music',
		'dashicons-wpdev-folder-video',
		'dashicons-wpdev-forward',
		'dashicons-wpdev-funnel',
		'dashicons-wpdev-game-controller',
		'dashicons-wpdev-gauge',
		'dashicons-wpdev-globe',
		'dashicons-wpdev-graduation-cap',
		'dashicons-wpdev-grid',
		'dashicons-wpdev-hair-cross',
		'dashicons-wpdev-hand',
		'dashicons-wpdev-hash',
		'dashicons-wpdev-hashtag',
		'dashicons-wpdev-heart',
		'dashicons-wpdev-heart-outlined',
		'dashicons-wpdev-help',
		'dashicons-wpdev-help-with-circle',
		'dashicons-wpdev-home',
		'dashicons-wpdev-hour-glass',
		'dashicons-wpdev-image',
		'dashicons-wpdev-image-inverted',
		'dashicons-wpdev-images',
		'dashicons-wpdev-inbox',
		'dashicons-wpdev-infinity',
		'dashicons-wpdev-info',
		'dashicons-wpdev-info-with-circle',
		'dashicons-wpdev-install',
		'dashicons-wpdev-key',
		'dashicons-wpdev-keyboard',
		'dashicons-wpdev-lab-flask',
		'dashicons-wpdev-landline',
		'dashicons-wpdev-language',
		'dashicons-wpdev-laptop',
		'dashicons-wpdev-layers',
		'dashicons-wpdev-leaf',
		'dashicons-wpdev-level-down',
		'dashicons-wpdev-level-up',
		'dashicons-wpdev-lifebuoy',
		'dashicons-wpdev-light-bulb',
		'dashicons-wpdev-light-down',
		'dashicons-wpdev-light-up',
		'dashicons-wpdev-line-graph',
		'dashicons-wpdev-link',
		'dashicons-wpdev-list',
		'dashicons-wpdev-location',
		'dashicons-wpdev-location-pin',
		'dashicons-wpdev-lock',
		'dashicons-wpdev-lock-open',
		'dashicons-wpdev-login',
		'dashicons-wpdev-log-out',
		'dashicons-wpdev-loop',
		'dashicons-wpdev-magnet',
		'dashicons-wpdev-magnifying-glass',
		'dashicons-wpdev-mail',
		'dashicons-wpdev-man',
		'dashicons-wpdev-map',
		'dashicons-wpdev-mask',
		'dashicons-wpdev-medal',
		'dashicons-wpdev-megaphone',
		'dashicons-wpdev-menu',
		'dashicons-wpdev-message',
		'dashicons-wpdev-mic',
		'dashicons-wpdev-minus',
		'dashicons-wpdev-mobile',
		'dashicons-wpdev-modern-mic',
		'dashicons-wpdev-moon',
		'dashicons-wpdev-mouse',
		'dashicons-wpdev-music',
		'dashicons-wpdev-new',
		'dashicons-wpdev-new-message',
		'dashicons-wpdev-news',
		'dashicons-wpdev-note',
		'dashicons-wpdev-notification',
		'dashicons-wpdev-number',
		'dashicons-wpdev-old-mobile',
		'dashicons-wpdev-old-phone',
		'dashicons-wpdev-open-book',
		'dashicons-wpdev-palette',
		'dashicons-wpdev-paper-plane',
		'dashicons-wpdev-pencil',
		'dashicons-wpdev-pencil2',
		'dashicons-wpdev-phone',
		'dashicons-wpdev-pie-chart',
		'dashicons-wpdev-pin',
		'dashicons-wpdev-plus',
		'dashicons-wpdev-popup',
		'dashicons-wpdev-power-cord',
		'dashicons-wpdev-power-plug',
		'dashicons-wpdev-price-ribbon',
		'dashicons-wpdev-price-tag',
		'dashicons-wpdev-print',
		'dashicons-wpdev-progress-empty',
		'dashicons-wpdev-progress-full',
		'dashicons-wpdev-progress-one',
		'dashicons-wpdev-progress-two',
		'dashicons-wpdev-publish',
		'dashicons-wpdev-qrcode',
		'dashicons-wpdev-quote',
		'dashicons-wpdev-radio',
		'dashicons-wpdev-remove-user',
		'dashicons-wpdev-reply',
		'dashicons-wpdev-reply-all',
		'dashicons-wpdev-resize-100',
		'dashicons-wpdev-resize-full-screen',
		'dashicons-wpdev-retweet',
		'dashicons-wpdev-rocket',
		'dashicons-wpdev-round-brush',
		'dashicons-wpdev-rss',
		'dashicons-wpdev-ruler',
		'dashicons-wpdev-save',
		'dashicons-wpdev-scissors',
		'dashicons-wpdev-select-arrows',
		'dashicons-wpdev-share',
		'dashicons-wpdev-shareable',
		'dashicons-wpdev-share-alternitive',
		'dashicons-wpdev-shield',
		'dashicons-wpdev-shop',
		'dashicons-wpdev-shopping-bag',
		'dashicons-wpdev-shopping-basket',
		'dashicons-wpdev-shopping-cart',
		'dashicons-wpdev-shuffle',
		'dashicons-wpdev-signal',
		'dashicons-wpdev-sound',
		'dashicons-wpdev-sound-mix',
		'dashicons-wpdev-sound-mute',
		'dashicons-wpdev-sports-club',
		'dashicons-wpdev-spreadsheet',
		'dashicons-wpdev-squared-cross',
		'dashicons-wpdev-squared-minus',
		'dashicons-wpdev-squared-plus',
		'dashicons-wpdev-star',
		'dashicons-wpdev-star-outlined',
		'dashicons-wpdev-stopwatch',
		'dashicons-wpdev-suitcase',
		'dashicons-wpdev-swap',
		'dashicons-wpdev-sweden',
		'dashicons-wpdev-switch',
		'dashicons-wpdev-tablet',
		'dashicons-wpdev-tag',
		'dashicons-wpdev-text',
		'dashicons-wpdev-text-document',
		'dashicons-wpdev-text-document-inverted',
		'dashicons-wpdev-thermometer',
		'dashicons-wpdev-thumbs-down',
		'dashicons-wpdev-thumbs-up',
		'dashicons-wpdev-thunder-cloud',
		'dashicons-wpdev-ticket',
		'dashicons-wpdev-ticket1',
		'dashicons-wpdev-time-slot',
		'dashicons-wpdev-toggle_on',
		'dashicons-wpdev-tools',
		'dashicons-wpdev-traffic-cone',
		'dashicons-wpdev-trash',
		'dashicons-wpdev-tree',
		'dashicons-wpdev-triangle-down',
		'dashicons-wpdev-triangle-left',
		'dashicons-wpdev-triangle-right',
		'dashicons-wpdev-triangle-up',
		'dashicons-wpdev-trophy',
		'dashicons-wpdev-tv',
		'dashicons-wpdev-typing',
		'dashicons-wpdev-uninstall',
		'dashicons-wpdev-unread',
		'dashicons-wpdev-untag',
		'dashicons-wpdev-upload',
		'dashicons-wpdev-upload-to-cloud',
		'dashicons-wpdev-user',
		'dashicons-wpdev-users',
		'dashicons-wpdev-v-card',
		'dashicons-wpdev-verified',
		'dashicons-wpdev-video',
		'dashicons-wpdev-vinyl',
		'dashicons-wpdev-voicemail',
		'dashicons-wpdev-wallet',
		'dashicons-wpdev-warning',
		'dashicons-wpdev-wpdev'
	);

	$all_icons['Dashicons'] = array(
		'dashicons-before dashicons-admin-appearance',
		'dashicons-before dashicons-admin-collapse',
		'dashicons-before dashicons-admin-comments',
		'dashicons-before dashicons-admin-customizer',
		'dashicons-before dashicons-admin-generic',
		'dashicons-before dashicons-admin-home',
		'dashicons-before dashicons-admin-links',
		'dashicons-before dashicons-admin-media',
		'dashicons-before dashicons-admin-multisite',
		'dashicons-before dashicons-admin-network',
		'dashicons-before dashicons-admin-page',
		'dashicons-before dashicons-admin-plugins',
		'dashicons-before dashicons-admin-post',
		'dashicons-before dashicons-admin-settings',
		// 'dashicons-before dashicons-admin-site-alt',
		// 'dashicons-before dashicons-admin-site-alt2',
		// 'dashicons-before dashicons-admin-site-alt3',
		'dashicons-before dashicons-admin-site',
		'dashicons-before dashicons-admin-tools',
		'dashicons-before dashicons-admin-users',
		'dashicons-before dashicons-album',
		'dashicons-before dashicons-align-center',
		'dashicons-before dashicons-align-left',
		'dashicons-before dashicons-align-none',
		'dashicons-before dashicons-align-right',
		'dashicons-before dashicons-analytics',
		'dashicons-before dashicons-archive',
		'dashicons-before dashicons-arrow-down-alt',
		'dashicons-before dashicons-arrow-down-alt2',
		'dashicons-before dashicons-arrow-down',
		'dashicons-before dashicons-arrow-left-alt',
		'dashicons-before dashicons-arrow-left-alt2',
		'dashicons-before dashicons-arrow-left',
		'dashicons-before dashicons-arrow-right-alt',
		'dashicons-before dashicons-arrow-right-alt2',
		'dashicons-before dashicons-arrow-right',
		'dashicons-before dashicons-arrow-up-alt',
		'dashicons-before dashicons-arrow-up-alt2',
		'dashicons-before dashicons-arrow-up',
		'dashicons-before dashicons-art',
		'dashicons-before dashicons-awards',
		'dashicons-before dashicons-backup',
		'dashicons-before dashicons-book-alt',
		'dashicons-before dashicons-book',
		'dashicons-before dashicons-buddicons-activity',
		'dashicons-before dashicons-buddicons-bbpress-logo',
		'dashicons-before dashicons-buddicons-buddypress-logo',
		'dashicons-before dashicons-buddicons-community',
		'dashicons-before dashicons-buddicons-forums',
		'dashicons-before dashicons-buddicons-friends',
		'dashicons-before dashicons-buddicons-groups',
		'dashicons-before dashicons-buddicons-pm',
		'dashicons-before dashicons-buddicons-replies',
		'dashicons-before dashicons-buddicons-topics',
		'dashicons-before dashicons-buddicons-tracking',
		'dashicons-before dashicons-building',
		'dashicons-before dashicons-businessman',
		'dashicons-before dashicons-calendar-alt',
		'dashicons-before dashicons-calendar',
		'dashicons-before dashicons-camera',
		'dashicons-before dashicons-carrot',
		'dashicons-before dashicons-cart',
		'dashicons-before dashicons-category',
		'dashicons-before dashicons-chart-area',
		'dashicons-before dashicons-chart-bar',
		'dashicons-before dashicons-chart-line',
		'dashicons-before dashicons-chart-pie',
		'dashicons-before dashicons-clipboard',
		'dashicons-before dashicons-clock',
		'dashicons-before dashicons-cloud',
		'dashicons-before dashicons-controls-back',
		'dashicons-before dashicons-controls-forward',
		'dashicons-before dashicons-controls-pause',
		'dashicons-before dashicons-controls-play',
		'dashicons-before dashicons-controls-repeat',
		'dashicons-before dashicons-controls-skipback',
		'dashicons-before dashicons-controls-skipforward',
		'dashicons-before dashicons-controls-volumeoff',
		'dashicons-before dashicons-controls-volumeon',
		'dashicons-before dashicons-dashboard',
		'dashicons-before dashicons-desktop',
		'dashicons-before dashicons-dismiss',
		'dashicons-before dashicons-download',
		'dashicons-before dashicons-edit',
		'dashicons-before dashicons-editor-aligncenter',
		'dashicons-before dashicons-editor-alignleft',
		'dashicons-before dashicons-editor-alignright',
		'dashicons-before dashicons-editor-bold',
		'dashicons-before dashicons-editor-break',
		'dashicons-before dashicons-editor-code',
		'dashicons-before dashicons-editor-contract',
		'dashicons-before dashicons-editor-customchar',
		'dashicons-before dashicons-editor-expand',
		'dashicons-before dashicons-editor-help',
		'dashicons-before dashicons-editor-indent',
		'dashicons-before dashicons-editor-insertmore',
		'dashicons-before dashicons-editor-italic',
		'dashicons-before dashicons-editor-justify',
		'dashicons-before dashicons-editor-kitchensink',
		'dashicons-before dashicons-editor-ltr',
		'dashicons-before dashicons-editor-ol',
		'dashicons-before dashicons-editor-outdent',
		'dashicons-before dashicons-editor-paragraph',
		'dashicons-before dashicons-editor-paste-text',
		'dashicons-before dashicons-editor-paste-word',
		'dashicons-before dashicons-editor-quote',
		'dashicons-before dashicons-editor-removeformatting',
		'dashicons-before dashicons-editor-rtl',
		'dashicons-before dashicons-editor-spellcheck',
		'dashicons-before dashicons-editor-strikethrough',
		'dashicons-before dashicons-editor-table',
		'dashicons-before dashicons-editor-textcolor',
		'dashicons-before dashicons-editor-ul',
		'dashicons-before dashicons-editor-underline',
		'dashicons-before dashicons-editor-unlink',
		'dashicons-before dashicons-editor-video',
		'dashicons-before dashicons-email-alt',
		// 'dashicons-before dashicons-email-alt2',
		'dashicons-before dashicons-email',
		'dashicons-before dashicons-excerpt-view',
		'dashicons-before dashicons-external',
		'dashicons-before dashicons-facebook-alt',
		'dashicons-before dashicons-facebook',
		'dashicons-before dashicons-feedback',
		'dashicons-before dashicons-filter',
		'dashicons-before dashicons-flag',
		'dashicons-before dashicons-format-aside',
		'dashicons-before dashicons-format-audio',
		'dashicons-before dashicons-format-chat',
		'dashicons-before dashicons-format-gallery',
		'dashicons-before dashicons-format-image',
		'dashicons-before dashicons-format-quote',
		'dashicons-before dashicons-format-status',
		'dashicons-before dashicons-format-video',
		'dashicons-before dashicons-forms',
		'dashicons-before dashicons-googleplus',
		'dashicons-before dashicons-grid-view',
		'dashicons-before dashicons-groups',
		'dashicons-before dashicons-hammer',
		'dashicons-before dashicons-heart',
		'dashicons-before dashicons-hidden',
		'dashicons-before dashicons-id-alt',
		'dashicons-before dashicons-id',
		'dashicons-before dashicons-image-crop',
		'dashicons-before dashicons-image-filter',
		'dashicons-before dashicons-image-flip-horizontal',
		'dashicons-before dashicons-image-flip-vertical',
		'dashicons-before dashicons-image-rotate-left',
		'dashicons-before dashicons-image-rotate-right',
		'dashicons-before dashicons-image-rotate',
		'dashicons-before dashicons-images-alt',
		'dashicons-before dashicons-images-alt2',
		'dashicons-before dashicons-index-card',
		'dashicons-before dashicons-info',
		'dashicons-before dashicons-laptop',
		'dashicons-before dashicons-layout',
		'dashicons-before dashicons-leftright',
		'dashicons-before dashicons-lightbulb',
		'dashicons-before dashicons-list-view',
		'dashicons-before dashicons-location-alt',
		'dashicons-before dashicons-location',
		'dashicons-before dashicons-lock',
		'dashicons-before dashicons-marker',
		'dashicons-before dashicons-media-archive',
		'dashicons-before dashicons-media-audio',
		'dashicons-before dashicons-media-code',
		'dashicons-before dashicons-media-default',
		'dashicons-before dashicons-media-document',
		'dashicons-before dashicons-media-interactive',
		'dashicons-before dashicons-media-spreadsheet',
		'dashicons-before dashicons-media-text',
		'dashicons-before dashicons-media-video',
		'dashicons-before dashicons-megaphone',
		// 'dashicons-before dashicons-menu-alt',
		'dashicons-before dashicons-menu',
		'dashicons-before dashicons-microphone',
		'dashicons-before dashicons-migrate',
		'dashicons-before dashicons-minus',
		'dashicons-before dashicons-money',
		'dashicons-before dashicons-move',
		'dashicons-before dashicons-nametag',
		'dashicons-before dashicons-networking',
		'dashicons-before dashicons-no-alt',
		'dashicons-before dashicons-no',
		'dashicons-before dashicons-palmtree',
		'dashicons-before dashicons-paperclip',
		'dashicons-before dashicons-performance',
		'dashicons-before dashicons-phone',
		'dashicons-before dashicons-playlist-audio',
		'dashicons-before dashicons-playlist-video',
		'dashicons-before dashicons-plus-alt',
		'dashicons-before dashicons-plus-light',
		'dashicons-before dashicons-plus',
		'dashicons-before dashicons-portfolio',
		'dashicons-before dashicons-post-status',
		'dashicons-before dashicons-pressthis',
		'dashicons-before dashicons-products',
		'dashicons-before dashicons-randomize',
		'dashicons-before dashicons-redo',
		// 'dashicons-before dashicons-rest-api',
		'dashicons-before dashicons-rss',
		'dashicons-before dashicons-schedule',
		'dashicons-before dashicons-screenoptions',
		'dashicons-before dashicons-search',
		'dashicons-before dashicons-share-alt',
		'dashicons-before dashicons-share-alt2',
		'dashicons-before dashicons-share',
		'dashicons-before dashicons-shield-alt',
		'dashicons-before dashicons-shield',
		'dashicons-before dashicons-slides',
		'dashicons-before dashicons-smartphone',
		'dashicons-before dashicons-smiley',
		'dashicons-before dashicons-sort',
		'dashicons-before dashicons-sos',
		'dashicons-before dashicons-star-empty',
		'dashicons-before dashicons-star-filled',
		'dashicons-before dashicons-star-half',
		'dashicons-before dashicons-sticky',
		'dashicons-before dashicons-store',
		'dashicons-before dashicons-tablet',
		'dashicons-before dashicons-tag',
		'dashicons-before dashicons-tagcloud',
		'dashicons-before dashicons-testimonial',
		'dashicons-before dashicons-text',
		'dashicons-before dashicons-thumbs-down',
		'dashicons-before dashicons-thumbs-up',
		'dashicons-before dashicons-tickets-alt',
		'dashicons-before dashicons-tickets',
		// 'dashicons-before dashicons-tide',
		'dashicons-before dashicons-translation',
		'dashicons-before dashicons-trash',
		'dashicons-before dashicons-twitter',
		'dashicons-before dashicons-undo',
		'dashicons-before dashicons-universal-access-alt',
		'dashicons-before dashicons-universal-access',
		'dashicons-before dashicons-unlock',
		'dashicons-before dashicons-update',
		'dashicons-before dashicons-upload',
		'dashicons-before dashicons-vault',
		'dashicons-before dashicons-video-alt',
		'dashicons-before dashicons-video-alt2',
		'dashicons-before dashicons-video-alt3',
		'dashicons-before dashicons-visibility',
		'dashicons-before dashicons-warning',
		'dashicons-before dashicons-welcome-add-page',
		'dashicons-before dashicons-welcome-comments',
		'dashicons-before dashicons-welcome-learn-more',
		'dashicons-before dashicons-welcome-view-site',
		'dashicons-before dashicons-welcome-widgets-menus',
		'dashicons-before dashicons-welcome-write-blog',
		'dashicons-before dashicons-wordpress-alt',
		'dashicons-before dashicons-wordpress',
		'dashicons-before dashicons-yes-alt',
		'dashicons-before dashicons-yes',
	);

	return apply_filters('wpdev_icons_list', $all_icons);

} // end wpdev_get_icons_list;

/**
 * Checks if the current theme is a block theme.
 *
 * @since 2.0.11
 * @return boolean
 */
function wpdev_is_block_theme() {

	if (function_exists('wp_is_block_theme')) {

		return wp_is_block_theme();

	} // end if;

	return false;

} // end wpdev_is_block_theme;

/**
 * Returns the HTML markup of an empty state page.
 *
 * Shared core helper consumed by list tables (table-builder), dashboard tabs,
 * and customer-panel elements. Lives in core so dependency-free modules can use
 * it without depending on admin-page-builder or table-builder.
 *
 * @since 2.0.0
 *
 * @param array $args List of the page arguments.
 * @return string
 */
function wpdev_render_empty_state($args = array()) {

	$args = wp_parse_args($args, array(
		'message'                  => __('This is not yet available...'),
		'sub_message'              => __('We\'re still working on this part of the product.'),
		'link_label'               => __('&larr; Go Back', 'wpdev'),
		'link_url'                 => 'javascript:history.go(-1)',
		'link_classes'             => '',
		'link_icon'                => '',
		'display_background_image' => true,
	));

	return wpdev_get_template_contents('base/empty-state', $args);

} // end wpdev_render_empty_state;
