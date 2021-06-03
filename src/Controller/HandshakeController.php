<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Controller;

use AtlassianConnectBundle\Storage\TenantStorageInterface;
use Firebase\JWT\JWT;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Class HandshakeController
 */
class HandshakeController
{
    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var string
     */
    private $tenantClass;

    /**
     * @var TenantStorageInterface
     */
    private $tenantStorage;

    /**
     * HandshakeController constructor.
     *
     * @param TenantStorageInterface $tenantStorage
     * @param LoggerInterface        $logger
     * @param string                 $tenantClass
     */
    public function __construct(TenantStorageInterface $tenantStorage, LoggerInterface $logger, string $tenantClass)
    {
        $this->logger = $logger;
        $this->tenantClass = $tenantClass;
        $this->tenantStorage = $tenantStorage;
    }

    /**
     * @param Request $request
     *
     * @return Response
     */
    public function registerAction(Request $request): Response
    {
        $content = $request->getContent();
        $content = \json_decode($content, true);

        $tenant = $this->tenantStorage->findByClientKey($content['clientKey']);

        if ($tenant !== null) {
            try {
                $authorizationHeaderArray = \explode(' ', $request->headers->get('authorization'));

                if (\count($authorizationHeaderArray) <= 1) {
                    throw new \InvalidArgumentException('Bad authorization header');
                }

                $jwt = $authorizationHeaderArray[1];
                JWT::decode($jwt, $tenant->getSharedSecret(), ['HS256']);
            } catch (\Throwable $e) {
                $this->logger->error($e->getMessage(), ['exception' => $e]);

                return new Response('Unauthorized', 401);
            }
        } else {
            $tenantClass = $this->tenantClass;
            $tenant = new $tenantClass();
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

        $this->tenantStorage->persist($tenant);

        return new Response('OK', 200);
    }
}
