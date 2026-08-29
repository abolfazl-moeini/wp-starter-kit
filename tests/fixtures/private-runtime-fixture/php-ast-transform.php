<?php

declare( strict_types=1 );

use PhpParser\Node;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitorAbstract;
use PhpParser\ParserFactory;
use PhpParser\PhpVersion;
use PhpParser\PrettyPrinter\Standard;

// Depth 3 resolves from tests/fixtures/private-runtime-fixture/ to the repo
// root; the other entries keep the helper usable from a copied-out location.
$autoload_candidates = array(
	dirname( __DIR__, 3 ) . '/vendor/autoload.php',
	dirname( __DIR__, 2 ) . '/vendor/autoload.php',
	dirname( __DIR__, 4 ) . '/vendor/autoload.php',
);
foreach ( $autoload_candidates as $autoload ) {
	if ( is_file( $autoload ) ) {
		require_once $autoload;
		break;
	}
}
if ( ! class_exists( ParserFactory::class ) ) {
	fwrite( STDERR, "nikic/php-parser is required for AST transforms\n" );
	exit( 3 );
}

if ( $argc !== 4 ) {
	fwrite( STDERR, "usage: php php-ast-transform.php <map-json> <input> <output>\n" );
	exit( 2 );
}

$mapping = json_decode( $argv[1], true );
$source  = file_get_contents( $argv[2] );
if ( ! is_array( $mapping ) || false === $source ) {
	fwrite( STDERR, "invalid transform input\n" );
	exit( 2 );
}

$parser = ( new ParserFactory() )->createForVersion( PhpVersion::fromString( '7.4' ) );
try {
	$ast       = $parser->parse( $source );
	$traverser = new NodeTraverser();
	$traverser->addVisitor(
		new class( $mapping ) extends NodeVisitorAbstract {
			/** @var array<string,string> */
			private array $mapping;

			/** @param array<string,string> $mapping */
			public function __construct( array $mapping ) {
				$this->mapping = $mapping;
			}

			public function enterNode( Node $node ) {
				if ( $node instanceof Node\Stmt\Function_ && isset( $this->mapping[ $node->name->toString() ] ) ) {
					$node->name = new Node\Identifier(
						$this->mapping[ $node->name->toString() ],
						$node->name->getAttributes()
					);

					return $node;
				}
				if ( $node instanceof Node\Expr\FuncCall && ! $node->name instanceof Node\Name ) {
					throw new RuntimeException( 'unresolved dynamic framework call' );
				}
				if ( $node instanceof Node\Name && isset( $this->mapping[ $node->toString() ] ) ) {
					return new Node\Name( $this->mapping[ $node->toString() ], $node->getAttributes() );
				}
				if ( $node instanceof Node\Scalar\String_ && isset( $this->mapping[ $node->value ] ) ) {
					throw new RuntimeException( 'unresolved dynamic framework callable' );
				}
				if ( $node instanceof Node\Expr\BinaryOp\Concat && $node->left instanceof Node\Scalar\String_ && false !== strpos( $node->left->value, 'wpdev_' ) ) {
					throw new RuntimeException( 'unresolved dynamic framework call' );
				}
				return null;
			}
		}
	);
	$ast = $traverser->traverse( $ast ?? array() );
	// Plan 1 §7 step 9 requires the parser AND the printer to target PHP 7.4.
	// php-parser currently defaults the printer to 7.4, but an inherited
	// default is not a pinned target: an upgrade could silently retarget it.
	$printer = new Standard( array( 'phpVersion' => PhpVersion::fromString( '7.4' ) ) );
	// Fail-closed: an unwritten transform must never report success, or a later
	// stage promotes a stale or missing file as the rewritten artifact.
	$written = file_put_contents( $argv[3], $printer->prettyPrintFile( $ast ) . "\n" );
	if ( false === $written ) {
		fwrite( STDERR, "unable to write transform output: {$argv[3]}\n" );
		exit( 5 );
	}
} catch ( Throwable $error ) {
	fwrite( STDERR, $error->getMessage() . "\n" );
	exit( 4 );
}
