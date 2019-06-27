<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Service\QSHGenerator;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Guard\AbstractGuardAuthenticator;

/**
 * Class JWTAuthenticator
 */
class JWTAuthenticator extends AbstractGuardAuthenticator
{
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
     * @param KernelInterface        $kernel
     * @param EntityManagerInterface $entityManager
     * @param string                 $tenantEntityClass
     * @param int                    $devTenant
     */
    public function __construct(KernelInterface $kernel, EntityManagerInterface $entityManager, string $tenantEntityClass, int $devTenant)
    {
        $this->kernel = $kernel;
        $this->em = $entityManager;
        $this->tenantEntityClass = $tenantEntityClass;
        $this->devTenant = $devTenant;
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
        return $request->query->has('jwt') ||
            $request->headers->has('authorization') ||
            ($this->devTenant && ($this->kernel->getEnvironment() === 'dev'));
    }

    /**
     * @param Request $request
     *
     * @return mixed Any non-null value
     */
    public function getCredentials(Request $request)
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

            $jwt = JWT::encode([
                'iss' => $tenant->getClientKey(),
                'iat' => \time(),
                'exp' => \strtotime('+1 day'),
                'qsh' => QSHGenerator::generate($request->getRequestUri(), 'GET'),
                'sub' => 'admin',
            ], $tenant->getSharedSecret());
        }

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
        $user = $userProvider->loadUserByUsername($clientKey);

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
