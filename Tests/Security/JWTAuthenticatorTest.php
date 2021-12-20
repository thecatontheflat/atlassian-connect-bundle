<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Security\JWTAuthenticator;
use AtlassianConnectBundle\Security\JWTSecurityHelperInterface;
use AtlassianConnectBundle\Security\JWTUserProvider;
use AtlassianConnectBundle\Security\JWTUserProviderInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

final class JWTAuthenticatorTest extends TestCase
{
    /**
     * @var JWTUserProviderInterface|MockObject
     */
    private $userProvider;

    /**
     * @var JWTSecurityHelperInterface|MockObject
     */
    private $securityHelper;

    private JWTAuthenticator $jwtAuthenticator;

    protected function setUp(): void
    {
        if (Kernel::VERSION_ID < 50100) {
            $this->markTestSkipped('This test only works with the new authenticator mechanism');
        }

        $this->userProvider = $this->createMock(JWTUserProvider::class);
        $this->securityHelper = $this->createMock(JWTSecurityHelperInterface::class);
        $this->jwtAuthenticator = new JWTAuthenticator(
            $this->userProvider,
            $this->securityHelper
        );
    }

    public function testSupportsRequest(): void
    {
        $this->securityHelper
            ->expects($this->once())
            ->method('supportsRequest')
            ->with($request = new Request())
            ->willReturn(true);

        $this->assertTrue($this->jwtAuthenticator->supports($request));
    }

    public function testAuthenticate(): void
    {
        $token = [
            'sub' => 'username',
            'iss' => 'key',
        ];

        $this->securityHelper
            ->expects($this->once())
            ->method('getJWTToken')
            ->with($request = new Request())
            ->willReturn('token');

        $this->userProvider
            ->expects($this->once())
            ->method('getDecodedToken')
            ->with('token')
            ->willReturn((object) $token);

        $this->userProvider
            ->expects($this->once())
            ->method('loadUserByIdentifier')
            ->with('key')
            ->willReturn($tenant = new Tenant());

        $result = $this->jwtAuthenticator->authenticate($request);

        if (class_exists(UserBadge::class)) {
            $this->assertEquals(
                new SelfValidatingPassport(new UserBadge('key')),
                $result
            );
        } else {
            $this->assertEquals(
                new SelfValidatingPassport($tenant),
                $result
            );
        }
    }

    public function testAuthenticateHasNoJWTToken(): void
    {
        $this->expectException(CustomUserMessageAuthenticationException::class);
        $this->expectExceptionMessage('JWT Token not provided');

        $this->securityHelper
            ->expects($this->once())
            ->method('getJWTToken')
            ->with($request = new Request())
            ->willReturn(null);

        $this->jwtAuthenticator->authenticate($request);
    }

    public function testAuthenticateHasNoClientKey(): void
    {
        $this->expectException(CustomUserMessageAuthenticationException::class);
        $this->expectExceptionMessage('API Key token does not exist');

        $token = [
            'sub' => 'username',
            'iss' => null,
        ];

        $this->securityHelper
            ->expects($this->once())
            ->method('getJWTToken')
            ->with($request = new Request())
            ->willReturn('token');

        $this->userProvider
            ->expects($this->once())
            ->method('getDecodedToken')
            ->with('token')
            ->willReturn((object) $token);

        $this->jwtAuthenticator->authenticate($request);
    }

    public function testItSendsAResponseOnAuthenticationFailure(): void
    {
        $response = $this->jwtAuthenticator->onAuthenticationFailure(new Request(), new AuthenticationException('Error'));

        $this->assertEquals('Authentication Failed: Error', $response->getContent());
        $this->assertEquals(403, $response->getStatusCode());
    }

    public function testItDoesNotSendAResponseOnAuthenticationSuccess(): void
    {
        $this->assertNull($this->jwtAuthenticator->onAuthenticationSuccess(new Request(), $this->createMock(TokenInterface::class), 'main'));
    }

    public function testStartMethod(): void
    {
        $this->assertEquals(
            new Response('Authentication header required', 401),
            $this->jwtAuthenticator->start(new Request())
        );
    }
}
