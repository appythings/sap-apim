# sap-apim
Commandline tool to use the management APIs of SAP API Management

Currently supports creating / updating providers

# Installation
```npm i -g sap-apim```

# Configuration
Create a yaml file with the following contents:
```yaml
provider:
  name: example-provider
  description: This is an example provider
  isOnPremise: false # default false
  host: example.com # hostname without http or https
  port: 443 # default 443
  useSsl: true # default true
  path: /v1/test
  keyStore: openshift # optional
  keyAlias: openshift # optional
  managedByProxy: true # if true, provider will be overwritten in case of changes
```

# Use
Use in combination with [sapim](https://www.npmjs.com/package/sapim)

```sap-apim provider ./manifest.yaml```