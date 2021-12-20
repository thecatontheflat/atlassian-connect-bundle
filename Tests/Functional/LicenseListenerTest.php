<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

final class LicenseListenerTest extends AbstractWebTestCase
{
    public function testLicenseListenerIsOk(): void
    {
        $client = self::createClient(['environment' => 'prod'], ['HTTP_AUTHORIZATION' => 'Bearer '.$this->getTenantJWTCode()]);

        $client->request('GET', '/protected/license-route');
        $this->assertResponseIsSuccessful();
    }

    public function testLicenseListenerFails(): void
    {
        $client = self::createClient(['environment' => 'prod'], ['HTTP_AUTHORIZATION' => 'Bearer '.$this->getTenantJWTCode('not_whitelisted')]);

        $client->request('GET', '/protected/license-route');
        $this->assertResponseRedirects('/protected/unlicensed');
    }

    public function testLicenseListenerWorksInDev(): void
    {
        $client = self::createClient(['environment' => 'dev'], ['HTTP_AUTHORIZATION' => 'Bearer '.$this->getTenantJWTCode('not_whitelisted')]);

        $client->request('GET', '/protected/license-route');
        $this->assertResponseIsSuccessful();
    }
}
