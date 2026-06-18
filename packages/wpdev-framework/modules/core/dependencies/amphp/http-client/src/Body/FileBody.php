<?php

namespace WPDev\Dependencies\Amp\Http\Client\Body;

use WPDev\Dependencies\Amp\ByteStream\InputStream;
use WPDev\Dependencies\Amp\File\Driver;
use WPDev\Dependencies\Amp\Http\Client\RequestBody;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\Amp\Success;
use function WPDev\Dependencies\Amp\call;
use function WPDev\Dependencies\Amp\File\getSize;
use function WPDev\Dependencies\Amp\File\open;
use function WPDev\Dependencies\Amp\File\openFile;
use function WPDev\Dependencies\Amp\File\size;
final class FileBody implements RequestBody
{
    /** @var string */
    private $path;
    /**
     * @param string $path The filesystem path for the file we wish to send
     */
    public function __construct(string $path)
    {
        if (!\interface_exists(Driver::class)) {
            throw new \Error("File request bodies require amphp/file to be installed");
        }
        $this->path = $path;
    }
    public function createBodyStream() : InputStream
    {
        $handlePromise = \function_exists('WPDev\\Dependencies\\Amp\\File\\openFile') ? openFile($this->path, "r") : open($this->path, "r");
        return new class($handlePromise) implements InputStream
        {
            /** @var Promise<InputStream> */
            private $promise;
            /** @var InputStream|null */
            private $stream;
            public function __construct(Promise $promise)
            {
                $this->promise = $promise;
                $this->promise->onResolve(function ($error, $stream) {
                    if ($error) {
                        return;
                    }
                    $this->stream = $stream;
                });
            }
            public function read() : Promise
            {
                if (!$this->stream) {
                    return call(function () {
                        /** @var InputStream $stream */
                        $stream = (yield $this->promise);
                        return $stream->read();
                    });
                }
                return $this->stream->read();
            }
        };
    }
    public function getHeaders() : Promise
    {
        return new Success([]);
    }
    public function getBodyLength() : Promise
    {
        return \function_exists('WPDev\\Dependencies\\Amp\\File\\getSize') ? getSize($this->path) : size($this->path);
    }
}
