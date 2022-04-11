const axios = require('axios')
const qs = require('qs')
const SwaggerParser = require("@apidevtools/swagger-parser");
const yaml = require('js-yaml')
const fs = require('fs-extra')
const FormData = require('form-data')
const jwt = require('../lib/jwt')

class Portal {
    constructor(manifest, config) {
        if (manifest) {
            let yml = yaml.safeLoad(fs.readFileSync(manifest, 'utf8'))
            const productConfig = yml.products
            if (!productConfig || !productConfig.find(product => product.openapi)) {
                throw new Error('no product found to upload')
            }
            this.swaggerFiles = productConfig.filter(product => product.openapi)
        }

        this.config = config
        this.request = axios.create({
            baseURL: this.config.hostname,
            timeout: 60000,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })
    }

    async login() {
        if (this.request.defaults.headers.common['Authorization']) {
            return
        }
        const data = {
            'client_id': this.config.clientId,
            'client_secret': this.config.clientSecret,
            'grant_type': this.config.grantType,
            'scope': this.config.scope
        }
        if (process.env.PRIVATE_KEY_BASE64 && process.env.PUBLIC_KEY_BASE64) {
            const privateKey = Buffer.from(process.env.PRIVATE_KEY_BASE64, 'base64')
                .toString('utf8');
            const publicKey = Buffer.from(process.env.PUBLIC_KEY_BASE64, 'base64')
                .toString('utf8');
            data.client_assertion = jwt.create(this.config.clientId, privateKey,
                publicKey, this.config.aud);
            data.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
        }
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: qs.stringify(data),
            url: this.config.tokenUrl
        }
        const response = await axios(options)
        this.request.defaults.headers.common['Authorization'] = 'Bearer ' + response.data.access_token
    }

    readSwaggerFile(spec) {
        const swagger = fs.readFileSync(spec, 'utf8')

        if (spec.endsWith('.yml') || spec.endsWith('.yaml')) {
            return yaml.safeLoad(swagger)
        }
        if (spec.endsWith('.json')) {
            return JSON.parse(swagger)
        }
        throw new Error('Openapi spec must be either yaml/yml or json')
    }

    async pushSwagger() {
        return Promise.all(this.swaggerFiles.map(async product => {
            console.log(`Uploading ${product.openapi} for product: ${product.name}`)
            const parsedSwagger = await this.readSwaggerFile(product.openapi)
            await SwaggerParser.validate(product.openapi);
            await this.login()
            return this.request.post(`api/environments/${this.config.environment}/apiproducts/${product.name}/specs${this.config.force ? '?force=true' : ""}`, {
                "environmentId": this.config.environment,
                'spec': parsedSwagger
            })
        }))
    }

    async pushMarkdown(zipFile) {
        await this.login()
        const form = new FormData()
        form.append('zip', zipFile, {
            filename: 'markdown.zip'
        })
        return axios.post(`${this.config.hostname}/markdown`,
            form.getBuffer(),
            {
                headers: {
                    ...form.getHeaders(),
                    Authorization: this.request.defaults.headers.common['Authorization']
                }
            })
    }
}

module.exports = Portal
