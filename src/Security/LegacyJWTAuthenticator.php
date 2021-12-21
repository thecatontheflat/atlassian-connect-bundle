<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Guard\AbstractGuardAuthenticator;

class LegacyJWTAuthenticator extends AbstractGuardAuthenticator
{
    private JWTSecurityHelperInterface $securityHelper;

    public function __construct(JWTSecurityHelperInterface $securityHelper)
    {
        $this->securityHelper = $securityHelper;
    }

    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new Response('Authentication header required', 401);
    }

    public function supports(Request $request): bool
    {
        return $this->securityHelper->supportsRequest($request);
    }

    /**
     * @return mixed Any non-null value
     */
    public function getCredentials(Request $request)
    {
        $jwt = $this->securityHelper->getJWTToken($request);

        if (!$jwt) {
            return null;
        }

        return ['jwt' => $jwt];
    }

    /**
     * @param mixed $credentials
     */
    public function getUser($credentials, UserProviderInterface $userProvider): ?UserInterface
    {
        if (!$userProvider instanceof JWTUserProviderInterface) {
            throw new InvalidArgumentException(sprintf('UserProvider must implement %s', JWTUserProviderInterface::class));
        }

        $token = $userProvider->getDecodedToken($credentials['jwt']);
        $clientKey = $token->iss;

        if (!$clientKey) {
            throw new AuthenticationException(sprintf('API Key "%s" does not exist.', $credentials['jwt']));
        }

        /** @var TenantInterface|UserInterface $user */
        $loadUserMethod = method_exists($userProvider, 'loadUserByIdentifier')
            ? 'loadUserByIdentifier'
            : 'loadUserByUsername'
        ;
        $user = $userProvider->$loadUserMethod($clientKey);

        if (property_exists($token, 'sub')) {
            // for some reasons, when webhooks are called - field sub is undefined
            $user->setUsername($token->sub);
        }

        return $user;
    }

    /**
     * @param mixed $credentials
     */
    public function checkCredentials($credentials, UserInterface $user): bool
    {
        return true;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new Response('Authentication Failed: '.$exception->getMessage(), 403);
    }

    /**
     * @param mixed|string $providerKey The provider (i.e. firewall) key
     */
    public function onAuthenticationSuccess(Request $request, TokenInterface $token, $providerKey): ?Response
    {
        return null;
    }

    public function supportsRememberMe(): bool
    {
        return false;
    }
}
