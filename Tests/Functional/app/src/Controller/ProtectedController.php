<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional\App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;

final class ProtectedController extends AbstractController
{
    public function protectedRoute(): Response
    {
        return new Response('OK');
    }

    public function licenseProtectedRoute(): Response
    {
        return new Response('OK');
    }
}
