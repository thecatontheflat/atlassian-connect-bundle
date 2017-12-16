<?php

namespace AtlassianConnectBundle\Security;

use Doctrine\Common\Persistence\ManagerRegistry;
use Doctrine\ORM\EntityManager;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\UsernameNotFoundException;
use Symfony\Component\Security\Core\User\UserProviderInterface;
use Symfony\Component\Security\Core\User\User;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\JWT\Authentication\JWT;

class JWTUserProvider implements UserProviderInterface
{
    /**
     * @var EntityManager
     */
    protected $em;
    protected $tokenLifetime;
    protected $tenantClass;

    public function __construct(ManagerRegistry $registry, $tokenLifetime, $tenantClass)
    {
        $this->em = $registry->getManager();
        $this->tokenLifetime = $tokenLifetime;
        $this->tenantClass = $tenantClass;
    }

    public function getDecodedToken($jwt)
    {
        try {
            $decodedToken = JWT::decode($jwt);
            $tenant = $this->findTenant($decodedToken->iss);

            JWT::decode($jwt, $tenant->getSharedSecret(), ['HS256'], $this->tokenLifetime);

            return $decodedToken;
        } catch (\Exception $e) {
            throw new AuthenticationException($e->getMessage());
        }
    }

    /**
     * @param string $clientKey

     * @return Tenant
     */
    public function loadUserByUsername($clientKey)
    {
        $tenant = $this->findTenant($clientKey);
        if (!$tenant) {
            throw new UsernameNotFoundException();
        }

        return $this->findTenant($clientKey);
    }

    public function refreshUser(UserInterface $user)
    {
        throw new UnsupportedUserException();
    }

    public function supportsClass($class)
    {
        return ('AtlassianConnectBundle\Entity\Tenant' === $class) || is_subclass_of($class,'AtlassianConnectBundle\Entity\Tenant');
    }

    /**
     * @param $clientKey
     * @return Tenant|null
     */
    protected function findTenant($clientKey)
    {
        return $this->em
            ->getRepository($this->tenantClass)
            ->findOneByClientKey($clientKey);
    }
}
