const Model = require('./model');

module.exports = class ApiProvider extends Model  {
  constructor(config) {
    super(
      `https://${config.host}/apiportal/api/1.0/Management.svc`,
      `https://${config.host}/apiportal/api/1.0/Management.svc/`,
      'GET',
      {
        user: config.username,
        pass: config.password,
      },
      'APIProviders',
    );
  }
};
