<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\DependencyInjection;

use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;

class AtlassianConnectExtension extends Extension
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        if(!isset($config['descriptor'])) {
            throw new \InvalidArgumentException('The "atlassian_connect.descriptor" parameter must be set.');
        }
        $container->setParameter('atlassian_connect', $config['descriptor']);
        if(!isset($config['dev_tenant'])) {
            throw new \InvalidArgumentException('The "atlassian_connect.dev_tenant" parameter must be set.');
        }
        $container->setParameter('atlassian_connect_dev_tenant', $config['dev_tenant']);
        if(!isset($config['license_allow_list'])) {
            throw new \InvalidArgumentException('The "atlassian_connect.license_allow_list" parameter must be set.');
        }

        $container->setParameter('atlassian_connect_license_allow_list', $config['license_allow_list']);


        $loader = new Loader\PhpFileLoader($container, new FileLocator(\dirname(__DIR__).'/Resources/config'));
        $loader->load('services.php');
    }
}
