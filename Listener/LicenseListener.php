<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Listener;

use AtlassianConnectBundle\Entity\Tenant;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorage;

/**
 * Class LicenseListener
 */
class LicenseListener
{
    /**
     * @var RouterInterface
     */
    protected $router;

    /**
     * @var KernelInterface
     */
    protected $kernel;
    /**
     * @var TokenStorage
     */
    protected $tokenStorage;

    /**
     * @param RouterInterface $router
     * @param KernelInterface $kernel
     * @param TokenStorage    $tokenStorage
     */
    public function __construct(RouterInterface $router, KernelInterface $kernel, TokenStorage $tokenStorage)
    {
        $this->router = $router;
        $this->kernel = $kernel;
        $this->tokenStorage = $tokenStorage;
    }

    /**
     * @param GetResponseEvent $event
     *
     * @return void
     */
    public function onKernelRequest(GetResponseEvent $event): void
    {
        if (!$event->isMasterRequest()) {
            return;
        }

        $request = $event->getRequest();
        $routes = $this->router->getRouteCollection();
        $route = $routes->get($request->attributes->get('_route'));

        if ($route !== null && !$route->getOption('requires_license')) {
            return;
        }

        if ($request->get('lic') !== 'active' && $this->kernel->getEnvironment() === 'prod') {
            // Checking for whitelisted users
            try {
                /** @noinspection NullPointerExceptionInspection */
                $user = $this->tokenStorage->getToken()->getUser();
                if ($user instanceof Tenant) {
                    if ($user->isWhiteListed()) {
                        return;
                    }

                    $today = \date('Y-m-d');
                    $whitelist = $this->kernel->getContainer()->getParameter('license_whitelist');
                    /** @noinspection ForeachSourceInspection */
                    foreach ($whitelist as $allowed) {
                        if ($today <= $allowed['valid_till'] && $allowed['client_key'] === $user->getClientKey()) {
                            return;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Do nothing
            }

            $url = $this->router->generate('atlassian_connect_unlicensed', $request->query->all());
            $response = new RedirectResponse($url);
            $event->setResponse($response);
        }
    }
}
