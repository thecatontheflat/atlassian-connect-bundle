<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Functional\App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * class ProtectedController
 */
final class ProtectedController extends AbstractController
{
    /**
     * @Route("/protected/route")
     *
     * @return Response
     */
    public function protectedRoute(): Response
    {
        return new Response('OK');
    }
}