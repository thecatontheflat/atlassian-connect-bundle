<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\PassportInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

/**
 * Class JWTAuthenticator
 */
class JWTAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    /**
     * @var JWTUserProviderInterface
     */
    private $userProvider;

    /**
     * @var JWTSecurityHelperInterface
     */
    private $securityHelper;

    /**
     * JWTAuthenticator constructor.
     *
     * @param JWTUserProviderInterface   $userProvider
     * @param JWTSecurityHelperInterface $securityHelper
     */
    public function __construct(JWTUserProviderInterface $userProvider, JWTSecurityHelperInterface $securityHelper)
    {
        $this->userProvider = $userProvider;
        $this->securityHelper = $securityHelper;
    }

    /**
     * @param Request $request
     *
     * @return bool|null
     */
    public function supports(Request $request): ?bool
    {
        return $this->securityHelper->supportsRequest($request);
    }

    /**
     * @param Request $request
     *
     * @return PassportInterface
     */
    public function authenticate(Request $request): PassportInterface
    {
        $jwt = $this->securityHelper->getJWTToken($request);

        if (!$jwt) {
            throw new CustomUserMessageAuthenticationException('JWT Token not provided');
        }

        $token = $this->userProvider->getDecodedToken($jwt);
        $clientKey = $token->iss;

        if (!$clientKey) {
            throw new CustomUserMessageAuthenticationException(
                \sprintf('API Key %s does not exist', $jwt)
            );
        }

        $user = $this->userProvider->loadUserByIdentifier($clientKey);

        if (\property_exists($token, 'sub')) {
            // for some reasons, when webhooks are called - field sub is undefined
            $user->setUsername($token->sub);
        }

        if (!\class_exists(UserBadge::class)) {
            return new SelfValidatingPassport($user);
        }

        return new SelfValidatingPassport(new UserBadge($clientKey));
    }

    /**
     * @param Request        $request
     * @param TokenInterface $token
     * @param string         $firewallName
     *
     * @return Response|null
     */
    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
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
     * @param Request                      $request
     * @param AuthenticationException|null $authException
     *
     * @return Response
     */
    public function start(Request $request, AuthenticationException $authException = null)
    {
        return new Response('Authentication header required', 401);
    }
}
