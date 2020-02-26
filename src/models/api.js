const Model = require('./model')

module.exports = class Api extends Model {
  constructor (config) {
    super(
      `https://${config.host}/api/1.0`,
      `https://${config.host}/apiportal/api/1.0/Management.svc/`,
      'GET',
      {
        user: config.username,
        pass: config.password
      },
      'apis'
    )
  }

}
