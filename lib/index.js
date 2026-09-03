/**
 * ui-whale host half.
 *
 * A Cordis Service registered under `whale`, exposed to the browser through
 * the Typert Gateway as the RPC namespace `whale` (the client calls
 * `ctx.remote.whale.usage()`). The service aggregates provider-reported token
 * usage from today's session logs and attributes it to the model recorded by
 * the nearest preceding `request/header` / `request/context` event.
 *
 * The money column is an estimate on top of public DeepSeek list prices; the
 * client renders it with an explicit "estimate" note.
 */
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'

const name = 'whale'

/** API key env name for the DeepSeek balance endpoint. */
const API_KEY_REF = 'DEEPSEEK_API_KEY'
/** DeepSeek platform session token (JWT) backing the console usage data. */
const PLATFORM_TOKEN_REF = 'DEEPSEEK_PLATFORM_TOKEN'
/** UTC+8 (Asia/Shanghai) — the platform's billing day window. */
const TZ_SEC = 28800

/**
 * Hand-written wire contract for the `whale.usage` Remote.
 *
 * The SRC marker fallback (markRemote below) is invisible across separate
 * `@deepseek-ai/dsh-typert-protocol` module copies — each copy owns a private
 * marker table, but the gateway reads markers through the dsh tree copy. The
 * invocation is therefore also registered into the host tree's typert
 * registry (`ctx.typert.register`), the documented path for packages without
 * a compiled `./typert` artifact. `src-json` keeps the payload schema-free
 * (no zod dependency).
 */
const WHALE_USAGE_INVOCATIONS = [{
  id: 'ui-whale#whale/usage',
  service: 'whale',
  namespace: 'whale',
  method: 'usage',
  invocation: { kind: 'direct' },
  parameters: [],
  result: { mode: 'src-json' },
}]

function pad(n) {
  return String(n).padStart(2, '0')
}

/**
 * Attach the `Remote` method marker exactly the way the TypeScript decorator
 * emit would: `addMarkerInitializer` runs its initializer with the instance as
 * `this`, and `mark()` writes the table keyed by the class prototype.
 */
function markRemote(instance, methodName) {
  const method = instance[methodName]
  Remote(method, {
    kind: 'method',
    name: methodName,
    static: false,
    private: false,
    access: {
      has: (obj) => methodName in obj,
      get: (obj) => obj[methodName],
    },
    addInitializer(fn) {
      fn.call(instance)
    },
  })
}

/**
 * Query the DeepSeek account balance through the official `GET /user/balance`
 * endpoint. The API returns balances natively in CNY (the `currency` field
 * states it), so the value is displayed as returned. Any failure (missing
 * key, timeout, auth error) yields `null` and never blocks the billboard.
 * @param ctx - host context with the optional `credentials` service.
 * @returns the balance fact, or `null` when unavailable.
 */
async function fetchBalance(ctx) {
  try {
    const credentials = ctx.get('credentials')
    let key
    if (credentials !== undefined && credentials !== null && typeof credentials.resolve === 'function') {
      const hit = await credentials.resolve(API_KEY_REF)
      if (hit) key = hit.value
    }
    if (!key) key = process.env[API_KEY_REF]
    if (!key) return null
    const res = await fetch('https://api.deepseek.com/user/balance', {
      headers: { authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const infos = Array.isArray(data && data.balance_infos) ? data.balance_infos : []
    const info = infos.find((entry) => entry && entry.currency === 'CNY') || infos[0]
    if (!info || typeof info.total_balance !== 'string') return null
    return {
      currency: typeof info.currency === 'string' ? info.currency : 'CNY',
      total: info.total_balance,
      granted: typeof info.granted_balance === 'string' ? info.granted_balance : null,
      toppedUp: typeof info.topped_up_balance === 'string' ? info.topped_up_balance : null,
      available: data.is_available === true,
    }
  } catch (err) {
    return null
  }
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Read today's per-model usage and cost from the DeepSeek platform console
 * APIs (the data behind https://platform.deepseek.com/usage):
 *
 *   GET /api/v0/usage/by_api_key/amount?start&end&tz
 *   GET /api/v0/usage/by_api_key/cost?start&end&tz
 *
 * Both are bearer-authenticated with the platform session JWT (the API key
 * is rejected: code 40003). Non-browser clients pass the platform WAF only
 * with browser-shaped request headers, which are copied from the SPA's own
 * requests. The cost figures are the account's real billed per-model amounts,
 * in the currency the platform reports (CNY by default).
 *
 * @returns
 *   { auth: 'ok', items, currency }    platform data for the day
 *   { auth: 'missing' }                no platform token configured
 *   { auth: 'invalid' }                token rejected (401 / 40003)
 *   { auth: 'failed' }                 transient transport / WAF failure
 */
async function fetchPlatformUsage(ctx, startSec, endSec) {
  const credentials = ctx.get('credentials')
  let token
  if (credentials !== undefined && credentials !== null && typeof credentials.resolve === 'function') {
    const hit = await credentials.resolve(PLATFORM_TOKEN_REF)
    if (hit) token = hit.value
  }
  if (!token) token = process.env[PLATFORM_TOKEN_REF]
  if (!token) return { auth: 'missing', items: [], currency: 'CNY' }

  const base = 'https://platform.deepseek.com'
  const query = 'start=' + startSec + '&end=' + endSec + '&tz=' + TZ_SEC
  const headers = {
    authorization: 'Bearer ' + token,
    accept: 'application/json, text/plain, */*',
    referer: base + '/usage',
    origin: base,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'accept-language': 'zh-CN,zh;q=0.9',
  }
  try {
    const [amountRes, costRes] = await Promise.all([
      fetch(base + '/api/v0/usage/by_api_key/amount?' + query, { headers, signal: AbortSignal.timeout(10000) }),
      fetch(base + '/api/v0/usage/by_api_key/cost?' + query, { headers, signal: AbortSignal.timeout(10000) }),
    ])
    if (amountRes.status === 401 || costRes.status === 401) return { auth: 'invalid', items: [], currency: 'CNY' }
    if (!amountRes.ok || !costRes.ok) return { auth: 'failed', items: [], currency: 'CNY' }
    const amountJson = await amountRes.json()
    const costJson = await costRes.json()
    if (!amountJson || amountJson.code === 40003 || !costJson || costJson.code === 40003) {
      return { auth: 'invalid', items: [], currency: 'CNY' }
    }
    const amountBiz = amountJson && amountJson.data && amountJson.data.biz_data
    const costBiz = costJson && costJson.data && costJson.data.biz_data
    if (!amountBiz || !costBiz) return { auth: 'failed', items: [], currency: 'CNY' }

    let currency = 'CNY'
    for (const entry of costBiz.data || []) {
      if (typeof entry.currency === 'string' && entry.currency !== '') { currency = entry.currency; break }
    }
    const byModel = new Map()
    const touch = (model) => {
      let item = byModel.get(model)
      if (!item) item = { model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, cost: 0 }
      byModel.set(model, item)
      return item
    }
    for (const series of amountBiz.series || []) {
      if (typeof series.model !== 'string') continue
      const item = touch(series.model)
      for (const bucket of series.buckets || []) {
        const u = bucket && bucket.usage
        if (!u) continue
        item.input += num(u.PROMPT_CACHE_MISS_TOKEN)
        item.output += num(u.RESPONSE_TOKEN)
        item.cacheRead += num(u.PROMPT_CACHE_HIT_TOKEN)
        item.calls += num(u.REQUEST)
      }
    }
    for (const entry of costBiz.data || []) {
      for (const series of entry.series || []) {
        if (typeof series.model !== 'string') continue
        const item = touch(series.model)
        for (const bucket of series.buckets || []) item.cost += num(bucket && bucket.cost)
      }
    }
    const items = [...byModel.values()].sort((a, b) => b.cost - a.cost)
    return items.length === 0 ? { auth: 'failed', items: [], currency } : { auth: 'ok', items, currency }
  } catch (err) {
    return { auth: 'failed', items: [], currency: 'CNY' }
  }
}

async function runUsage(ctx) {
  const q = ctx.get('sessionQuery')
  if (!q) return { ok: false }
  const balancePromise = fetchBalance(ctx)
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayEnd = dayStart + 86400000
  // The platform bills in UTC+8; query the same day window edge-to-edge.
  const nowSec = Math.floor(Date.now() / 1000)
  const dayStartSec = Math.floor((nowSec + TZ_SEC) / 86400) * 86400 - TZ_SEC
  const platformPromise = fetchPlatformUsage(ctx, dayStartSec, nowSec)
  let sessions
  try {
    sessions = await q.listSessions()
  } catch (err) {
    return { ok: false }
  }
  // Session-log tokens: real provider-reported usage of this host, kept as a
  // fallback row set (without cost) when the platform data is unavailable.
  const acc = {}
  for (const rec of sessions) {
    let snap
    try {
      snap = await q.readSession(rec.header.id)
    } catch (err) {
      continue
    }
    if (!snap || !Array.isArray(snap.events)) continue
    let provider = ''
    let model = ''
    for (const ev of snap.events) {
      const t = typeof ev.time === 'number' ? ev.time : 0
      if (t >= dayEnd) break
      const d = ev.data
      if (ev.type === 'request/header') {
        const cfg = d && d.header && d.header.config
        if (cfg && typeof cfg.provider === 'string' && typeof cfg.model === 'string') {
          provider = cfg.provider
          model = cfg.model
        }
      } else if (ev.type === 'request/context') {
        if (d && typeof d.provider === 'string' && typeof d.model === 'string') {
          provider = d.provider
          model = d.model
        }
      } else if (ev.type === 'assistant/message') {
        if (t < dayStart) continue
        const u = d && d.usage
        if (!u || !model) continue
        const key = provider + '\u0000' + model
        let b = acc[key]
        if (!b) b = acc[key] = { provider, model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 }
        b.input += typeof u.inputTokens === 'number' ? u.inputTokens : 0
        b.output += typeof u.outputTokens === 'number' ? u.outputTokens : 0
        b.cacheRead += typeof u.cacheReadTokens === 'number' ? u.cacheReadTokens : 0
        b.cacheWrite += typeof u.cacheWriteTokens === 'number' ? u.cacheWriteTokens : 0
        b.calls += 1
      }
    }
  }
  const sessionModels = Object.keys(acc).map((key) => {
    const b = acc[key]
    return {
      provider: b.provider,
      model: b.model,
      input: b.input,
      output: b.output,
      cacheRead: b.cacheRead,
      cacheWrite: b.cacheWrite,
      calls: b.calls,
      cost: null, // only the platform console carries real billed amounts
    }
  }).sort((a, b) => b.input + b.output + b.cacheRead + b.cacheWrite - (a.input + a.output + a.cacheRead + a.cacheWrite))

  const platform = await platformPromise
  const models = platform.auth === 'ok' ? platform.items : sessionModels
  let totalTokens = 0
  let totalCost = null
  for (const m of models) {
    totalTokens += m.input + m.output + m.cacheRead + m.cacheWrite
    if (m.cost !== null) totalCost = (totalCost === null ? 0 : totalCost) + m.cost
  }
  return {
    ok: true,
    date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()),
    models,
    totalTokens,
    totalCost,
    balance: await balancePromise,
    authState: platform.auth,
    currency: platform.currency,
  }
}

class WhaleUsageService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'whale')
    markRemote(this, 'usage')
    // Register the invocation through the host tree's typert registry so the
    // gateway (which reads the tree's own protocol copy) can claim and serve
    // `whale/usage` regardless of which package copy libraries resolve.
    ctx.inject(['typert'], (c) => {
      c.typert.register({
        package: 'ui-whale',
        face: 'host',
        schemas: [],
        invocations: WHALE_USAGE_INVOCATIONS,
      })
    })
  }

  usage() {
    return runUsage(this.ctx)
  }
}

export { name, WhaleUsageService, WhaleUsageService as default, runUsage }
