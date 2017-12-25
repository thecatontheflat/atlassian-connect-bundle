<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Service;

use AtlassianConnectBundle\Entity\TenantInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\CurlHandler;
use GuzzleHttp\HandlerStack;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Class JWTRequest
 */
class JWTRequest
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
     * JWTRequest constructor.
     *
     * @param TenantInterface $tenant
     */
    public function __construct(TenantInterface $tenant)
    {
        $this->tenant = $tenant;
        $this->client = $this->createClient();
    }

    /**
     * @param UploadedFile $file
     * @param string       $restUrl
     *
     * @return string
     */
    public function sendFile(UploadedFile $file, string $restUrl): string
    {
        $options['headers']['X-Atlassian-Token'] = 'nocheck';
        $savedFile = $file->move('/tmp/', $file->getClientOriginalName());

        $options['body'] = [
            'file' => \fopen($savedFile->getRealPath(), 'rb'),
        ];

        \unlink($savedFile->getRealPath());

        return $this->client->post($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    /**
     * @param string  $restUrl
     * @param mixed[] $json
     *
     * @return string
     */
    public function put(string $restUrl, array $json): string
    {
        $options['headers']['Content-Type'] = 'application/json';
        $options['json'] = $json;

        return $this->client->put($this->buildURL($restUrl), $options)->getBody()->getContents();
    }

    /**
     * @param string  $restUrl
     * @param mixed[] $json
     *
     * @return string
     */
    public function post(string $restUrl, array $json): string
    {
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
        $stack->push(JWTMiddleware::authTokenMiddleware(
            $this->tenant->getAddonKey(),
            $this->tenant->getSharedSecret()
        ));

        return new Client(['handler' => $stack]);
    }
}
