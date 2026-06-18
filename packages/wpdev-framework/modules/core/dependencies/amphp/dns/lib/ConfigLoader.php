<?php

namespace WPDev\Dependencies\Amp\Dns;

use WPDev\Dependencies\Amp\Promise;
interface ConfigLoader
{
    public function loadConfig() : Promise;
}
