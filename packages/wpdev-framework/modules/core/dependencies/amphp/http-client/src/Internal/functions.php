<?php

namespace WPDev\Dependencies\Amp\Http\Client\Internal;

use WPDev\Dependencies\Amp\Http\Client\InvalidRequestException;
use WPDev\Dependencies\Amp\Http\Client\Request;
/**
 * @param Request $request
 *
 * @return string
 * @throws InvalidRequestException
 *
 * @internal
 */
function normalizeRequestPathWithQuery(Request $request) : string
{
    $path = $request->getUri()->getPath();
    $query = $request->getUri()->getQuery();
    if ($path === '') {
        return '/' . ($query !== '' ? '?' . $query : '');
    }
    if ($path[0] !== '/') {
        throw new InvalidRequestException($request, 'Relative path (' . $path . ') is not allowed in the request URI');
    }
    return $path . ($query !== '' ? '?' . $query : '');
}
