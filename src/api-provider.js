const odata = require('odata-client');
const request = require('request-promise');

module.exports = class ApiProvider {
  constructor(uri, auth) {
    this.uri = uri;
    this.auth = auth;
    this.resource = 'APIProviders';
  }

  async getHeaders() {
    const optionHeaders = {
      method: 'GET',
      uri: `${this.uri}`,
      auth: this.auth,
      headers: {
        'X-CSRF-Token': 'Fetch'
      },
      resolveWithFullResponse: true,
    };
    try{
      const response = await request(optionHeaders);
      return {
        Accept: 'application/json',
        'X-CSRF-Token': response.headers['x-csrf-token'].toString(),
        Cookie: response.headers['set-cookie'],
        'Content-Type': 'application/json',
      };
    } catch (e) {
      throw new Error('Could not login to SAP. Please check host and username/password configuration')
    }
  }

  async findById(id) {
    try{
      const q = await this.getOdataQuery(id)
      return q.get();
    } catch (e) {
      console.log('iets')
      return
    }
  }

  async create(body) {
    const q = await this.getOdataQuery()
    return q.post(body);
  }

  async update(body, id) {
    const q = await this.getOdataQuery(id)
    return q.put(body);
  }

  async getOdataQuery(id){
    return odata({ service: this.uri, headers: await this.getHeaders() }).resource(this.resource, id);
  }

};
