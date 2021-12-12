<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Functional\App;

use Psr\Log\NullLogger;
use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

/**
 * class Kernel
 */
final class Kernel extends BaseKernel
{
    use MicroKernelTrait;

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
     * @param ContainerConfigurator $container
     */
    public function configureContainer(ContainerConfigurator $container): void
    {
        $container->import('../config/{packages}/*.yaml');
        $container->import('../config/{services}*.yaml');
    }

    /**
     * @param RoutingConfigurator $routes
     */
    public function configureRoutes(RoutingConfigurator $routes): void
    {
        $routes->import('../config/routes.yaml');
    }

    /**
     * @param ContainerBuilder $container
     */
    protected function build(ContainerBuilder $container): void
    {
        $container->register('logger', NullLogger::class);
    }
}
