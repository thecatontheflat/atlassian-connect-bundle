<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional\App;

use AtlassianConnectBundle\AtlassianConnectBundle;
use Doctrine\Bundle\DoctrineBundle\DoctrineBundle;
use Doctrine\Bundle\FixturesBundle\DoctrineFixturesBundle;
use Psr\Log\NullLogger;
use Symfony\Bundle\FrameworkBundle\FrameworkBundle;
use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Bundle\SecurityBundle\SecurityBundle;
use Symfony\Bundle\TwigBundle\TwigBundle;
use Symfony\Component\Config\Loader\LoaderInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\Bundle\BundleInterface;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

final class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    /**
     * @return array<BundleInterface>
     */
    public function registerBundles(): array
    {
        return [
            new FrameworkBundle(),
            new TwigBundle(),
            new SecurityBundle(),
            new DoctrineBundle(),
            new DoctrineFixturesBundle(),
            new AtlassianConnectBundle(),
        ];
    }

    public function getProjectDir(): string
    {
        return \dirname(__DIR__);
    }

    public function getCacheDir(): string
    {
        return sys_get_temp_dir().'/com.github.thecatontheflat.atlassian/tests/var/cache';
    }

    public function getLogDir(): string
    {
        return sys_get_temp_dir().'/com.github.thecatontheflat.atlassian/tests/var'.$this->environment.'/log';
    }

    protected function configureContainer(ContainerBuilder $container, LoaderInterface $loader): void
    {
        $configDir = $this->getProjectDir().'/config';

        $loader->load($configDir.'/{base}/*.yaml', 'glob');

        $loader->load($configDir.'/{packages}/*.yaml', 'glob');
        $loader->load($configDir.'/{services}.yaml', 'glob');
    }

    protected function build(ContainerBuilder $container): void
    {
        if (self::MAJOR_VERSION < 6) {
            $container->prependExtensionConfig('security', ['enable_authenticator_manager' => true]);
        }

        $container->register('logger', NullLogger::class);
    }
}
