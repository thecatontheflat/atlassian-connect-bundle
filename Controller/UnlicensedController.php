<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Controller;

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
     * @return string
     */
    public function unlicensedAction(): string
    {
        return $this->twig->render('@AtlassianConnect/unlicensed.html.twig');
    }
}
