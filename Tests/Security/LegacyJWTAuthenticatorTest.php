<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Security\JWTSecurityHelperInterface;
use AtlassianConnectBundle\Security\JWTUserProvider;
use AtlassianConnectBundle\Security\JWTUserProviderInterface;
use AtlassianConnectBundle\Security\LegacyJWTAuthenticator;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Guard\AbstractGuardAuthenticator;

/**
 * Class LegacyJWTAuthenticatorTest
 */
final class LegacyJWTAuthenticatorTest extends TestCase
{
    /**
     * @var JWTSecurityHelperInterface|MockObject
     */
    private $securityHelper;

    /**
     * @var LegacyJWTAuthenticator
     */
    private $jwtAuthenticator;

    /**
     * Setup Before Class
     *
     * @return void
     */
    public static function setUpBeforeClass(): void
    {
        if (!\class_exists(AbstractGuardAuthenticator::class)) {
            self::markTestSkipped('Test only applies to symfony/security-guard 5.4 or earlier');
        }
    }

    /**
     * Setup method
     */
    public function setUp(): void
    {
        $this->securityHelper = $this->createMock(JWTSecurityHelperInterface::class);

        $this->jwtAuthenticator = new LegacyJWTAuthenticator($this->securityHelper);
    }

    /**
     * Test start method
     */
    public function testItSendsA401WhenNoAuthenticationHeaderIsSet(): void
    {
        $response = $this->jwtAuthenticator->start(new Request());

        $this->assertEquals('Authentication header required', $response->getContent());
        $this->assertEquals(401, $response->getStatusCode());
    }

    /**
     * Tests if the request is supported
     */
    public function testSupportsRequest(): void
    {
        $this->securityHelper
            ->expects($this->once())
            ->method('supportsRequest')
            ->with($request = new Request())
            ->willReturn(true);

        $this->assertTrue($this->jwtAuthenticator->supports($request));
    }

    /**
     * Test if the getCredentials method returns a valid array
     */
    public function testGetsCredentials(): void
    {
        $request = new Request(['jwt' => 'token']);
        $this->securityHelper
            ->expects($this->once())
            ->method('getJWTToken')
            ->with($request)
            ->willReturn('token');

        $this->assertSame(['jwt' => 'token'], $this->jwtAuthenticator->getCredentials($request));
    }

    /**
     * Test if the getCredentials method returns null when no jwt token is passed
     */
    public function testGetsCredentialsTokenDoesNotExist(): void
    {
        $request = new Request();
        $this->securityHelper
            ->expects($this->once())
            ->method('getJWTToken')
            ->with($request)
            ->willReturn(null);

        $this->assertNull($this->jwtAuthenticator->getCredentials($request));
    }

    /**
     * Test get user gets invalid user provider
     */
    public function testGetUserGetsInvalidUserProvider(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('UserProvider must implement AtlassianConnectBundle\Security\JWTUserProviderInterface');

        $userProvider = $this->createMock(UserProviderInterface::class);

        $this->jwtAuthenticator->getUser('credentials', $userProvider);
    }

    /**
     * Test get user without client key throws exception
     */
    public function testGetUserWithoutClientKeyThrowsException(): void
    {
        $this->expectException(AuthenticationException::class);
        $this->expectExceptionMessage('API Key "token" does not exist.');

        $token = [
            'sub' => 'username',
            'iss' => null,
        ];

        $userProvider = $this->createMock(JWTUserProviderInterface::class);
        $userProvider
            ->expects($this->once())
            ->method('getDecodedToken')
            ->willReturn((object) $token);

        $this->jwtAuthenticator->getUser(['jwt' => 'token'], $userProvider);
    }

    /**
     * Test UserProvider with loadByIdentifier metdho
     */
    public function testUserProviderHasLoadMethod(): void
    {
        $token = [
            'iss' => 'iss',
            'sub' => 'username',
        ];

        $tenant = new Tenant();

        $userProvider = $this->createMock(JWTUserProvider::class);
        $userProvider
            ->expects($this->once())
            ->method('getDecodedToken')
            ->willReturn((object) $token);

        $userProvider
            ->expects($this->once())
            ->method('loadUserByIdentifier')
            ->with('iss')
            ->willReturn($tenant);

        $user = $this->jwtAuthenticator->getUser(['jwt' => 'token'], $userProvider);

        $this->assertInstanceOf(Tenant::class, $user);
        $this->assertEquals('username', $tenant->getUsername());
    }

    /**
     * Test if a user gets fetched
     */
    public function testGetsUser(): void
    {
        $token = [
            'iss' => 'iss',
            'sub' => 'username',
        ];

        $tenant = new Tenant();

        $userProvider = $this->createMock(JWTUserProviderInterface::class);
        $userProvider
            ->expects($this->once())
            ->method('getDecodedToken')
            ->willReturn((object) $token);

        $userProvider
            ->expects($this->once())
            ->method('loadUserByUsername')
            ->with('iss')
            ->willReturn($tenant);

        $user = $this->jwtAuthenticator->getUser(['jwt' => 'token'], $userProvider);

        $this->assertInstanceOf(Tenant::class, $user);
        $this->assertEquals('username', $tenant->getUsername());
    }

    /**
     * test checkCredentials method
     */
    public function testItChecksCredentials(): void
    {
        $this->assertTrue($this->jwtAuthenticator->checkCredentials(null, $this->createMock(UserInterface::class)));
    }

    /**
     * test onAuthenticationFailure Method
     */
    public function testItSendsAResponseOnAuthenticationFailure(): void
    {
        $response = $this->jwtAuthenticator->onAuthenticationFailure(new Request(), new AuthenticationException('Error'));

        $this->assertEquals('Authentication Failed: Error', $response->getContent());
        $this->assertEquals(403, $response->getStatusCode());
    }

    /**
     * test onAuthenticationSuccess method
     */
    public function testItDoesNotSendAResponseOnAuthenticationSuccess(): void
    {
        $this->assertNull($this->jwtAuthenticator->onAuthenticationSuccess(new Request(), $this->createMock(TokenInterface::class), 'main'));
    }

    /**
     * test supportsRememberMe method
     */
    public function testItDoesNotSupportRememberMeFunctionality(): void
    {
        $this->assertFalse($this->jwtAuthenticator->supportsRememberMe());
    }
}
