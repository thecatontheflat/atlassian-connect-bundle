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
     * @param mixed[]          $configs
     * @param ContainerBuilder $container
     *
     * @return void
     */
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        $prod = $config['prod'];
        $dev = $config['dev'];

        $config['dev'] = \array_merge($prod, $dev);

        $container->setParameter('atlassian_connect', $config);
        $container->setParameter('atlassian_connect_token_lifetime', $config['token_lifetime']);
        $container->setParameter('atlassian_connect_dev_tenant', $config['dev_tenant']);

        $loader = new Loader\YamlFileLoader($container, new FileLocator(__DIR__.'/../Resources/config'));
        $loader->load('services.yml');
    }
}
