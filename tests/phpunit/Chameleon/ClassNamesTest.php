<?php

declare(strict_types=1);

namespace Tests\Chameleon;

use WP_UnitTestCase;
use WPDev\Chameleon\Generated\ClassNames;

class ClassNamesTest extends WP_UnitTestCase {
    public function test_core_constants(): void {
        $this->assertSame('ps-root', ClassNames::ROOT);
        $this->assertSame('ps-button', ClassNames::BUTTON);
        $this->assertSame('ps-button-solid', ClassNames::BUTTON_SOLID);
        $this->assertSame('ps-button-soft', ClassNames::BUTTON_SOFT);
        $this->assertSame('ps-button-ghost', ClassNames::BUTTON_GHOST);
        $this->assertSame('ps-card', ClassNames::CARD);
        $this->assertSame('ps-modal', ClassNames::MODAL);
        $this->assertSame('ps-modal-dialog', ClassNames::MODAL_DIALOG);
    }

    public function test_compose_valid_modifiers(): void {
        $composed = ClassNames::compose('button', ['variant' => 'solid', 'size' => 'sm']);
        $this->assertSame('ps-button ps-button-solid ps-button-sm', $composed);

        $card = ClassNames::compose('card', ['elevation' => '2']);
        $this->assertSame('ps-card ps-card-elevation-2', $card);

        $text = ClassNames::compose('text', ['size' => 'lg', 'weight' => 'bold']);
        $this->assertSame('ps-text ps-text-lg ps-text-weight-bold', $text);
    }

    public function test_compose_with_extra_class(): void {
        $composed = ClassNames::compose('button', ['variant' => 'soft'], 'my-custom-class');
        $this->assertSame('ps-button ps-button-soft my-custom-class', $composed);
    }

    public function test_compose_handles_invalid_inputs(): void {
        $this->setExpectedIncorrectUsage('WPDev\Chameleon\Generated\ClassNames::compose');
        $composed = ClassNames::compose('button', ['variant' => 'nonexistent']);
        $this->assertSame('ps-button', $composed);

        $this->setExpectedIncorrectUsage('WPDev\Chameleon\Generated\ClassNames::compose');
        $unknown = ClassNames::compose('unsupported_component', [], 'fallback-class');
        $this->assertSame('fallback-class', $unknown);
    }
}
