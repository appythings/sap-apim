#!/usr/bin/env node
const ApiProvider = require('./models/api-provider')
const yaml = require('js-yaml')
const fs = require('fs')

const isUpdated = (a, b, properties) => {
  return properties.find(prop => {
    if (prop.includes('.')) {
      const props = prop.split('.')
      return a[props[0]][props[1]] !== b[props[0]][props[1]]
    }
    return a[prop] !== b[prop]
  })
}

module.exports = async (config, manifest) => {
  const provider = new ApiProvider(config)
  let yml = yaml.safeLoad(fs.readFileSync(manifest, 'utf8'))
  const providerConfig = yml.provider
  if(!providerConfig){
    return false
  }else{
    return console.log(JSON.stringify(providerConfig))
  }
  const newProvider = {
    'description': providerConfig.description,
    'destType': providerConfig.isOnPremise === 'true' ? 'ODATA' : 'Internet',
    'host': providerConfig.host,
    'name': providerConfig.name,
    'trustAll': false,
    'title': providerConfig.name,
    'authType': 'NONE',
    'port': providerConfig.port ? providerConfig.port : 443,
    'pathPrefix': providerConfig.path || null,
    'useSSL': providerConfig.useSsl !== 'false',
    'isOnPremise': providerConfig.isOnPremise === 'true' ,
    'rt_auth': null,
    'sslInfo': {
      'ciphers': '',
      'clientAuthEnabled': !!providerConfig.keyStore,
      'enabled': providerConfig.useSsl !== 'false',
      'ignoreValidationErrors': false,
      'keyAlias': providerConfig.keyAlias || null,
      'keyStore': providerConfig.keyStore || null,
      'protocols': '',
      'trustStore': providerConfig.trustStore || null
    }
  }
  const current = await provider.findById(providerConfig.name)
  if (current.statusCode === 404) {
    if (providerConfig.managedByProxy === true) {
      const result = await provider.create(newProvider)
      console.log('Created provider')
    } else {
      console.log('Provider not found, but the provider is not managed by this proxy. Please create the provider manually.')
      process.exitCode = 1;
    }
  } else {
    const currentProvider = JSON.parse(current.body)
    if (isUpdated(currentProvider.d, newProvider, ['host', 'port', 'pathPrefix', 'useSSL', 'sslInfo.keyStore', 'sslInfo.keyAlias', 'sslInfo.trustStore'])) {
      if (providerConfig.managedByProxy === true) {
        const result = await provider.update(newProvider, providerConfig.name)
        console.log('Updated provider')
      } else {
        console.log('Change detected in provider, but the provider is not managed by this proxy. Please update the provider manually.')
      }
    } else{
      console.log('Provider up to date')
    }
  }
}
