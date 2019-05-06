<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\Security\Core\User\UserProviderInterface;

interface JWTUserProviderInterface extends UserProviderInterface
{
    /**
     * @param string $jwt
     *
     * @return object
     */
    public function getDecodedToken(string $jwt);
}
