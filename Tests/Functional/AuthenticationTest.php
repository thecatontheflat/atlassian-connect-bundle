<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Functional;

use AtlassianConnectBundle\Service\QSHGenerator;
use Firebase\JWT\JWT;

/**
 * Class AuthenticationTest
 */
final class AuthenticationTest extends AbstractWebTestCase
{
    /**
     * test a protected route without any authentication headers
     * also test the entry point response
     */
    public function testProtectedRouteWithoutAuthentication(): void
    {
        $client = self::createClient(['environment' => 'prod']);

        $client->request('GET', '/protected/route');

        $this->assertResponseStatusCodeSame(401);
        $this->assertSame('Authentication header required', $client->getResponse()->getContent());
    }

    /**
     * test authentication with bearer endpoint
     */
    public function testProtectedRouteWithBearerToken(): void
    {
        $client = self::createClient(['environment' => 'prod'], ['HTTP_AUTHORIZATION' => 'Bearer '.$this->getTenantJWTCode()]);

        $client->request('GET', '/protected/route');
        $this->assertResponseIsSuccessful();
    }

    /**
     * test authentication with jwt endpoint
     */
    public function testProtectedRouteWithQueryToken(): void
    {
        $client = self::createClient(['environment' => 'prod']);

        $client->request('GET', '/protected/route?jwt='.$this->getTenantJWTCode());
        $this->assertResponseIsSuccessful();
    }

    /**
     * test authentication in dev mode
     */
    public function testProtectedRouteInDevEnvironment(): void
    {
        $client = self::createClient(['environment' => 'dev']);

        $client->request('GET', '/protected/route');
        $this->assertResponseIsSuccessful();
    }

    /**
     * test authentication with invalid jwt token
     */
    public function testProtectedRouteWithInvalidJWTToken(): void
    {
        $client = self::createClient(['environment' => 'prod']);

        $client->request('GET', '/protected/route?jwt=invalid');
        $this->assertResponseStatusCodeSame(403);
        $this->assertEquals('Authentication Failed: Failed to parse token', $client->getResponse()->getContent());
    }

    /**
     * @return string
     */
    public function getTenantJWTCode(): string
    {
        return JWT::encode([
            'iss' => 'client_key',
            'iat' => \time(),
            'exp' => \strtotime('+1 day'),
            'qsh' => QSHGenerator::generate('/protected_route', 'GET'),
            'sub' => 'admin',
        ], 'shared_secret');
    }
}
