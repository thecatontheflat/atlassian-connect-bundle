# Atlassian Connect Bundle

[![Build Status](https://img.shields.io/travis/thecatontheflat/atlassian-connect-bundle.svg?style=flat-square)](https://travis-ci.org/thecatontheflat/atlassian-connect-bundle)
[![Code Coverage](https://img.shields.io/codecov/c/github/thecatontheflat/atlassian-connect-bundle.svg?style=flat-square)](https://codecov.io/github/thecatontheflat/atlassian-connect-bundle)
[![Scrutinizer Code Quality](https://img.shields.io/scrutinizer/g/thecatontheflat/atlassian-connect-bundle.svg?style=flat-square)](https://scrutinizer-ci.com/g/thecatontheflat/atlassian-connect-bundle/?branch=master)
[![License](https://img.shields.io/packagist/l/thecatontheflat/atlassian-connect-bundle.svg?style=flat-square)](https://packagist.org/packages/thecatontheflat/atlassian-connect-bundle)
[![Latest Stable Version](https://img.shields.io/packagist/v/thecatontheflat/atlassian-connect-bundle.svg?style=flat-square)](https://packagist.org/packages/thecatontheflat/atlassian-connect-bundle)
[![Total Downloads](https://img.shields.io/packagist/dt/thecatontheflat/atlassian-connect-bundle.svg?style=flat-square)](https://packagist.org/packages/thecatontheflat/atlassian-connect-bundle)

About
-----
Symfony Bundle for Atlassian Connect platform

Installation
------------

### Step 1. Add bundle to composer dependencies

**Without Symfony Flex:**
```bash
composer require thecatontheflat/atlassian-connect-bundle
```

### Step 2. Add bundle to kernel

Add the bundle to `app/AppKernel.php`

```php
$bundles = array(
	// ... other bundles
	new AtlassianConnectBundle\AtlassianConnectBundle(),
);
```

### Step 3. Bundle configuration

Bundle configuration includes has two main nodes - `prod` and `dev`. 
When requesting descriptor - this configuration is converted to JSON. 
Whatever you specify under `dev` node will override same option from `prod`.

Sample configuration in `config.yml`:

```yaml
    atlassian_connect:
        dev_tenant: 1
        prod:
            key: 'your-addon-key'
            name: 'Your Add-On Name'
            description: 'Your Add-On Description'
            authentication:
            	type: jwt
            vendor:
                name: 'Your Vendor Name'
                url: 'https://marketplace.atlassian.com/vendors/1211528'
            baseUrl: 'https://your-production-domain.com/'
            lifecycle:
                installed: '/handshake'
            scopes: ['READ', 'WRITE', 'ACT_AS_USER'] # If you want get oauth_client_id need to add scope ACT_AS_USER
            modules:
                jiraIssueTabPanels:
                    -
                        key: 'your-addon-key-tab'
                        url: '/protected/list?issue=${issue.key}'
                        weight: 100
                        name:
                            value: 'Tab Name'

        dev:
          baseUrl: 'http://localhost:8888'
```

### Step 4. Security configuration

To configure security part - use the following configuration in your `security.yml`. If you have another firewall that has the `"^/"` pattern, be sure to set the `jwt_secured_area` firewall first.

```yaml
    security:
        providers:
            jwt_user_provider:
                id: jwt_user_provider
        firewalls:
            jwt_secured_area:
                pattern: "^/protected"
                stateless: true
                guard:
                    authenticators:
                        - jwt_authenticator
                provider: jwt_user_provider
```
    
### Step 5. Include Routes
 
- For Symfony 4 and Flex to `config/routes.yaml`
- For Symfony 2/3 to `app/config/routing.yml`

Add the following:
```yaml
    ac:
        resource: "@AtlassianConnectBundle/Resources/config/routing.yml"
```

    
### Step 6. (Optional): Configure License Check

To perform a license check for a certain route - specify the `requires_license` default in your `routing.yml`
```yaml
    some_route:
        path: ...
        defaults:
            requires_license: true
```      

### Step 7. Update Database

```bash
bin/console doctrine:schema:update --force
```


Usage Examples
------------

### Signed Request

In your **protected** controller action you can make a signed request to JIRA instance:
```php
<?php declare(strict_types = 1);

namespace App\Controller;

use AtlassianConnectBundle\Service\AtlassianRestClient;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;

/**
 * @Route("/protected")
 */
class ProtectedController extends Controller
{
    /**
     * @Route("/", name="main")
     */
    public function index()
    {
        $client = $this->container->get(AtlassianRestClient::class);
        
        // Send request from anonymous plugin user
        $issue = $client->get('/rest/api/2/issue/KEY-XXX');
        
        // Send request from choosen user
        $user = $client
            ->setUser('5ds4e4352a12451789b13243') // the accountId of the user in Jira/Confluence etc.
            ->get('/rest/api/2/myself')
        ;
        
        return new Response([$issue, $user]);
    }
}
```

### Whitelisting licences

You could white-list any licence by editing related row in table tenant and setting field is_white_listed to 1.
If you will also set white_listed_until - you will be able to set white-list expiration

### Dev environment

In dev environment Tenant with id=1 would be used automatically. 
You could set configuration variable atlassian_connect.dev_tenant to false in order to disable it, or use another dev tenant id. 
It would allow you to test your plugin output for any tenant.

### Custom tenant entity

If you need to add more properties to tenant entity or reverse-side of your app entity relations - you could override default Tenant entity like

```php
<?php
    namespace AppBundle\Entity;
    
    use Doctrine\ORM\Mapping as ORM;
    use AtlassianConnectBundle\Entity\TenantTrait;
    use AtlassianConnectBundle\Entity\TenantInterface;
    use Symfony\Component\Security\Core\User\UserInterface;
     
    /**
     * JiraTenant
     *
     * @ORM\Table()
     * @ORM\HasLifecycleCallbacks()
     * @ORM\Entity()
     */
    class JiraTenant implements UserInterface, TenantInterface
    {
        /**
         * @ORM\OneToMany(type="MyEntity", mappedBy="jiraTenant")
         */
        protected $myEntities;
    
        use TenantTrait;    
    
        // getters/setters for your custom properties
    }
```

And override default one by setting parameter
```yaml
    atlassian_connect_tenant_entity_class: AppBundle\Entity\JiraTenant
```
    
In order to use it you will need to disable doctrine automapping
```yaml
    auto_mapping: false
        mappings:
            AppBundle: ~
```


Troubleshooting
------------

### Cant start free trial of my plugin on Jira Cloud

As soon as you will create your plugin - you will be able to access plugin manifest via url `https://yourplugindomain.com/atlassian-connect.json`
    
You will be able to setup it in "Manage Addons" section of your Jira Cloud using "Upload addon" interface. 
But right now AtlassianConnectBundle support only "paid via Atlassian" model, so you will not be able to start your trial.

Instead of using manifest url directly - you should add **private listing** of your plugin, create token and get  manifest url like

`https://marketplace.atlassian.com/files/1.0.0-AC/artifact/descriptor/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/atlassian-connect.json?access-token=xxxxxxxx`
    
If you will use that url from marketplace - your trial will be started automatically.
