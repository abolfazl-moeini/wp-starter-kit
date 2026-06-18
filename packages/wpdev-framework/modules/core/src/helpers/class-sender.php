<?php
/**
 * Handles the action o send a admin notice to a sub-site or a email.
 *
 * @package WPDev
 * @subpackage Helper
 * @since 2.0.0
 */

namespace WPDevFramework\Helpers;

use WPDevFramework\Models\Email_Template;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Handles hashing to encode ids and prevent spoofing due to auto-increments.
 *
 * @since 2.0.0
 */
class Sender {

	/**
	 * Parse attributes against the defaults.
	 *
	 * @since 2.0.0
	 *
	 * @param array $args The args passed.
	 * @return array
	 */
	public static function parse_args($args = array()) {

		$default_args = array(
			'from'        => array(
				'name'  => wpdev_get_setting('from_name'),
				'email' => wpdev_get_setting('from_email'),
			),
			'content'     => '',
			'subject'     => '',
			'bcc'         => array(),
			'payload'     => array(),
			'attachments' => array(),
			'style'       => wpdev_get_setting('email_template_type', 'html'),
		);

		$args = wp_parse_args($args, $default_args);

		return $args;

	} // end parse_args;

	/**
	 * Send an email to one or more users.
	 *
	 * @since 2.0.0
	 *
	 * @param array  $from From whom will be send this mail.
	 * @param string $to   To who this email is.
	 * @param array  $args With content, subject and other arguments, has shortcodes, mail type.
	 * @return array With the send response.
	 */
	public static function send_mail($from = array(), $to = array(), $args = array()) {

		if (!$from) {

			$from = array(
				'email' => wpdev_get_setting('from_email'),
				'name'  => wpdev_get_setting('from_name'),
			);

		} // end if;

		$args = Sender::parse_args($args);

		/*
		 * First, replace shortcodes.
		 */
		$payload = wpdev_get_isset($args, 'payload', array());

		$subject = Sender::process_shortcodes(wpdev_get_isset($args, 'subject', ''), $payload);

		$content = Sender::process_shortcodes(wpdev_get_isset($args, 'content', ''), $payload);

		/*
		 * Content type and template
		 */
		$headers = array();

		if (wpdev_get_isset($args, 'style', 'html') === 'html') {

			$headers[] = 'Content-Type: text/html; charset=UTF-8';

			$default_settings = \WPDevFramework\Admin_Pages\Email_Template_Customize_Admin_Page::get_default_settings();

			$template_settings = wpdev_get_option('email_template', $default_settings);

			$template_settings = wp_parse_args($template_settings, $default_settings);

			$template = wpdev_get_template_contents('broadcast/emails/base', array(
				'site_name'         => get_network_option(null, 'site_name'),
				'site_url'          => get_site_url(wpdev_get_main_site_id()),
				'logo_url'          => wpdev_get_network_logo(),
				'is_editor'         => false,
				'subject'           => $subject,
				'content'           => $content,
				'template_settings' => $template_settings,
			));

		} else {

			$headers[] = 'Content-Type: text/html; charset=UTF-8';

			$template = nl2br(strip_tags($content, '<p><a><br>')); // by default, set the plain email content.

		} // end if;

		$bcc = '';

		/*
		 * Build the recipients list.
		 */
		if (count($to) > 1) {

			$to = array_map(fn($item) => wpdev_format_email_string(wpdev_get_isset($item, 'email'), wpdev_get_isset($item, 'name')), $to);

			/*
			 * Decide which strategy to use, BCC or multiple "to"s.
			 *
			 * By default, we use multiple tos, but that can be changed to bcc.
			 * Depending on the SMTP solution being used, that can make a difference on the number of
			 * emails sent out.
			 */
			if (apply_filters('wpdev_sender_recipients_strategy', 'bcc') === 'bcc') {

				$main_to = $to[0];

				unset($to[0]);

				$bcc_array = array_map(function($item) {

					$email = is_array($item) ? $item['email'] : $item;

					preg_match('/<([^>]+)>/', $email, $matches);

					return !empty($matches[1]) ? $matches[1] : $email;

				}, $to);

				$bcc = implode(', ', array_filter($bcc_array));

				$headers[] = "Bcc: $bcc";

				$to = $main_to;

			} // end if;

		} else {

			$to = array(
				wpdev_format_email_string(wpdev_get_isset($to[0], 'email'), wpdev_get_isset($to[0], 'name'))
			);

		} // end if;

		/*
		 * Build From
		 */
		$from_email  = wpdev_get_isset($from, 'email', wpdev_get_setting('from_email'));
		$from_name   = wpdev_get_isset($from, 'name');
		$from_string = wpdev_format_email_string($from_email, $from_name);

		$headers[] = "From: {$from_string}";

		$attachments = $args['attachments'];

		// if (isset($args['schedule'])) {

		// wpdev_schedule_single_action($args['schedule'], 'wpdev_send_schedule_system_email', array(
		// 'to'          => $to,
		// 'subject'     => $subject,
		// 'template'    => $template,
		// 'headers'     => $headers,
		// 'attachments' => $attachments,
		// ));

		// } // end if;

		// Send the actual email
		return wp_mail($to, $subject, $template, $headers, $attachments);

	} // end send_mail;

	/**
	 * Change the shortcodes for values in the content.
	 *
	 * @since 2.0.0
	 *
	 * @param string $content   Content to be rendered.
	 * @param array  $payload   Payload with the values to render in the content.
	 * @return string
	 */
	public static function process_shortcodes($content, $payload = array()) {

		if (empty($payload)) {

			return $content;

		} // end if;

		$match = array();

		preg_match_all('/{{(.*?)}}/', $content, $match);

		$shortcodes = shortcode_atts(array_flip($match[1]), $payload);

		foreach ($shortcodes as $shortcode_key => $shortcode_value) {

			$shortcode_str = '{{' . $shortcode_key . '}}';

			$content = str_replace($shortcode_str, nl2br((string) $shortcode_value), $content);

		} // end foreach;

		return $content;

	} // end process_shortcodes;

} // end class Sender;
