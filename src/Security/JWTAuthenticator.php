<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

class JWTAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    private JWTUserProviderInterface $userProvider;

    private JWTSecurityHelperInterface $securityHelper;

    public function __construct(JWTUserProviderInterface $userProvider, JWTSecurityHelperInterface $securityHelper)
    {
        $this->userProvider = $userProvider;
        $this->securityHelper = $securityHelper;
    }

    public function supports(Request $request): ?bool
    {
        return $this->securityHelper->supportsRequest($request);
    }

    public function authenticate(Request $request): Passport
    {
        $jwt = $this->securityHelper->getJWTToken($request);

        if (!$jwt) {
            throw new CustomUserMessageAuthenticationException('JWT Token not provided');
        }

        $token = $this->userProvider->getDecodedToken($jwt);
        $clientKey = $token->iss;

        if (!$clientKey) {
            throw new CustomUserMessageAuthenticationException(sprintf('API Key %s does not exist', $jwt));
        }

        $user = $this->userProvider->loadUserByIdentifier($clientKey);

        if (property_exists($token, 'sub')) {
            // for some reasons, when webhooks are called - field sub is undefined
            $user->setUsername($token->sub);
        }

        return new SelfValidatingPassport(new UserBadge($clientKey));
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new Response('Authentication Failed: '.$exception->getMessage(), 403);
    }

    public function start(Request $request, AuthenticationException $authException = null): Response
    {
        return new Response('Authentication header required', 401);
    }
}
