<?php

namespace WPDev\Dependencies\Amp\Http\Client\Internal;

use WPDev\Dependencies\Amp\ByteStream\InputStream;
use WPDev\Dependencies\Amp\Failure;
use WPDev\Dependencies\Amp\Http\Client\ParseException;
use WPDev\Dependencies\Amp\Http\Status;
use WPDev\Dependencies\Amp\Promise;
/** @internal */
final class SizeLimitingInputStream implements InputStream
{
    use ForbidSerialization;
    use ForbidCloning;
    /** @var InputStream|null */
    private $source;
    /** @var int */
    private $bytesRead = 0;
    /** @var int */
    private $sizeLimit;
    /** @var \Throwable|null */
    private $exception;
    public function __construct(InputStream $source, int $sizeLimit)
    {
        $this->source = $source;
        $this->sizeLimit = $sizeLimit;
    }
    public function read() : Promise
    {
        if ($this->exception) {
            return new Failure($this->exception);
        }
        \assert($this->source !== null);
        $promise = $this->source->read();
        $promise->onResolve(function ($error, $value) {
            if ($value !== null) {
                $this->bytesRead += \strlen($value);
                if ($this->bytesRead > $this->sizeLimit) {
                    $this->exception = new ParseException("Configured body size exceeded: {$this->bytesRead} bytes received, while the configured limit is {$this->sizeLimit} bytes", Status::PAYLOAD_TOO_LARGE);
                    $this->source = null;
                }
            }
        });
        return $promise;
    }
}
