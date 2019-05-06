<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\DependencyInjection;

use AtlassianConnectBundle\Controller\UnlicensedController;
use PHPUnit\Framework\TestCase;

/**
 * UnlicensedControllerTest
 */
class UnlicensedControllerTest extends TestCase
{
    /**
     * Test
     */
    public function testUnlicensedAction(): void
    {
        $loader = new \Twig_Loader_Filesystem();
        $loader->addPath(__DIR__.'/../../src/Resources/views', 'AtlassianConnect');

        $twig = new \Twig_Environment($loader, [
            'debug' => true,
            'cache' => false,
        ]);

        $controller = new UnlicensedController($twig);

        $response = $controller->unlicensedAction();
        self::assertEquals(200, $response->getStatusCode());
    }
}
