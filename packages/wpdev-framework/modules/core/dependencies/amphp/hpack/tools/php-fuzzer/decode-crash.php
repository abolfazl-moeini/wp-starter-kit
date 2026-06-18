<?php

namespace WPDev\Dependencies;

require __DIR__ . '/../../vendor/autoload.php';
use WPDev\Dependencies\Amp\Http\HPack;
(new HPack())->decode(\file_get_contents($argv[1]), 8192);
