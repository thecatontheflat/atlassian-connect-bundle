<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Listener;

use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Class TestUser
 */
final class TestUser implements UserInterface
{
    /**
     * @inheritDoc
     */
    public function getRoles()
    {
    }

    /**
     * @inheritDoc
     */
    public function getPassword()
    {
    }

    /**
     * @inheritDoc
     */
    public function getSalt()
    {
    }

    /**
     * @inheritDoc
     */
    public function getUsername()
    {
    }

    /**
     * @inheritDoc
     */
    public function eraseCredentials()
    {
    }
}
