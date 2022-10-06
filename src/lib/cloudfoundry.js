const request = require('request-promise');

module.exports = class CloudFoundry {
    constructor(config) {
        this.tokenUrl = config.tokenUrl;
        this.auth = config.auth;
    }

    async login() {
        const optionHeaders = {
            method: 'POST',
            uri: `${this.tokenUrl}?grant_type=client_credentials`,
            auth: this.auth,
            resolveWithFullResponse: true,
        };
        const response = await request(optionHeaders);

        const body = JSON.parse(response.body);
        return body.access_token
    }

    static updateSapimClient(sapimInstance, access_token, logger, level) {
        sapimInstance.config['access_token'] = access_token
        sapimInstance.client.client.catch(e => logger.level = level)
        sapimInstance.client.client = (async() => request.defaults({
            baseUrl: "https://" + sapimInstance.config.host + "/apiportal/api/1.0",
            jar: true,
            proxy: sapimInstance.config.proxy,
            resolveWithFullResponse: true,
            headers: {
                authorization: 'Bearer ' + access_token
            }
        }))();
    }
}
