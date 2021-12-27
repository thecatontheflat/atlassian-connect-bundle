<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class AtlassianRestClient implements AtlassianRestClientInterface
{
    private HttpClientInterface $client;

    private TokenStorageInterface $tokenStorage;

    private ?TenantInterface $tenant;

    private ?string $user;

    public function __construct(HttpClientInterface $client, TokenStorageInterface $tokenStorage)
    {
        $this->client = $client;
        $this->tokenStorage = $tokenStorage;

        $this->tenant = null;
        $this->user = null;
    }

    public function setTenant(TenantInterface $tenant): self
    {
        $this->tenant = $tenant;

        return $this;
    }

    public function actAsUser(string $userId): self
    {
        $this->user = $userId;

        return $this;
    }

    public function get(string $restUrl): string
    {
        return $this->doRequest('GET', $restUrl, []);
    }

    public function post(string $restUrl, array $json): string
    {
        return $this->doRequest('POST', $restUrl, [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $json,
        ]);
    }

    public function put(string $restUrl, array $json): string
    {
        return $this->doRequest('PUT', $restUrl, [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $json,
        ]);
    }

    public function delete(string $restUrl): string
    {
        return $this->doRequest('DELETE', $restUrl, []);
    }

    public function sendFile(File $file, string $restUrl): string
    {
        $options = [];

        $options['headers']['X-Atlassian-Token'] = 'nocheck';
        $savedFile = $file->move('/tmp/', $file->getFilename());

        $options['body'] = [
            'file' => fopen($savedFile->getRealPath(), 'r'),
        ];

        unlink($savedFile->getRealPath());

        return $this->doRequest('POST', $restUrl, $options);
    }

    public function doRequest(string $method, string $restUrl, array $options): string
    {
        $options['tenant'] = $this->getTenant();
        $options['user_id'] = $this->user;

        return $this->client->request($method, $this->buildURL($restUrl), $options)->getContent();
    }

    private function getTenant(): TenantInterface
    {
        if ($this->tenant) {
            return $this->tenant;
        }

        $token = $this->tokenStorage->getToken();

        if (!$token || !$user = $token->getUser()) {
            throw new \RuntimeException('Could not get tenant from token');
        }

        if (!$user instanceof TenantInterface) {
            throw new \RuntimeException('Current user is not a Tenant');
        }

        return $this->tenant = $user;
    }

    private function buildURL(string $restUrl): string
    {
        // Jira return absolute self links, so its more easy to work with get with absolute urls in such cases
        if ((0 !== mb_strpos($restUrl, 'http://')) && (0 !== mb_strpos($restUrl, 'https://'))) {
            return $this->tenant->getBaseUrl().$restUrl;
        }

        return $restUrl;
    }
}
