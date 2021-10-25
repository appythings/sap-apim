#!/usr/bin/env node
const converter = require('api-spec-converter');
const yaml = require('js-yaml')
const fs = require('fs')
const Api = require('./models/api')
const uuid = require('uuid')

const readSwaggerFile = (swaggerFile) => {
  const swagger = fs.readFileSync(swaggerFile, 'utf8')

  if(swaggerFile.endsWith('.yml') || swaggerFile.endsWith('.yaml')) {
    return yaml.safeLoad(swagger)
  }
  if(swaggerFile.endsWith('.json')) {
    return JSON.parse(swagger)
  }
  throw new Error('Openapi spec must be either yaml/yml or json')
}

module.exports = async (config, swaggerFile, host) => {
  const apiModel = new Api(config)
  const swagger = readSwaggerFile(swaggerFile)
  const name = uuid.v4()
  if(swagger.swagger === '2.0') {
    swagger.basePath = '/' + name + swagger.basePath
  }else{
    swagger.servers = swagger.servers.map(server => {
      const url = server.url.match(/(http[s]?:\/\/)?([^\/\s]+\/?)(.*)/)
      if(!url[2].endsWith('/')){
        url[2] = `${url[2]}/`
      }

      return {
        url: `${url[1]}${url[2]}${name}${url[3]}`
      }
    })
  }
  await apiModel.create({name: name, content: JSON.stringify(swagger)})
  return name
}
