<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Security\JWTAuthenticator;
use AtlassianConnectBundle\Security\JWTUserProviderInterface;
use Doctrine\Common\Persistence\ObjectRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Class JWTAuthenticatorTest
 */
final class JWTAuthenticatorTest extends TestCase
{
    /**
     * @var KernelInterface|MockObject
     */
    private $kernel;

    /**
     * @var EntityManagerInterface|MockObject
     */
    private $em;

    /**
     * @var string
     */
    private $tenantEntityClass;

    /**
     * @var int
     */
    private $devTenant;

    /**
     * @var JWTAuthenticator
     */
    private $jwtAuthenticator;

    /**
     * Setup method
     */
    public function setUp(): void
    {
        $this->kernel = $this->createMock(KernelInterface::class);
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->tenantEntityClass = Tenant::class;
        $this->devTenant = 1;

        $this->jwtAuthenticator = new JWTAuthenticator(
            $this->kernel,
            $this->em,
            $this->tenantEntityClass,
            $this->devTenant
        );
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
        $request = new Request(['jwt' => 'token']);
        $this->assertTrue($this->jwtAuthenticator->supports($request));

        $request = new Request();
        $request->headers->set('authorization', 'jwt token');
        $this->assertTrue($this->jwtAuthenticator->supports($request));

        $request = new Request();

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('dev');

        $this->assertTrue($this->jwtAuthenticator->supports($request));
    }

    /**
     * Tests if the request is not supportd
     */
    public function testDoesNotSupportRequest(): void
    {
        $request = new Request();
        $this->assertFalse($this->jwtAuthenticator->supports($request));
    }

    /**
     * Test if the getCredentials method returns a valid array
     */
    public function testGetsCredentials(): void
    {
        $request = new Request(['jwt' => 'token']);
        $credentials = $this->jwtAuthenticator->getCredentials($request);
        $this->assertIsArray($credentials);
        $this->assertArrayHasKey('jwt', $credentials);
        $this->assertEquals('token', $credentials['jwt']);

        $request = new Request();
        $request->headers->set('authorization', 'jwt token');
        $credentials = $this->jwtAuthenticator->getCredentials($request);
        $this->assertIsArray($credentials);
        $this->assertArrayHasKey('jwt', $credentials);
        $this->assertEquals('token', $credentials['jwt']);
    }

    /**
     * Test if the getCredentials method returns null when no jwt token is passed
     */
    public function testGetsCredentialsTokenDoesNotExist(): void
    {
        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('prod');

        $request = new Request();
        $credentials = $this->jwtAuthenticator->getCredentials($request);
        $this->assertNull($credentials);
    }

    /**
     * Test if the getCredentials method can get the credentials in dev mode
     */
    public function testGetsCredentialsOnDevTenant(): void
    {
        $tenant = new Tenant();
        $tenant->setClientKey('client_key');
        $tenant->setSharedSecret('shared_secret');

        $repository = $this->createMock(ObjectRepository::class);
        $repository
            ->expects($this->once())
            ->method('find')
            ->with(1)
            ->willReturn($tenant);

        $this->em
            ->expects($this->once())
            ->method('getRepository')
            ->willReturn($repository);

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('dev');

        $request = new Request();
        $credentials = $this->jwtAuthenticator->getCredentials($request);
        $this->assertIsArray($credentials);
        $this->assertArrayHasKey('jwt', $credentials);
        $this->assertIsString($credentials['jwt']);
    }

    /**
     * Test it fails when no tenant exists
     */
    public function testItFailsWhenNoTenantExists(): void
    {
        $this->expectException(\RuntimeException::class);

        $repository = $this->createMock(ObjectRepository::class);
        $repository
            ->expects($this->once())
            ->method('find')
            ->with(1)
            ->willReturn(null);

        $this->em
            ->expects($this->once())
            ->method('getRepository')
            ->willReturn($repository);

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('dev');

        $request = new Request();
        $this->jwtAuthenticator->getCredentials($request);
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
