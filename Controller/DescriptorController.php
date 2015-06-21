<?php

namespace AtlassianConnectBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;

class DescriptorController extends Controller
{
    public function indexAction()
    {
        $kernel = $this->container->get('kernel');
        $env = $kernel->getEnvironment();
        $path = $kernel->locateResource('@AtlassianConnectBundle/Resources/config/descriptor.'.$env.'.json');
        $descriptor = file_get_contents($path);

        $response = new Response();
        $response->setContent($descriptor);
        $response->headers->set('Content-Type', 'application/json');

        return $response;
    }
}
