<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use GuzzleHttp\Client;
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
                    \array_merge($request->getHeaders(), ['Authorization' => 'JWT '.JWTGenerator::generate($request, $issuer, $secret)]),
                    $request->getBody()
                );
            }
        );
    }

    /**
     * @param string $oauthClientId
     * @param string $secret
     * @param string $baseUrl
     * @param string $username
     *
     * @return callable
     */
    public static function authUserTokenMiddleware(string $oauthClientId, string $secret, string $baseUrl, string $username): callable
    {
        return Middleware::mapRequest(
            function (RequestInterface $request) use ($oauthClientId, $secret, $baseUrl, $username) {
                return new Request(
                    $request->getMethod(),
                    $request->getUri(),
                    \array_merge($request->getHeaders(), [
                        'Authorization' => 'Bearer '.self::getAuthToken($oauthClientId, $secret, $baseUrl, $username),
                        'Accept' => 'application/json',
                    ]),
                    $request->getBody()
                );
            }
        );
    }

    /**
     * @param string $oauthClientId
     * @param string $secret
     * @param string $baseUrl
     * @param string $username
     *
     * @return string
     */
    private static function getAuthToken(string $oauthClientId, string $secret, string $baseUrl, string $username): string
    {
        $result = (new Client())->post('https://auth.atlassian.io/oauth2/token', [
            'form_params' => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => JWTGenerator::generateAssertion($secret, $oauthClientId, $baseUrl, $username),
            ],
        ]);

        return \json_decode($result->getBody()->getContents(), true)['access_token'];
    }
}
