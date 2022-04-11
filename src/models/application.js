const Model = require('./model');
const moment = require('moment')

module.exports = class Application extends Model {
  constructor(config) {
    const auth = config.access_token ? { 'bearer': config.access_token } : {
      user: config.username,
      pass: config.password,
    }
    super(
        `https://${config.host}/odata/1.0/data.svc`,
        `https://${config.host}/csrf`,
        'HEAD',
        auth,
        'APIMgmt.Applications'
    )
  }

  addFilters(q) {
    return q//.expand('ToSubscriptions,ToAttributes');
  }

  from(model) {
    const products = model.ToSubscriptions && model.ToSubscriptions.results
        ? model.ToSubscriptions.results.filter(product => product.isSubscribed).map((product) => product.product_id) : [];

    return {
      id: model.id,
      appId: model.id,
      attributes: [],
      callbackUrl: model.callbackurl,
      createdAt: model.created_at ? moment(model.created_at).format() : undefined,
      createdBy: model.life_cycle ? model.life_cycle.created_by : undefined,
      consumerKey: model.app_key,
      consumerSecret: model.app_secret,
      apiProducts: products,
      developerId: model.developer_id,
      lastModifiedAt: model.life_cycle ? moment(model.life_cycle.changed_at).format() : undefined,
      lastModifiedBy: model.life_cycle ? model.life_cycle.changed_by : undefined,
      name: model.title,
      displayName: model.title,
      scopes: [],
      status: 'approved',
    };
  }

  to(model) {
    return {
      id: '00000000000000000000000000000000',
      version: '1',
      title: model.name,
      description: model.name,
      developer_id: model.developerId,
      ToSubscriptions: model.apiProducts
          ? model.apiProducts.map((product) => ({
            ToAPIProduct: [
              {
                __metadata: { uri: `APIMgmt.APIProducts('${product}')` },
              },
            ],
            id: '00000000000000000000000000000000',
          })) : [],
      app_key: model.consumerKey || null,
      app_secret: model.consumerSecret || null,
    };
  }
};
