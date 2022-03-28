const odata = require('odata-client')
const request = require('request-promise')

module.exports = class Model {
  constructor (uri, loginUri, loginMethod, auth, resource) {
    this.uri = uri
    this.loginUri = loginUri
    this.loginMethod = loginMethod
    this.auth = auth
    this.resource = resource
    this.cookie = undefined
  }

  async getHeaders (count = 0) {
    if(this.auth.bearer){
      return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.auth.bearer}`
      }
    }
    try {
      const optionHeaders = {
        method: this.loginMethod,
        uri: this.loginUri,
        auth: this.auth,
        headers: {
          'X-CSRF-Token': 'Fetch',
          Cookie: this.cookie
        },
        resolveWithFullResponse: true
      }
      const response = await request(optionHeaders)
      const returnHeaders = {
        Accept: 'application/json',
        'x-csrf-token': response.headers['x-csrf-token'].toString(),
        Cookie: response.headers['set-cookie'] ? response.headers['set-cookie'] : this.cookie,
        'Content-Type': 'application/json'
      }

      return returnHeaders
    } catch (e) {
      if(count < 3){
        return this.getHeaders(count + 1)
      }
      throw new Error('Something went wrong with fetching a token. Please check your username/password combination.')
    }
  }

  addFilters (q) {
    return q
  }

  handleResponse (response) {
    if (response.statusCode >= 400) {
      throw new Error(response.body)
    }

    const parsed = JSON.parse(response.body);
    if (parsed.d && parsed.d.results) {
      return parsed.d.results.map(this.from);
    }
    if (Array.isArray(parsed)) {
      return parsed.map(this.from);
    }
    return parsed.d ? this.from(parsed.d) : this.from(parsed);
  }

  async find (filter, orderby) {
    let q = await this.getOdataQuery()
    q = this.addFilters(q)
    if (filter) {
      filter.forEach((f) => q.filter(f[0], f[1], f[2]))
    }
    if (orderby) {
      q.orderby(orderby)
    }
    return q.get().then(response => this.handleResponse(response))
  }

  async findById (id) {
    const q = await this.getOdataQuery(id)
    return this.addFilters(q).get().then(response => this.handleResponse(response))
  }

  async create (body) {
    const q = await this.getOdataQuery()
    return q.post(this.to(body)).then(response => this.handleResponse(response))
  }

  async update (body, id) {
    const q = await this.getOdataQuery(id)
    return q.put(this.to(body)).then(response => this.handleResponse(response))
  }

  async delete (id) {
    const q = await this.getOdataQuery(id)
    q.url.qurl.pathname = q.url.qurl.pathname.replace(/%3D/g, '=')
    return q.delete().then(response => this.handleResponse(response))
  }

  async getOdataQuery (id, service) {
    return odata({service: service || this.uri, headers: await this.getHeaders()}).resource(this.resource, id)
  }

  from (model) {
    return model
  }

  to (model) {
    return model
  }

  async createBatch () {
    return odata({service: this.uri, headers: await this.getHeaders()}).batch()
  }

  async sendBatch (q) {
    // Workaround because the SAP odata APIs require only the last part of the URL
    q._batch.ops = q._batch.ops.map((op) => ({
      ...op, query: op.query.split('/Management.svc/').pop().replaceAll('%3D', '=').replaceAll('%2C', ',')
    }))
    return this.processBatchResponse(await q.send().then(this.handleResponse))
  }

  processBatchResponse (response) {
    const boundary = '--batch_'
    const responseLines = response.body.split(boundary)
    return responseLines.map(function (value) {
      const startJson = value.indexOf('{')
      const endJson = value.lastIndexOf('}')
      if (startJson < 0 || endJson < 0) {
        return
      }
      const responseJson = value.substr(startJson, (endJson - startJson) + 1)
      return JSON.parse(responseJson)
    }).filter(res => res !== undefined)
  }
}
