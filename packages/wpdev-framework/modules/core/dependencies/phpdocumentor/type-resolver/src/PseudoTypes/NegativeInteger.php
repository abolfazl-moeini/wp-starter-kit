<?php

declare (strict_types=1);
/**
 * This file is part of phpDocumentor.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * @link      http://phpdoc.org
 */
namespace WPDev\Dependencies\phpDocumentor\Reflection\PseudoTypes;

use WPDev\Dependencies\phpDocumentor\Reflection\PseudoType;
use WPDev\Dependencies\phpDocumentor\Reflection\Type;
use WPDev\Dependencies\phpDocumentor\Reflection\Types\Integer;
/**
 * Value Object representing the type 'int'.
 *
 * @psalm-immutable
 */
final class NegativeInteger extends Integer implements PseudoType
{
    public function underlyingType() : Type
    {
        return new Integer();
    }
    /**
     * Returns a rendered output of the Type as it would be used in a DocBlock.
     */
    public function __toString() : string
    {
        return 'negative-int';
    }
}
