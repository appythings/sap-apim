const Model = require('./model');

module.exports = class ApiProvider extends Model  {
  constructor(config) {
      const auth = config.access_token ? { 'bearer': config.access_token } : {
          user: config.username,
          pass: config.password,
      }
    super(
      `https://${config.host}/apiportal/api/1.0/Management.svc`,
      `https://${config.host}/apiportal/api/1.0/Management.svc/`,
      'GET',
      auth,
      'APIProviders',
    );
  }
};
