<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\CurlHandler;
use GuzzleHttp\HandlerStack;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class AtlassianRestClient
{
    private TenantInterface $tenant;

    private Client $client;

    private ?string $user;

    public function __construct(?TenantInterface $tenant, ?TokenStorageInterface $tokenStorage = null)
    {
        $this->setTenant($tenant, $tokenStorage);
        $this->client = $this->createClient();
    }

    public function getClient(): Client
    {
        return $this->client;
    }

    public function sendFile(UploadedFile $file, string $restUrl): string
    {
        $options = [];

        $options['headers']['X-Atlassian-Token'] = 'nocheck';
        $savedFile = $file->move('/tmp/', $file->getClientOriginalName());

        $options['body'] = [
            'file' => fopen($savedFile->getRealPath(), 'r'),
        ];

        unlink($savedFile->getRealPath());

        return $this->client->post($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    /**
     * @param array<mixed> $json
     */
    public function put(string $restUrl, array $json): string
    {
        $options = [];

        $options['headers']['Content-Type'] = 'application/json';
        $options['json'] = $json;

        return $this->client->put($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    public function post(string $restUrl, array $json): string
    {
        $options = [];

        $options['headers']['Content-Type'] = 'application/json';
        $options['json'] = $json;

        return $this->client->post($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    public function get(string $restUrl): string
    {
        return $this->client->get($this->buildURL($restUrl))->getBody()->getContents();
    }

    public function delete(string $restUrl): string
    {
        return $this->client->delete($this->buildURL($restUrl))->getBody()->getContents();
    }

    public function setUser(?string $user): self
    {
        $this->user = $user;
        $this->client = $this->createClient();

        return $this;
    }

    private function buildURL(string $restUrl): string
    {
        // Jira return absolute self links, so its more easy to work with get with absolute urls in such cases
        if ((0 !== mb_strpos($restUrl, 'http://')) && (0 !== mb_strpos($restUrl, 'https://'))) {
            return $this->tenant->getBaseUrl() . $restUrl;
        }

        return $restUrl;
    }

    private function createClient(): Client
    {
        $stack = new HandlerStack();
        $stack->setHandler(new CurlHandler());

        if (null === $this->user) {
            $stack->push(GuzzleJWTMiddleware::authTokenMiddleware(
                $this->tenant->getAddonKey(),
                $this->tenant->getSharedSecret()
            ));
        } else {
            $stack->push(GuzzleJWTMiddleware::authUserTokenMiddleware(
                new Client(),
                $this->tenant->getOauthClientId(),
                $this->tenant->getSharedSecret(),
                $this->tenant->getBaseUrl(),
                $this->user
            ));
        }

        return new Client(['handler' => $stack]);
    }

    private function setTenant(?TenantInterface $tenant, ?TokenStorageInterface $tokenStorage): void
    {
        if (null !== $tenant) {
            $this->tenant = $tenant;
        } elseif (null !== $tokenStorage) {
            $token = $tokenStorage->getToken();

            if (null !== $token) {
                $user = $token->getUser();

                if ($user instanceof TenantInterface) {
                    $this->tenant = $user;
                }
            }
        } else {
            throw new \RuntimeException('Can\'t get tenant');
        }
    }
}
