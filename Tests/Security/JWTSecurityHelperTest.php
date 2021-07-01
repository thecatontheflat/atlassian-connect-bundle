<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Security\JWTSecurityHelper;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ObjectRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Class JWTSecurityHelperTest
 */
final class JWTSecurityHelperTest extends TestCase
{
    /**
     * @var EntityManagerInterface|MockObject
     */
    private $em;

    /**
     * @var JWTSecurityHelper
     */
    private $helper;

    /**
     * Setup method
     */
    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->helper = new JWTSecurityHelper($this->em, 1, 'dev', TenantInterface::class);
    }

    /**
     * @dataProvider supportsRequestProvider
     *
     * @param Request  $request
     * @param bool     $supportsRequest
     * @param int|null $devTenant
     * @param string   $environment
     */
    public function testSupportsRequest(
        Request $request,
        bool $supportsRequest,
        ?int $devTenant,
        string $environment
    ): void {
        $helper = new JWTSecurityHelper($this->em, $devTenant, $environment, TenantInterface::class);

        $this->assertSame($supportsRequest, $helper->supportsRequest($request));
    }

    /**
     * @return \Generator
     */
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

    /**
     * Test if the jwt token can be fetched from the query parameters.
     */
    public function testGetJWTFromQueryParameter(): void
    {
        $request = new Request(['jwt' => 'token']);

        $this->assertSame('token', $this->helper->getJWTToken($request));
    }

    /**
     * Test if the jwt token can be fetched from the request headers.
     */
    public function testGetJWTFromAuthorizationHeader(): void
    {
        $request = new Request();
        $request->headers->set('authorization', 'Bearer token');

        $this->assertSame('token', $this->helper->getJWTToken($request));
    }

    /**
     * Test if the jwt token can be fetched from the dev tenant.
     */
    public function testGetJWTFromDevTenant(): void
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

        $jwt = $this->helper->getJWTToken(Request::create('/test'));
        $this->assertNotNull($jwt);
        $this->assertStringContainsString(
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.',
            $jwt
        );
    }

    /**
     * Test repository cannot find tenant
     */
    public function testCannotFindTenant(): void
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

        $this->helper->getJWTToken(new Request());
    }

    /**
     * Test there is no jwt token at all
     */
    public function testNoJWTToken(): void
    {
        $helper = new JWTSecurityHelper($this->em, 1, 'prod', TenantInterface::class);

        $this->em->expects($this->never())->method('getRepository');
        $this->assertNull($helper->getJWTToken(new Request()));
    }
}
