<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Table(name="tenant")
 * @ORM\HasLifecycleCallbacks()
 * @ORM\Entity()
 */
class Tenant implements TenantInterface
{
    use TenantTrait;
}
