<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Service;

use AtlassianConnectBundle\Service\AtlassianRestClient;
use AtlassianConnectBundle\Service\AtlassianRestClientFactory;
use AtlassianConnectBundle\Service\AtlassianRestClientInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class AtlassianRestClientFactoryTest extends TestCase
{
    public function testCreatesClientInstance(): void
    {
        $client = AtlassianRestClientFactory::createAtlassianRestClient($storage = $this->createMock(TokenStorageInterface::class), null);

        $this->assertInstanceOf(AtlassianRestClientInterface::class, $client);
        $this->assertInstanceOf(AtlassianRestClient::class, $client);
    }
}
