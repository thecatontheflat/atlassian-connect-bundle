<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Service\AtlassianRestClient;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

final class AtlassianRestClientTest extends TestCase
{
    private const APP_URL = 'https://app.atlassian.com';

    /** @var HttpClientInterface|MockObject */
    private $client;

    /** @var MockObject|TokenStorageInterface */
    private $tokenStorage;

    private AtlassianRestClient $restClient;

    protected function setUp(): void
    {
        $this->client = $this->createMock(HttpClientInterface::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

        $this->restClient = new AtlassianRestClient($this->client, $this->tokenStorage);
    }

    public function testGetWithTenantBaseUrl(): void
    {
        $this->restClient->setTenant($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('GET', self::APP_URL.'/resource', ['tenant' => $tenant, 'user_id' => null])
            ->willReturn($this->getResponse('OK'));

        $this->restClient->get('/resource');
    }

    public function testWithFullUrl(): void
    {
        $this->restClient->setTenant($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('GET', 'https://other-app.atlassian.com/resource', ['tenant' => $tenant, 'user_id' => null])
            ->willReturn($this->getResponse('OK'));

        $this->restClient->get('https://other-app.atlassian.com/resource');
    }

    public function testGetWithUserIdentifier(): void
    {
        $this->restClient->setTenant($tenant = $this->getTenant())
            ->actAsUser('user_id');

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('GET', self::APP_URL.'/resource', ['tenant' => $tenant, 'user_id' => 'user_id'])
            ->willReturn($this->getResponse('OK'));

        $this->restClient->get('/resource');
    }

    public function testPost(): void
    {
        $this->restClient->setTenant($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('POST', self::APP_URL.'/resource', ['tenant' => $tenant, 'user_id' => null, 'headers' => ['Content-Type' => 'application/json'], 'json' => ['data' => 'data']])
            ->willReturn($this->getResponse('OK'));

        $this->restClient->post('/resource', ['data' => 'data']);
    }

    public function testPut(): void
    {
        $this->restClient->setTenant($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('PUT', self::APP_URL.'/resource', ['tenant' => $tenant, 'user_id' => null, 'headers' => ['Content-Type' => 'application/json'], 'json' => ['data' => 'data']])->willReturn($this->getResponse('OK'));

        $this->restClient->put('/resource', ['data' => 'data']);
    }

    public function testDelete(): void
    {
        $this->restClient->setTenant($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('DELETE', self::APP_URL.'/resource', ['tenant' => $tenant, 'user_id' => null])
            ->willReturn($this->getResponse('OK'));

        $this->restClient->delete('/resource');
    }

    public function testSendFile(): void
    {
        $file = fopen(__DIR__.'/file.txt', 'w');
        fwrite($file, 'text');

        $uploadedFile = new File(__DIR__.'/file.txt');

        $this->restClient->setTenant($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('POST', self::APP_URL.'/resource', $this->anything())
            ->willReturn($this->getResponse('OK'));

        $this->restClient->sendFile($uploadedFile, '/resource');
    }

    public function testGetTenantFromTokenStorage(): void
    {
        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn($token = $this->createMock(TokenInterface::class));

        $token
            ->expects($this->once())
            ->method('getUser')
            ->willReturn($tenant = $this->getTenant());

        $this->client
            ->expects($this->once())
            ->method('request')
            ->with('GET', self::APP_URL.'/resource', ['tenant' => $tenant, 'user_id' => null])
            ->willReturn($this->getResponse('OK'));

        $this->restClient->get('/resource');
    }

    public function testNoTenantInToken(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectDeprecationMessage('Could not get tenant from token');

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn(null);

        $this->restClient->get('/resource');
    }

    public function testNotInTenantContext(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectDeprecationMessage('Current user is not a Tenant');

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn($token = $this->createMock(TokenInterface::class));
        $token->expects($this->once())
            ->method('getUser')
            ->willReturn($this->createMock(UserInterface::class));

        $this->restClient->get('/resource');
    }

    private function getResponse(string $content): ResponseInterface
    {
        $response = $this->createMock(ResponseInterface::class);
        $response->method('getContent')->willReturn($content);

        return $response;
    }

    private function getTenant(): TenantInterface
    {
        $tenant = $this->createMock(TenantInterface::class);
        $tenant->method('getBaseUrl')
            ->willReturn(self::APP_URL);

        return $tenant;
    }
}
