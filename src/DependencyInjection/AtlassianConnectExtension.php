<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\DependencyInjection;

use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;

/**
 * This is the class that loads and manages your bundle configuration
 */
class AtlassianConnectExtension extends Extension
{
    /**
     * @param array<mixed>     $configs
     * @param ContainerBuilder $container
     *
     * @return void
     */
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        $container->setParameter('atlassian_connect', $config['descriptor']);
        $container->setParameter('atlassian_connect_dev_tenant', $config['dev_tenant']);

        $loader = new Loader\PhpFileLoader($container, new FileLocator(\dirname(__DIR__).'/Resources/config'));
        $loader->load('services.php');
    }
}
