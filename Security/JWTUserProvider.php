<?php

namespace AtlassianConnectBundle\Security;

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
    private $em;

    public function __construct(EntityManager $em)
    {
        $this->em = $em;
    }

    public function getDecodedToken($jwt)
    {
        try {
            $decodedToken = JWT::decode($jwt);
            $tenant = $this->findTenant($decodedToken->iss);

            JWT::decode($jwt, $tenant->getSharedSecret(), ['HS256'], 600);

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
        return 'AtlassianConnectBundle\Entity\Tenant' === $class;
    }

    /**
     * @param $clientKey
     * @return Tenant|null
     */
    private function findTenant($clientKey)
    {
        return $this->em
            ->getRepository('AtlassianConnectBundle:Tenant')
            ->findOneByClientKey($clientKey);
    }
}