<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\DependencyInjection;

use AtlassianConnectBundle\Controller\HandshakeController;
use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Storage\TenantStorageInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Log\Logger;

/**
 * HandshakeControllerTest
 */
class HandshakeControllerTest extends TestCase
{
    /**
     * Test
     */
    public function testIndexAction(): void
    {
        $tenantStorage = $this->createMock(TenantStorageInterface::class);

        $controller = new HandshakeController($tenantStorage, new Logger(), Tenant::class);
        $request = new Request([], [], [], [], [], [], \json_encode([
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
        ]));

        $response = $controller->registerAction($request);
        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals('OK', $response->getContent());
    }
}
