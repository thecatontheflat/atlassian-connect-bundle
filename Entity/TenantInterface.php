<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Entity;

/**
 * Interface TenantInterface
 */
interface TenantInterface
{
    /**
     * @return null|string
     */
    public function getSharedSecret(): ?string;

    /**
     * @return null|string
     */
    public function getBaseUrl(): ?string;

    /**
     * @return null|string
     */
    public function getAddonKey(): ?string;
}
