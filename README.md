# Atlassian Connect Bundle

### Installation
##### Step 1: Download the Bundle
In `composer.json`:

    "require": {
        // ...
        "thecatontheflat/atlassian-connect-bundle": "dev-master"
    }
    
##### Step 2: Enable the Bundle
    // app/AppKernel.php
    class AppKernel extends Kernel
    {
        public function registerBundles()
        {
            $bundles = array(
                // ...
                new AtlassianConnectBundle\AtlassianConnectBundle()
            );
        }
    }

##### Step 3: Configure the Bundle

Bundle configuration includes has two main nodes - `prod` and `dev`. When requesting descriptor - this configuration is converted to JSON. Whatever you specify under `dev` node will override same option from `prod`.

Sample configuration in `config.yml`

    atlassian_connect:
        prod:
            key: 'your-addon-key'
            name: 'Your Add-On Name'
            description: 'Your Add-On Description'
            vendor:
                name: 'Your Vendor Name'
                url: 'https://marketplace.atlassian.com/vendors/1211528'
            baseUrl: 'https://your-production-domain.com/'
            lifecycle:
                installed: '/handshake'
            scopes: ['READ', 'WRITE']
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


##### Step 4: Configure Security

To configure security part - use the following configuration in your `security.yml`

    security:
        providers:
            jwt_user_provider:
                id: jwt_user_provider
    
        firewalls:
            jwt_secured_area:
                pattern: "^/protected"
                stateless: true
                simple_preauth:
                    authenticator: jwt_authenticator
                
##### Step 5: Include Routes

Add the following to your `app/config/routing.yml`

    ac:
        resource: "@AtlassianConnectBundle/Resources/config/routing.yml"


##### Step 6 (Optional): Configure License Check

To perform a license check for a certain route - specify the `requires_license` options in your `routing.yml`

    some_route:
        path: ...
        defaults: ...
        options:
            requires_license: true
                

##### Step 7: Update Database

    app/console doctrine:schema:update --force


# Usage Examples

### Signed Request

In your **protected** controller action you can make a signed request to JIRA instance:

    $request = new JWTRequest($this->getUser());
    $json = $request->get('/rest/api/2/issue/KEY-XXX');

### Dev environment
In dev environment Tenant with id=1 would be used automatically
