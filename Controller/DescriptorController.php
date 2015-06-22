<?php

namespace AtlassianConnectBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;

class DescriptorController extends Controller
{
    public function indexAction()
    {
        $kernel = $this->container->get('kernel');
        $config = $this->getParameter('atlassian_connect');
        $envConfig = $config[$kernel->getEnvironment()];
        $descriptor = json_encode($envConfig);

        $response = new Response();
        $response->setContent($descriptor);
        $response->headers->set('Content-Type', 'application/json');

        return $response;
    }
}
