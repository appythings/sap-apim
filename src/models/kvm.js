const Model = require('./model')

module.exports = class ApiProvider extends Model {
  constructor (config) {
    const auth = config.access_token ? { 'bearer': config.access_token } : {
      user: config.username,
      pass: config.password,
    }
    super(
      `https://${config.host}/apiportal/api/1.0/Management.svc`,
      `https://${config.host}/apiportal/api/1.0/Management.svc/`,
      'GET',
      auth,
      'KeyMapEntries'
    )
  }

  addFilters (q) {
    return q.expand('keyMapEntryValues')
  }

  async update (newKvm, oldKvm, purgeDeleted) {
    const add = newKvm.keyMapEntryValues.filter(key => !oldKvm.keyMapEntryValues.results.find(entry => key.name === entry.name))
    const update = newKvm.keyMapEntryValues.filter(key => oldKvm.keyMapEntryValues.results.find(entry => key.name === entry.name && entry.value !== key.value))
    const remove = oldKvm.keyMapEntryValues.results.filter(entry => !newKvm.keyMapEntryValues.find(key => key.name === entry.name))

    if (add.length > 0 || update.length > 0 || remove.length > 0) {
      const batch = await this.createBatch()

      add.forEach(entryValue => batch.resource('KeyMapEntryValues').post({
        ...entryValue,
        keyMapEntry: {'__metadata': {uri: `KeyMapEntries('${entryValue.map_name}')`}}
      }))
      update.forEach(entryValue => batch.resource('KeyMapEntryValues', {
        map_name: entryValue.map_name,
        name: entryValue.name
      }).put({value: entryValue.value}))
      if (purgeDeleted) {
        remove.forEach(entryValue => batch.resource('KeyMapEntryValues', {
          map_name: entryValue.map_name,
          name: entryValue.name
        }).delete())
      }

      return this.sendBatch(batch)
    }
  }
}
