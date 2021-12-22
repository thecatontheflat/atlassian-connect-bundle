<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use AtlassianConnectBundle\Security\JWTSecurityHelper;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class JWTSecurityHelperTest extends TestCase
{
    /** @var TenantRepositoryInterface|MockObject */
    private $repository;

    private JWTSecurityHelper $helper;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(TenantRepositoryInterface::class);
        $this->helper = new JWTSecurityHelper($this->repository, 1, 'dev');
    }

    /**
     * @dataProvider supportsRequestProvider
     */
    public function testSupportsRequest(
        Request $request,
        bool $supportsRequest,
        ?int $devTenant,
        string $environment
    ): void {
        $helper = new JWTSecurityHelper($this->repository, $devTenant, $environment);

        $this->assertSame($supportsRequest, $helper->supportsRequest($request));
    }

    public function supportsRequestProvider(): \Generator
    {
        $request = new Request(['jwt' => 'token']);

        yield 'query_parameter' => [$request, true, null, 'prod'];

        $request = new Request();

        yield 'empty_request' => [$request, false, null, 'prod'];

        $request = new Request();
        $request->headers->set('authorization', 'Bearer token');

        yield 'header' => [$request, true, null, 'prod'];

        yield 'dev_tenant' => [new Request(), true, 1, 'dev'];

        yield 'no_dev_tenant' => [new Request(), false, null, 'dev'];

        yield 'dev_tenant_prod' => [new Request(), false, 1, 'prod'];
    }

    public function testGetJWTFromQueryParameter(): void
    {
        $request = new Request(['jwt' => 'token']);

        $this->assertSame('token', $this->helper->getJWTToken($request));
    }

    public function testGetJWTFromAuthorizationHeader(): void
    {
        $request = new Request();
        $request->headers->set('authorization', 'Bearer token');

        $this->assertSame('token', $this->helper->getJWTToken($request));
    }

    public function testGetJWTFromDevTenant(): void
    {
        $tenant = new Tenant();
        $tenant->setClientKey('client_key');
        $tenant->setSharedSecret('shared_secret');

        $this->repository
            ->expects($this->once())
            ->method('findById')
            ->with(1)
            ->willReturn($tenant);

        $jwt = $this->helper->getJWTToken(Request::create('/test'));
        $this->assertNotNull($jwt);
        $this->assertStringContainsString(
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.',
            $jwt
        );
    }

    public function testCannotFindTenant(): void
    {
        $this->expectException(\RuntimeException::class);

        $this->repository
            ->expects($this->once())
            ->method('findById')
            ->with(1)
            ->willReturn(null);

        $this->helper->getJWTToken(new Request());
    }

    public function testNoJWTToken(): void
    {
        $helper = new JWTSecurityHelper($this->repository, 1, 'prod');

        $this->repository->expects($this->never())->method('findById');

        $this->assertNull($helper->getJWTToken(new Request()));
    }
}
