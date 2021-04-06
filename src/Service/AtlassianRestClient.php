<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\CurlHandler;
use GuzzleHttp\HandlerStack;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Class AtlassianRestClient
 */
class AtlassianRestClient
{
    /**
     * @var TenantInterface
     */
    private $tenant;

    /**
     * @var Client
     */
    private $client;

    /**
     * @var string|null
     */
    private $user;

    /**
     * @param TenantInterface|null       $tenant
     * @param TokenStorageInterface|null $tokenStorage
     */
    public function __construct(?TenantInterface $tenant, ?TokenStorageInterface $tokenStorage = null)
    {
        $this->setTenant($tenant, $tokenStorage);
        $this->client = $this->createClient();
    }

    /**
     * @return Client
     */
    public function getClient(): Client
    {
        return $this->client;
    }

    /**
     * @param UploadedFile $file
     * @param string       $restUrl
     *
     * @return string
     */
    public function sendFile(UploadedFile $file, string $restUrl): string
    {
        $options = [];

        $options['headers']['X-Atlassian-Token'] = 'nocheck';
        $savedFile = $file->move('/tmp/', $file->getClientOriginalName());

        $options['body'] = [
            'file' => \fopen($savedFile->getRealPath(), 'r'),
        ];

        \unlink($savedFile->getRealPath());

        return $this->client->post($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    /**
     * @param string       $restUrl
     * @param array<mixed> $json
     *
     * @return string
     */
    public function put(string $restUrl, array $json): string
    {
        $options = [];

        $options['headers']['Content-Type'] = 'application/json';
        $options['json'] = $json;

        return $this->client->put($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    /**
     * @param string       $restUrl
     * @param array<mixed> $json
     *
     * @return string
     */
    public function post(string $restUrl, array $json): string
    {
        $options = [];

        $options['headers']['Content-Type'] = 'application/json';
        $options['json'] = $json;

        return $this->client->post($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    /**
     * @param string $restUrl
     *
     * @return string
     */
    public function get(string $restUrl): string
    {
        return $this->client->get($this->buildURL($restUrl))->getBody()->getContents();
    }

    /**
     * @param string $restUrl
     *
     * @return string
     */
    public function delete(string $restUrl): string
    {
        return $this->client->delete($this->buildURL($restUrl))->getBody()->getContents();
    }

    /**
     * @param string|null $user
     *
     * @return AtlassianRestClient
     */
    public function setUser(?string $user): AtlassianRestClient
    {
        $this->user = $user;
        $this->client = $this->createClient();

        return $this;
    }

    /**
     * @param string $restUrl
     *
     * @return string
     */
    private function buildURL(string $restUrl): string
    {
        // Jira return absolute self links, so its more easy to work with get with absolute urls in such cases
        if ((\mb_strpos($restUrl, 'http://') !== 0) && (\mb_strpos($restUrl, 'https://') !== 0)) {
            return $this->tenant->getBaseUrl().$restUrl;
        }

        return $restUrl;
    }

    /**
     * Create a HTTP client
     *
     * @return Client
     */
    private function createClient(): Client
    {
        $stack = new HandlerStack();
        $stack->setHandler(new CurlHandler());

        if ($this->user === null) {
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

    /**
     * @param TenantInterface|null       $tenant
     * @param TokenStorageInterface|null $tokenStorage
     *
     * @return void
     */
    private function setTenant(?TenantInterface $tenant, ?TokenStorageInterface $tokenStorage): void
    {
        if ($tenant !== null) {
            $this->tenant = $tenant;
        } elseif ($tokenStorage !== null) {
            $token = $tokenStorage->getToken();

            if ($token !== null) {
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
