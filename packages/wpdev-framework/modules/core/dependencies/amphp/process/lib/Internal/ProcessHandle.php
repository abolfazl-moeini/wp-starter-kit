<?php

namespace WPDev\Dependencies\Amp\Process\Internal;

use WPDev\Dependencies\Amp\Deferred;
use WPDev\Dependencies\Amp\Process\ProcessInputStream;
use WPDev\Dependencies\Amp\Process\ProcessOutputStream;
use WPDev\Dependencies\Amp\Struct;
abstract class ProcessHandle
{
    use Struct;
    /** @var ProcessOutputStream */
    public $stdin;
    /** @var ProcessInputStream */
    public $stdout;
    /** @var ProcessInputStream */
    public $stderr;
    /** @var Deferred */
    public $pidDeferred;
    /** @var int */
    public $status = ProcessStatus::STARTING;
}
