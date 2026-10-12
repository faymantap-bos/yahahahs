import { pathToFileURL } from 'node:url'

const NOXXY_BASE = 'https://am.noxxyrorr.biz.id'
const BASE_GENEMAIL = 'https://generator.email'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function getGeneratorEmailSession() {
  const init = await fetch(`${BASE_GENEMAIL}/`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000)
  })

  const setCookies = init.headers.getSetCookie
    ? init.headers.getSetCookie()
    : [init.headers.get('set-cookie') || '']

  const hpCookie = setCookies.find(
    c => c && c.startsWith('__Host-ab_hp=')
  )

  const rawCtx = setCookies.find(
    c => c && c.startsWith('inbox_ctx=')
  )

  let domain = 'heyzalo.vn'

  if (rawCtx) {
    try {
      const dec = decodeURIComponent(
        rawCtx.split(';')[0].split('=').slice(1).join('=')
      )

      const extracted = dec.split('/')[0]
      if (extracted) domain = extracted
    } catch {}
  }

  const hpCookieHeader = hpCookie
    ? hpCookie.split(';')[0]
    : ''

  return { domain, hpCookieHeader }
}

function generateRandomUser() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let user = 'amnox'

  for (let i = 0; i < 6; i++) {
    user += chars.charAt(
      Math.floor(Math.random() * chars.length)
    )
  }

  user += Math.floor(Math.random() * 89 + 10)
  return user
}

async function sendLink(email) {
  const res = await fetch(`${NOXXY_BASE}/api/send-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA
    },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(15000)
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat mengirim link`)
  }

  return res.json()
}

async function verifyLink(email, magicLink) {
  const res = await fetch(`${NOXXY_BASE}/api/verify-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA
    },
    body: JSON.stringify({ email, magicLink }),
    signal: AbortSignal.timeout(15000)
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat verifikasi link`)
  }

  return res.json()
}

async function fetchMagicLink(domain, user, hpCookieHeader, maxAttempts = 10) {
  const ctx = encodeURIComponent(`${domain}/${user}/`)
  const cookies = `inbox_ctx=${ctx}; ${hpCookieHeader}`

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await sleep(attempt === 1 ? 5000 : 3000)

    try {
      const res = await fetch(`${BASE_GENEMAIL}/inbox1/`, {
        headers: {
          'User-Agent': UA,
          'Cookie': cookies
        },
        signal: AbortSignal.timeout(10000)
      })

      if (!res.ok) continue

      const html = await res.text()

      const links = html.match(/https?:\/\/[^\s"'<>]+/gi) || []

      const magicLink = links.find(link =>
        (
          link.includes('alight-creative.firebaseapp.com') ||
          link.includes('alightcreative.com')
        ) &&
        (
          link.includes('signInWithEmailLink') ||
          link.includes('auth_action') ||
          link.includes('links?link=')
        )
      )

      if (magicLink) {
        return magicLink.replace(/&amp;/g, '&')
      }
    } catch {}
  }

  throw new Error('Timeout menunggu email magic link dari Alight Motion')
}

async function createAndVerifySingleAccount(sessionData) {
  const { domain, hpCookieHeader } = sessionData

  const user = generateRandomUser()
  const email = `${user}@${domain}`
  const inbox = `${BASE_GENEMAIL}/${email}`

  const sendRes = await sendLink(email)

  if (!sendRes?.success) {
    throw new Error(
      sendRes?.message ||
      sendRes?.error ||
      'Gagal mengirim link ke email'
    )
  }

  const magicLink = await fetchMagicLink(
    domain,
    user,
    hpCookieHeader
  )

  const verifyRes = await verifyLink(email, magicLink)

  if (!verifyRes?.success) {
    throw new Error(
      verifyRes?.message ||
      verifyRes?.error ||
      'Gagal verifikasi magic link'
    )
  }

  const amuser = verifyRes.data?.user || verifyRes.data || verifyRes.userData || {}

  return {
    email,
    inbox,
    status: true,
    membershipStatus: amuser.membershipStatus ?? null,
    planName: amuser.planName ?? null,
    orderId: amuser.orderId ?? null,
    validUntil: amuser.validUntil ?? null
  }
}

async function bulk(count = 1) {
  const num = Math.max(1, Math.min(Number(count) || 1, 50))
  const results = []

  for (let i = 0; i < num; i++) {
    try {
      const sessionData = await getGeneratorEmailSession()
      const account = await createAndVerifySingleAccount(sessionData)

      results.push(account)
    } catch (err) {
      results.push({
        status: false,
        error: err.message
      })
    }

    if (i < num - 1) {
      await sleep(1500)
    }
  }

  return {
    Creator: 'Noxxy',
    total: results.length,
    success: results.filter(r => r.status).length,
    failed: results.filter(r => !r.status).length,
    results
  }
}

export {
  NOXXY_BASE,
  BASE_GENEMAIL,
  UA,
  sleep,
  getGeneratorEmailSession,
  generateRandomUser,
  sendLink,
  verifyLink,
  fetchMagicLink,
  createAndVerifySingleAccount,
  bulk
}

export default bulk

const isMain = Boolean(
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
)

if (isMain) {
  async function main() {
    const arg = process.argv[2]

    if (!arg || !Number.isInteger(Number(arg))) {
      console.log('Usage: node ambulk.js <jumlah>')
      return
    }

    const count = parseInt(arg, 10)
    const result = await bulk(count)

    console.log(JSON.stringify(result, null, 2))
  }

  main().catch(err => {
    console.error(JSON.stringify({
      Creator: 'Noxxy',
      status: false,
      error: err.message
    }, null, 2))

    process.exitCode = 1
  })
}
