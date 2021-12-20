<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\Response;

class DescriptorController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function indexAction(): Response
    {
        $descriptor = json_encode($this->config);

        $response = new Response();
        $response->setContent($descriptor);
        $response->headers->set('Content-Type', 'application/json');

        return $response;
    }
}
