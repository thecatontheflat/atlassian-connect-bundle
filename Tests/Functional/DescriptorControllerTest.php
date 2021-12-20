<?php declare(strict_types = 1);

namespace AtlassianConnectBundle\Tests\Functional;

/**
 * class DescriptorControllerTest
 */
final class DescriptorControllerTest extends AbstractWebTestCase
{
    /**
     * test if the descriptor matches the config
     */
    public function testGetDescriptor(): void
    {
        $client = self::createClient();
        $client->request('GET', '/atlassian-connect.json');

        $this->assertResponseIsSuccessful();

        $descriptor = \json_decode($client->getResponse()->getContent(), true);
        $config = self::getParentContainer()->getParameter('atlassian_connect');
        $this->assertSame(
            $config,
            $descriptor
        );
    }
}
