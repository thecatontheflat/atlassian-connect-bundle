<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Controller;

use Symfony\Component\HttpFoundation\Response;

/**
 * Class UnlicensedController
 */
class UnlicensedController
{
    /**
     * @var \Twig_Environment
     */
    private $twig;

    /**
     * @param \Twig_Environment $twig
     */
    public function __construct(\Twig_Environment $twig)
    {
        $this->twig = $twig;
    }

    /**
     * @return Response
     */
    public function unlicensedAction(): Response
    {
        return new Response($this->twig->render('@AtlassianConnect/unlicensed.html.twig'));
    }
}
