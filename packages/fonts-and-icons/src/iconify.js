import axios from 'axios'
import { ensureDir, ensureFile } from 'fs-extra'
import { existsSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import path, { dirname, join } from 'node:path'
import { pascalCase } from 'change-case'
import prettier from 'prettier'
import { transform } from '@svgr/core'
import { fileURLToPath } from 'node:url'
import { throttleAll } from 'promise-throttle-all'
import fs from 'node:fs/promises'

const __dirname = join(dirname(fileURLToPath(import.meta.url)))

const iconData = {}

async function main({ prefixToInstall = '' } = {}) {
  const collections = await axios.get('https://api.iconify.design/collections')
  const fontEntries = Object.entries(collections.data)
  const [prefix, info] = fontEntries.find(([prefix, info]) => {
    return prefixToInstall === prefix
  })

  const icons = await axios.get(`https://api.iconify.design/collection?prefix=${prefix}`)
  const packDir = join(__dirname, '..', '..', '..', '../packages', `icon-${prefix}`)
  if (existsSync(packDir)) {
    rmSync(packDir, { recursive: true })
  }
  mkdirSync(packDir, { recursive: true })
  const packageName = `@tamagui-icons/icon-${prefix}`
  writeFileSync(
    join(packDir, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        version: '0.0.1', // TODO:
        source: 'src/index.ts',
        types: 'src/index.ts',
        main: 'dist/cjs',
        module: 'dist/esm',
        'module:jsx': 'dist/jsx',
        scripts: {
          release: 'npm publish',
          build: 'tamagui-build --skip-types',
          watch: 'tamagui-build --skip-types --watch',
          clean: 'tamagui-build --skip-types clean',
          'clean:build': 'tamagui-build --skip-types clean:build',
        },
        peerDependencies: {
          react: '*',
          'react-native-svg': '>=12',
        },
        dependencies: {
          '@tamagui/helpers-icon': '*',
        },
        devDependencies: {
          '@types/react': '*',
          '@tamagui/build': '*',
          'react-native-svg': '13.4.0',
        },
      },
      null,
      2
    )
  )

  writeFileSync(
    join(packDir, '.gitignore'),
    `dist/
.DS_Store
THUMBS_DB
node_modules/
types/
`
  )

  writeFileSync(
    join(packDir, 'README.md'),
    `## Usage with Next.js
          
Add this to next.config.js:
    
\`\`\`ts
modularizeImports: {
    // ...
    "${packageName}": {
        transform: "${packageName}/dist/esm/icons/{{kebabCase member}}",
        skipDefaultConversion: true,
    },
},
\`\`\`

Make sure to re-install dependencies and re-build after cloning.
        `
  )
  writeFileSync(
    join(packDir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          composite: true,
          forceConsistentCasingInFileNames: false,
        },
        references: [],
        include: ['src'],
      },
      null,
      2
    )
  )

  writeFileSync(join(packDir, '.gitignore'), `dist`)
  // writeFileSync(join(packDir, 'rome.json'), "../../rome.json", null, 2)
  mkdirSync(join(packDir, 'src'), { recursive: true })
  writeFileSync(join(packDir, 'src', 'index.ts'), '')

  console.log('Fetching and installing icon...')
  if (icons.data.uncategorized) {
    await throttleAll(
      20,
      icons.data.uncategorized.map((icon) => () => populateIcon(prefix, icon))
    )
  } else {
    for (const [categoryTitle, categoryIcons] of Object.entries(icons.data.categories)) {
      await throttleAll(
        20,
        categoryIcons.map((icon) => () => populateIcon(prefix, icon))
      )
    }
  }
  console.log(`Finished generating the "${prefix}" package`)
  iconData[prefix] = info

  const metaPath = path.join(__dirname, '../meta/data.json')
  await ensureFile(metaPath)
  await fs.writeFile(metaPath, JSON.stringify(iconData, null, 2))
}

/**
 *
 * @param {string} prefix
 * @param {string} iconName
 */
async function populateIcon(prefix, ogIconName, attemptNo = 1) {
  const iconName = `icon-${ogIconName}`
  let componentName = pascalCase(iconName)
  try {
    const iconsDir = join(
      __dirname,
      '..',
      '..',
      '..',
      '../packages',
      `icon-${prefix}`,
      'src',
      'icons'
    )
    const iconPath = join(iconsDir, `${iconName}.tsx`)
    await ensureDir(iconsDir)
    if (existsSync(iconPath)) {
      console.log(`${prefix} / ${iconName} already exists - skipping.`)
      return
    }
    const svgContent = await axios.get(`https://api.iconify.design/${prefix}/${ogIconName}.svg`)

    // if starts with number, add an _
    if (!isNaN(Number(componentName[0]))) {
      componentName = `_${componentName}`
    }

    const svgrIcon = await transformSvgr(svgContent.data, componentName)
    writeFileSync(iconPath, svgrIcon)

    const indexFilePath = join(
      __dirname,
      '..',
      '..',
      '..',
      '../packages',
      `icon-${prefix}`,
      'src',
      'index.ts'
    )
    await ensureFile(indexFilePath)
    appendFileSync(indexFilePath, `export { ${componentName} } from "./icons/${iconName}";\n`)
  } catch (e) {
    if (attemptNo > 5) {
      console.log('no more attempts left. componentName:', componentName, ' left out')
      return
    }
    const RETRY_SLEEP_MS = 15_000
    await new Promise((res) => setTimeout(() => res(), RETRY_SLEEP_MS))
    await populateIcon(prefix, ogIconName, attemptNo + 1)
  }
}
// main({ prefixToInstall: 'clarity' })

/**
 *
 * @param {string} svg
 * @param {string} componentName
 */
async function transformSvgr(svg, componentName) {
  // Ensure SVG has a single root element by wrapping content in an <svg> tag
  const svgWithRoot = svg.startsWith('<svg') ? svg : `<svg>${svg}</svg>`

  // Check if SVG string contains only one root element
  const svgRootElements = svgWithRoot.match(/<svg[^>]*>(.*?)<\/svg>/g)
  if (svgRootElements && svgRootElements.length > 1) {
    // If SVG string contains more than one root element, log an error and return
    console.error(`SVG string for component ${componentName} contains multiple root elements.`)
    return
  }

  let transformedIcon = await transform(
    svgWithRoot,
    {
      icon: true,
      native: true,
      dimensions: true,
      typescript: true,
      namedExport: componentName,
      exportType: 'named',
      // ref: true,
      memo: true,
      plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx', '@svgr/plugin-prettier'],
    },
    { componentName }
  )

  const transformedIconFirstTransform = `${transformedIcon}`

  // for some reason SVGR imports SVG as the default export - this is a temp fix
  transformedIcon = transformedIcon.replace('Svg, {', '{ Svg,')

  transformedIcon =
    `/* eslint-disable @typescript-eslint/no-explicit-any */\nimport { themed } from "@tamagui/helpers-icon";\nimport type { IconProps } from "@tamagui/helpers-icon";\n${transformedIcon}`
      .replace(/props: SvgProps/g, '_props: any')
      .replace(
        /\) => \(((.|\n)*)\);\nconst Memo = memo/g,
        `) => {
  const { size = 24, ...props } = _props;
  return ($1)
};
const Memo = memo`
      )
      .replace('width={24}', 'width={size}')
      .replace('height={24}', 'height={size}')
      .replace(/import type { SvgProps.+/, `import type { SvgProps } from "react-native-svg";`)
      .replace(/xmlns="[^"]*"\s*/g, '')
      .replace(/memo\(.*\)/g, `memo(themed(${componentName}))`)
      .replace(
        '=> (',
        `=> {
      const { size = 24, ...props } = _props;
      `
      )
      .replace('</Svg>\n)', '</Svg>\n}')
      .replace('<Svg', 'return <Svg')

  try {
    const setTransformedIcon = prettier.format(transformedIcon, {
      singleQuote: true,
      trailingComma: 'es5',
      arrowParens: 'always',
      parser: 'typescript',
      semi: false,
    })
    transformedIcon = setTransformedIcon
  } catch (e) {
    console.log('error formatting:', e)
  }
  return transformedIcon
}

export default main
