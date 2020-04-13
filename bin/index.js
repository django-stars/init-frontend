#!/usr/bin/env node
const chalk = require('chalk')
const semver = require('semver')
const path = require('path')
const program = require('commander')
const init = require('../src/init')
const requiredVersion = require('../package.json').engines.node

if(!semver.satisfies(process.version, requiredVersion)) {
  console.log(
    chalk.red(`\nMinimum node version not met :)`) +
      chalk.yellow(
        `\nYou are using Node ${process.version}, Requirement: Node ${requiredVersion}.\n`,
      ),
  )
  process.exit(1)
}

program
  .version(require('../package.json').version)
  .usage('<command> [options]')

program
  .command('init [siteName] [folderName] [rootDir]')
  .description('Initialize website')
  .action((siteName, folderName, rootDir = '.') => {
    init(path.resolve(rootDir), siteName, folderName)
  })

program.arguments('<command>').action((cmd) => {
  program.outputHelp()
  console.log(`  ${chalk.red(`\n  Unknown command ${chalk.yellow(cmd)}.`)}`)
  console.log()
})

program.parse(process.argv)

if(!process.argv.slice(2).length) {
  program.outputHelp()
}
