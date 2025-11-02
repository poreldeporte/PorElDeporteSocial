import { createSeedClient } from '@snaplet/seed'
import { copycat } from '@snaplet/copycat'

async function fetchRandomPhoto() {
  const response = await fetch('https://api.unsplash.com/photos/random?client_id=')
  const data = await response.json()
  return data
}

async function run() {
  const seed = await createSeedClient({
    dryRun: true,
  })

  await seed.$resetDatabase()

  const randomPhoto = await fetchRandomPhoto()

  await seed.posts([
    {
      title: (x) => copycat.sentence(x.seed, { max: 10 }),
      category_id: '7cc01a01-8fb0-470e-baf9-100504ac1839',
      content(ctx) {
        return copycat.sentence(ctx.seed, {
          max: 500,
        })
      },
      image_url: randomPhoto.urls.regular,
      profile_id: '6b8df928-aa94-453f-9f94-109013405cab',
    },
  ])
  process.exit()
}

run()
