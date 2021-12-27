<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Listener;

use AtlassianConnectBundle\Entity\Tenant;
use AtlassianConnectBundle\Listener\LicenseListener;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
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

    protected function setUp(): void
    {
        $this->router = $this->createMock(RouterInterface::class);
        $this->kernel = $this->createMock(KernelInterface::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);
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

        $this->getLicenseListener()->onKernelRequest($event);
    }

    public function testItSkipsWhenTheRouteIsNotNullAndRouteRequiresNoLicense(): void
    {
        $request = new Request(
            ['lic' => 'test'],
            [],
            [
                '_route' => 'route',
                'requires_license' => false,
            ]
        );

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->getLicenseListener('dev')->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testItSkipsWhenTheRouteIsNotNullAndRouteHasNoRequiresLicenseAttribute(): void
    {
        $request = new Request(
            ['lic' => 'test'],
            [],
            [
                '_route' => 'route',
            ]
        );

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->getLicenseListener()->onKernelRequest($event);

        $this->assertNull($event->getResponse());
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

        $this->getLicenseListener('dev')->onKernelRequest($event1);
        $this->getLicenseListener('dev')->onKernelRequest($event2);
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

        $this->getLicenseListener()->onKernelRequest($event);

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

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->getLicenseListener()->onKernelRequest($event);
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

        $event = $this->getEvent(
            $this->kernel,
            $request,
            KernelInterface::MASTER_REQUEST
        );

        $this->getLicenseListener('prod', [['valid_till' => $date->format('Y-m-d'), 'client_key' => 'key']])->onKernelRequest($event);
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

        $this->getLicenseListener()->onKernelRequest($event);
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

        $this->getLicenseListener()->onKernelRequest($event);
        $this->assertNotNull($event->getResponse());
        $response = $event->getResponse();
        $this->assertInstanceOf(RedirectResponse::class, $response);
        $this->assertEquals('http://website.com', $response->getTargetUrl());
    }

    private function getEvent(KernelInterface $kernel, Request $request, int $type)
    {
        return new RequestEvent($kernel, $request, $type);
    }

    private function getLicenseListener(string $environment = 'prod', array $license_allow_list = [])
    {
        return new LicenseListener($this->router, $this->tokenStorage, $environment, $license_allow_list);
    }
}
