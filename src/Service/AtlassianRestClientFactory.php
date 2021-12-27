<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class AtlassianRestClientFactory
{
    public static function createAtlassianRestClient(TokenStorageInterface $tokenStorage, HttpClientInterface $client = null): AtlassianRestClient
    {
        return new AtlassianRestClient(
            new AuthenticatedAtlassianClient($client),
            $tokenStorage,
        );
    }
}
