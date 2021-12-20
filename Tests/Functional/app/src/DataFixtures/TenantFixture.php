<?php

declare(strict_types=1);

namespace AtlassianConnectBundle\Tests\Functional\App\DataFixtures;

use AtlassianConnectBundle\Entity\Tenant;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

final class TenantFixture extends Fixture
{
    public function load(ObjectManager $manager)
    {
        $tenant = new Tenant();
        $tenant->setAddonKey('addon_key');
        $tenant->setClientKey('client_key');
        $tenant->setPublicKey('public_key');
        $tenant->setSharedSecret('shared_secret');
        $tenant->setServerVersion('1');
        $tenant->setPluginsVersion('plugin_version');
        $tenant->setBaseUrl('http://base_url.org');
        $tenant->setProductType('product_type');
        $tenant->setDescription('description');
        $tenant->setEventType('type');

        $manager->persist($tenant);
        $manager->flush();
    }
}
