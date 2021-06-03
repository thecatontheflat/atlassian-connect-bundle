<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Service;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Storage\DoctrineTenantStorage;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ObjectRepository;
use PHPUnit\Framework\TestCase;

/**
 * Class DoctrineTenantStorageTest
 *
 * @covers \AtlassianConnectBundle\Storage\DoctrineTenantStorage
 */
class DoctrineTenantStorageTest extends TestCase
{
    /**
     * @var EntityManagerInterface|\PHPUnit\Framework\MockObject\MockObject
     */
    private $entityManager;

    /**
     * @var DoctrineTenantStorage
     */
    private $doctrineTenantStorage;

    /**
     * @var string
     */
    private $tenantEntityClass;

    /**
     * Setup properties
     */
    protected function setUp(): void
    {
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->tenantEntityClass = Tenant::class;

        $this->doctrineTenantStorage = new DoctrineTenantStorage(
            $this->entityManager,
            $this->tenantEntityClass
        );
    }

    /**
     * @return void
     */
    public function testFindByClientKey(): void
    {
        $repository = $this->createMock(ObjectRepository::class);
        $repository
            ->expects(static::once())
            ->method('findOneBy')
            ->with(['clientKey' => 'key']);

        $this->entityManager
            ->expects($this->once())
            ->method('getRepository')
            ->willReturn($repository);

        $this->doctrineTenantStorage->findByClientKey('key');
    }

    /**
     * @return void
     */
    public function testFindById(): void
    {
        $repository = $this->createMock(ObjectRepository::class);
        $repository
            ->expects(static::once())
            ->method('find')
            ->with(1);

        $this->entityManager
            ->expects($this->once())
            ->method('getRepository')
            ->willReturn($repository);

        $this->doctrineTenantStorage->findById(1);
    }

    /**
     * @return void
     */
    public function testPersist(): void
    {
        $tenantClassName = $this->tenantEntityClass;
        $tenant = new $tenantClassName();

        $this->entityManager
            ->expects($this->once())
            ->method('persist')
            ->with($tenant);

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $this->doctrineTenantStorage->persist($tenant);
    }
}
