<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Storage;

use AtlassianConnectBundle\Entity\TenantInterface;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Class DoctrineTenantStorage
 */
class DoctrineTenantStorage implements TenantStorageInterface
{
    /**
     * @var EntityManagerInterface
     */
    private $entityManager;

    /**
     * @var string
     */
    private $tenantEntityClass;

    /**
     * DoctrineTenantStorage constructor.
     *
     * @param EntityManagerInterface $entityManager
     * @param string                 $tenantEntityClass
     */
    public function __construct(EntityManagerInterface $entityManager, string $tenantEntityClass)
    {
        $this->entityManager = $entityManager;
        $this->tenantEntityClass = $tenantEntityClass;
    }

    /**
     * @param string $clientKey
     * @return TenantInterface|null
     */
    public function findByClientKey(string $clientKey): ?TenantInterface
    {
        /** @var TenantInterface|null $tenant */
        $tenant = $this->entityManager
            ->getRepository($this->tenantEntityClass)
            ->findOneBy(['clientKey' => $clientKey]);

        return $tenant;
    }

    /**
     * @param int $tenantId
     * @return TenantInterface|null
     */
    public function findById(int $tenantId): ?TenantInterface
    {
        /** @var TenantInterface|null $tenant */
        $tenant = $this->entityManager
            ->getRepository($this->tenantEntityClass)
            ->find($tenantId);

        return $tenant;
    }

    /**
     * @param TenantInterface $tenant
     */
    public function persist(TenantInterface $tenant): void
    {
        $this->entityManager->persist($tenant);
        $this->entityManager->flush();
    }
}
