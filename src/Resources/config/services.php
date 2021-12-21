<?php

declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use AtlassianConnectBundle\Command\RequestAPICommand;
use AtlassianConnectBundle\Controller\DescriptorController;
use AtlassianConnectBundle\Controller\HandshakeController;
use AtlassianConnectBundle\Controller\UnlicensedController;
use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Listener\LicenseListener;
use AtlassianConnectBundle\Security\JWTAuthenticator;
use AtlassianConnectBundle\Security\JWTSecurityHelper;
use AtlassianConnectBundle\Security\JWTSecurityHelperInterface;
use AtlassianConnectBundle\Security\JWTUserProvider;
use AtlassianConnectBundle\Security\LegacyJWTAuthenticator;
use AtlassianConnectBundle\Service\AtlassianRestClient;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use Psr\Log\LoggerInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Guard\AbstractGuardAuthenticator;
use Twig\Environment;

return static function (ContainerConfigurator $container) {
    $container->parameters()
        ->set('atlassian_connect_license_listener_class', LicenseListener::class)
        ->set('atlassian_connect_jwt_user_provider_class', JWTUserProvider::class)
        ->set('atlassian_connect_jwt_authenticator_class', JWTAuthenticator::class)
        ->set('atlassian_connect_tenant_entity_class', Tenant::class);

    $container->services()
        ->set(UnlicensedController::class)
            ->args([new ReferenceConfigurator(Environment::class)])
            ->tag('controller.service_arguments')
        ->set(HandshakeController::class)
            ->args([
                new ReferenceConfigurator(EntityManagerInterface::class),
                new ReferenceConfigurator(LoggerInterface::class),
                '%atlassian_connect_tenant_entity_class%',
            ])
            ->tag('controller.service_arguments')
        ->set(DescriptorController::class)
            ->args(['%atlassian_connect%'])
            ->tag('controller.service_arguments')
        ->set(RequestAPICommand::class)
            ->args([
                new ReferenceConfigurator(ManagerRegistry::class),
                '%atlassian_connect_tenant_entity_class%',
            ])
            ->tag('console.command')
        ->set(AtlassianRestClient::class)
            ->public()
            ->args([
                null,
                new ReferenceConfigurator(TokenStorageInterface::class),
            ])
        ->set(JWTSecurityHelper::class)
            ->args([
                new ReferenceConfigurator(EntityManagerInterface::class),
                '%atlassian_connect_dev_tenant%',
                '%kernel.environment%',
                '%atlassian_connect_tenant_entity_class%',
            ])
        ->alias(JWTSecurityHelperInterface::class, JWTSecurityHelper::class)
        ->set('kernel.listener.license_listener', '%atlassian_connect_license_listener_class%')
            ->args([
                new ReferenceConfigurator(RouterInterface::class),
                new ReferenceConfigurator(TokenStorageInterface::class),
            ])
            ->tag('kernel.event_listener', ['event' => 'kernel.request', 'method' => 'onKernelRequest'])
        ->set('jwt_user_provider', '%atlassian_connect_jwt_user_provider_class%')
            ->args([
                new ReferenceConfigurator(EntityManagerInterface::class),
                '%atlassian_connect_tenant_entity_class%',
            ])
        ->set('jwt_authenticator', '%atlassian_connect_jwt_authenticator_class%')
            ->args([
                new ReferenceConfigurator('jwt_user_provider'),
                new ReferenceConfigurator(JWTSecurityHelperInterface::class),
            ])
        ->alias(JWTAuthenticator::class, (new ReferenceConfigurator('jwt_authenticator'))->__toString())
    ;

    if (class_exists(AbstractGuardAuthenticator::class)) {
        $container->parameters()
            ->set('atlassian_connect_jwt_authenticator_guard_class', LegacyJWTAuthenticator::class);

        $container->services()
            ->set('jwt_authenticator_guard', '%atlassian_connect_jwt_authenticator_guard_class%')
            ->args([new ReferenceConfigurator(JWTSecurityHelperInterface::class)]);
    }
};
