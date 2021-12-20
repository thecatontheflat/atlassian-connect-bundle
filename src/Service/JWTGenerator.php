<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use Firebase\JWT\JWT;
use Psr\Http\Message\RequestInterface;

class JWTGenerator
{
    public static function generate(RequestInterface $request, string $issuer, string $secret): string
    {
        $data = [
            'iss' => $issuer,
            'iat' => time(),
            'exp' => strtotime('+1 day'),
            'qsh' => QSHGenerator::generate((string) $request->getUri(), $request->getMethod()),
        ];

        return JWT::encode($data, $secret);
    }

    public static function generateAssertion(string $secret, string $oauthClientId, string $baseUrl, string $user): string
    {
        $data = [
            'iss' => 'urn:atlassian:connect:clientid:' . $oauthClientId,
            'sub' => 'urn:atlassian:connect:useraccountid:' . $user,
            'iat' => time(),
            'exp' => strtotime('+1 minutes'),
            'tnt' => $baseUrl,
            'aud' => 'https://auth.atlassian.io',
        ];

        return JWT::encode($data, $secret);
    }
}
