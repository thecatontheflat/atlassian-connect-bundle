<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Listener;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class LicenseListener
{
    public function __construct(
        private RouterInterface $router,
        private TokenStorageInterface $tokenStorage,
        private string $environment,
        private array $licenseAllowList
    ) {
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $route = $request->attributes->get('_route');

        if (null !== $route && false === $request->attributes->get('requires_license', false)) {
            return;
        }

        if ('active' === $request->query->get('lic') || 'prod' !== $this->environment) {
            return;
        }

        // Checking for allowed users
        try {
            /** @var TenantInterface $user */
            $user = $this->tokenStorage->getToken()->getUser();

            if ($user instanceof TenantInterface && $user->isWhiteListed()) {
                return;
            }

            $today = date('Y-m-d');

            foreach ($this->licenseAllowList as $allowed) {
                if ($today <= $allowed['valid_till'] && $allowed['client_key'] === $user->getClientKey()) {
                    return;
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
