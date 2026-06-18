<?php

namespace WPDev\Dependencies\Amp\Dns\Internal;

use WPDev\Dependencies\Amp\Dns\DnsException;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\Amp\Success;
use WPDev\Dependencies\LibDNS\Decoder\DecoderFactory;
use WPDev\Dependencies\LibDNS\Encoder\EncoderFactory;
use WPDev\Dependencies\LibDNS\Messages\Message;
use function WPDev\Dependencies\Amp\call;
/** @internal */
final class UdpSocket extends Socket
{
    /** @var \LibDNS\Encoder\Encoder */
    private $encoder;
    /** @var \LibDNS\Decoder\Decoder */
    private $decoder;
    public static function connect(string $uri) : Promise
    {
        if (!($socket = @\stream_socket_client($uri, $errno, $errstr, 0, \STREAM_CLIENT_ASYNC_CONNECT))) {
            throw new DnsException(\sprintf("Connection to %s failed: [Error #%d] %s", $uri, $errno, $errstr));
        }
        return new Success(new self($socket));
    }
    protected function __construct($socket)
    {
        parent::__construct($socket);
        $this->encoder = (new EncoderFactory())->create();
        $this->decoder = (new DecoderFactory())->create();
    }
    protected function send(Message $message) : Promise
    {
        $data = $this->encoder->encode($message);
        return $this->write($data);
    }
    protected function receive() : Promise
    {
        return call(function () {
            $data = (yield $this->read());
            if ($data === null) {
                throw new DnsException("Reading from the server failed");
            }
            return $this->decoder->decode($data);
        });
    }
    public function isAlive() : bool
    {
        return \true;
    }
}
