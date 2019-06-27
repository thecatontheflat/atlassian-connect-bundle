<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use Firebase\JWT\JWT;
use Psr\Http\Message\RequestInterface;

/**
 * Class JWTGenerator
 */
class JWTGenerator
{
    /**
     * Create JWT token used by Atlassian REST API request
     *
     * @param RequestInterface $request
     * @param string           $issuer  Key of the add-on
     * @param string           $secret  Shared secret of the Tenant
     *
     * @return string
     */
    public static function generate(RequestInterface $request, string $issuer, string $secret): string
    {
        $data = [
            'iss' => $issuer,
            'iat' => \time(),
            'exp' => \strtotime('+1 day'),
            'qsh' => QSHGenerator::generate((string) $request->getUri(), $request->getMethod()),
        ];

        return JWT::encode($data, $secret);
    }

    /**
     * @param string $secret
     * @param string $oauthClientId
     * @param string $baseUrl
     * @param string $user
     *
     * @return string
     */
    public static function generateAssertion(string $secret, string $oauthClientId, string $baseUrl, string $user): string
    {
        $data = [
            'iss' => 'urn:atlassian:connect:clientid:'.$oauthClientId,
            'sub' => 'urn:atlassian:connect:useraccountid:'.$user,
            'iat' => \time(),
            'exp' => \strtotime('+1 minutes'),
            'tnt' => $baseUrl,
            'aud' => 'https://auth.atlassian.io',
        ];

        return JWT::encode($data, $secret);
    }
}
