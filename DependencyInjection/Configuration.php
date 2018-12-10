<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

/**
 * This is the class that validates and merges configuration from your app/config files
 */
class Configuration implements ConfigurationInterface
{
    /**
     * @return TreeBuilder
     */
    public function getConfigTreeBuilder(): TreeBuilder
    {
        if (method_exists(TreeBuilder::class, 'getRootNode')) {
            $treeBuilder = new TreeBuilder('atlassian_connect');
            $rootNode = $treeBuilder->getRootNode();
        } else {
            $treeBuilder = new TreeBuilder();
            $rootNode = $treeBuilder->root('atlassian_connect');
        }

        $rootNode
            ->children()
                ->variableNode('dev_tenant')->defaultValue(1)->end()
                ->variableNode('prod')->end()
                ->variableNode('dev')->end()
            ->end()
        ;

        return $treeBuilder;
    }
}
