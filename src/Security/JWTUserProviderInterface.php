<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Security;

use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * @template-covariant TUser of UserInterface
 * @template-extends UserProviderInterface<TUser>
 */
interface JWTUserProviderInterface extends UserProviderInterface
{
    public function getDecodedToken(string $jwt): object;
}
