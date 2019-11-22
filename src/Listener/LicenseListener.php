<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Listener;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

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
     * @var TokenStorageInterface
     */
    protected $tokenStorage;

    /**
     * @param RouterInterface       $router
     * @param TokenStorageInterface $tokenStorage
     */
    public function __construct(RouterInterface $router, TokenStorageInterface $tokenStorage)
    {
        $this->router = $router;
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
        $route = $request->attributes->get('_route');
        $kernel = $event->getKernel();

        if ($route !== null && !$request->attributes->get('requires_license')) {
            return;
        }

        if ($request->get('lic') === 'active' || $kernel->getEnvironment() !== 'prod') {
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

                $today = \date('Y-m-d');
                $whitelist = $kernel->getContainer()->getParameter('license_whitelist');

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
