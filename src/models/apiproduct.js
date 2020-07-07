const Model = require('./model')

module.exports = class ApiProduct extends Model {
  constructor (config) {
    super(
      `https://${config.host}/apiportal/api/1.0/Management.svc`,
      `https://${config.host}/apiportal/api/1.0/Management.svc`,
      'GET',
      {
        user: config.username,
        pass: config.password
      },
      'APIProducts'
    )
  }

  addFilters (q) {
    return q.expand('apiProxies')
  }

  async update (body, id, add, remove) {
    const batch = await this.createBatch()
    delete body.apiProxies

    batch.resource(this.resource, {name: id}).put(body, { headers: {accept: 'application/json'}})
    add.forEach(proxy => batch.resource(this.resource, {name: id}).resource('$links').resource('apiProxies').post({uri: `APIProxies('${proxy}')`}))
    add.forEach(proxy => batch.resource('APIProxies', {name: proxy}).resource('$links').resource('apiProducts').post({uri: `APIProducts('${id}')`}))
    remove.forEach(proxy => batch.resource(this.resource, {name: id}).resource('$links').resource('apiProxies', proxy).delete())
    remove.forEach(proxy => batch.resource('APIProxies', {name: proxy}).resource('$links').resource('apiProducts', id).delete())

    return this.sendBatch(batch)
  }

}
