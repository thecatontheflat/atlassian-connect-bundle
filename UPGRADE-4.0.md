UPGRADE FROM 3.X to 4.0
=======================

Supported Versions
------------------

* Minimum Symfony versions have been bumped to `^4.4|^5.4|^6.0`.
* Minimum PHP version has been bumped to `^7.4|^8.0`

TenantInterface
---------------

 `isWhiteListed` and `getClientKey` has been added to the `TenantInterface`

Configuration
-------------
* The `prod` and `dev` key have been deprecated. Use the `descriptor` key instead to define the descriptor configuration. If you wish to override something in a specific environment. Use the `config/packages/{env}/atlassian-connect.json`. The descriptor configuration has some basic validation to match the descriptor json schema.
* When importing routes to you configuration file, point to `@AtlassianConnectBundle/Resources/config/routing.php` instead of `@AtlassianConnectBundle/Resources/config/routing.yml`

Services
--------
* Only the `AtlassianRestClient` is public. All other services have been made private. Be sure to use Dependency injection instead of fetching the service through the container.