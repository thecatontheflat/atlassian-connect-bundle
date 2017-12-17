<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Model\QSH;
use Doctrine\Common\Persistence\ManagerRegistry;
use Doctrine\ORM\EntityManager;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\PreAuthenticatedToken;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationFailureHandlerInterface;
use Symfony\Component\Security\Http\Authentication\SimplePreAuthenticatorInterface;

/**
 * Class JWTAuthenticator
 */
class JWTAuthenticator implements SimplePreAuthenticatorInterface, AuthenticationFailureHandlerInterface
{
    /**
     * @var JWTUserProvider
     */
    protected $userProvider;

    /**
     * @var KernelInterface
     */
    protected $kernel;

    /**
     * @var EntityManager
     */
    protected $em;

    /**
     * @var string
     */
    protected $tenantEntityClass;

    /**
     * @var int
     */
    protected $devTenant;

    /**
     * JWTAuthenticator constructor.
     *
     * @param JWTUserProvider $userProvider
     * @param KernelInterface $kernel
     * @param ManagerRegistry $registry
     * @param string          $tenantEntityClass
     * @param int             $devTenant
     */
    public function __construct(JWTUserProvider $userProvider, KernelInterface $kernel, ManagerRegistry $registry, string $tenantEntityClass, int $devTenant)
    {
        $this->userProvider = $userProvider;
        $this->kernel = $kernel;
        $this->em = $registry->getManager();
        $this->tenantEntityClass = $tenantEntityClass;
        $this->devTenant = $devTenant;
    }

    /**
     * @param Request $request
     * @param mixed   $providerKey
     *
     * @return PreAuthenticatedToken
     */
    public function createToken(Request $request, $providerKey): PreAuthenticatedToken
    {
        $jwt = $request->query->get('jwt');
        if (!$jwt && $request->headers->has('authorization')) {
            $authorizationHeaderArray = \explode(' ', $request->headers->get('authorization'));
            if (\count($authorizationHeaderArray) > 1) {
                $jwt = $authorizationHeaderArray[1];
            }
        }

        if (!$jwt && $this->devTenant && ($this->kernel->getEnvironment() === 'dev')) {
            $tenant = $this->em->getRepository($this->tenantEntityClass)->find($this->devTenant);
            if ($tenant === null) {
                throw new \RuntimeException(\sprintf('Cant find tenant with id %s - please set atlassian_connect.dev_tenant to false to disable dedicated dev tenant OR add valid id', $this->devTenant));
            }
            $clientKey = $tenant->getClientKey();
            $sharedSecret = $tenant->getSharedSecret();
            $qshHelper = new QSH();
            $qsh = $qshHelper->create('GET', $request->getRequestUri());
            $payload = [
                'iss' => $clientKey,
                'iat' => \time(),
                'exp' => \strtotime('+1 day'),
                'qsh' => $qsh,
                'sub' => 'admin',
            ];

            $jwt = JWT::encode($payload, $sharedSecret);
        }

        if (!$jwt) {
            throw new BadCredentialsException('No JWT token found');
        }

        return new PreAuthenticatedToken('anon.', $jwt, $providerKey);
    }

    /**
     * @param TokenInterface        $token
     * @param UserProviderInterface $userProvider
     * @param mixed                 $providerKey
     *
     * @return PreAuthenticatedToken
     */
    public function authenticateToken(TokenInterface $token, UserProviderInterface $userProvider, $providerKey): PreAuthenticatedToken
    {
        $jwt = $token->getCredentials();
        $token = $this->userProvider->getDecodedToken($jwt);
        $clientKey = $token->iss;

        if (!$clientKey) {
            throw new AuthenticationException(
                \sprintf('API Key "%s" does not exist.', $jwt)
            );
        }

        /** @var Tenant $user */
        $user = $this->userProvider->loadUserByUsername($clientKey);
        if (\property_exists($token, 'sub')) {
            // for some reasons, when webhooks are called - field sub is undefined
            $user->setUsername($token->sub);
        }

        return new PreAuthenticatedToken($user, $jwt, $providerKey, $user->getRoles());
    }

    /**
     * @param TokenInterface $token
     * @param mixed          $providerKey
     *
     * @return bool
     */
    public function supportsToken(TokenInterface $token, $providerKey): bool
    {
        return $token instanceof PreAuthenticatedToken && $token->getProviderKey() === $providerKey;
    }

    /**
     * @param Request                 $request
     * @param AuthenticationException $exception
     *
     * @return Response
     */
    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): Response
    {
        return new Response('Authentication Failed: '.$exception->getMessage(), 403);
    }
}
