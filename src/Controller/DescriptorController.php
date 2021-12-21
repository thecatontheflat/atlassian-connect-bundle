<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;

class DescriptorController
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function indexAction(): JsonResponse
    {
        return new JsonResponse($this->config);
    }
}
