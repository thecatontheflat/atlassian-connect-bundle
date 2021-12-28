<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class UnlicensedController
{
    public function __construct(private Environment $twig)
    {
    }

    public function unlicensedAction(): Response
    {
        return new Response($this->twig->render('@AtlassianConnect/unlicensed.html.twig'));
    }
}
