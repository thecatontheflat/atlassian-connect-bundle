<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Tenant
 *
 * @ORM\Table(name="tenant")
 * @ORM\HasLifecycleCallbacks()
 * @ORM\Entity()
 */
class Tenant implements UserInterface, TenantInterface
{
    use TenantTrait;
}
