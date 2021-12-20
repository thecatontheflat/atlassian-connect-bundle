<?php declare(strict_types = 1);

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
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;
use Symfony\Component\Routing\RouteCollectionBuilder;

/**
 * class Kernel
 */
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

    /**
     * @return string
     */
    public function getProjectDir(): string
    {
        return \dirname(__DIR__);
    }

    /**
     * @return string
     */
    public function getCacheDir(): string
    {
        return \sys_get_temp_dir().'/com.github.thecatontheflat.atlassian/tests/var/cache';
    }

    /**
     * @return string
     */
    public function getLogDir(): string
    {
        return \sys_get_temp_dir().'/com.github.thecatontheflat.atlassian/tests/var'.$this->environment.'/log';
    }

    /**
     * @param ContainerBuilder $container
     * @param LoaderInterface  $loader
     *
     * @return void
     */
    protected function configureContainer(ContainerBuilder $container, LoaderInterface $loader): void
    {
        $configDir = $this->getProjectDir().'/config';

        if (BaseKernel::VERSION_ID >= 50400) {
            $loader->load($configDir.'/{base}/*.yaml', 'glob');
        } else {
            $loader->load($configDir.'/{base_old}/*.yaml', 'glob');
        }

        $loader->load($configDir.'/{packages}/*.yaml', 'glob');
        $loader->load($configDir.'/{services}.yaml', 'glob');
    }

    /**
     * @param ContainerBuilder $container
     */
    protected function build(ContainerBuilder $container): void
    {
        $container->register('logger', NullLogger::class);
    }

    /**
     * TODO: Drop RouteCollectionBuilder when support for Symfony 4.4 is dropped.
     *
     * @param RoutingConfigurator|RouteCollectionBuilder $routes
     */
    protected function configureRoutes($routes)
    {
        $routes->import($this->getProjectDir().'/config/routes.yaml');
    }
}
