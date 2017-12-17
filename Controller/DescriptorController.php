<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;

/**
 * Class DescriptorController
 */
class DescriptorController
{
    /**
     * @var KernelInterface
     */
    private $kernel;

    /**
     * @var mixed[]
     */
    private $config;

    /**
     * @param KernelInterface $kernel
     * @param mixed[]         $config
     */
    public function __construct(KernelInterface $kernel, array $config)
    {
        $this->kernel = $kernel;
        $this->config = $config;
    }

    /**
     * @return Response
     */
    public function indexAction(): Response
    {
        $envConfig = $this->config[$this->kernel->getEnvironment()];
        $descriptor = \json_encode($envConfig);

        $response = new Response();
        $response->setContent($descriptor);
        $response->headers->set('Content-Type', 'application/json');

        return $response;
    }
}
