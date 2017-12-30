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
     * @param null|string      $user
     *
     * @return string
     */
    public static function generate(RequestInterface $request, string $issuer, string $secret, ?string $user): string
    {
        $data = [
            'iss' => $issuer,
            'iat' => \time(),
            'exp' => \strtotime('+1 day'),
            'qsh' => QSHGenerator::generate((string) $request->getUri(), $request->getMethod()),
        ];

        if ($user !== null) {
            $data['sub'] = $user;
        }

        return JWT::encode($data, $secret);
    }
}
