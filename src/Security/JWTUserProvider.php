<?php

declare(strict_types=1);

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

class JWTUserProvider implements JWTUserProviderInterface
{
    protected EntityManagerInterface $em;

    protected string $tenantClass;

    public function __construct(EntityManagerInterface $entityManager, string $tenantClass)
    {
        $this->em = $entityManager;
        $this->tenantClass = $tenantClass;
    }

    /**
     * @return object|mixed
     */
    public function getDecodedToken(string $jwt)
    {
        try {
            $bodyb64 = explode('.', $jwt)[1];
            $decodedToken = json_decode(JWT::urlsafeB64Decode($bodyb64));

            /* @noinspection NullPointerExceptionInspection */
            JWT::decode($jwt, $this->findTenant($decodedToken->iss)->getSharedSecret(), ['HS256']);

            return $decodedToken;
        } catch (\Throwable $e) {
            throw new AuthenticationException('Failed to parse token');
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
            if (class_exists(UserNotFoundException::class)) {
                throw new UserNotFoundException('Can\'t find tenant with such username');
            }

            throw new UsernameNotFoundException('Can\'t find tenant with such username');
        }

        return $tenant;
    }

    public function refreshUser(UserInterface $user): void
    {
        throw new UnsupportedUserException('Refresh prohibited');
    }

    /**
     * @param string|mixed $class
     */
    public function supportsClass($class): bool
    {
        return is_subclass_of($class, TenantInterface::class);
    }

    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $tenant = $this->findTenant($identifier);

        if (!$tenant) {
            throw new UserNotFoundException('Can\'t find tenant with such identifier');
        }

        return $tenant;
    }

    private function findTenant(string $clientKey): ?TenantInterface
    {
        return $this->em
            ->getRepository($this->tenantClass)
            ->findOneBy(['clientKey' => $clientKey]);
    }
}
