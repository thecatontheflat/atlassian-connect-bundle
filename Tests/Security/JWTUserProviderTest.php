<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Security\JWTUserProvider;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Class JWTUserProviderTest
 */
final class JWTUserProviderTest extends TestCase
{
    /**
     * @var EntityManagerInterface|MockObject
     */
    private $entityManager;

    /**
     * @var JWTUserProvider
     */
    private $userProvider;

    /**
     * @var EntityRepository|MockObject
     */
    private $entityRepository;

    /**
     * Setup properties
     */
    protected function setUp(): void
    {
        $this->entityManager = $this->createMock(EntityManagerInterface::class);

        $this->entityRepository = $this->createMock(EntityRepository::class);
        $this->entityManager
            ->method('getRepository')
            ->willReturn($this->entityRepository);

        $this->userProvider = new JWTUserProvider(
            $this->entityManager,
            Tenant::class
        );
    }

    /**
     * @dataProvider jwtTokenProvider
     *
     * @param string $jwt
     * @param string $secret
     * @param string $isstoken
     * @param string $sub
     * @param string $name
     * @param int    $iat
     */
    public function testItDecodesAToken(string $jwt, string $secret, string $isstoken, string $sub, string $name, int $iat): void
    {
        $tenant = $this->createMock(TenantInterface::class);
        $tenant
            ->expects($this->once())
            ->method('getSharedSecret')
            ->willReturn($secret);

        $this->entityRepository->expects($this->once())
            ->method('findOneBy')
            ->with(['clientKey' => $isstoken])
            ->willReturn($tenant);

        $token = $this->userProvider->getDecodedToken($jwt);

        $this->assertEquals($sub, $token->sub);
        $this->assertEquals($name, $token->name);
        $this->assertEquals($isstoken, $token->iss);
        $this->assertEquals($iat, $token->iat);
    }

    /**
     * @return \Generator
     */
    public function jwtTokenProvider(): \Generator
    {
        yield [
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJpc3MiOiJpc3N0b2tlbiJ9.vcwW8PMPwPF2E-CkWflDrhAulR5dPWbbl-lOJheOwIY',
            'secret',
            'isstoken',
            '1234567890',
            'John Doe',
            1516239022,
        ];
        yield [
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIzLCJpc3MiOiJhbm90aGVySXNzVG9rZW4ifQ.wzTiSSNtS6rXoAYXL4tdmVzEbUvRd7BSuMq3kbboSA4',
            'anotherSecret',
            'anotherIssToken',
            '9876543210',
            'Jane Doe',
            1516239023,
        ];
    }

    /**
     * test loadUserByUsername method
     */
    public function testLoadsUserByUserName(): void
    {
        $tenant = $this->createMock(TenantInterface::class);

        $this->entityRepository
            ->expects($this->once())
            ->method('findOneBy')
            ->with([
                'clientKey' => 'key',
            ])
            ->willReturn($tenant);

        $result = $this->userProvider->loadUserByUsername('key');
        $this->assertSame($result, $tenant);
    }

    /**
     * @expectedException \Symfony\Component\Security\Core\Exception\UsernameNotFoundException
     */
    public function testItFailsToLoadAUserByUserName(): void
    {
        $this->entityRepository
            ->expects($this->once())
            ->method('findOneBy')
            ->with([
                'clientKey' => 'key',
            ])
            ->willReturn(null);

        $this->userProvider->loadUserByUsername('key');
    }

    /**
     * @expectedException \Symfony\Component\Security\Core\Exception\UnsupportedUserException
     */
    public function testRefreshUserIsNotSupported(): void
    {
        $this->userProvider->refreshUser($this->createMock(UserInterface::class));
    }

    /**
     * @param mixed $class
     * @param bool  $isSupported
     *
     * @dataProvider classProvider
     */
    public function testItSupportsAclass($class, bool $isSupported): void
    {
        $result = $this->userProvider->supportsClass($class);

        $this->assertEquals($isSupported, $result);
    }

    /**
     * @return \Generator
     */
    public function classProvider(): \Generator
    {
        yield [new Tenant(), true];
        yield [new StubbedTenant(), true];
        yield [new \stdClass(), false];
    }
}
