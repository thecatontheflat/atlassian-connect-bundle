<?php declare(strict_types = 1);

namespace Bukashk0zzz\FilterBundle\Tests\DependencyInjection;

use AtlassianConnectBundle\Controller\DescriptorController;
use PHPUnit\Framework\TestCase;

/**
 * DescriptorControllerTest
 */
class DescriptorControllerTest extends TestCase
{
    /**
     * Test
     */
    public function testIndexAction(): void
    {
        $data = [
            'name' => 'test dev',
        ];

        $controller = new DescriptorController('dev', [
            'dev_tenant' => 1,
            'prod' => [],
            'dev' => $data,
        ]);

        $response = $controller->indexAction();
        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals(\json_encode($data), $response->getContent());
    }
}
