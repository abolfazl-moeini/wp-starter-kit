<?php

declare (strict_types=1);
namespace WPDev\Dependencies\PHPStan\PhpDocParser\Ast\NodeVisitor;

use WPDev\Dependencies\PHPStan\PhpDocParser\Ast\AbstractNodeVisitor;
use WPDev\Dependencies\PHPStan\PhpDocParser\Ast\Attribute;
use WPDev\Dependencies\PHPStan\PhpDocParser\Ast\Node;
final class CloningVisitor extends AbstractNodeVisitor
{
    public function enterNode(Node $originalNode)
    {
        $node = clone $originalNode;
        $node->setAttribute(Attribute::ORIGINAL_NODE, $originalNode);
        return $node;
    }
}
