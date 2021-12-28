<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Repository;

use AtlassianConnectBundle\Entity\TenantInterface;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

final class TenantRepository extends ServiceEntityRepository implements TenantRepositoryInterface
{
    public function __construct(ManagerRegistry $registry, private string $tenantClass)
    {
        parent::__construct($registry, $tenantClass);
    }

    public function findById($id): ?TenantInterface
    {
        return $this->findOneBy(['id' => $id]);
    }

    public function findByClientKey(string $clientKey): ?TenantInterface
    {
        return $this->findOneBy(['clientKey' => $clientKey]);
    }

    public function save(TenantInterface $tenant): void
    {
        $this->getEntityManager()->persist($tenant);
        $this->getEntityManager()->flush();
    }

    public function initializeTenant(): TenantInterface
    {
        return new $this->tenantClass();
    }
}
