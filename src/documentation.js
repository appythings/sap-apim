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

const convertSwagger = async (swagger) => {
  if(swagger.swagger === '2.0'){
    return swagger
  }
  const converted = await converter.convert({
    from: 'openapi_3',
    to: 'swagger_2',
    source: swagger,
  })
  return converted.spec
}

module.exports = async (config, swaggerFile) => {
  const apiModel = new Api(config)
  const swagger = await convertSwagger(readSwaggerFile(swaggerFile))
  const name = uuid.v4()
  swagger.basePath = '/' + name + swagger.basePath
  await apiModel.create({name: name, content: JSON.stringify(swagger)})
  return name
}
