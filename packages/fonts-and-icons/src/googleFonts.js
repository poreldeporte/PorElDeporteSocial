import { promises as fs, createWriteStream } from 'node:fs'
import path, { dirname, join } from 'node:path'
import fetch from 'node-fetch'
import { pascalCase, kebabCase } from 'change-case'
import { fileURLToPath } from 'node:url'

const __dirname = join(dirname(fileURLToPath(import.meta.url)))

function kebabCaseTocapitalizeWords(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getPackageJson(name, version) {
  return {
    name,
    version,
    types: './types/index.d.ts',
    main: 'dist/cjs',
    module: 'dist/esm',
    'module:jsx': 'dist/jsx',
    files: ['types', 'dist', 'css', 'fonts'],
    scripts: {
      build: 'tamagui-build',
      // "subset": "node -r esbuild-register subset.ts",
      watch: 'tamagui-build --watch',
      // "lint": "../../node_modules/.bin/rome check src",
      // "lint:fix": "../../node_modules/.bin/rome check --apply src",
      clean: 'tamagui-build clean',
      'clean:build': 'tamagui-build clean:build',
    },
    peerDependencies: {
      '@tamagui/core': '*',
    },
    devDependencies: {
      '@tamagui/build': '*',
      'subset-font': '^1.6.1',
    },
  }
}

function getTsConfig() {
  return {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      composite: true,
    },
    include: ['src/**/*.ts'],
    exclude: ['node_modules'],
  }
}

const fontData = {}
const main = async ({ prefixToInstall } = {}) => {
  const { familyMetadataList } = await fetch('https://fonts.google.com/metadata/fonts').then((r) =>
    r.json()
  )

  // console.log(
  //   'kebabCaseTocapitalizeWords(prefixToInstall',
  //   kebabCaseTocapitalizeWords(prefixToInstall)
  // )
  const { family, fonts, axes, subsets } = familyMetadataList.find(
    ({ family, fonts, axes, subsets }) => {
      return family === kebabCaseTocapitalizeWords(prefixToInstall)
    }
  )

  const weights = new Set()
  const styles = new Set()

  const nonWeightFonts = Object.fromEntries(
    Object.entries(fonts).filter((v) => !v[0].endsWith('wght'))
  )

  const listRes = await fetch(`https://fonts.google.com/download/list?family=${family}`)
  const list = JSON.parse((await listRes.text()).split('\n').slice(1).join('\n'))

  function getWeightName(filename) {
    return filename.split('/').pop().split('.')[0].split('-').join('')
  }
  const fileRefs = list.manifest.fileRefs.map((fileRef) => ({
    ...fileRef,
    name: getWeightName(fileRef.filename),
  }))

  for (const variant of Object.keys(fonts)) {
    if (variant.endsWith('i')) {
      styles.add('italic')
      weights.add(variant.slice(0, -1))
      continue
    } else {
      styles.add('normal')
      weights.add(variant)
    }
  }

  const hasVariableFont = axes.length > 0

  let optionalAxes
  if (hasVariableFont) {
    weights.add('variable')

    const nonWeightAxes = axes.filter(({ tag }) => tag !== 'wght')
    if (nonWeightAxes.length > 0) {
      optionalAxes = nonWeightAxes
    }
  }

  fontData[kebabCase(family)] = {
    weights: [...weights],
    styles: [...styles],
    axes: hasVariableFont ? axes : undefined,
    subsets,
  }
  const createFunctionName = `create${pascalCase(family)}Font`

  // const optionalIfVariableFont = hasVariableFont ? '?' : ''

  // const formatUnion = (values) =>
  //   values.map((value) => `"${value}"`).join('|')

  // const weightTypes = [...weights]
  // const styleTypes = [...styles]

  const template = `import {
  FillInFont,
  GenericFont,
  createFont,
  getVariableValue,
  isWeb,
} from '@tamagui/core'
      
const LINE_HEIGHT = ${Object.values(nonWeightFonts)[0].lineHeight}
export const ${createFunctionName} = <A extends GenericFont>(
  font: Partial<A> = {},
  {
    sizeLineHeight = (size) => size,
    sizeSize = (size) => size,
  }: {
    sizeLineHeight?: (fontSize: number) => number
    sizeSize?: (size: number) => number
  } = {}
): FillInFont<A, keyof typeof defaultSizes> => {
  // merge to allow individual overrides
  const size = Object.fromEntries(
    Object.entries({
      ...defaultSizes,
      ...font.size,
    }).map(([k, v]) => [k, sizeSize(+v)])
  )
  return createFont({
    family: isWeb
      ? '${
        family.includes(' ') ? `"${family}"` : family
      }, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      : '${family}',
    lineHeight: Object.fromEntries(
      Object.entries(size).map(([k, v]) => [k, sizeLineHeight(getVariableValue(v) * LINE_HEIGHT)])
    ),
    weight: {
      4: '300',
    },
    letterSpacing: {
      4: 0,
    },
    ...(font as any),
    size,
  })
}

const defaultSizes = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  true: 14,
  5: 16,
  6: 18,
  7: 20,
  8: 23,
  9: 30,
  10: 46,
  11: 55,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 134,
} as const
`

  const packageName = `@tamagui-google-fonts/${kebabCase(family)}`
  await fs.mkdir(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/src`),
    {
      recursive: true,
    }
  )
  await fs.writeFile(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/package.json`),
    JSON.stringify(getPackageJson(packageName, `0.0.1`), null, 2)
  )

  await fs.writeFile(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/.gitignore`),
    `dist/
.DS_Store
THUMBS_DB
node_modules/
types/`
  )

  await fs.writeFile(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/README.md`),
    `# Prerequisite
First install the dependencies running \`yarn install\`, then make sure to build the package using \`yarn build\` and add the package as a dependency to the package/app you want to consume it from (could be the \`app\` or \`ui\` package) like so:
\`\`\`
"dependencies": {
  "${packageName}": "*"
}
\`\`\`
## Usage
### Expo
  
Add this to the root of your file:
    
\`\`\`ts
import { useFonts } from 'expo-font'

export default function App() {
  const [loaded] = useFonts({
    ${fileRefs
      .filter(({ name }) => !name.includes(',') && !name.includes('_wght'))
      .map(({ filename, name }, idx) => {
        name = name.replace('Regular', '') // used as default name
        return `${name}: require('${packageName}/fonts/${filename}'),`
      })
      .join('\n    ')}
  })
// ...
\`\`\`

## Web

Get the font's script (\`<link>\` or \`@import\`) and add it to \`<head>\` from [here](https://fonts.google.com/specimen/${family
      .split(' ')
      .join('+')})


## Next.js Font (next/font/google)

Import the font from \`next/font/google\` and give it a variable name in your \`_app.tsx\` like so:

\`\`\`ts
import { ${pascalCase(family)} } from 'next/font/google' // the casing might differ

const font = ${pascalCase(family)}({
  variable: '--my-font',
})
\`\`\`

Add the variable style in \`_app.tsx\`:

\`\`\`tsx
<div className={font.variable}>
  {*/ ...rest of your _app.tsx tree */}
</div>
\`\`\`

Then go to the generated font package and update \`family\` with the variable.

So, change it from:
\`\`\`ts
return createFont({
    family: isWeb
      ? '"${family}", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      : '${family}',
\`\`\`

To:
\`\`\`ts
return createFont({
    family: isWeb
      ? 'var(--my-font), -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      : '${family}',
\`\`\`


## Usage in config

\`\`\`ts
import { ${createFunctionName} } from '${packageName}' 

export const myFont = ${createFunctionName}(
  {
    face: ${JSON.stringify(
      Object.fromEntries(
        Object.entries(fonts)
          .map(([weight, info], idx) => {
            if (!fileRefs[idx]) return [null, null]
            const weightName = fileRefs[idx].name.replace('Regular', '') // used as default name
            const font = weightName.includes(',') ? null : { normal: weightName }
            if (font) {
              const italicWeightKey = `${weight}i`
              if (italicWeightKey in fonts) {
                const italicIdx = Object.keys(fonts).findIndex(
                  (_weight) => _weight === italicWeightKey
                )
                if (fileRefs[italicIdx]) {
                  font.italic = fileRefs[italicIdx].name
                }
              }
            }
            return [weight, font]
          })
          .filter(([weight, font]) => !!font && !weight.endsWith('i'))
      ),
      null,
      4
    )}
        },
  {
    // customize the size and line height scaling to your own needs
    // sizeSize: (size) => Math.round(size * 1.1),
    // sizeLineHeight: (size) => size + 5,
  }
)
\`\`\`

NOTE: these instructions are auto-generated and might not be accurate with some fonts since not all fonts share the same conventions. you may need to edit them out to get them to work.
`
  )
  await fs.writeFile(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/tsconfig.json`),
    JSON.stringify(getTsConfig(), null, 2)
  )
  await fs.writeFile(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/src/index.ts`),
    template
  )
  await fs.mkdir(
    path.join(__dirname, '..', '..', '..', `../packages/font-${kebabCase(family)}/fonts/static`),
    {
      recursive: true,
    }
  )
  console.log('Fetching and installing font...')
  await Promise.all(
    fileRefs.map((font) =>
      downloadFile(
        font.url,
        path.join(
          __dirname,
          '..',
          '..',
          '..',
          `../packages/font-${kebabCase(family)}/fonts/${font.filename}`
        )
      )
    )
  )

  console.log(`Finished generating the "${family}" package`)

  async function downloadFile(url, path) {
    const res = await fetch(url)
    const fileStream = createWriteStream(path)
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream)
      res.body.on('error', reject)
      fileStream.on('finish', resolve)
    })
  }
}

export default main
