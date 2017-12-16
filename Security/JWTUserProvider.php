<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\Tenant;
use Doctrine\Common\Persistence\ManagerRegistry;
use Doctrine\ORM\EntityManager;
use Firebase\JWT\JWT;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Class JWTUserProvider
 */
class JWTUserProvider implements UserProviderInterface
{
    /**
     * @var EntityManager
     */
    protected $em;

    /**
     * @var int
     */
    protected $tokenLifetime;

    /**
     * @var string
     */
    protected $tenantClass;

    /**
     * JWTUserProvider constructor.
     *
     * @param ManagerRegistry $registry
     * @param int             $tokenLifetime
     * @param string          $tenantClass
     */
    public function __construct(ManagerRegistry $registry, int $tokenLifetime, string $tenantClass)
    {
        $this->em = $registry->getManager();
        $this->tokenLifetime = $tokenLifetime;
        $this->tenantClass = $tenantClass;
    }

    /**
     * @param string $jwt
     *
     * @return mixed
     */
    public function getDecodedToken(string $jwt)
    {
        try {
            /** @noinspection PhpUnusedLocalVariableInspection */
            [$headb64, $bodyb64, $cryptob64] = \explode('.', $jwt);
            $decodedToken = \json_decode(JWT::urlsafeB64Decode($bodyb64));

            $tenant = $this->findTenant($decodedToken->iss);

            JWT::decode($jwt, $tenant->getSharedSecret(), ['HS256']);

            return $decodedToken;
        } catch (\Throwable $e) {
            throw new AuthenticationException($e->getMessage());
        }
    }

    /**
     * @param mixed $clientKey
     *
     * @return Tenant
     */
    public function loadUserByUsername($clientKey): Tenant
    {
        $tenant = $this->findTenant($clientKey);
        if (!$tenant) {
            throw new UsernameNotFoundException('Can\'t find tenant with such username');
        }

        return $this->findTenant($clientKey);
    }

    /**
     * @param UserInterface $user
     */
    public function refreshUser(UserInterface $user): void
    {
        throw new UnsupportedUserException('Refresh prohibited');
    }

    /**
     * @param string|mixed $class
     *
     * @return bool
     */
    public function supportsClass($class): bool
    {
        return ($class === 'AtlassianConnectBundle\Entity\Tenant') || \is_subclass_of($class, Tenant::class);
    }

    /**
     * @param string $clientKey
     *
     * @return Tenant|null
     */
    protected function findTenant(string $clientKey): ?Tenant
    {
        /** @noinspection PhpUndefinedMethodInspection */

        return $this->em
            ->getRepository($this->tenantClass)
            ->findOneByClientKey($clientKey);
    }
}
