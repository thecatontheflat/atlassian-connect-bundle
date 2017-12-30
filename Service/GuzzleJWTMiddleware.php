<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use Psr\Http\Message\RequestInterface;

/**
 * Class GuzzleJWTMiddleware
 */
class GuzzleJWTMiddleware
{
    /**
     * JWT Authentication middleware for Guzzle
     *
     * @param string      $issuer Add-on key in most cases
     * @param string      $secret Shared secret
     * @param null|string $user
     *
     * @return callable
     */
    public static function authTokenMiddleware(string $issuer, string $secret, ?string $user): callable
    {
        return Middleware::mapRequest(
            function (RequestInterface $request) use ($issuer, $secret, $user) {
                return new Request(
                    $request->getMethod(),
                    $request->getUri(),
                    \array_merge($request->getHeaders(), ['Authorization' => 'JWT '.JWTGenerator::generate($request, $issuer, $secret, $user)]),
                    $request->getBody()
                );
            }
        );
    }
}
