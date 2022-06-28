<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Controller;

use AtlassianConnectBundle\Repository\TenantRepositoryInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class HandshakeController
{
    public function __construct(private TenantRepositoryInterface $repository, private LoggerInterface $logger)
    {
    }

    public function registerAction(Request $request): Response
    {
        $content = $request->getContent();
        $content = json_decode($content, true);

        $tenant = $this->repository->findByClientKey($content['clientKey']);

        if (null !== $tenant) {
            try {
                $authorizationHeaderArray = explode(' ', $request->headers->get('authorization'));

                if (\count($authorizationHeaderArray) <= 1) {
                    throw new \InvalidArgumentException('Bad authorization header');
                }

                $jwt = $authorizationHeaderArray[1];
                JWT::decode($jwt, new Key($tenant->getSharedSecret(), 'HS256'));
            } catch (\Throwable $e) {
                $this->logger->error($e->getMessage(), ['exception' => $e]);

                return new Response('Unauthorized', 401);
            }
        } else {
            $tenant = $this->repository->initializeTenant();
        }

        $tenant
            ->setAddonKey($content['key'])
            ->setClientKey($content['clientKey'])
            ->setPublicKey($content['publicKey'])
            ->setSharedSecret($content['sharedSecret'])
            ->setServerVersion($content['serverVersion'])
            ->setPluginsVersion($content['pluginsVersion'])
            ->setBaseUrl($content['baseUrl'])
            ->setProductType($content['productType'])
            ->setDescription($content['description'])
            ->setEventType($content['eventType'])
        ;

        if (\array_key_exists('oauthClientId', $content)) {
            $tenant->setOauthClientId($content['oauthClientId']);
        }

        $this->repository->save($tenant);

        return new Response('OK', 200);
    }
}
