<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\HttpClient\DecoratorTrait;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

final class AuthenticatedAtlassianClient implements HttpClientInterface
{
    use DecoratorTrait;

    public function request(string $method, string $url, array $options = []): ResponseInterface
    {
        /** @var TenantInterface $tenant */
        $tenant = $options['tenant'];
        $userId = $options['user_id'];
        unset($options['tenant']);
        unset($options['user_id']);

        if (!$userId) {
            $options['headers']['Authorization'] = 'JWT '.JWTGenerator::generate($url, $method, $tenant->getAddonKey(), $tenant->getSharedSecret());

            return $this->client->request($method, $url, $options);
        }

        if (!$tenant->getOauthClientId()) {
            throw new \RuntimeException('Tenant is not set up as oath application. Install the app with "ACT_AS_USER" scope.');
        }

        $result = $this->client->request('POST', 'https://oauth-2-authorization-server.services.atlassian.com/oauth2/token', [
            'body' => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => JWTGenerator::generateAssertion($tenant->getSharedSecret(), $tenant->getOauthClientId(), $tenant->getBaseUrl(), $userId),
            ],
        ]);

        $options['headers']['Authorization'] = 'Bearer '.$result->toArray()['access_token'];

        return $this->client->request($method, $url, $options);
    }
}
