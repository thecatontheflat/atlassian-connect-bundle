<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;

class DescriptorController
{
    public function __construct(private array $config)
    {
    }

    public function indexAction(): JsonResponse
    {
        return new JsonResponse($this->config);
    }
}
