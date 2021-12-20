<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Listener;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class LicenseListener
{
    protected RouterInterface $router;

    protected TokenStorageInterface $tokenStorage;

    public function __construct(RouterInterface $router, TokenStorageInterface $tokenStorage)
    {
        $this->router = $router;
        $this->tokenStorage = $tokenStorage;
    }

    /**
     * @param GetResponseEvent|RequestEvent $event
     */
    public function onKernelRequest($event): void
    {
        if (!$event instanceof RequestEvent && !$event instanceof GetResponseEvent) {
            throw new \InvalidArgumentException();
        }

        $mainRequest = method_exists($event, 'isMainRequest')
            ? 'isMainRequest'
            : 'isMasterRequest'
        ;

        if (!$event->$mainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $route = $request->attributes->get('_route');
        $kernel = $event->getKernel();

        if (null !== $route && !$request->attributes->get('requires_license')) {
            return;
        }

        if ('active' === $request->get('lic') || 'prod' !== $kernel->getEnvironment()) {
            return;
        }

        // Checking for whitelisted users
        try {
            /** @noinspection NullPointerExceptionInspection */
            $user = $this->tokenStorage->getToken()->getUser();

            if ($user instanceof TenantInterface) {
                if ($user->isWhiteListed()) {
                    return;
                }

                $today = date('Y-m-d');
                $whitelist = $kernel->getContainer()->getParameter('license_whitelist');

                /* @noinspection ForeachSourceInspection */
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
