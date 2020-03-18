#!/usr/bin/env node
const program = require('commander')
const fs = require('fs-extra')
const {version, name, description} = require('../package.json')
const updateProvider = require('./provider')
const updateProducts = require('./apiproduct')
const createDocumentation = require('./documentation')
const apiProxy = require('./models/api-proxy')
const sapim = require("sapim");
const dotenv = require("dotenv");

function build() {
  if (program.env) {
    dotenv.config({ path: program.env });
    return sapim.default();
  } else {
    dotenv.config();
    return sapim.default();
  }
}

program.name(name)
  .version(version, '-v, --version')
  .description(description)
  .option('-s, --silent', 'suppress console output')
  .option('-e, --env <path>', 'load environment variables from the given file')
  .option('-c, --config <path>', 'load the given configuration file')
  .option('-d, --debug', 'show debug messages')

program.command('provider <manifest>')
  .description('creates or updates a provider based on the given manifest')
  .action(manifest => updateProvider(build().config, manifest))

program.command('products <manifest>')
  .description('creates or updates a list of products based on the given manifest')
  .action(manifest => updateProducts(build().config, manifest))

program.command('documentation <swagger> <apiProxyFolder>')
  .description('creates or updates a list of products based on the given manifest')
  .action(async (swagger, apiProxyFolder) => {
    if(!await fs.pathExists(swagger)){
      throw new Error('Path ' + swagger + ' does not exist.')
    }
    if(!await fs.pathExists(apiProxyFolder)){
      throw new Error('Path ' + apiProxyFolder + ' does not exist.')
    }
    const sapimBuild = build()
    const name = await createDocumentation(sapimBuild.config, swagger)
    const apiProxyModel = new apiProxy(sapimBuild.config)
    await apiProxyModel.download(name, './downloaded')
    await apiProxyModel.delete({name})
    await fs.remove(apiProxyFolder + '/Documentation')
    await fs.remove(apiProxyFolder + '/APIResource')
    const json = await fs.readJson('./downloaded/APIProxy/Documentation/SWAGGER_JSON_en.html')
    json.basePath = json.basePath.replace('/' + name, '')
    await fs.writeJson('./downloaded/APIProxy/Documentation/SWAGGER_JSON_en.html', json)
    await fs.move('./downloaded/APIProxy/Documentation', apiProxyFolder + '/Documentation')
    await fs.move('./downloaded/APIProxy/APIResource', apiProxyFolder + '/APIResource')
    const file = await fs.readFile(`./downloaded/APIProxy/${name}.xml`, 'utf8')
    const regex = /<proxyEndPoints>[\s\S]*<\/proxyEndPoints>/
    const endpoints = file.match(regex)
    const proxyFile = await fs.readFile(`${apiProxyFolder}/index.xml`, 'utf8')
    fs.writeFile(`${apiProxyFolder}/index.xml`, proxyFile.replace(regex, endpoints[0]))
    await fs.remove('./downloaded')

    console.log('Succesfully created API documentation')
  })

program.parse(process.argv)