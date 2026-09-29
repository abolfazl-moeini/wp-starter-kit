<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\HostTokens;

/**
 * HostTokenRecord: Immutable DTO representing an extracted host theme design token.
 * Fully compatible with PHP 7.4+ (private properties with getters, no readonly/enum).
 */
final class HostTokenRecord {
    public const ROLE_COLOR_PRIMARY   = 'color.primary';
    public const ROLE_COLOR_ON_PRIMARY = 'color.onPrimary';
    public const ROLE_COLOR_BG        = 'color.bg';
    public const ROLE_COLOR_FG        = 'color.fg';
    public const ROLE_COLOR_BORDER    = 'color.border';
    public const ROLE_FONT_BODY       = 'font.body';
    public const ROLE_FONT_HEADING    = 'font.heading';
    public const ROLE_RADIUS_CONTROL  = 'radius.control';
    public const ROLE_RADIUS_SURFACE  = 'radius.surface';

    /**
     * @var string
     */
    private $role;

    /**
     * @var string
     */
    private $value;

    /**
     * @var string
     */
    private $source;

    /**
     * @var float
     */
    private $confidence;

    /**
     * @var float|null
     */
    private $contrast;

    /**
     * @param string $role
     * @param string $value
     * @param string $source
     * @param float $confidence
     * @param float|null $contrast
     */
    public function __construct(
        string $role,
        string $value,
        string $source,
        float $confidence = 1.0,
        ?float $contrast = null
    ) {
        if (!preg_match('/^[a-zA-Z0-9_.-]+$/', $role)) {
            throw new \InvalidArgumentException(sprintf('Invalid host token role "%s": must contain only alphanumeric, dash, dot, or underscore characters.', $role));
        }
        $this->role = $role;
        $this->value = $value;
        $this->source = $source;
        $this->confidence = $confidence;
        $this->contrast = $contrast;
    }

    public function getRole(): string {
        return $this->role;
    }

    public function getValue(): string {
        return $this->value;
    }

    public function getSource(): string {
        return $this->source;
    }

    public function getConfidence(): float {
        return $this->confidence;
    }

    public function getContrast(): ?float {
        return $this->contrast;
    }

    /**
     * Map token role to standard Polaris CSS variable name.
     */
    public function getCssVariableName(): string {
        switch ($this->role) {
            case self::ROLE_COLOR_PRIMARY:
                return '--ps-color-primary';
            case self::ROLE_COLOR_ON_PRIMARY:
                return '--ps-color-primary-fg';
            case self::ROLE_COLOR_BG:
                return '--ps-color-bg';
            case self::ROLE_COLOR_FG:
                return '--ps-color-fg';
            case self::ROLE_COLOR_BORDER:
                return '--ps-color-border';
            case self::ROLE_FONT_BODY:
                return '--ps-font-body';
            case self::ROLE_FONT_HEADING:
                return '--ps-font-heading';
            case self::ROLE_RADIUS_CONTROL:
                return '--ps-radius-base';
            case self::ROLE_RADIUS_SURFACE:
                return '--ps-radius-lg';
            default:
                $sanitized_role = preg_replace('/[^a-zA-Z0-9_-]/', '-', str_replace('.', '-', $this->role));
                return '--ps-host-' . $sanitized_role;
        }
    }
}
