<?php

namespace AtlassianConnectBundle\Controller;

use AtlassianConnectBundle\JWT\Authentication\JWT;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

class HandshakeController extends Controller
{
    public function registerAction(Request $request)
    {
        $content = $request->getContent();
        $content = json_decode($content, true);

        $tenantClass = $this->getParameter("atlassian_connect_tenant_entity_class");
        $tenant = $this->getDoctrine()->getRepository($tenantClass)
            ->findOneByClientKey($content['clientKey']);

        if ($tenant) {
            try {
                $authorizationHeaderArray = explode(' ', $request->headers->get('authorization'));
                if (count($authorizationHeaderArray) > 1) {
                    $jwt = $authorizationHeaderArray[1];
                    JWT::decode($jwt, $tenant->getSharedSecret(), ['HS256']);
                }
                throw new \InvalidArgumentException('Bad authorization header');
            } catch (\Exception $e) {
                $this->get('logger')->error($e->getMessage(), ['exception' => $e]);
                return new Response('Unauthorized', 401);
            }
        } else {
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
            ->setEventType($content['eventType']);

        $this->getDoctrine()->getManager()->persist($tenant);
        $this->getDoctrine()->getManager()->flush();

        return new Response('OK', 200);
    }
}
