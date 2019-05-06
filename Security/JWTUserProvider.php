<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use Doctrine\Common\Persistence\ManagerRegistry;
use Doctrine\ORM\EntityManager;
use Firebase\JWT\JWT;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Class JWTUserProvider
 */
class JWTUserProvider implements JWTUserProviderInterface
{
    /**
     * @var EntityManager
     */
    protected $em;

    /**
     * @var string
     */
    protected $tenantClass;

    /**
     * JWTUserProvider constructor.
     *
     * @param ManagerRegistry $registry
     * @param string          $tenantClass
     */
    public function __construct(ManagerRegistry $registry, string $tenantClass)
    {
        $this->em = $registry->getManager();
        $this->tenantClass = $tenantClass;
    }

    /**
     * @param string $jwt
     *
     * @return object
     */
    public function getDecodedToken(string $jwt)
    {
        try {
            /** @noinspection PhpUnusedLocalVariableInspection */
            [$headb64, $bodyb64, $cryptob64] = \explode('.', $jwt);
            $decodedToken = \json_decode(JWT::urlsafeB64Decode($bodyb64));

            /** @noinspection NullPointerExceptionInspection */
            JWT::decode($jwt, $this->findTenant($decodedToken->iss)->getSharedSecret(), ['HS256']);

            return $decodedToken;
        } catch (\Throwable $e) {
            throw new AuthenticationException($e->getMessage());
        }
    }

    /**
     * @param mixed $clientKey
     *
     * @return TenantInterface|UserInterface
     */
    public function loadUserByUsername($clientKey): TenantInterface
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
        return \is_subclass_of($class, TenantInterface::class);
    }

    /**
     * @param string $clientKey
     *
     * @return TenantInterface|null
     */
    protected function findTenant(string $clientKey): ?TenantInterface
    {
        /** @noinspection PhpUndefinedMethodInspection */

        return $this->em
            ->getRepository($this->tenantClass)
            ->findOneByClientKey($clientKey);
    }
}
