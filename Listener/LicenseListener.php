<?php

namespace AtlassianConnectBundle\Listener;

use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorage;
use Symfony\Component\Security\Core\User\UserInterface;

class LicenseListener
{
    /**
     * @var RouterInterface
     */
    private $router;

    /**
     * @var KernelInterface
     */
    private $kernel;
    /**
     * @var TokenStorage
     */
    private $tokenStorage;

    /**
     * @param RouterInterface $router
     * @param KernelInterface $kernel
     * @param TokenStorage $tokenStorage
     */
    public function __construct(RouterInterface $router, KernelInterface $kernel, TokenStorage $tokenStorage)
    {
        $this->router = $router;
        $this->kernel = $kernel;
        $this->tokenStorage = $tokenStorage;
    }

    public function onKernelRequest(GetResponseEvent $event)
    {
        if (!$event->isMasterRequest()) {
            return;
        }

        $request = $event->getRequest();
        $routes = $this->router->getRouteCollection();
        $route = $routes->get($request->attributes->get('_route'));

        if (!$route->getOption('requires_license')) {

            return;
        }


        if ('active' != $request->get('lic') && $this->kernel->getEnvironment() == 'prod') {
            // Checking for whitelisted users
            try {
                $user = $this->tokenStorage->getToken()->getUser();
                $today = date('Y-m-d');
                if ($user instanceof UserInterface) {
                    $whitelist = $this->kernel->getContainer()->getParameter('license_whitelist');
                    foreach ($whitelist as $allowed) {
                        if ($allowed['client_key'] == $user->getClientKey() && $today <= $allowed['valid_till']) {

                            return;
                        }
                    }

                }
            } catch (\Exception $e) {
                // Do nothing
            }

            $url = $this->router->generate('atlassian_connect_unlicensed', $request->query->all());
            $response = new RedirectResponse($url);
            $event->setResponse($response);
        }
    }
}