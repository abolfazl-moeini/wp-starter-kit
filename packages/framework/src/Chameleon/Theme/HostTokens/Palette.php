<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\HostTokens;

/**
 * Palette: OKLab / OKLCH color calculations, WCAG 2.1 contrast calculation,
 * and functional action color ramp generation in pure PHP (Plan 2 §1.4).
 */
final class Palette {
    /**
     * Compute WCAG 2.1 contrast ratio between two hex colors.
     *
     * @param string $hex1 e.g. '#ffffff'
     * @param string $hex2 e.g. '#0e5f63'
     * @return float Contrast ratio (e.g. 4.5 to 21.0)
     */
    public static function contrast_ratio(string $hex1, string $hex2): float {
        $rgb1 = self::hex_to_rgb($hex1);
        $rgb2 = self::hex_to_rgb($hex2);

        $l1 = self::relative_luminance($rgb1);
        $l2 = self::relative_luminance($rgb2);

        $lighter = max($l1, $l2);
        $darker  = min($l1, $l2);

        return ($lighter + 0.05) / ($darker + 0.05);
    }

    /**
     * Determine optimal foreground text color (either #ffffff or #111111) for a background.
     *
     * @param string $bgHex Background color hex
     * @return string '#ffffff' or '#111111'
     */
    public static function optimal_on_color(string $bgHex): string {
        $contrastWhite = self::contrast_ratio($bgHex, '#ffffff');
        $contrastDark  = self::contrast_ratio($bgHex, '#111111');

        return ($contrastWhite >= $contrastDark) ? '#ffffff' : '#111111';
    }

    /**
     * Ensure primary functional color satisfies white text contrast requirement (≥ 4.5:1).
     * If white text has < 4.5 contrast against $hex, darkens L in OKLCH until contrast ≥ 4.5.
     *
     * @param string $hex Original primary color hex
     * @return string Adjusted hex (or original if already compliant)
     */
    public static function ensure_accessible_primary(string $hex): string {
        $contrast = self::contrast_ratio($hex, '#ffffff');
        if ($contrast >= 4.5) {
            return strtolower($hex);
        }

        $oklch = self::hex_to_oklch($hex);
        $l = $oklch['L'];
        $c = $oklch['C'];
        $h = $oklch['h'];

        // Step down L by 0.02 until contrast reaches 4.5 or minimum reached
        while ($l > 0.1) {
            $l -= 0.02;
            $candidateHex = self::oklch_to_hex($l, $c, $h);
            if (self::contrast_ratio($candidateHex, '#ffffff') >= 4.5) {
                return $candidateHex;
            }
        }

        return self::oklch_to_hex($l, $c, $h);
    }

    /**
     * Generate complete functional palette ramp for a primary color.
     *
     * @param string $primaryHex
     * @return array<string, string>
     */
    public static function generate_ramp(string $primaryHex): array {
        $cleanPrimary = Sanitizer::sanitize_color($primaryHex) ?? '#0e5f63';
        $onPrimary = self::optimal_on_color($cleanPrimary);

        $oklch = self::hex_to_oklch($cleanPrimary);
        $l = $oklch['L'];
        $c = $oklch['C'];
        $h = $oklch['h'];

        $hover = self::oklch_to_hex(max(0.0, $l - 0.06), $c, $h);
        $active = self::oklch_to_hex(max(0.0, $l - 0.12), $c, $h);
        $soft = self::oklch_to_hex(0.95, $c * 0.3, $h);
        $border = self::oklch_to_hex(0.85, $c * 0.25, $h);

        return [
            'primary'       => $cleanPrimary,
            'onPrimary'     => $onPrimary,
            'primaryHover'  => $hover,
            'primaryActive' => $active,
            'soft'          => $soft,
            'border'        => $border,
        ];
    }

    // --- Color Space Mathematics (Björn Ottosson OKLab reference) ---

    public static function hex_to_rgb(string $hex): array {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $r = hexdec(str_repeat(substr($hex, 0, 1), 2));
            $g = hexdec(str_repeat(substr($hex, 1, 1), 2));
            $b = hexdec(str_repeat(substr($hex, 2, 1), 2));
        } else {
            $r = hexdec(substr($hex, 0, 2));
            $g = hexdec(substr($hex, 2, 2));
            $b = hexdec(substr($hex, 4, 2));
        }
        return [(float) $r, (float) $g, (float) $b];
    }

    public static function rgb_to_hex(float $r, float $g, float $b): string {
        $rClamped = (int) round(max(0.0, min(255.0, $r)));
        $gClamped = (int) round(max(0.0, min(255.0, $g)));
        $bClamped = (int) round(max(0.0, min(255.0, $b)));
        return sprintf('#%02x%02x%02x', $rClamped, $gClamped, $bClamped);
    }

    public static function relative_luminance(array $rgb): float {
        $channels = array_map(function ($val) {
            $s = $val / 255.0;
            return ($s <= 0.04045) ? ($s / 12.92) : pow(($s + 0.055) / 1.055, 2.4);
        }, $rgb);

        return 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2];
    }

    public static function hex_to_oklch(string $hex): array {
        [$r, $g, $b] = self::hex_to_rgb($hex);

        // Linearize sRGB
        $rLin = ($r / 255.0 <= 0.04045) ? ($r / 255.0 / 12.92) : pow(($r / 255.0 + 0.055) / 1.055, 2.4);
        $gLin = ($g / 255.0 <= 0.04045) ? ($g / 255.0 / 12.92) : pow(($g / 255.0 + 0.055) / 1.055, 2.4);
        $bLin = ($b / 255.0 <= 0.04045) ? ($b / 255.0 / 12.92) : pow(($b / 255.0 + 0.055) / 1.055, 2.4);

        // Convert to LMS
        $l = 0.4122214708 * $rLin + 0.5363325363 * $gLin + 0.0514459929 * $bLin;
        $m = 0.2119034982 * $rLin + 0.6806995451 * $gLin + 0.1073969566 * $bLin;
        $s = 0.0883024619 * $rLin + 0.2817188376 * $gLin + 0.6299787005 * $bLin;

        $l_ = self::cbrt($l);
        $m_ = self::cbrt($m);
        $s_ = self::cbrt($s);

        // Convert to OKLab
        $L = 0.2104542553 * $l_ + 0.7936177850 * $m_ - 0.0040720468 * $s_;
        $a = 1.9779984951 * $l_ - 2.4285922050 * $m_ + 0.4505937099 * $s_;
        $b_ok = 0.0259040371 * $l_ + 0.7827717662 * $m_ - 0.8086757660 * $s_;

        // Convert to OKLCH
        $C = sqrt($a * $a + $b_ok * $b_ok);
        $hRad = atan2($b_ok, $a);
        $hDeg = rad2deg($hRad);
        if ($hDeg < 0.0) {
            $hDeg += 360.0;
        }

        return ['L' => $L, 'C' => $C, 'h' => $hDeg];
    }

    public static function oklch_to_hex(float $L, float $C, float $hDeg): string {
        $hRad = deg2rad($hDeg);
        $a = $C * cos($hRad);
        $b_ok = $C * sin($hRad);

        // Convert OKLab to LMS
        $l_ = $L + 0.3963377774 * $a + 0.2158037573 * $b_ok;
        $m_ = $L - 0.1055613458 * $a - 0.0638541728 * $b_ok;
        $s_ = $L - 0.0894841775 * $a - 1.2914855480 * $b_ok;

        $l = $l_ * $l_ * $l_;
        $m = $m_ * $m_ * $m_;
        $s = $s_ * $s_ * $s_;

        // Convert LMS to linear sRGB
        $rLin = +4.0767416621 * $l - 3.3077115913 * $m + 0.2309699292 * $s;
        $gLin = -1.2684380046 * $l + 2.6097574011 * $m - 0.3413193965 * $s;
        $bLin = -0.0041960863 * $l - 0.7034186147 * $m + 1.7076147010 * $s;

        // Gamma compression
        $r = ($rLin <= 0.0031308) ? (12.92 * $rLin) : (1.055 * pow($rLin, 1.0 / 2.4) - 0.055);
        $g = ($gLin <= 0.0031308) ? (12.92 * $gLin) : (1.055 * pow($gLin, 1.0 / 2.4) - 0.055);
        $b = ($bLin <= 0.0031308) ? (12.92 * $bLin) : (1.055 * pow($bLin, 1.0 / 2.4) - 0.055);

        return self::rgb_to_hex($r * 255.0, $g * 255.0, $b * 255.0);
    }

    private static function cbrt(float $x): float {
        return ($x >= 0.0) ? pow($x, 1.0 / 3.0) : -pow(-$x, 1.0 / 3.0);
    }
}
