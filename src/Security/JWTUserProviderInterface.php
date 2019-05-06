<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * @class JWTUserProviderInterface
 */
interface JWTUserProviderInterface extends UserProviderInterface
{
    /**
     * @param string $jwt
     *
     * @return object|mixed
     */
    public function getDecodedToken(string $jwt);
}
