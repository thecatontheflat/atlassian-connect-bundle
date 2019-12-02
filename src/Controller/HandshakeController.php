<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Controller;

use AtlassianConnectBundle\Entity\TenantInterface;
use Doctrine\ORM\EntityManagerInterface;
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
     * @var EntityManagerInterface
     */
    private $em;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var string
     */
    private $tenantClass;

    /**
     * @param EntityManagerInterface $em
     * @param LoggerInterface        $logger
     * @param string                 $tenantClass
     */
    public function __construct(EntityManagerInterface $em, LoggerInterface $logger, string $tenantClass)
    {
        $this->em = $em;
        $this->logger = $logger;
        $this->tenantClass = $tenantClass;
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

        /** @var TenantInterface $tenant */
        /** @noinspection PhpUndefinedMethodInspection */
        $tenant = $this->em->getRepository($this->tenantClass)->findOneByClientKey($content['clientKey']);

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

        $this->em->persist($tenant);
        $this->em->flush();

        return new Response('OK', 200);
    }
}
