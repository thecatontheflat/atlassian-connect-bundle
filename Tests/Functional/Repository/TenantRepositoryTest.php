<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional\Repository;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use AtlassianConnectBundle\Tests\Functional\KernelTestCase;
use Doctrine\ORM\EntityManagerInterface;

final class TenantRepositoryTest extends KernelTestCase
{
    public function testFindTenant(): void
    {
        self::bootKernel();
        $repository = self::getContainer()->get(TenantRepositoryInterface::class);

        $this->assertNotNull($repository->findById(1));
    }

    public function testFindTenantByClientKey(): void
    {
        self::bootKernel();
        $repository = self::getContainer()->get(TenantRepositoryInterface::class);

        $tenant = $repository->findByClientKey('client_key');

        $this->assertNotNull($tenant);
        $this->assertSame('client_key', $tenant->getClientKey());
    }

    public function testSaveTenant(): void
    {
        self::bootKernel();
        /** @var TenantRepositoryInterface $repository */
        $repository = self::getContainer()->get(TenantRepositoryInterface::class);

        /** @var Tenant $tenant */
        $tenant = $repository->initializeTenant();
        $tenant->setClientKey('new_client_key');
        $tenant->setAddonKey('key');
        $tenant->setPublicKey('key');
        $tenant->setSharedSecret('shared');
        $tenant->setServerVersion('1');
        $tenant->setPluginsVersion('1');
        $tenant->setBaseUrl('https://google.com');
        $tenant->setProductType('jira');
        $tenant->setDescription('description');
        $tenant->setEventType('event');
        $repository->save($tenant);

        self::getContainer()->get(EntityManagerInterface::class)->clear();

        $this->assertNotNull($tenant = $repository->findByClientKey('new_client_key'));
        $this->assertNotNull($tenant->getCreatedAt());
    }
}
