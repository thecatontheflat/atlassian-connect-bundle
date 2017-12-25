<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use Firebase\JWT\JWT;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use Psr\Http\Message\RequestInterface;

/**
 * Class JWTMiddleware
 */
class JWTMiddleware
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
                    \array_merge($request->getHeaders(), ['Authorization' => 'JWT '.static::create($request, $issuer, $secret)]),
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
    private static function create(RequestInterface $request, string $issuer, string $secret): string
    {
        $payload = [
            'iss' => $issuer,
            'iat' => \time(),
            'exp' => \strtotime('+1 day'),
            'qsh' => static::qsh((string) $request->getUri(), $request->getMethod()),
        ];

        return JWT::encode($payload, $secret);
    }

    /**
     * Create Query String Hash
     *
     * More details:
     * https://developer.atlassian.com/static/connect/docs/latest/concepts/understanding-jwt.html#creating-token
     *
     * @param string $url    URL of the request
     * @param string $method HTTP method
     *
     * @return string
     */
    private static function qsh(string $url, string $method): string
    {
        $method = \mb_strtoupper($method);
        $parts = \parse_url($url);

        // Remove "/wiki" part from the path for the Confluence
        // Really, I didn't find this part in the docs, but it works
        $path = \str_replace('/wiki', '', $parts['path']);
        $canonicalQuery = '';
        if (!empty($parts['query'])) {
            $query = $parts['query'];
            $queryParts = \explode('&', $query);
            $queryArray = [];
            foreach ($queryParts as $queryPart) {
                $pieces = \explode('=', $queryPart);
                $key = \array_shift($pieces);
                $key = \rawurlencode($key);
                $value = \mb_substr($queryPart, \mb_strlen($key) + 1);
                $value = \rawurlencode($value);
                $queryArray[$key][] = $value;
            }
            \ksort($queryArray);
            foreach ($queryArray as $key => $pieceOfQuery) {
                $pieceOfQuery = \implode(',', $pieceOfQuery);
                $canonicalQuery .= $key.'='.$pieceOfQuery.'&';
            }
            $canonicalQuery = \rtrim($canonicalQuery, '&');
        }

        return \hash('sha256', \implode('&', [$method, $path, $canonicalQuery]));
    }
}
