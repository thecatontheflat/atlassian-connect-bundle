<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional;

final class DescriptorControllerTest extends AbstractWebTestCase
{
    public function testGetDescriptor(): void
    {
        $client = self::createClient();
        $client->request('GET', '/atlassian-connect.json');

        $this->assertResponseIsSuccessful();

        $descriptor = json_decode($client->getResponse()->getContent(), true);
        $config = self::getContainer()->getParameter('atlassian_connect');
        $this->assertSame(
            $config,
            $descriptor
        );
    }
}
