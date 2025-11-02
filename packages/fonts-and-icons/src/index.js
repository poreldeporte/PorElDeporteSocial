import chalk from 'chalk'
import { pascalCase } from 'change-case'
import pkg from 'fs-extra'
import { marked } from 'marked'
import TerminalRenderer from 'marked-terminal'
import { homedir } from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import fonts from './fonts.js'
import googleFonts from './googleFonts.js'
import iconify from './iconify.js'
import icons from './icons.js'

const { copy, ensureDir, readFileSync } = pkg
marked.setOptions({
  headerIds: false,
  mangle: false,
  renderer: new TerminalRenderer(),
})

const home = homedir()
const tamaguiDir = path.join(home, '.tamagui')

export const generatedPackageTypes = ['font', 'icon']
export const installGeneratedPackage = async (type, packagesPath) => {
  packagesPath = packagesPath || path.join(process.cwd(), '..', '..', 'packages')
  if (!generatedPackageTypes.includes(type)) {
    throw new Error(
      `${
        type ? `Type "${type}" is Not supported.` : `No type provided.`
      } Supported types: ${generatedPackageTypes.join(', ')}`
    )
  }
  console.info(`Setting up ${chalk.blueBright(tamaguiDir)}...`)
  await ensureDir(tamaguiDir)
  console.info(
    chalk.gray(
      `Use ⇧/⇩ to navigate. Use tab to cycle the result. Use Page Up/Page Down (on Mac: fn + ⇧ / ⇩) to change page. Hit enter to select the highlighted item below the prompt.`
    )
  )
  const result = await prompts({
    name: 'packageName',
    type: 'autocomplete',
    message:
      type === 'icon' ? `Pick an icon pack:` : type === 'font' ? `Pick a font:` : `Pick one:`,
    choices: Object.entries(type === 'font' ? fonts : icons).map(([slug, data]) => ({
      title:
        type === 'font'
          ? `${slug}: ${data.weights.length} weights, ${data.styles.length} styles, ${
              data.subsets.length
            } subsets (https://fonts.google.com/specimen/${pascalCase(slug)})`
          : `${data.name}: ${data.total} icons, ${data.license.title} license (${data.author.url})`,
      value: slug,
    })),
  })

  if (type === 'icon') {
    await iconify({ prefixToInstall: result.packageName })
  }
  if (type === 'font') {
    console.log('font')
    await googleFonts({ prefixToInstall: result.packageName })
  }
}

async function run() {
  const type = process.argv[2]
  if (type === 'font' || type === 'icon') {
    await installGeneratedPackage(type)
  } else {
    console.error('Invalid argument. Please provide "font" or "icon".')
  }
}

run()
