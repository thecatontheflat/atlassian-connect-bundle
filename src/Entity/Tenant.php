<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Tenant
 *
 * @ORM\Table(name="tenant")
 * @ORM\HasLifecycleCallbacks()
 * @ORM\Entity()
 */
class Tenant implements TenantInterface
{
    use TenantTrait;
}
