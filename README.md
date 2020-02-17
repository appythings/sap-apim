# sap-apim
Commandline tool to use the management APIs of SAP API Management

Currently supports creating / updating providers

# Installation
```npm i -g sap-apim```

# Configuration
Create a yaml file with the following contents:
```yml
provider:
  name: example-provider
  description: This is an example provider
  isOnPremise: false # default false
  host: example.com
  port: 443 # default 443
  useSsl: true # default true
  path: /v1/test
  keyStore: example # optional, useSsl must be true
  keyAlias: example # optional, useSsl must be true
  managedByProxy: true # default false
```

## Use
Use in combination with [sapim](https://www.npmjs.com/package/sapim)

```sap-apim provider ./manifest.yaml```


# To manage products
Create a yaml file with the following contents:
```yml
products:
  - name: Example-product-silver
    title: Example product silver
    description: |
      Silver version of the example product
    quota: 2
    interval: 1
    timeunit: minute
    proxies:
      - echoheaders
  - name: Example-product-gold
    title: Example product gold
    description: |
      Gold version of the example product
    quota: 3
    interval: 1
    timeunit: minute
    proxies:
      - echoheaders
```

## Use
Use in combination with [sapim](https://www.npmjs.com/package/sapim)

```sap-apim products ./products.yaml```
