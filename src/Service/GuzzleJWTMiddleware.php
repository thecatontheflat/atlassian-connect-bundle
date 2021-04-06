<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Middleware;
use GuzzleHttp\RequestOptions;
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
            static function (RequestInterface $request) use ($issuer, $secret) {
                return $request->withHeader(
                    'Authorization',
                    'JWT '.JWTGenerator::generate($request, $issuer, $secret)
                );
            }
        );
    }

    /**
     * @param ClientInterface $client
     * @param string          $oauthClientId
     * @param string          $secret
     * @param string          $baseUrl
     * @param string          $username
     *
     * @return callable
     */
    public static function authUserTokenMiddleware(
        ClientInterface $client,
        string $oauthClientId,
        string $secret,
        string $baseUrl,
        string $username
    ): callable {
        return Middleware::mapRequest(
            static function (RequestInterface $request) use ($client, $oauthClientId, $secret, $baseUrl, $username) {
                return $request
                    ->withHeader('Accept', 'application/json')
                    ->withHeader(
                        'Authorization',
                        'Bearer '.self::getAuthToken($client, $oauthClientId, $secret, $baseUrl, $username)
                    );
            }
        );
    }

    /**
     * @param ClientInterface $client
     * @param string          $oauthClientId
     * @param string          $secret
     * @param string          $baseUrl
     * @param string          $username
     *
     * @return string
     */
    private static function getAuthToken(
        ClientInterface $client,
        string $oauthClientId,
        string $secret,
        string $baseUrl,
        string $username
    ): string {
        $result = $client->request('POST', 'https://auth.atlassian.io/oath2/token', [
            RequestOptions::FORM_PARAMS => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => JWTGenerator::generateAssertion($secret, $oauthClientId, $baseUrl, $username),
            ],
        ]);

        return \json_decode($result->getBody()->getContents(), true)['access_token'];
    }
}
