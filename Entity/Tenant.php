<?php

namespace AtlassianConnectBundle\Entity;

use Serializable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\Role\Role;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Tenant
 *
 * @ORM\Table(name="tenant")
 * @ORM\HasLifecycleCallbacks()
 * @ORM\Entity()
 */
class Tenant implements UserInterface
{
    use TenantTrait;
}