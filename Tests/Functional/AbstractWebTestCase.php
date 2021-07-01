<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Kernel;

/**
 * abstract class AbstractWebTestCase
 */
abstract class AbstractWebTestCase extends WebTestCase
{
    /**
     * setup method
     */
    protected function setUp(): void
    {
        if (Kernel::VERSION_ID >= 50100) {
            return;
        }

        $this->markTestSkipped('These tests only run on Symfony 5.2 or higher');
    }

    /**
     * @return ContainerInterface
     */
    public static function getParentContainer(): ContainerInterface
    {
        if (\method_exists(self::class, 'getContainer')) {
            return self::getContainer();
        }

        return self::$container;
    }

    /**
     * @return string
     */
    protected static function getKernelClass()
    {
        return 'AtlassianConnectBundle\Tests\Functional\App\Kernel';
    }
}
