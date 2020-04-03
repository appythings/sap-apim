const axios = require('axios')
const qs = require('qs')
const FormData = require('form-data');

class Portal {
  constructor (config) {
    this.config = config
    this.request = axios.create({
      baseURL: `http://${this.config.hostname}`,
      timeout: 60000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
  }

  async login () {
    const data = {
      'client_id': this.config.clientId,
      'client_secret': this.config.clientSecret,
      'grant_type': this.config.grantType,
      'scope': this.config.scope
    }
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: qs.stringify(data),
      url: `https://${this.config.tokenUrl}/token`
    }
    const response = await axios(options)
    this.request.defaults.headers.common['Authorization'] = 'Bearer ' + response.data.access_token
  }

  async pushSwagger (swagger) {
    await this.login()
    return this.request.post(`/api/specs`, {
      'productId': `${this.config.product}`,
      'environmentId': `${this.config.environment}`,
      'spec': swagger
    })
  }

  async pushMarkdown (zipFile) {
    await this.login()
    const form = new FormData();
    form.append('zip', zipFile, {
      filename: 'markdown.zip'
    });
    form.submit(`http://${this.config.hostname}/markdown`, (err) => {
      if(err) {
        console.log(err)
        process.exit(1)
      }
    })
  }
}

module.exports = Portal
