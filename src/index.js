#!/usr/bin/env node
const program = require('commander')
const fs = require('fs-extra')
const {version, name, description} = require('../package.json')
const updateProvider = require('./provider')
const updateProducts = require('./apiproduct')
const updateKvms = require('./kvms')
const createDocumentation = require('./documentation')
const apiProxy = require('./models/api-proxy')
const Portal = require('./devportal/portal')
const CloudFoundry = require('./lib/cloudfoundry')
const sapim = require('sapim')
const dotenv = require('dotenv')
const chai = require('chai')
const archiver = require('archiver')
const streamToPromise = require('stream-to-promise')
const expect = chai.expect

function build() {
    const currentLoggerLevel = sapim.logger.level
    if (program.access_token) {
        process.env['SAPIM_USERNAME'] = 'unimplemented'
        process.env['SAPIM_PASSWORD'] = 'unimplemented'
        sapim.logger.level = 100 // silence logging because the first CSRF-token call will generate an error
    }
    if (program.env) {
        dotenv.config({path: program.env})
    } else {
        dotenv.config()
    }
    const sapimInstance = sapim.default()
    if (program.access_token) {
        CloudFoundry.updateSapimClient(sapimInstance, program.access_token, sapim.logger, currentLoggerLevel)
    }
    return sapimInstance
}

function handleError(e) {
    console.error('ERROR:')
    console.error(e.message)
    process.exit(1)
}

program.name(name)
    .version(version, '-v, --version')
    .description(description)
    .option('-s, --silent', 'suppress console output')
    .option('-e, --env <path>', 'load environment variables from the given file')
    .option('-c, --config <path>', 'load the given configuration file')
    .option('-d, --debug', 'show debug messages')
    .option('-a, --access_token <access_token>', 'set access_token', process.env.SAPIM_ACCESS_TOKEN)


program.command("cf-login")
    .description("Returns an access-token for Cloud Foundry")
    .option('--tokenUrl <tokenUrl>', 'add the environment to deploy this to', process.env.SAPIM_TOKENURL)
    .option('--clientid <clientid>', 'add the environment to deploy this to', process.env.SAPIM_CLIENTID)
    .option('--secret <secret>', 'add the environment to deploy this to', process.env.SAPIM_SECRET)
    .action(async (command) => {
        const cf = new CloudFoundry({
            tokenUrl: command.tokenUrl, auth: {
                username: command.clientid,
                password: command.secret
            }
        })
        const access_token = await cf.login()
        console.log(access_token)
    });

program.command("deploy <manifest>")
    .description("deploy API manager artifacts described by the given manifest")
    .action(manifest => build().deployManifest(manifest));

program.command("package <manifest> [target_archive]")
    .description("deploy API manager artifacts described by the given manifest")
    .action((manifest, target_archive) => build().packageManifest(manifest, target_archive));

program.command("upload-proxy <archive>")
    .description("Package the API proxy described by the given manifest into an archive.")
    .action(archive => build().uploadProxy(archive));

program.command('provider <manifest>')
    .description('creates or updates a provider based on the given manifest')
    .action(manifest => updateProvider(build().config, manifest).catch(handleError))

program.command('products <manifest>')
    .description('creates or updates a list of products based on the given manifest')
    .action(manifest => updateProducts(build().config, manifest).catch(handleError))

program.command('kvms <manifest>')
    .option('--purgeDeleted', 'Deletes all entries in the KVM that are not in the Manifest.', false)
    .description('creates or updates a list of kvms based on the given manifest')
    .action((manifest, command) => updateKvms(build().config, manifest, command.purgeDeleted).catch(handleError))

program.command('documentation <swagger> <apiProxyFolder>')
    .option('-h, --host <host>', 'add the hostname for the SAP environment', null)
    .option('-p, --proxyFileName <proxyFileName>', 'To use an alternative name for the file in the index of the APIProxy folder', 'index.xml')
    .description('creates or updates a list of products based on the given manifest')
    .action(async (swagger, apiProxyFolder, command) => {
        try {
            if (!await fs.pathExists(swagger)) {
                throw new Error('Path ' + swagger + ' does not exist.')
            }
            if (!await fs.pathExists(apiProxyFolder)) {
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
            if (json.swagger === '2.0') {
                json.basePath = json.basePath.replace('/' + name, '')
            } else {
                json.servers = json.servers.map(server => ({url: server.url.replace(name, '')}))
            }
            await fs.writeJson('./downloaded/APIProxy/Documentation/SWAGGER_JSON_en.html', json)
            await fs.move('./downloaded/APIProxy/Documentation', apiProxyFolder + '/Documentation')
            await fs.move('./downloaded/APIProxy/APIResource', apiProxyFolder + '/APIResource')
            const file = await fs.readFile(`./downloaded/APIProxy/${name}.xml`, 'utf8')
            const regex = /<proxyEndPoints>[\s\S]*<\/proxyEndPoints>/
            const endpoints = file.match(regex)
            const proxyFile = await fs.readFile(`${apiProxyFolder}/${command.proxyFileName}`, 'utf8')
            fs.writeFile(`${apiProxyFolder}/${command.proxyFileName}`, proxyFile.replace(regex, endpoints[0]))
            await fs.remove('./downloaded')

            console.log('Succesfully created API documentation')
        } catch (e) {
            console.log(e.message)
            process.exit(1)
        }
    })

program.command('devportal-upload-spec <manifest>')
    .requiredOption('--environment <environment>', 'add the environment to deploy this to', process.env.APIDEX_ENVIRONMENT)
    .requiredOption('--host <host>', 'add the hostname for the developer portal', process.env.APIDEX_HOST)
    .requiredOption('--clientId <clientId>', 'add the clientId from your OpenID Connect provider linked to the developer portal', process.env.APIDEX_CLIENTID)
    .option('--clientSecret <clientSecret>', 'add the clientSecret from your OpenID Connect provider linked to the developer portal', process.env.APIDEX_SECRET)
    .option('--aud <aud>', 'Only used in combination with client certificate authentication instead of clientSecret. Provide the audience for the client token.', null)
    .requiredOption('--scope <scope>', 'add the scope for the developer portal app registration', process.env.APIDEX_SCOPE)
    .requiredOption('--tokenUrl <tokenUrl>', 'add the tokenUrl from your OpenID Connect provider (ex: https://login.microsoftonline.com/yourcompany.onmicrosoft.com/oauth2/v2.0/token)', process.env.APIDEX_TOKENURL)
    .option('--force', 'Force the database to overwrite spec regardless of version number', false)
    .description('uploads an openapi spec to the developer portal')
    .action((manifest, command) => {
        const config = {
            environment: command.environment,
            clientId: command.clientId,
            clientSecret: command.clientSecret,
            aud: command.aud,
            hostname: command.host,
            scope: command.scope,
            tokenUrl: command.tokenUrl,
            grantType: 'client_credentials',
            force: command.force
        }

        try {
            const portal = new Portal(manifest, config)

            portal.pushSwagger().then(success => {
                console.log('Successfully updated documentation')
            }).catch(error => {
                console.log(error.response ? error.response.data : error)
                process.exit(1)
            })
        } catch (e) {
            console.log(e.message)
        }
    })

program.command('devportal-upload-markdown <directory>')
    .requiredOption('--host <host>', 'add the hostname for the developer portal', process.env.APIDEX_HOST)
    .requiredOption('--clientId <clientId>', 'add the clientId from your OpenID Connect provider linked to the developer portal', process.env.APIDEX_CLIENTID)
    .option('--clientSecret <clientSecret>', 'add the clientSecret from your OpenID Connect provider linked to the developer portal', process.env.APIDEX_SECRET)
    .option('--aud <aud>', 'Only used in combination with client certificate authentication instead of clientSecret. Provide the audience for the client token.', null)
    .requiredOption('--scope <scope>', 'add the scope for the developer portal app registration', process.env.APIDEX_SCOPE)
    .requiredOption('--tokenUrl <tokenUrl>', 'add the tokenUrl from your OpenID Connect provider (ex: https://login.microsoftonline.com/yourcompany.onmicrosoft.com/oauth2/v2.0/token)', process.env.APIDEX_TOKENURL)
    .description('uploads a directory of markdown files to the developer portal')
    .action(async (directory, command) => {
        const config = {
            clientId: command.clientId,
            clientSecret: command.clientSecret,
            aud: command.aud,
            hostname: command.host,
            scope: command.scope,
            tokenUrl: command.tokenUrl,
            grantType: 'client_credentials'
        }

        const portal = new Portal(config)

        let archive = archiver('zip')
        archive.directory(directory, false)
        archive.finalize()

        const done = await streamToPromise(archive)

        portal.pushMarkdown(done).then(() => console.log('Successfully pushed markdown to developer portal')).catch(error => {
            console.log(error)
            process.exit(1)
        })
    })

program.parse(process.argv)
