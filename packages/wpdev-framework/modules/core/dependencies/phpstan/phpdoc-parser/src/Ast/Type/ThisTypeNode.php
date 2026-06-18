<?php

declare (strict_types=1);
namespace WPDev\Dependencies\PHPStan\PhpDocParser\Ast\Type;

use WPDev\Dependencies\PHPStan\PhpDocParser\Ast\NodeAttributes;
class ThisTypeNode implements TypeNode
{
    use NodeAttributes;
    public function __toString() : string
    {
        return '$this';
    }
}
