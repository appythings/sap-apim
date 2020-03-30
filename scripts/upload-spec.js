const {argv} = require('yargs')
const fs = require('fs')
const chai = require('chai')
const expect = chai.expect
const Portal = require('../src/lib/specs-devportal/portal')

expect(argv.env, '--env argument missing').to.be.ok
expect(argv.swagger, '--swagger argument missing').to.be.ok
expect(argv.hostname, '--hostname argument missing').to.be.ok
expect(argv.product, '--product argument missing').to.be.ok
expect(argv.clientId, '--client_id argument missing').to.be.ok
expect(argv.clientSecret, '--client_secret argument missing').to.be.ok
expect(argv.grantType, '--grantType argument missing').to.be.ok
expect(argv.scope, '--scope argument missing').to.be.ok
expect(argv.tokenUrl, '--tokenEndpoint argument missing').to.be.ok

const config = {
    product: argv.product,
    environment: argv.env,
    clientId: argv.clientId,
    clientSecret: argv.clientSecret,
    hostname: argv.hostname,
    scope: argv.scope,
    tokenUrl: argv.tokenUrl,
    grantType: argv.grantType
}

const portal = new Portal(config)
const swagger = JSON.parse(fs.readFileSync(argv.swagger))

portal.pushSwagger(swagger).catch(error => {
    console.log(error)
    process.exit(1)
})
