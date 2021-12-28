<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use Firebase\JWT\JWT;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;

class JWTUserProvider implements JWTUserProviderInterface
{
    public function __construct(private TenantRepositoryInterface $repository)
    {
    }

    public function getDecodedToken(string $jwt): object
    {
        try {
            $bodyb64 = explode('.', $jwt)[1];
            $decodedToken = json_decode(JWT::urlsafeB64Decode($bodyb64));

            JWT::decode($jwt, $this->findTenant($decodedToken->iss)->getSharedSecret(), ['HS256']);

            return $decodedToken;
        } catch (\Throwable $e) {
            throw new AuthenticationException('Failed to parse token');
        }
    }

    public function loadUserByUsername(string $username): UserInterface
    {
        return $this->loadUserByIdentifier($username);
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
            throw new UserNotFoundException('Can\t find tenant with such username');
        }

        return $tenant;
    }

    private function findTenant(string $clientKey): ?TenantInterface
    {
        return $this->repository->findByClientKey($clientKey);
    }
}
