<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Table(name="tenant")
 * @ORM\HasLifecycleCallbacks()
 * @ORM\Entity()
 */
#[ORM\Entity, ORM\Table(name: 'tenant'), ORM\HasLifecycleCallbacks]
class Tenant implements TenantInterface
{
    use TenantTrait;
}
