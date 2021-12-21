<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('atlassian_connect');
        $rootNode = $treeBuilder->getRootNode();

        $rootNode
            ->children()
                ->variableNode('dev_tenant')->defaultValue(1)->end()
                ->arrayNode('descriptor')
                    ->ignoreExtraKeys()
                    ->children()
                        ->arrayNode('authentication')
                            ->addDefaultsIfNotSet()
                            ->children()
                                ->enumNode('type')->values(['jwt', 'none', 'JWT', 'NONE'])->defaultValue('jwt')->isRequired()->end()
                            ->end()
                        ->end()
                        ->scalarNode('baseUrl')->isRequired()->cannotBeEmpty()->end()
                        ->variableNode('regionBaseUrls')->end()
                        ->scalarNode('key')->isRequired()->cannotBeEmpty()->end()
                        ->integerNode('apiVersion')->end()
                        ->scalarNode('name')->end()
                        ->scalarNode('description')->end()
                        ->scalarNode('aliasKey')->end()
                        ->booleanNode('enableLicensing')->end()
                        ->arrayNode('lifecycle')
                            ->children()
                                ->scalarNode('installed')->end()
                                ->scalarNode('enabled')->end()
                                ->scalarNode('disabled')->end()
                                ->scalarNode('uninstalled')->end()
                            ->end()
                        ->end()
                        ->arrayNode('vendor')
                            ->children()
                                ->scalarNode('name')->end()
                                ->scalarNode('url')->end()
                            ->end()
                        ->end()
                        ->arrayNode('scopes')
                            ->scalarPrototype()->end()
                        ->end()
                        ->variableNode('links')->end()
                        ->variableNode('modules')->end()
                        ->variableNode('apiMigrations')->end()
                        ->arrayNode('translations')
                            ->children()
                                ->arrayNode('paths')
                                    ->scalarPrototype()->end()
                                ->end()
                            ->end()
                        ->end()
                    ->end()
                ->end()
                ->arrayNode('license_allow_list')
                    ->arrayPrototype()
                        ->children()
                            ->scalarNode('client_key')->end()
                            ->scalarNode('valid_till')->end()
                        ->end()
                    ->end()
                ->end()
            ->end()
        ;

        return $treeBuilder;
    }
}
