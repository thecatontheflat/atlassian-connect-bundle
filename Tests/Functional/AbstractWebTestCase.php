<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;

abstract class AbstractWebTestCase extends WebTestCase
{
    public static function getParentContainer(): ContainerInterface
    {
        if (method_exists(self::class, 'getContainer')) {
            return self::getContainer();
        }

        return self::$container;
    }

    protected static function getKernelClass(): string
    {
        return App\Kernel::class;
    }
}
