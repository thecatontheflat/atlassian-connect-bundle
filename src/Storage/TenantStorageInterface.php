<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Storage;

use AtlassianConnectBundle\Entity\TenantInterface;

/**
 * Interface TenantStorageInterface
 */
interface TenantStorageInterface
{
    /**
     * @param string $clientKey
     * @return TenantInterface|null
     */
    public function findByClientKey(string $clientKey): ?TenantInterface;

    /**
     * @param int $tenantId
     * @return TenantInterface|null
     */
    public function findById(int $tenantId): ?TenantInterface;

    /**
     * @param TenantInterface $tenant
     */
    public function persist(TenantInterface $tenant): void;
}
