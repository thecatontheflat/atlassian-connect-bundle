<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Controller;

use AtlassianConnectBundle\Controller\DescriptorController;
use PHPUnit\Framework\TestCase;

class DescriptorControllerTest extends TestCase
{
    public function testIndexAction(): void
    {
        $controller = new DescriptorController($data = [
            'name' => 'test dev',
        ]);

        $response = $controller->indexAction();
        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals(json_encode($data), $response->getContent());
    }
}
