#!/usr/bin/env node
const program = require('commander')
const {version, name, description} = require('../package.json')
const updateProvider = require('./provider')
const updateProducts = require('./apiproduct')
const sapim = require("sapim");
const dotenv = require("dotenv");

function build() {
  if (program.env) {
    dotenv.config({ path: program.env });
    return sapim.default();
  } else {
    dotenv.config();
    return sapim.default();
  }
}

program.name(name)
  .version(version, '-v, --version')
  .description(description)
  .option('-s, --silent', 'suppress console output')
  .option('-e, --env <path>', 'load environment variables from the given file')
  .option('-c, --config <path>', 'load the given configuration file')
  .option('-d, --debug', 'show debug messages')

program.command('provider <manifest>')
  .description('creates or updates a provider based on the given manifest')
  .action(manifest => updateProvider(build().config, manifest))

program.command('products <manifest>')
  .description('creates or updates a list of products based on the given manifest')
  .action(manifest => updateProducts(build().config, manifest))

program.parse(process.argv)