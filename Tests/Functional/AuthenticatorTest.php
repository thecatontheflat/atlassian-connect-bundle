<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

use AtlassianConnectBundle\Service\QSHGenerator;
use Firebase\JWT\JWT;

/**
 * Tests JWTAuthenticator and LegacyJWTAuthenticator
 */
final class AuthenticatorTest extends AbstractWebTestCase
{
    public function testProtectedRouteWithoutAuthentication(): void
    {
        $client = self::createClient();

        $client->request('GET', '/protected/route');

        $this->assertResponseStatusCodeSame(401);
        $this->assertSame('Authentication header required', $client->getResponse()->getContent());
    }

    public function testProtectedRouteWithBearerToken(): void
    {
        $client = self::createClient([], ['HTTP_AUTHORIZATION' => 'Bearer ' . $this->getTenantJWTCode()]);

        $client->request('GET', '/protected/route');
        $this->assertResponseIsSuccessful();
    }

    public function testProtectedRouteWithQueryToken(): void
    {
        $client = self::createClient();

        $client->request('GET', '/protected/route?jwt=' . $this->getTenantJWTCode());
        $this->assertResponseIsSuccessful();
    }

    public function testProtectedRouteInDevEnvironment(): void
    {
        $client = self::createClient(['environment' => 'dev']);

        $client->request('GET', '/protected/route');
        $this->assertResponseIsSuccessful();
    }

    public function testProtectedRouteWithInvalidJWTToken(): void
    {
        $client = self::createClient();

        $client->request('GET', '/protected/route?jwt=invalid');
        $this->assertResponseStatusCodeSame(403);
        $this->assertEquals('Authentication Failed: Failed to parse token', $client->getResponse()->getContent());
    }

    public function getTenantJWTCode(): string
    {
        return JWT::encode([
            'iss' => 'client_key',
            'iat' => time(),
            'exp' => strtotime('+1 day'),
            'qsh' => QSHGenerator::generate('/protected_route', 'GET'),
            'sub' => 'admin',
        ], 'shared_secret');
    }
}
