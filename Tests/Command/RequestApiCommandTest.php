<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Command;

use AtlassianConnectBundle\Command\RequestAPICommand;
use AtlassianConnectBundle\Entity\TenantInterface;
use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use AtlassianConnectBundle\Service\AtlassianRestClientInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

final class RequestApiCommandTest extends TestCase
{
    /** @var TenantRepositoryInterface|\PHPUnit\Framework\MockObject\MockObject */
    private $tenantRepository;

    /** @var AtlassianRestClientInterface|\PHPUnit\Framework\MockObject\MockObject */
    private $restClient;

    private CommandTester $commandTester;

    protected function setUp(): void
    {
        $this->tenantRepository = $this->createMock(TenantRepositoryInterface::class);
        $this->restClient = $this->createMock(AtlassianRestClientInterface::class);
        $application = new Application();
        $application->add(new RequestAPICommand($this->tenantRepository, $this->restClient));
        $this->commandTester = new CommandTester($application->find('ac:request-api'));
    }

    public function testExecute(): void
    {
        $this->tenantRepository->expects($this->once())
            ->method('findById')
            ->with('1')
            ->willReturn($this->createMock(TenantInterface::class));

        $this->restClient
            ->expects($this->once())
            ->method('get')
            ->with('/resource')
            ->willReturn('{"message": "ok"}');

        $this->commandTester->execute(['rest-url' => '/resource', '--tenant-id' => '1'], []);
        $this->assertStringContainsString('{"message": "ok"}', $this->commandTester->getDisplay());
    }

    public function testByClientKey(): void
    {
        $this->tenantRepository->expects($this->once())
            ->method('findByClientKey')
            ->with('key')
            ->willReturn($this->createMock(TenantInterface::class));

        $this->restClient
            ->expects($this->once())
            ->method('get')
            ->with('/resource')
            ->willReturn('{"message": "ok"}');

        $this->commandTester->execute(['rest-url' => '/resource', '--client-key' => 'key'], []);
        $this->assertStringContainsString('{"message": "ok"}', $this->commandTester->getDisplay());
    }

    public function testFails(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->commandTester->execute(['rest-url' => '/resource'], []);
    }
}
