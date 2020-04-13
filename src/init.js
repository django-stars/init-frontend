const shell = require('shelljs')
const chalk = require('chalk')
const fs = require('fs-extra')
const inquirer = require('inquirer')
const path = require('path')
const { execSync } = require('child_process')
const readMe = require('./getReadMe')
var rimraf = require('rimraf')
const readline = require('readline')
const pick = require('lodash/pick')
const omit = require('lodash/omit')

var prompt = inquirer.createPromptModule()

const allQuestions = [
  {
    type: 'input',
    name: 'repository',
    message: 'Please enter git url',
  },
  {
    type: 'input',
    name: 'backendUrl',
    message: 'Please enter dev server url',
  },
  {
    type: 'list',
    name: 'projectType',
    message: 'What is your project type?',
    choices: ['React', 'MPA', 'MPA & REACT'],
  },
]
function hasYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}


function getConfigs(name, folderName) {
  const questions = ([
    !name ? {
      type: 'input',
      name: 'name',
      message: 'Please enter project name',
    } : null,
    !folderName ? {
      type: 'input',
      name: 'folderName',
      message: 'Please enter folder name',
      default: 'client',
    } : null,
    ...allQuestions,
  ]).filter(Boolean)


  return prompt(questions)
    .then((userconfigs) => {
      if(!name && !userconfigs.name) {
        throw new Error(chalk.red('A project name is required'))
      }
      return userconfigs
    })
}


function updatePkg(pkgPath, { name, projectType, repository }) {
  fs.readFile(pkgPath, 'utf-8')
    .then(content => {
      const pkg = JSON.parse(content)
      pkg.name = name
      pkg.version = '1.0.0'
      pkg.description = `${name} website`
      pkg.contributors = []
      pkg.bugs = `${repository}/issues`
      pkg.repository = repository
      if(projectType === 'MPA') {
        pkg.dependencies = pick(pkg.dependencies, [
          '@sentry/browser',
          'abortcontroller-polyfill',
          'bootstrap',
          'core-decorators',
          'ds-frontend',
          'lodash',
          'path-to-regexp',
          'smoothscroll-polyfill',
          'whatwg-fetch',
        ])
      }

      const newPkg = omit(pkg, 'license')

      return fs.outputFile(pkgPath, JSON.stringify(newPkg, null, 2))
        .catch(err => {
          console.log(chalk.red('Failed to update package.json'))
          throw err
        })
    })
}

function updateReadMe(pkgPath) {
  return fs.outputFile(pkgPath, readMe)
    .catch(err => {
      console.log(chalk.red('Failed to update README.md'))
      throw err
    })
}

function updateEnvFile(path, { backendUrl, projectType }) {
  const readFile = readline.createInterface({
    input: fs.createReadStream(path),
    output: fs.createWriteStream(path + '_'),
    terminal: false,
  })

  readFile.on('line', transform)
  readFile.on('close', function() {
    fs.removeSync(path)
    fs.renameSync(path + '_', path)
  })

  function transform(line) {
    if(line.includes('BACKEND_URL') && backendUrl) {
      return this.output.write(`BACKEND_URL=${backendUrl}\n`)
    }
    if(line.includes('SSR=') && (projectType === 'MPA' || projectType === 'MPA & REACT')) {
      return this.output.write(`SSR=TRUE\n`)
    }
    this.output.write(`${line}\n`)
  }
}


function init(
  rootDir,
  siteName,
  folderName
) {
  const useYarn = hasYarn()
  if(!useYarn) {
    throw new Error(chalk.red('Please install yarn'))
  }
  let dest
  let configs = {
    name: siteName,
    folderName,
  }


  getConfigs(siteName, folderName)
    .then(userconfigs => {
      configs = { ...configs, ...userconfigs }

      dest = path.resolve(rootDir, configs.folderName)
      if(fs.existsSync(dest)) {
        throw new Error(chalk.red(`Directory already exists at ${dest} !`))
      }

      console.log()
      console.log(chalk.cyan('Creating new project ...'))
      console.log()
      console.log(chalk.cyan('Cloning git repository'))
      if(shell.exec(`git clone --recursive https://github.com/django-stars/frontend-skeleton ${dest}`, { silent: true }).code !== 0) {
        throw new Error(chalk.red(`Cloning git repo failed!`))
      }

      shell.exec(`cd ./${configs.folderName} && git fetch origin && git checkout next-generation`)

      console.log(chalk.cyan('Cloning git repository finished'))
      return updatePkg(path.join(dest, 'package.json'), configs)
    })
    .then(_ => updateReadMe(path.join(dest, 'README.md')))
    .then(_ => updateEnvFile(path.join(dest, '.env.default'), configs))
    .then(_ => {
      fs.removeSync(path.join(dest, 'LICENSE'))
      rimraf.sync(path.join(dest, '.git'))
      fs.removeSync(path.join(dest, 'Resource.md'))
      const pkgManager = 'yarn'
      console.log(`Installing dependencies with: ${chalk.cyan(pkgManager)}`)

      if(configs.projectType === 'MPA') {
        rimraf.sync(path.join(dest, 'src/app/common'))
        rimraf.sync(path.join(dest, 'src/app/layouts'))
        rimraf.sync(path.join(dest, 'src/app/pages'))
        rimraf.sync(path.join(dest, 'src/app/store'))
        fs.removeSync(path.join(dest, 'src/app/App.js'))
        fs.removeSync(path.join(dest, 'src/app/cache.js'))
        fs.removeSync(path.join(dest, 'src/app/init.js'))
        fs.removeSync(path.join(dest, 'src/app/routes.js'))
        fs.writeFile(path.join(dest, 'src/app/index.js'), `import 'polyfills'\nimport '../styles/index.scss'\n`)
      }

      try {
        shell.exec(`cd ./${configs.folderName} && yarn`)
      } catch (err) {
        console.log(chalk.red('Installation failed'))
        throw err
      }

      console.log()
      const cdpath =
      path.join(process.cwd(), configs.folderName) === dest
        ? configs.folderName
        : path.relative(process.cwd(), configs.folderName)

      console.log()
      console.log(`Success! Created ${chalk.cyan(cdpath)}`)
      console.log('Inside that directory, you can run several commands:')
      console.log()
      console.log(chalk.cyan(`  ${pkgManager} start`))
      console.log('    Starts the development server.')
      console.log()
      console.log(chalk.cyan(`  ${pkgManager} build`))
      console.log('    Bundles the app into static files for production.')
      console.log()
      console.log('We suggest that you begin by typing:')
      console.log()
      console.log(chalk.cyan('  cd'), `./${cdpath}`)
      console.log(`  ${chalk.cyan(`${pkgManager} start`)}`)

      console.log()
      console.log('Happy codding!')
    })
}

module.exports = init
