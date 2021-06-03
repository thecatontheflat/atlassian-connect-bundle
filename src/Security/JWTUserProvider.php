<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Storage\TenantStorageInterface;
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
     * @var TenantStorageInterface
     */
    private $tenantStorage;

    /**
     * JWTUserProvider constructor.
     *
     * @param TenantStorageInterface $tenantStorage
     */
    public function __construct(TenantStorageInterface $tenantStorage)
    {
        $this->tenantStorage = $tenantStorage;
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
            JWT::decode($jwt, $this->tenantStorage->findByClientKey($decodedToken->iss)->getSharedSecret(), ['HS256']);

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
        $tenant = $this->tenantStorage->findByClientKey($clientKey);

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
        $tenant = $this->tenantStorage->findByClientKey($identifier);

        if (!$tenant) {
            throw new UserNotFoundException('Can\'t find tenant with such identifier');
        }

        return $tenant;
    }

}
