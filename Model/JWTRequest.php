<?php

namespace AtlassianConnectBundle\Model;

use AtlassianConnectBundle\Entity\Tenant;
use GuzzleHttp\Client;
use AtlassianConnectBundle\JWT\Authentication\JWT;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class JWTRequest
{
    /**
     * @var Tenant
     */
    private $tenant;

    private $client;

    public function __construct($tenant)
    {
        $this->tenant = $tenant;
        $this->client = new Client();
        $this->qshHelper = new QSH();
    }

    public function sendFile(UploadedFile $file, $restUrl)
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('POST', $restUrl)];
        $options['headers']['X-Atlassian-Token'] = 'nocheck';
        $savedFile = $file->move('/tmp/', $file->getClientOriginalName());

        $options['body'] = [
            'file' => fopen($savedFile->getRealPath(), 'r')
        ];

        unlink($savedFile->getRealPath());

        $this->client->post($url, $options);
    }

    public function put($restUrl, $json)
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('PUT', $restUrl)];
        $options['headers']['Content-Type'] = 'application/json';

        $options['json'] = $json;

        $response = $this->client->put($url, $options);

        return $response->json();
    }
    
    public function post($restUrl, $json)
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('POST', $restUrl)];
        $options['headers']['Content-Type'] = 'application/json';

        $options['json'] = $json;

        $response = $this->client->post($url, $options);

        return $response->json();
    }

    public function get($restUrl)
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('GET', $restUrl)];

        $response = $this->client->get($url, $options);

        return $response->json();
    }

    public function delete($restUrl)
    {
        $url = $this->buildURL($restUrl);
        $options = ['headers' => $this->buildAuthHeader('DELETE', $restUrl)];

        $this->client->delete($url, $options);
    }

    private function buildAuthHeader($method, $restUrl)
    {
        $token = $this->buildPayload($method, $restUrl);
        $jwt = JWT::encode($token, $this->tenant->getSharedSecret());

        return ['Authorization' => 'JWT '.$jwt];
    }

    private function buildURL($restUrl)
    {
        // Jira return absolute self links, so its more easy to work with get with absolute urls in such cases  
        if((substr($restUrl,0,7) != 'http://') && (substr($restUrl,0,8) != 'https://')) {
            return $this->tenant->getBaseUrl().$restUrl;
        } else {
            return $restUrl;
        }
    }

    private function buildPayload($method, $restUrl)
    {
        $qsh = $this->qshHelper->create($method, $restUrl);

        return [
            'iss' => $this->tenant->getAddonKey(),
            'iat' => time(),
            'exp' => time() + 86400,
            'qsh' => $qsh,
        ];
    }
}
