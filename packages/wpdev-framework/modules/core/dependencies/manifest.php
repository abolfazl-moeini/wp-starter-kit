<?php
/**
 * Module dependency manifest (generated).
 *
 * @package WPDev
 */

defined( 'ABSPATH' ) || exit;

return array(
	'psr4' => array(
		'WPDev\\Dependencies\\Amp\\' => array(
			__DIR__ . '/amphp/amp/lib',
		),
		'WPDev\\Dependencies\\Amp\\ByteStream\\' => array(
			__DIR__ . '/amphp/byte-stream/lib',
		),
		'WPDev\\Dependencies\\Amp\\Cache\\' => array(
			__DIR__ . '/amphp/cache/lib',
		),
		'WPDev\\Dependencies\\Amp\\Dns\\' => array(
			__DIR__ . '/amphp/dns/lib',
		),
		'WPDev\\Dependencies\\Amp\\Http\\' => array(
			__DIR__ . '/amphp/hpack/src',
			__DIR__ . '/amphp/http/src',
		),
		'WPDev\\Dependencies\\Amp\\Http\\Client\\' => array(
			__DIR__ . '/amphp/http-client/src',
		),
		'WPDev\\Dependencies\\Amp\\Parser\\' => array(
			__DIR__ . '/amphp/parser/src',
		),
		'WPDev\\Dependencies\\Amp\\Process\\' => array(
			__DIR__ . '/amphp/process/lib',
		),
		'WPDev\\Dependencies\\Amp\\Serialization\\' => array(
			__DIR__ . '/amphp/serialization/src',
		),
		'WPDev\\Dependencies\\Amp\\Socket\\' => array(
			__DIR__ . '/amphp/socket/src',
		),
		'WPDev\\Dependencies\\Amp\\Sync\\' => array(
			__DIR__ . '/amphp/sync/src',
		),
		'WPDev\\Dependencies\\Amp\\WindowsRegistry\\' => array(
			__DIR__ . '/amphp/windows-registry/lib',
		),
		'WPDev\\Dependencies\\BerlinDB\\' => array(
			__DIR__ . '/berlindb/core/src',
		),
		'WPDev\\Dependencies\\Carbon\\' => array(
			__DIR__ . '/nesbot/carbon/src/Carbon',
		),
		'WPDev\\Dependencies\\Delight\\Cookie\\' => array(
			__DIR__ . '/delight-im/cookie/src',
		),
		'WPDev\\Dependencies\\Delight\\Http\\' => array(
			__DIR__ . '/delight-im/http/src',
		),
		'WPDev\\Dependencies\\Doctrine\\Deprecations\\' => array(
			__DIR__ . '/doctrine/deprecations/lib/Doctrine/Deprecations',
		),
		'WPDev\\Dependencies\\Hashids\\' => array(
			__DIR__ . '/hashids/hashids/src',
		),
		'WPDev\\Dependencies\\Ifsnop\\' => array(
			__DIR__ . '/ifsnop/mysqldump-php/src/Ifsnop',
		),
		'WPDev\\Dependencies\\Nyholm\\Psr7\\' => array(
			__DIR__ . '/nyholm/psr7/src',
		),
		'WPDev\\Dependencies\\Pablo_Pacheco\\WP_Namespace_Autoloader\\' => array(
			__DIR__ . '/pablo-sg-pacheco/wp-namespace-autoloader/src',
		),
		'WPDev\\Dependencies\\ParagonIE\\ConstantTime\\' => array(
			__DIR__ . '/paragonie/constant_time_encoding/src',
		),
		'WPDev\\Dependencies\\phpDocumentor\\Reflection\\' => array(
			__DIR__ . '/phpdocumentor/reflection-common/src',
			__DIR__ . '/phpdocumentor/reflection-docblock/src',
			__DIR__ . '/phpdocumentor/type-resolver/src',
		),
		'bcmath_compat\\' => array(
			__DIR__ . '/phpseclib/bcmath_compat/src',
		),
		'phpseclib3\\' => array(
			__DIR__ . '/phpseclib/phpseclib/phpseclib',
		),
		'WPDev\\Dependencies\\PHPStan\\PhpDocParser\\' => array(
			__DIR__ . '/phpstan/phpdoc-parser/src',
		),
		'WPDev\\Dependencies\\Psr\\Container\\' => array(
			__DIR__ . '/psr/container/src',
		),
		'WPDev\\Dependencies\\Rakit\\Validation\\' => array(
			__DIR__ . '/rakit/validation/src',
		),
		'WPDev\\Dependencies\\Arrch\\' => array(
			__DIR__ . '/rpnzl/arrch/src/Arrch',
		),
		'WPDev\\Dependencies\\Symfony\\Component\\Cache\\' => array(
			__DIR__ . '/symfony/cache/',
		),
		'WPDev\\Dependencies\\Symfony\\Contracts\\Cache\\' => array(
			__DIR__ . '/symfony/cache-contracts/',
		),
		'Symfony\\Polyfill\\Mbstring\\' => array(
			__DIR__ . '/symfony/polyfill-mbstring/',
		),
		'Symfony\\Polyfill\\Php73\\' => array(
			__DIR__ . '/symfony/polyfill-php73/',
		),
		'Symfony\\Polyfill\\Php80\\' => array(
			__DIR__ . '/symfony/polyfill-php80/',
		),
		'Symfony\\Polyfill\\Php81\\' => array(
			__DIR__ . '/symfony/polyfill-php81/',
		),
		'WPDev\\Dependencies\\Symfony\\Contracts\\Service\\' => array(
			__DIR__ . '/symfony/service-contracts/',
		),
		'Symfony\\Component\\Translation\\' => array(
			__DIR__ . '/symfony/translation/',
		),
		'WPDev\\Dependencies\\Symfony\\Contracts\\Translation\\' => array(
			__DIR__ . '/symfony/translation-contracts/',
		),
		'WPDev\\Dependencies\\Symfony\\Component\\VarExporter\\' => array(
			__DIR__ . '/symfony/var-exporter/',
		),
		'WPDev\\Dependencies\\Webmozart\\Assert\\' => array(
			__DIR__ . '/webmozart/assert/src',
		),
	),
	'classmap' => array(
	),
	'files' => array(
		__DIR__ . '/amphp/amp/lib/functions.php',
		__DIR__ . '/amphp/amp/lib/Internal/functions.php',
		__DIR__ . '/amphp/byte-stream/lib/functions.php',
		__DIR__ . '/amphp/dns/lib/functions.php',
		__DIR__ . '/amphp/http/src/functions.php',
		__DIR__ . '/amphp/http-client/src/Internal/functions.php',
		__DIR__ . '/amphp/process/lib/functions.php',
		__DIR__ . '/amphp/serialization/src/functions.php',
		__DIR__ . '/amphp/socket/src/functions.php',
		__DIR__ . '/amphp/socket/src/Internal/functions.php',
		__DIR__ . '/amphp/sync/src/functions.php',
		__DIR__ . '/amphp/sync/src/ConcurrentIterator/functions.php',
		__DIR__ . '/phpseclib/bcmath_compat/lib/bcmath.php',
		__DIR__ . '/phpseclib/phpseclib/phpseclib/bootstrap.php',
		__DIR__ . '/symfony/deprecation-contracts/function.php',
		__DIR__ . '/symfony/polyfill-mbstring/bootstrap.php',
		__DIR__ . '/symfony/polyfill-php73/bootstrap.php',
		__DIR__ . '/symfony/polyfill-php80/bootstrap.php',
		__DIR__ . '/symfony/polyfill-php81/bootstrap.php',
		__DIR__ . '/symfony/translation/Resources/functions.php',
		__DIR__ . '/yahnis-elsts/plugin-update-checker/load-v4p11.php',
	),
);
