<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\Response;

/**
 * Class DescriptorController
 */
class DescriptorController
{
    /**
     * @var string
     */
    private $env;

    /**
     * @var mixed[]
     */
    private $config;

    /**
     * @param string  $env
     * @param mixed[] $config
     */
    public function __construct(string $env, array $config)
    {
        $this->env = $env ?: 'dev';
        $this->config = $config;
    }

    /**
     * @return Response
     */
    public function indexAction(): Response
    {
        $envConfig = $this->config[$this->env];
        $descriptor = \json_encode($envConfig);

        $response = new Response();
        $response->setContent($descriptor);
        $response->headers->set('Content-Type', 'application/json');

        return $response;
    }
}
