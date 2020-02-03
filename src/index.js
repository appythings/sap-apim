#!/usr/bin/env node
const program = require('commander')
const {version, name, description} = require('../package.json')
const updateProvider = require('./provider')

program.name(name)
  .version(version, '-v, --version')
  .description(description)
  .option('-s, --silent', 'suppress console output')
  .option('-e, --env <path>', 'load environment variables from the given file')
  .option('-c, --config <path>', 'load the given configuration file')
  .option('-d, --debug', 'show debug messages')

program.command('provider')
  .description('creates or updates a provider based on the provider.yaml file')
  .action(updateProvider)

program.parse(process.argv)