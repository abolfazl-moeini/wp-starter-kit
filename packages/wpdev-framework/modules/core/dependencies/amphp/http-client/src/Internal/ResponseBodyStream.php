<?php

namespace WPDev\Dependencies\Amp\Http\Client\Internal;

use WPDev\Dependencies\Amp\ByteStream\InputStream;
use WPDev\Dependencies\Amp\CancellationTokenSource;
use WPDev\Dependencies\Amp\Promise;
/** @internal */
final class ResponseBodyStream implements InputStream
{
    use ForbidSerialization;
    use ForbidCloning;
    /** @var InputStream */
    private $body;
    /** @var CancellationTokenSource */
    private $bodyCancellation;
    /** @var bool */
    private $successfulEnd = \false;
    public function __construct(InputStream $body, CancellationTokenSource $bodyCancellation)
    {
        $this->body = $body;
        $this->bodyCancellation = $bodyCancellation;
    }
    public function read() : Promise
    {
        $promise = $this->body->read();
        $promise->onResolve(function ($error, $value) {
            if ($value === null && $error === null) {
                $this->successfulEnd = \true;
            }
        });
        return $promise;
    }
    public function __destruct()
    {
        if (!$this->successfulEnd) {
            $this->bodyCancellation->cancel();
        }
    }
}
