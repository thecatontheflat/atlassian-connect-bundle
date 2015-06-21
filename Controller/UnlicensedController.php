<?php

namespace AtlassianConnectBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;

class UnlicensedController extends Controller
{
    public function unlicensedAction()
    {
        return $this->render('@AtlassianConnect/unlicensed.html.twig');
    }
}
