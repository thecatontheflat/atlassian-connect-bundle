<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

use AtlassianConnectBundle\Tests\Functional\App\Kernel;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase as BaseKernelTestCase;

abstract class KernelTestCase extends BaseKernelTestCase
{
    protected static function getKernelClass(): string
    {
        return Kernel::class;
    }
}
