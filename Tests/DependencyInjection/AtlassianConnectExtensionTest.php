<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\DependencyInjection;

use AtlassianConnectBundle\DependencyInjection\AtlassianConnectExtension;
use AtlassianConnectBundle\Service\AtlassianRestClientInterface;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Twig\Environment;

class AtlassianConnectExtensionTest extends TestCase
{
    private AtlassianConnectExtension $extension;

    private ContainerBuilder $container;

    protected function setUp(): void
    {
        $this->extension = new AtlassianConnectExtension();
        $this->container = new ContainerBuilder();
        $this->container->registerExtension($this->extension);
    }

    public function testLoadExtension(): void
    {
        $this->container->set(RouterInterface::class, new \stdClass());
        $this->container->set(KernelInterface::class, new \stdClass());
        $this->container->set(TokenStorageInterface::class, new \stdClass());
        $this->container->set(EntityManagerInterface::class, new \stdClass());
        $this->container->set(LoggerInterface::class, new \stdClass());
        $this->container->set(Environment::class, new \stdClass());
        $this->container->setParameter('kernel.environment', 'test');

        $this->container->prependExtensionConfig($this->extension->getAlias(), [
            'dev_tenant' => 1,
            'descriptor' => [
                'baseUrl' => 'https://github.com/thecatontheflat/atlassian-connect-bundle',
                'key' => 'atlassian-connect-bundle',
            ],
        ]);
        $this->container->loadFromExtension($this->extension->getAlias());
        $this->container->compile();
        // Check that services have been loaded
        $this->assertTrue($this->container->has(AtlassianRestClientInterface::class));
    }
}
