<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use Firebase\JWT\JWT;
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
     * @param string $issuer Add-on key in most cases
     * @param string $secret Shared secret
     *
     * @return callable
     */
    public static function authTokenMiddleware(string $issuer, string $secret): callable
    {
        return Middleware::mapRequest(
            function (RequestInterface $request) use ($issuer, $secret) {
                return new Request(
                    $request->getMethod(),
                    $request->getUri(),
                    \array_merge($request->getHeaders(), ['Authorization' => 'JWT '.static::createToken($request, $issuer, $secret)]),
                    $request->getBody()
                );
            }
        );
    }

    /**
     * Create JWT token used by Atlassian REST API request
     *
     * @param RequestInterface $request
     * @param string           $issuer  Key of the add-on
     * @param string           $secret  Shared secret of the Tenant
     *
     * @return string
     */
    private static function createToken(RequestInterface $request, string $issuer, string $secret): string
    {
        return JWT::encode([
            'iss' => $issuer,
            'iat' => \time(),
            'exp' => \strtotime('+1 day'),
            'qsh' => QSHGenerator::generate((string) $request->getUri(), $request->getMethod()),
        ], $secret);
    }
}
