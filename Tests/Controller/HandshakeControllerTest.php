<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Controller;

use AtlassianConnectBundle\Controller\HandshakeController;
use AtlassianConnectBundle\Entity\Tenant;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ObjectRepository;
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
        $tenantRepository = $this->getMockBuilder(ObjectRepository::class)->addMethods(['findOneByClientKey'])->getMockForAbstractClass();
        $tenantRepository->expects($this->any())
            ->method('findOneByClientKey')
            ->willReturn(null);

        $objectManager = $this->createMock(EntityManagerInterface::class);
        $objectManager->expects($this->any())
            ->method('getRepository')
            ->willReturn($tenantRepository);

        $controller = new HandshakeController($objectManager, new Logger(), Tenant::class);
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
