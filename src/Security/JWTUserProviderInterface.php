<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\Security\Core\User\UserProviderInterface;

interface JWTUserProviderInterface extends UserProviderInterface
{
    /**
     * @return object|mixed
     */
    public function getDecodedToken(string $jwt);
}
