const odata = require('odata-client');
const Model = require('./model');

module.exports = class Developer extends Model {
  constructor(config) {
    const auth = config.access_token ? { 'bearer': config.access_token } : {
      user: config.username,
      pass: config.password,
    }
    super(
        `https://${config.host}/api/1.0`,
        `https://${config.host}/csrf`,
        'HEAD',
        auth,
        'registrations',
    )
  }

  addFilters(q) {
    return q.custom('type', 'registered');
  }

  async getOdataQuery(id) {
    let { resource } = this;
    if (id) {
      resource += `/${id}`;
    }
    return odata({ service: this.uri, headers: await this.getHeaders() }).resource(resource);
  }

  async create(developer) {
    return super.create(developer);
  }

  async update(developer, id) {
    return super.update(developer, id);
  }

  from(model) {
    if (model.rolesAccess && model.rolesAccess[0].status === 'rejected') {
      throw new Error('Developer not found');
    }
    return {
      id: model.userId,
      developerId: model.userId,
      email: model.emailId,
      firstName: model.firstName,
      lastName: model.lastName,
      userName: model.emailId,
    };
  }

  to(model) {
    return {
      autoReLogin: false,
      userId: model.email,
      emailId: model.email,
      firstName: model.firstName,
      lastName: model.lastName,
      rolesAccess: model.rolesAccess || [
        {
          requestReason: '',
          role: 'API_ApplicationDeveloper',
        },
      ],
      country: 'NL',
    };
  }
};
