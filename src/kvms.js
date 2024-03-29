#!/usr/bin/env node
const Kvm = require('./models/kvm')
const yaml = require('js-yaml')
const fs = require('fs')
const chai = require('chai')
const expect = chai.expect

const isUpdated = (a, b, properties) => {
  return properties.find(prop => {
    if (prop.includes('.')) {
      const props = prop.split('.')
      return a[props[0]][props[1]] !== b[props[0]][props[1]]
    }
    return a[prop] !== b[prop]
  })
}

module.exports = async (config, manifest, purgeDeleted) => {
  const kvmModel = new Kvm(config)
  let yml = yaml.safeLoad(fs.readFileSync(manifest, 'utf8'))
  const kvmConfig = yml.kvms
  if (!kvmConfig) {
    return false
  }
  expect(kvmConfig, 'The KVM config is not an object').to.be.an('object')
  Object.keys(kvmConfig).map(async (kvmName) => {
    const kvm = kvmConfig[kvmName];
    expect(kvm, 'The KVM value is not an object').to.be.an('object')

    const newkvm = {
      'name': kvmName,
      'encrypted': false,
      'scope': 'ENV',
      'keyMapEntryValues': Object.keys(kvm).map(key => ({'name': key, 'map_name': kvmName, 'value': kvm[key]}))
    }

    try {
      const currentkvm = await kvmModel.findById(kvmName)
      await kvmModel.update(newkvm, currentkvm, purgeDeleted)
      console.log('Updated kvm: ' + newkvm.name)
    } catch (e) {
      if (e.message.includes('not be found')) {
        const response = await kvmModel.create(newkvm)
        console.log('Created kvm: ' + newkvm.name)
      } else {
        console.log(e.message)
        process.exitCode = 1
      }
    }
  })
}
