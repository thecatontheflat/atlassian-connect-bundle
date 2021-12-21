<?php

declare(strict_types=1);

use AtlassianConnectBundle\Controller\DescriptorController;
use AtlassianConnectBundle\Controller\HandshakeController;
use AtlassianConnectBundle\Controller\UnlicensedController;
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

return function (RoutingConfigurator $routes) {
    $routes
        ->add('atlassian_connect_descriptor', '/atlassian-connect.json')
            ->controller([DescriptorController::class, 'indexAction'])
            ->methods(['GET'])
        ->add('atlassian_connect_handshake', '/handshake')
            ->controller([HandshakeController::class, 'registerAction'])
        ->add('atlassian_connect_unlicensed', '/protected/unlicensed')
            ->controller([UnlicensedController::class, 'unlicensedAction'])
    ;
};
