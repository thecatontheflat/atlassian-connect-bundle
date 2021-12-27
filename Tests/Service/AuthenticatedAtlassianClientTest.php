<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Service\AuthenticatedAtlassianClient;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

final class AuthenticatedAtlassianClientTest extends TestCase
{
    /**
     * @var MockObject|HttpClientInterface
     */
    private $inner;
    private AuthenticatedAtlassianClient $client;

    protected function setUp(): void
    {
        $this->inner = $this->createMock(HttpClientInterface::class);
        $this->client = new AuthenticatedAtlassianClient($this->inner);
    }

    public function testTenantAuthorization(): void
    {
        $this->inner
            ->expects($this->once())
            ->method('request')
            ->with('GET', 'https://app.atlassian.com/resource', $this->callback(function (array $options): bool {
                $this->assertArrayHasKey('Authorization', $options['headers']);
                $this->assertStringStartsWith('JWT', $options['headers']['Authorization']);

                return true;
            }));

        $this->client->request('GET', 'https://app.atlassian.com/resource', ['tenant' => $this->getTenant(), 'user_id' => null]);
    }

    public function testWithUserId(): void
    {
        $response1 = $this->createMock(ResponseInterface::class);
        $response1->expects($this->once())
            ->method('toArray')
            ->willReturn(['access_token' => 'token']);
        $tenant = $this->getTenant();
        $tenant->method('getOauthClientId')->willReturn('oauth');

        $this->inner
            ->expects($this->exactly(2))
            ->method('request')
            ->withConsecutive(
                ['POST', 'https://oauth-2-authorization-server.services.atlassian.com/oauth2/token', $this->anything()],
                ['GET', 'https://app.atlassian.com/resource', $this->callback(function (array $options): bool {
                    $this->assertEquals('Bearer token', $options['headers']['Authorization']);

                    return true;
                })]
            )
            ->willReturnOnConsecutiveCalls($response1, $this->createMock(ResponseInterface::class));

        $this->client->request('GET', 'https://app.atlassian.com/resource', ['tenant' => $tenant, 'user_id' => 'user_id']);
    }

    public function testTenantNotSetUpForOauth(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Tenant is not set up as oath application. Install the app with "ACT_AS_USER" scope.');

        $this->inner->expects($this->never())->method('request');

        $this->client->request('GET', 'https://app.atlassian.com/resource', ['tenant' => $this->getTenant(), 'user_id' => 'user_id']);
    }

    /**
     * @return TenantInterface|MockObject
     */
    private function getTenant(): TenantInterface
    {
        $tenant = $this->createMock(TenantInterface::class);
        $tenant->method('getBaseUrl')
            ->willReturn('https://app.atlassian.com');

        $tenant->method('getAddonKey')
            ->willReturn('addon-key');

        $tenant
            ->method('getSharedSecret')
            ->willReturn('shared-secret');

        return $tenant;
    }
}
