const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE
if (!url || !anon || !service) {
  console.error('missing envs', { url, anon: !!anon, service: !!service })
  process.exit(1)
}
const admin = createClient(url, service)
const email = `dev+cli-${randomUUID()}@ped.app`
const password = 'TempPass123!'
async function main() {
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr) throw createErr
  const userId = createData.user?.id
  const auth = createClient(url, anon)
  const { data: signInData, error: signInErr } = await auth.auth.signInWithPassword({ email, password })
  if (signInErr) throw signInErr
  const token = signInData.session?.access_token
  const authed = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data, error } = await authed
    .from('games')
    .select(`id,name,game_queue ( profile_id, status )`)
    .gte('start_time', new Date().toISOString())
    .limit(1)
  if (error) {
    console.error('Query error', error)
  } else {
    console.log('Rows', data)
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId)
  }
}
main().catch(async (err) => {
  console.error('script failed', err)
  process.exit(1)
})
