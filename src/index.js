#!/usr/bin/env node
const program = require('commander')
const fs = require('fs-extra')
const {version, name, description} = require('../package.json')
const updateProvider = require('./provider')
const updateProducts = require('./apiproduct')
const createDocumentation = require('./documentation')
const apiProxy = require('./models/api-proxy')
const Portal = require('./devportal/portal')
const sapim = require("sapim");
const dotenv = require("dotenv");
const chai = require('chai')
const archiver = require('archiver');
const streamToPromise = require('stream-to-promise');
const expect = chai.expect

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
    .option('-h, --host <host>', 'add the hostname for the SAP environment', null)
    .description('creates or updates a list of products based on the given manifest')
    .action(async (swagger, apiProxyFolder, command) => {
        if(!await fs.pathExists(swagger)){
            throw new Error('Path ' + swagger + ' does not exist.')
        }
        if(!await fs.pathExists(apiProxyFolder)){
            throw new Error('Path ' + apiProxyFolder + ' does not exist.')
        }
        const sapimBuild = build()
        const name = await createDocumentation(sapimBuild.config, swagger, command.host)
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



program.command('devportal-upload-spec <openapispec>')
    .option('--environment <environment>', 'add the environment to deploy this to', null)
    .option('--host <host>', 'add the hostname for the developer portal', null)
    .option('--product <product>', 'add the name of the SAP product to link the documentation to', null)
    .option('--clientId <clientId>', 'add the clientId from your OpenID Connect provider linked to the developer portal', null)
    .option('--clientSecret <clientSecret>', 'add the clientSecret from your OpenID Connect provider linked to the developer portal', null)
    .option('--scope <scope>', 'add the scope for the developer portal app registration', null)
    .option('--tokenUrl <tokenUrl>', 'add the tokenUrl from your OpenID Connect provider', null)
    .option('--force <force>', 'Force the database to overwrite spec regardless of version number', null)
    .description('uploads an openapi spec to the developer portal')
    .action((openapispec, command) => {
        expect(command.environment, '--environment argument missing').to.be.ok
        expect(command.host, '--host argument missing').to.be.ok
        expect(command.product, '--product argument missing').to.be.ok
        expect(command.clientId, '--clientId argument missing').to.be.ok
        expect(command.clientSecret, '--clientSecret argument missing').to.be.ok
        expect(command.scope, '--scope argument missing').to.be.ok
        expect(command.tokenUrl, '--tokenUrl argument missing').to.be.ok

        const config = {
            product: command.product,
            environment: command.environment,
            clientId: command.clientId,
            clientSecret: command.clientSecret,
            hostname: command.host,
            scope: command.scope,
            tokenUrl: command.tokenUrl,
            grantType: 'client_credentials',
            force: command.force
        }

        const portal = new Portal(config)

        portal.pushSwagger(openapispec).catch(error => {
            console.log(error)
            process.exit(1)
        })
    })

program.command('devportal-upload-markdown <directory>')
    .option('-h, --host <host>', 'add the hostname for the developer portal', null)
    .option('--clientId <clientId>', 'add the clientId from your OpenID Connect provider linked to the developer portal', null)
    .option('--clientSecret <clientSecret>', 'add the clientSecret from your OpenID Connect provider linked to the developer portal', null)
    .option('--scope <scope>', 'add the scope for the developer portal app registration', null)
    .option('--tokenUrl <tokenUrl>', 'add the tokenUrl from your OpenID Connect provider', null)
    .description('uploads a directory of markdown files to the developer portal')
    .action(async (directory, command) => {
        expect(command.host, '--host argument missing').to.be.ok
        expect(command.clientId, '--clientId argument missing').to.be.ok
        expect(command.clientSecret, '--clientSecret argument missing').to.be.ok
        expect(command.scope, '--scope argument missing').to.be.ok
        expect(command.tokenUrl, '--tokenUrl argument missing').to.be.ok

        const config = {
            clientId: command.clientId,
            clientSecret: command.clientSecret,
            hostname: command.host,
            scope: command.scope,
            tokenUrl: command.tokenUrl,
            grantType: 'client_credentials'
        }

        const portal = new Portal(config)

        let archive = archiver("zip");
        archive.directory(directory, false);
        archive.finalize();

        const done = await streamToPromise(archive)

        portal.pushMarkdown(done).catch(error => {
            console.log(error)
            process.exit(1)
        })
    })


program.parse(process.argv)
