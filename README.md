# sap-apim
Commandline tool to use the management APIs of SAP API Management

Currently supports creating / updating providers and products and generating documentation

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

# To create documentation for your api proxy
To be able to see the documentation of an API proxy correctly in the SAP developer portal, 
the APIProxy requires 2 folders with some documentation content.
This command will generate those 2 folders from an openapi spec by creating, downloading, extracting the 2 folders and deleting a proxy in SAP.
Both openapi 3.0 and swagger 2.0 are supported in json and yml format.

## Use
Use in combination with [sapim](https://www.npmjs.com/package/sapim)
```
sap-apim documentation <spec> <outputFolder>
sap-apim documentation ./openapi.yml ./APIProxy
```

# To manage KVMs
This command will create / update / delete the key-values in your KVMs.

Create a yaml file with the following contents, or add this to your current yaml file:
```yml
kvms:
  test:
    key1: value1
    key2: value2
```

## Use
Use in combination with [sapim](https://www.npmjs.com/package/sapim)
```
sap-apim kvms <manifest>
sap-apim kvms manifest.yaml
```