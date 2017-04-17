<?php

namespace AtlassianConnectBundle\Controller;

use AtlassianConnectBundle\Entity\Tenant;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class HandshakeController extends Controller
{
    public function registerAction(Request $request)
    {
        $content = $request->getContent();
        $content = json_decode($content, true);

        $tenantClass = $this->getParameter("atlassian_connect_tenant_entity_class");
        $tenant = $this->getDoctrine()->getRepository($tenantClass)
            ->findOneByClientKey($content['clientKey']);

        if (!$tenant) {
            $tenant = new Tenant();
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
