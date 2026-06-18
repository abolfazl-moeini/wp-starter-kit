<?php

declare (strict_types=1);
namespace WPDev\Dependencies\PHPStan\PhpDocParser\Ast\ConstExpr;

use WPDev\Dependencies\PHPStan\PhpDocParser\Ast\NodeAttributes;
class ConstExprFloatNode implements ConstExprNode
{
    use NodeAttributes;
    /** @var string */
    public $value;
    public function __construct(string $value)
    {
        $this->value = $value;
    }
    public function __toString() : string
    {
        return $this->value;
    }
}
