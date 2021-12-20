<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class UnlicensedController
{
    private Environment $twig;

    public function __construct(Environment $twig)
    {
        $this->twig = $twig;
    }

    public function unlicensedAction(): Response
    {
        return new Response($this->twig->render('@AtlassianConnect/unlicensed.html.twig'));
    }
}
