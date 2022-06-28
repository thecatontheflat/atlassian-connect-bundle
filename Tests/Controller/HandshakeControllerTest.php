<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Controller;

use AtlassianConnectBundle\Controller\HandshakeController;
use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use Firebase\JWT\JWT;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Log\Logger;

class HandshakeControllerTest extends TestCase
{
    public function testCreateTenant(): void
    {
        $repository = $this->createMock(TenantRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findByClientKey')
            ->with('test')
            ->willReturn(null);
        $repository
            ->expects($this->once())
            ->method('initializeTenant')
            ->willReturn(new Tenant());

        $expectedTenant = new Tenant();
        $expectedTenant
            ->setAddonKey('test')
            ->setClientKey('test')
            ->setPublicKey('test')
            ->setSharedSecret('test')
            ->setServerVersion('test')
            ->setPluginsVersion('test')
            ->setBaseUrl('test')
            ->setProductType('test')
            ->setDescription('test')
            ->setEventType('test')
            ->setOauthClientId('test');

        $repository->expects($this->once())
            ->method('save')
            ->with($expectedTenant);

        $controller = new HandshakeController($repository, new Logger());
        $request = new Request([], [], [], [], [], [], json_encode([
            'key' => 'test',
            'clientKey' => 'test',
            'publicKey' => 'test',
            'sharedSecret' => 'test',
            'serverVersion' => 'test',
            'pluginsVersion' => 'test',
            'baseUrl' => 'test',
            'productType' => 'test',
            'description' => 'test',
            'eventType' => 'test',
            'oauthClientId' => 'test',
        ]));

        $response = $controller->registerAction($request);
        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals('OK', $response->getContent());
    }

    public function testUpdateTenant(): void
    {
        $tenant = new Tenant();
        $tenant
            ->setAddonKey('test')
            ->setClientKey('test')
            ->setPublicKey('test')
            ->setSharedSecret('test')
            ->setServerVersion('test')
            ->setPluginsVersion('test')
            ->setBaseUrl('test')
            ->setProductType('test')
            ->setDescription('test')
            ->setEventType('test')
            ->setOauthClientId('test');

        $repository = $this->createMock(TenantRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findByClientKey')
            ->with('test')
            ->willReturn($tenant);
        $repository
            ->expects($this->never())
            ->method('initializeTenant');

        $expectedTenant = new Tenant();
        $expectedTenant
            ->setAddonKey('test2')
            ->setClientKey('test')
            ->setPublicKey('test2')
            ->setSharedSecret('test')
            ->setServerVersion('test2')
            ->setPluginsVersion('test')
            ->setBaseUrl('test2')
            ->setProductType('test2')
            ->setDescription('test')
            ->setEventType('test')
            ->setOauthClientId('test');

        $repository->expects($this->once())
            ->method('save')
            ->with($expectedTenant);

        $controller = new HandshakeController($repository, new Logger());
        $request = new Request([], [], [], [], [], ['HTTP_AUTHORIZATION' => 'Bearer '.JWT::encode([], 'test', 'HS256')], json_encode([
            'key' => 'test2',
            'clientKey' => 'test',
            'publicKey' => 'test2',
            'sharedSecret' => 'test',
            'serverVersion' => 'test2',
            'pluginsVersion' => 'test',
            'baseUrl' => 'test2',
            'productType' => 'test2',
            'description' => 'test',
            'eventType' => 'test',
            'oauthClientId' => 'test',
        ]));

        $response = $controller->registerAction($request);
        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals('OK', $response->getContent());
    }

    public function testUnauthorized(): void
    {
        $tenant = new Tenant();
        $tenant
            ->setAddonKey('test')
            ->setClientKey('test')
            ->setPublicKey('test')
            ->setSharedSecret('differentsharedsecret')
            ->setServerVersion('test')
            ->setPluginsVersion('test')
            ->setBaseUrl('test')
            ->setProductType('test')
            ->setDescription('test')
            ->setEventType('test')
            ->setOauthClientId('test');

        $repository = $this->createMock(TenantRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findByClientKey')
            ->with('test')
            ->willReturn($tenant);

        $repository
            ->expects($this->never())
            ->method('initializeTenant');

        $repository->expects($this->never())
            ->method('save');

        $controller = new HandshakeController($repository, new NullLogger());
        $request = new Request([], [], [], [], [], ['HTTP_AUTHORIZATION' => 'Bearer '.JWT::encode([], 'test', 'HS256')], json_encode([
            'key' => 'test2',
            'clientKey' => 'test',
            'publicKey' => 'test2',
            'sharedSecret' => 'test',
            'serverVersion' => 'test2',
            'pluginsVersion' => 'test',
            'baseUrl' => 'test2',
            'productType' => 'test2',
            'description' => 'test',
            'eventType' => 'test',
            'oauthClientId' => 'test',
        ]));

        $response = $controller->registerAction($request);
        self::assertEquals(401, $response->getStatusCode());
        self::assertEquals('Unauthorized', $response->getContent());
    }
}
