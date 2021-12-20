<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Listener;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Listener\LicenseListener;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\User\UserInterface;

final class LicenseListenerTest extends TestCase
{
    /**
     * @var MockObject|KernelInterface
     */
    private $kernel;

    /**
     * @var MockObject|RouterInterface
     */
    private $router;

    /**
     * @var MockObject|TokenStorageInterface
     */
    private $tokenStorage;

    private LicenseListener $listener;

    protected function setUp(): void
    {
        $this->router = $this->createMock(RouterInterface::class);
        $this->kernel = $this->createMock(KernelInterface::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

        $this->listener = new LicenseListener(
            $this->router,
            $this->tokenStorage
        );
    }

    public function testItSkipsOnASubRequest(): void
    {
        $attributeParameterBag = $this->createMock(ParameterBagInterface::class);
        $attributeParameterBag
            ->expects($this->never())
            ->method('get');

        $request = new Request();
        $request->attributes = $attributeParameterBag;

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::SUB_REQUEST
        );

        $this->listener->onKernelRequest($event);
    }

    public function testItSkipsWhenTheRouteIsNullAndRouteRequiresNoLicense(): void
    {
        $request = new Request(
            ['lic' => 'test'],
            [],
            [
                '_route' => 'route',
                'requires_license' => false,
            ]
        );

        $this->kernel
            ->expects($this->never())
            ->method('getEnvironment');

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event);
    }

    public function testLicenseIsNotActiveOrDevelopment(): void
    {
        $request1 = new Request(
            ['lic' => 'active'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $request2 = new Request(
            ['lic' => 'notactive'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('dev');

        $this->tokenStorage
            ->expects($this->never())
            ->method('getToken');

        $event1 = $this->getEvent(
            $this->kernel,
            $request1,
            KernelInterface::MASTER_REQUEST
        );

        $event2 = $this->getEvent(
            $this->kernel,
            $request2,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event1);
        $this->listener->onKernelRequest($event2);
    }

    public function testUserIsNoTenant(): void
    {
        $request = new Request(
            ['lic' => 'not_active'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('prod');

        $this->kernel
            ->expects($this->never())
            ->method('getContainer');

        $token = $this->createMock(TokenInterface::class);
        $token
            ->expects($this->once())
            ->method('getUser')
            ->willReturn($this->createMock(UserInterface::class));

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn($token);

        $this->router
            ->expects($this->once())
            ->method('generate')
            ->with('atlassian_connect_unlicensed')
            ->willReturn('http://website.com');

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event);

        $response = $event->getResponse();
        $this->assertInstanceOf(RedirectResponse::class, $response);
        $this->assertEquals('http://website.com', $response->getTargetUrl());
    }

    public function testTenantIsWhiteListed(): void
    {
        $request = new Request(
            ['lic' => 'not_active'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('prod');

        $user = new Tenant();
        $user->setIsWhiteListed(true);

        $token = $this->createMock(TokenInterface::class);
        $token
            ->expects($this->once())
            ->method('getUser')
            ->willReturn($user);

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn($token);

        $this->kernel
            ->expects($this->never())
            ->method('getContainer');

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event);
    }

    public function testIsValidByWhiteList(): void
    {
        $request = new Request(
            ['lic' => 'not_active'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('prod');

        $user = new Tenant();
        $user->setClientKey('key');

        $token = $this->createMock(TokenInterface::class);
        $token
            ->expects($this->once())
            ->method('getUser')
            ->willReturn($user);

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn($token);

        $date = new \DateTime();
        $date->modify('+1 day');

        $container = $this->createMock(ContainerInterface::class);
        $container
            ->expects($this->once())
            ->method('getParameter')
            ->willReturn([
                ['valid_till' => $date->format('Y-m-d'), 'client_key' => 'key'],
            ]);

        $this->kernel
            ->expects($this->once())
            ->method('getContainer')
            ->willReturn($container);

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event);
        $this->assertNull($event->getResponse());
    }

    public function testWhiteListIsExpired(): void
    {
        $request = new Request(
            ['lic' => 'not_active'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('prod');

        $user = new Tenant();
        $user->setClientKey('key');

        $token = $this->createMock(TokenInterface::class);
        $token
            ->expects($this->once())
            ->method('getUser')
            ->willReturn($user);

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willReturn($token);

        $date = new \DateTime();
        $date->modify('-1 day');

        $container = $this->createMock(ContainerInterface::class);
        $container
            ->expects($this->once())
            ->method('getParameter')
            ->willReturn([
                ['valid_till' => $date->format('Y-m-d'), 'client_key' => 'key'],
            ]);

        $this->kernel
            ->expects($this->once())
            ->method('getContainer')
            ->willReturn($container);

        $this->router
            ->expects($this->once())
            ->method('generate')
            ->with('atlassian_connect_unlicensed')
            ->willReturn('http://website.com');

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event);
        $this->assertNotNull($event->getResponse());
        $response = $event->getResponse();
        $this->assertInstanceOf(RedirectResponse::class, $response);
        $this->assertEquals('http://website.com', $response->getTargetUrl());
    }

    public function testThrowsException(): void
    {
        $request = new Request(
            ['lic' => 'not_active'],
            [],
            [
                '_route' => 'route',
                'requires_license' => true,
            ]
        );

        $this->kernel
            ->expects($this->once())
            ->method('getEnvironment')
            ->willReturn('prod');

        $user = new Tenant();
        $user->setClientKey('key');

        $this->tokenStorage
            ->expects($this->once())
            ->method('getToken')
            ->willThrowException(new \Exception());

        $this->router
            ->expects($this->once())
            ->method('generate')
            ->with('atlassian_connect_unlicensed')
            ->willReturn('http://website.com');

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->listener->onKernelRequest($event);
        $this->assertNotNull($event->getResponse());
        $response = $event->getResponse();
        $this->assertInstanceOf(RedirectResponse::class, $response);
        $this->assertEquals('http://website.com', $response->getTargetUrl());
    }

    private function getEvent(KernelInterface $kernel, Request $request, int $type)
    {
        if (class_exists(RequestEvent::class)) {
            return new RequestEvent($kernel, $request, $type);
        }

        return new GetResponseEvent($kernel, $request, $type);
    }
}
