<?php

namespace WPDev\Dependencies\Amp\Http\Client\Body;

use WPDev\Dependencies\Amp\ByteStream\InMemoryStream;
use WPDev\Dependencies\Amp\ByteStream\InputStream;
use WPDev\Dependencies\Amp\Http\Client\RequestBody;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\Amp\Success;
final class StringBody implements RequestBody
{
    private $body;
    public function __construct(string $body)
    {
        $this->body = $body;
    }
    public function createBodyStream() : InputStream
    {
        return new InMemoryStream($this->body !== '' ? $this->body : null);
    }
    public function getHeaders() : Promise
    {
        return new Success([]);
    }
    public function getBodyLength() : Promise
    {
        return new Success(\strlen($this->body));
    }
}
