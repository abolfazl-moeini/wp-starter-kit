<?php

/** @noinspection PhpComposerExtensionStubsInspection */
namespace WPDev\Dependencies\Amp\Http\Client\Body;

use WPDev\Dependencies\Amp\ByteStream\InMemoryStream;
use WPDev\Dependencies\Amp\ByteStream\InputStream;
use WPDev\Dependencies\Amp\Http\Client\HttpException;
use WPDev\Dependencies\Amp\Http\Client\RequestBody;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\Amp\Success;
final class JsonBody implements RequestBody
{
    /** @var string */
    private $json;
    /**
     * JsonBody constructor.
     *
     * @param mixed $data
     * @param int $options
     * @param int<1, 2147483647> $depth
     *
     * @throws HttpException
     */
    public function __construct($data, int $options = 0, int $depth = 512)
    {
        $this->json = \json_encode($data, $options, $depth);
        if (\json_last_error() !== \JSON_ERROR_NONE) {
            throw new HttpException('Failed to encode data to JSON');
        }
    }
    public function getHeaders() : Promise
    {
        return new Success(['content-type' => 'application/json; charset=utf-8']);
    }
    public function createBodyStream() : InputStream
    {
        return new InMemoryStream($this->json);
    }
    public function getBodyLength() : Promise
    {
        return new Success(\strlen($this->json));
    }
}
