<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Controller;

use AtlassianConnectBundle\Controller\UnlicensedController;
use PHPUnit\Framework\TestCase;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

class UnlicensedControllerTest extends TestCase
{
    public function testUnlicensedAction(): void
    {
        $loader = new FilesystemLoader();
        $loader->addPath(__DIR__.'/../../src/Resources/views', 'AtlassianConnect');

        $twig = new Environment($loader, [
            'debug' => true,
            'cache' => false,
        ]);

        $controller = new UnlicensedController($twig);

        $response = $controller->unlicensedAction();
        self::assertEquals(200, $response->getStatusCode());
    }
}
