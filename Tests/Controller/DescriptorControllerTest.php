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

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals(json_encode($data), $response->getContent());
        $this->assertEquals('application/json', $response->headers->get('Content-Type'));
    }
}
