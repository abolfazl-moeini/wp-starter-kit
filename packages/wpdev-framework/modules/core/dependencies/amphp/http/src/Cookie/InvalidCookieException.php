<?php

namespace WPDev\Dependencies\Amp\Http\Cookie;

final class InvalidCookieException extends \Exception
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
