#!/usr/bin/env node
const Application = require('./models/application')
const Developer = require('./models/developer')

module.exports = async (config1, config2) => {
  // const application = new Application(config1)
  const application2 = new Application(config2)
  const apps = await application2.find()
  const allApps = await Promise.all(apps.map(async (app) => await application2.findById(app.id)))
  console.log('dev: var dev =')
  return console.log(allApps.map(app => app.consumerKey === app.consumerSecret ? app.consumerKey : null).filter(app => !!app))


  const developerModel = new Developer(config2)
  const developers = await developerModel.find()
  // const apps = await application.find()
  console.log(`${apps.length} apps found`)

  await Promise.all(apps.filter(app => app.apiProducts.length > 0).map(async (appl) => {
    const app = await application.findById(appl.id)
    app.apiProducts = app.apiProducts.map(product =>
        product === 'Contentserver' ? 'internal-contentserver':
            product === 'apimsample' ? 'APIMSample':
                product === 'edsn-ceres-requestpowergeneratingunits-v1' ? 'external-edsn-ceres-requestpowergeneratingunits-v1':
                    product === 'internal-cf-qirion-icore' ? 'internal-cf-qirion-icore-v1':
                        product.startsWith('apim-') ? product.substring(5) :
                            product
    ).filter(product =>
        product !== 'OAuth' &&
        product !== 'internal-gps-asset-process-v1' &&
        product !== 'odata-c4ticket-newtemptest-v1')
    if(app.apiProducts.find((product)=>product==='odata-cloud-for-customer')){
      app.apiProducts = app.apiProducts.filter((product)=>product!=='odata-cloud-for-customer')
      app.apiProducts.push('internal-odata-c4ticket-v1')
      app.apiProducts.push('internal-odata-c4account-v1')
    }
    try{
      if(!developers.find(developer => developer.email === app.developerId)){
        const lastName = app.developerId.split('@')[0].split('.').filter((word, index) => index > 0).join(' ')
        console.log(`creating developer ${app.developerId}`)

        developers.push(await developerModel.create({
          email: app.developerId,
          firstName: app.developerId.split('.')[0],
          lastName: lastName
        }))
      }
    }catch (e) {  console.log(e.message)  }

    try{
      await application2.create(app)
      console.log(app.consumerSecret)
    }catch (e) {
      if(e.message === '{"error":{"code":"TARGET_DOES_NOT_EXIST","message":{"lang":"en","value":"Target does not exist; try with an existing entity of type:APIProducts"}}}'){
        console.log(e.message + ' ' + app.name)
        console.log(app.apiProducts)
      }
    }
  }))

}
