<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use Firebase\JWT\JWT;

class JWTGenerator
{
    public static function generate(string $url, string $method, string $issuer, string $secret): string
    {
        $data = [
            'iss' => $issuer,
            'iat' => time(),
            'exp' => strtotime('+1 day'),
            'qsh' => QSHGenerator::generate($url, $method),
        ];

        return JWT::encode($data, $secret);
    }

    public static function generateAssertion(string $secret, string $oauthClientId, string $baseUrl, string $user): string
    {
        $data = [
            'iss' => 'urn:atlassian:connect:clientid:'.$oauthClientId,
            'sub' => 'urn:atlassian:connect:useraccountid:'.$user,
            'iat' => time(),
            'exp' => strtotime('+1 minutes'),
            'tnt' => $baseUrl,
            'aud' => 'https://oauth-2-authorization-server.services.atlassian.com',
        ];

        return JWT::encode($data, $secret);
    }
}
