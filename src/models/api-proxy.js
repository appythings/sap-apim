const Model = require('./model')
const streamToPromise = require('stream-to-promise')
const unzip = require('unzip-stream')
const MemoryStream = require('memorystream')

module.exports = class ApiProxy extends Model {
  constructor (config) {
    super(
      `https://${config.host}/apiportal/api/1.0/Management.svc`,
      `https://${config.host}/apiportal/api/1.0/Management.svc/`,
      'GET',
      {
        user: config.username,
        pass: config.password
      },
      'APIProxies'
    )
    this.transportUri = `https://${config.host}/apiportal/api/1.0/Transport.svc`
  }

  async download(name, path){
    const q = await this.getOdataQuery(undefined, this.transportUri)
    q.custom('name', name)
    const response = await q.get({encoding: null});
    const stream = MemoryStream.createReadStream(response.body);
    stream.pipe(unzip.Extract({path}))
    return streamToPromise(stream)
  }
}
