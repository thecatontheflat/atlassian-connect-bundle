<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Model;

use AtlassianConnectBundle\Entity\TenantInterface;
use Firebase\JWT\JWT;
use GuzzleHttp\Client;
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
     * @var QSH
     */
    private $qshHelper;

    /**
     * JWTRequest constructor.
     *
     * @param TenantInterface $tenant
     */
    public function __construct(TenantInterface $tenant)
    {
        $this->tenant = $tenant;
        $this->client = new Client();
        $this->qshHelper = new QSH();
    }

    /**
     * @param UploadedFile $file
     * @param string       $restUrl
     */
    public function sendFile(UploadedFile $file, string $restUrl): void
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('POST', $restUrl)];
        $options['headers']['X-Atlassian-Token'] = 'nocheck';
        $savedFile = $file->move('/tmp/', $file->getClientOriginalName());

        $options['body'] = [
            'file' => \fopen($savedFile->getRealPath(), 'rb'),
        ];

        \unlink($savedFile->getRealPath());

        $this->client->post($url, $options);
    }

    /**
     * @param string  $restUrl
     * @param mixed[] $json
     *
     * @return string
     */
    public function put(string $restUrl, array $json): string
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('PUT', $restUrl)];
        $options['headers']['Content-Type'] = 'application/json';

        $options['json'] = $json;

        $response = $this->client->put($url, $options);

        return $response->getBody()->getContents();
    }

    /**
     * @param string  $restUrl
     * @param mixed[] $json
     *
     * @return string
     */
    public function post(string $restUrl, array $json): string
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('POST', $restUrl)];
        $options['headers']['Content-Type'] = 'application/json';

        $options['json'] = $json;

        $response = $this->client->post($url, $options);

        return $response->getBody()->getContents();
    }

    /**
     * @param string $restUrl
     *
     * @return string
     */
    public function get(string $restUrl): string
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('GET', $restUrl)];

        $response = $this->client->get($url, $options);

        return $response->getBody()->getContents();
    }

    /**
     * @param string $restUrl
     */
    public function delete(string $restUrl): void
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('DELETE', $restUrl)];

        $this->client->delete($url, $options);
    }

    /**
     * @param string $method
     * @param string $restUrl
     *
     * @return mixed[]
     */
    private function buildAuthHeader(string $method, string $restUrl): array
    {
        $token = $this->buildPayload($method, $restUrl);
        $jwt = JWT::encode($token, $this->tenant->getSharedSecret());

        return ['Authorization' => 'JWT '.$jwt];
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
     * @param string $method
     * @param string $restUrl
     *
     * @return mixed[]
     */
    private function buildPayload(string $method, string $restUrl): array
    {
        return [
            'iss' => $this->tenant->getAddonKey(),
            'iat' => \time(),
            'exp' => \strtotime('+1 day'),
            'qsh' => $this->qshHelper->create($method, $restUrl),
        ];
    }
}
