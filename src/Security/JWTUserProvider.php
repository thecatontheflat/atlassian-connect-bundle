<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
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
     * @param EntityManagerInterface $entityManager
     * @param string                 $tenantClass
     */
    public function __construct(EntityManagerInterface $entityManager, string $tenantClass)
    {
        $this->em = $entityManager;
        $this->tenantClass = $tenantClass;
    }

    /**
     * @param string $jwt
     *
     * @return object|mixed
     */
    public function getDecodedToken(string $jwt)
    {
        try {
            /** @noinspection PhpUnusedLocalVariableInspection */
            $bodyb64 = \explode('.', $jwt)[1];
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

        return $tenant;
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
     * @param string $identifier
     *
     * @return UserInterface
     */
    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $tenant = $this->findTenant($identifier);

        if (!$tenant) {
            throw new UserNotFoundException('Can\'t find tenant with such identifier');
        }

        return $tenant;
    }

    /**
     * @param string $clientKey
     *
     * @return TenantInterface|object|null
     */
    private function findTenant(string $clientKey): ?TenantInterface
    {
        /** @noinspection PhpUndefinedMethodInspection */

        return $this->em
            ->getRepository($this->tenantClass)
            ->findOneBy(['clientKey' => $clientKey]);
    }
}
