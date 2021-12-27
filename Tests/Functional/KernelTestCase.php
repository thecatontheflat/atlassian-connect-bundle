<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

use AtlassianConnectBundle\Tests\Functional\App\Kernel;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase as BaseKernelTestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;

abstract class KernelTestCase extends BaseKernelTestCase
{
    protected static function getKernelClass(): string
    {
        return Kernel::class;
    }

    protected static function getContainer(): ContainerInterface
    {
        if (method_exists(parent::class, 'getContainer')) {
            return parent::getContainer();
        }

        return self::$container;
    }
}
