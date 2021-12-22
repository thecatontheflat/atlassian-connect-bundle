<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Repository;

use AtlassianConnectBundle\Entity\TenantInterface;

interface TenantRepositoryInterface
{
    public function findById($id): ?TenantInterface;

    public function findByClientKey(string $clientKey): ?TenantInterface;

    public function save(TenantInterface $tenant): void;

    public function initializeTenant(): TenantInterface;
}
