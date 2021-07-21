<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\DependencyInjection;

use AtlassianConnectBundle\Controller\DescriptorController;
use AtlassianConnectBundle\Controller\HandshakeController;
use AtlassianConnectBundle\Controller\UnlicensedController;
use AtlassianConnectBundle\DependencyInjection\AtlassianConnectExtension;
use AtlassianConnectBundle\Security\JWTAuthenticator;
use Doctrine\Common\Persistence\ObjectManager;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * AtlassianConnectExtensionTest
 */
class AtlassianConnectExtensionTest extends TestCase
{
    /**
     * @var AtlassianConnectExtension
     */
    private $extension;

    /**
     * @var ContainerBuilder Container builder
     */
    private $container;

    /**
     * Set UP
     */
    protected function setUp(): void
    {
        $this->extension = new AtlassianConnectExtension();
        $this->container = new ContainerBuilder();
        $this->container->registerExtension($this->extension);
    }

    /**
     * Test load extension
     */
    public function testLoadExtension(): void
    {
        $this->container->set(RouterInterface::class, new \stdClass());
        $this->container->set(KernelInterface::class, new \stdClass());
        $this->container->set(TokenStorageInterface::class, new \stdClass());
        $this->container->set(EntityManagerInterface::class, new \stdClass());
        $this->container->set(ObjectManager::class, new \stdClass());
        $this->container->set(LoggerInterface::class, new \stdClass());
        $this->container->set('twig', new \stdClass());
        $this->container->setParameter('kernel.environment', 'test');

        $this->container->prependExtensionConfig($this->extension->getAlias(), [
            'dev_tenant' => 1,
            'prod' => [],
            'dev' => [],
        ]);
        $this->container->loadFromExtension($this->extension->getAlias());
        $this->container->compile();

        // Check that services have been loaded
        static::assertTrue($this->container->has('jwt_user_provider'));
        static::assertTrue($this->container->has('jwt_authenticator'));
        static::assertTrue($this->container->has(DescriptorController::class));
        static::assertTrue($this->container->has(UnlicensedController::class));
        static::assertTrue($this->container->has(HandshakeController::class));

        if (Kernel::VERSION_ID >= 50100) {
            static::assertTrue($this->container->has('new_jwt_authenticator'));
            static::assertTrue($this->container->has(JWTAuthenticator::class));
        }
    }
}
