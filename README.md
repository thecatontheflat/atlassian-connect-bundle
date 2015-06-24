# Configuration

## General Configuration

Sample configuration in **config.yml**

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


## Security and Routes Configuration

To perform a license check for a certain route - specify the **requires_license** options

    edit_description:
        path: /protected/edit-description
        defaults: { _controller: SimpleEditBundle:MD:editDescription }
        options:
            requires_license: true
