<?php declare(strict_types = 1);

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

/**
 * Class LegacyJWTAuthenticator
 */
class LegacyJWTAuthenticator extends AbstractGuardAuthenticator
{
    /**
     * @var JWTSecurityHelperInterface
     */
    private $securityHelper;

    /**
     * LegacyJWTAuthenticator constructor.
     *
     * @param JWTSecurityHelperInterface $securityHelper
     */
    public function __construct(JWTSecurityHelperInterface $securityHelper)
    {
        $this->securityHelper = $securityHelper;
    }

    /**
     * @param Request                      $request
     * @param AuthenticationException|null $authException
     *
     * @return Response
     */
    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new Response('Authentication header required', 401);
    }

    /**
     * @param Request $request
     *
     * @return bool
     */
    public function supports(Request $request): bool
    {
        return $this->securityHelper->supportsRequest($request);
    }

    /**
     * @param Request $request
     *
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
     * @param mixed                 $credentials
     * @param UserProviderInterface $userProvider
     *
     * @return UserInterface|null
     */
    public function getUser($credentials, UserProviderInterface $userProvider): ?UserInterface
    {
        if (!$userProvider instanceof JWTUserProviderInterface) {
            throw new InvalidArgumentException(\sprintf(
                'UserProvider must implement %s',
                JWTUserProviderInterface::class
            ));
        }

        $token = $userProvider->getDecodedToken($credentials['jwt']);
        $clientKey = $token->iss;

        if (!$clientKey) {
            throw new AuthenticationException(
                \sprintf('API Key "%s" does not exist.', $credentials['jwt'])
            );
        }

        /** @var TenantInterface|UserInterface $user */
        $loadUserMethod = \method_exists($userProvider, 'loadUserByIdentifier')
            ? 'loadUserByIdentifier'
            : 'loadUserByUsername'
        ;
        $user = $userProvider->$loadUserMethod($clientKey);

        if (\property_exists($token, 'sub')) {
            // for some reasons, when webhooks are called - field sub is undefined
            $user->setUsername($token->sub);
        }

        return $user;
    }

    /**
     * @param mixed         $credentials
     * @param UserInterface $user
     *
     * @return bool
     */
    public function checkCredentials($credentials, UserInterface $user): bool
    {
        return true;
    }

    /**
     * @param Request                 $request
     * @param AuthenticationException $exception
     *
     * @return Response|null
     */
    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new Response('Authentication Failed: '.$exception->getMessage(), 403);
    }

    /**
     * @param Request        $request
     * @param TokenInterface $token
     * @param mixed|string   $providerKey The provider (i.e. firewall) key
     *
     * @return Response|null
     */
    public function onAuthenticationSuccess(Request $request, TokenInterface $token, $providerKey): ?Response
    {
        return null;
    }

    /**
     * @return bool
     */
    public function supportsRememberMe(): bool
    {
        return false;
    }
}
