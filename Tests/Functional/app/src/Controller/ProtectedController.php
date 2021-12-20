<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional\App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

final class ProtectedController extends AbstractController
{
    /**
     * @Route("/protected/route")
     */
    public function protectedRoute(): Response
    {
        return new Response('OK');
    }

    /**
     * @Route("/protected/license-route", defaults={"requires_license": "true"})
     */
    public function licenseProtectedRoute(): Response
    {
        return new Response('OK');
    }
}
