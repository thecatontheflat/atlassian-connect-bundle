<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Security\JWTUserProvider;
use AtlassianConnectBundle\Storage\TenantStorageInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Class JWTUserProviderTest
 */
final class JWTUserProviderTest extends TestCase
{
    /**
     * @var JWTUserProvider
     */
    private $userProvider;

    /**
     * @var TenantStorageInterface|MockObject
     */
    private $tenantStorage;

    /**
     * Setup properties
     */
    protected function setUp(): void
    {
        $this->tenantStorage = $this->createMock(TenantStorageInterface::class);

        $this->userProvider = new JWTUserProvider($this->tenantStorage);
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

        $this->tenantStorage->expects($this->once())
            ->method('findByClientKey')
            ->with($isstoken)
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

        $this->tenantStorage
            ->expects($this->once())
            ->method('findByClientKey')
            ->with('key')
            ->willReturn($tenant);

        $result = $this->userProvider->loadUserByUsername('key');
        $this->assertSame($result, $tenant);
    }

    /**
     * Test it fails to load a user by user name
     */
    public function testItFailsToLoadAUserByUserName(): void
    {
        $this->expectException(UsernameNotFoundException::class);

        $this->tenantStorage
            ->expects($this->once())
            ->method('findByClientKey')
            ->with('key')
            ->willReturn(null);

        $this->userProvider->loadUserByUsername('key');
    }

    /**
     * Test refresh user is not supported
     */
    public function testRefreshUserIsNotSupported(): void
    {
        $this->expectException(UnsupportedUserException::class);

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
