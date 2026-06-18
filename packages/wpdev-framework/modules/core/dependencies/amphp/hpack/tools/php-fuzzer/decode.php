<?php

namespace WPDev\Dependencies;

require __DIR__ . '/../../vendor/autoload.php';
use WPDev\Dependencies\Amp\Http\HPack;
$fuzzer->setTarget(function (string $input) {
    (new HPack())->decode($input, 8192);
});
$fuzzer->setMaxLen(1024);
