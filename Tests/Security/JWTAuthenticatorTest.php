<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Security\JWTAuthenticator;
use AtlassianConnectBundle\Security\JWTUserProvider;
use Doctrine\Common\Persistence\ManagerRegistry;
use Doctrine\Common\Persistence\ObjectRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Class JWTAuthenticatorTest
 */
final class JWTAuthenticatorTest extends TestCase
{
    /**
     * @var JWTUserProvider|MockObject
     */
    private $userProvider;

    /**
     * @var KernelInterface|MockObject
     */
    private $kernel;

    /**
     * @var ManagerRegistry|MockObject
     */
    private $managerRegistry;

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
        $this->userProvider = $this->createMock(JWTUserProvider::class);
        $this->kernel = $this->createMock(KernelInterface::class);
        $this->managerRegistry = $this->createMock(ManagerRegistry::class);
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->tenantEntityClass = Tenant::class;
        $this->devTenant = 1;

        $this->managerRegistry
            ->method('getManager')
            ->willReturn($this->em);

        $this->jwtAuthenticator = new JWTAuthenticator(
            $this->userProvider,
            $this->kernel,
            $this->managerRegistry,
            $this->tenantEntityClass,
            $this->devTenant
        );
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
     * Test if a user gets fetched
     */
    public function testGetsUser(): void
    {
        $token = [
            'iss' => 'iss',
            'sub' => 'username',
        ];

        $tenant = new Tenant();

        $this->userProvider
            ->expects($this->once())
            ->method('getDecodedToken')
            ->willReturn((object) $token);

        $this->userProvider
            ->expects($this->once())
            ->method('loadUserByUsername')
            ->with('iss')
            ->willReturn($tenant);

        $user = $this->jwtAuthenticator->getUser(['jwt' => 'token'], $this->createMock(UserProviderInterface::class));

        $this->assertInstanceOf(Tenant::class, $user);
        $this->assertEquals('username', $tenant->getUsername());
    }
}
