/**
 * ui-whale host half.
 *
 * A Cordis Service registered under `whale`, exposed to the browser through
 * the Typert Gateway as the RPC namespace `whale` (the client calls
 * `ctx.remote.whale.usage()`). The service aggregates provider-reported token
 * usage from today's session logs and attributes it to the model recorded by
 * the nearest preceding `request/header` / `request/context` event.
 *
 * "Today" is the DeepSeek billing day (UTC+8) for every source: the session
 * scan, the platform query, and the displayed date share one window.
 *
 * The money column is the platform's real billed amount when the platform
 * token is configured; otherwise it stays `null` (unknown) and the client says
 * so instead of printing a fabricated zero.
 */
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'

const name = 'whale'

/** API key env name for the DeepSeek balance endpoint. */
const API_KEY_REF = 'DEEPSEEK_API_KEY'
/** DeepSeek platform session token (JWT) backing the console usage data. */
const PLATFORM_TOKEN_REF = 'DEEPSEEK_PLATFORM_TOKEN'
/** UTC+8 (Asia/Shanghai) — the platform's billing day window. */
const TZ_SEC = 28800
/** Milliseconds in one UTC+8 day (UTC+8 has no DST, so a fixed span is exact). */
const DAY_MS = 86400000
/** How long one aggregated result stays fresh. */
const USAGE_TTL_MS = 30000
/** Wall-clock budget for one full session scan before returning partial rows. */
const SCAN_BUDGET_MS = 20000
/** Parallel session reads (each one decodes a whole log). */
const SCAN_CONCURRENCY = 4
/** Timeout for the session listing call. */
const LIST_TIMEOUT_MS = 5000
/** Provider label for rows that come from the platform console. */
const PLATFORM_PROVIDER = 'deepseek-platform'

/**
 * Hand-written wire contract for the `whale.usage` Remote.
 *
 * `markRemote` below emulates the TypeScript decorator emit so a descriptor
 * also lands on the class prototype. The protocol copy this package resolves
 * (0.1.1-rc.2) keeps those markers in a module-private WeakMap, which the host
 * tree's copy (0.1.2-rc.1, string-keyed prototype property) cannot read — so
 * the invocation is ALSO registered into the host tree's typert registry
 * (`ctx.typert.register`), the documented path for packages without a compiled
 * `./typert` artifact. That registration is the load-bearing one; the marker
 * is kept as forward compatibility. `src-json` keeps the payload schema-free
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
 * Format one instant as the UTC+8 calendar date.
 * @param ms - epoch milliseconds.
 * @returns `YYYY-MM-DD` in UTC+8.
 */
function dayLabel(ms) {
  const shifted = new Date(ms + TZ_SEC * 1000)
  return shifted.getUTCFullYear() + '-' + pad(shifted.getUTCMonth() + 1) + '-' + pad(shifted.getUTCDate())
}

/**
 * The UTC+8 billing-day window containing `nowMs`.
 *
 * Every source of "today" goes through this: the session scan filters events
 * by `startMs`/`endMs`, the platform query uses `startSec`/`nowSec`, and the
 * billboard prints `label`. Deriving all three from one offset keeps a
 * non-UTC+8 host from querying one day and labelling another.
 *
 * @param nowMs - epoch milliseconds.
 * @returns `{ startMs, endMs, startSec, nowSec, label }`.
 */
function dayWindow(nowMs) {
  const startMs = Math.floor((nowMs + TZ_SEC * 1000) / DAY_MS) * DAY_MS - TZ_SEC * 1000
  return {
    startMs,
    endMs: startMs + DAY_MS,
    startSec: Math.floor(startMs / 1000),
    nowSec: Math.floor(nowMs / 1000),
    label: dayLabel(nowMs),
  }
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
 * in the currency the platform reports (CNY by default); a model the cost
 * endpoint does not mention keeps `cost: null` so "unknown" never renders as
 * a real zero.
 *
 * @returns
 *   { auth: 'ok', items, currency }    platform data for the day (possibly empty)
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
      if (!item) item = { provider: PLATFORM_PROVIDER, model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, cost: null }
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
        for (const bucket of series.buckets || []) {
          if (!bucket) continue
          item.cost = (item.cost === null ? 0 : item.cost) + num(bucket.cost)
        }
      }
    }
    // Unknown cost sorts last; a zero-cost model still precedes it.
    const items = [...byModel.values()].sort((a, b) => (b.cost === null ? -1 : b.cost) - (a.cost === null ? -1 : a.cost))
    return { auth: 'ok', items, currency }
  } catch (err) {
    return { auth: 'failed', items: [], currency: 'CNY' }
  }
}

/**
 * Read today's per-model usage from the session logs, attributing each
 * `assistant/message` to the nearest preceding `request/header` /
 * `request/context` model.
 *
 * `readSession` accepts no cancellation token, so the scan is bounded by a
 * wall-clock deadline instead of an AbortSignal: on expiry the rows already
 * accumulated are returned (and the caller warns) rather than holding the RPC
 * open. Reads run a few at a time because each one decodes a whole log.
 *
 * @param q - the host `sessionQuery` service.
 * @param win - the UTC+8 day window from {@link dayWindow}.
 * @returns `{ models, truncated }` with rows sorted by total tokens.
 */
async function scanSessions(q, win) {
  let sessions
  try {
    sessions = await q.listSessions(AbortSignal.timeout(LIST_TIMEOUT_MS))
  } catch (err) {
    console.error('[ui-whale] listSessions failed:', err)
    return { models: [], truncated: false }
  }
  const records = Array.isArray(sessions) ? sessions : []
  const acc = new Map()
  const deadline = Date.now() + SCAN_BUDGET_MS
  let next = 0
  let truncated = false
  const worker = async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= records.length) return
      if (Date.now() > deadline) {
        truncated = true
        return
      }
      const rec = records[index]
      const id = rec && rec.header && rec.header.id
      if (id === undefined || id === null) continue
      let snap
      try {
        snap = await q.readSession(id)
      } catch (err) {
        continue
      }
      if (!snap || !Array.isArray(snap.events)) continue
      let provider = ''
      let model = ''
      for (const ev of snap.events) {
        const t = typeof ev.time === 'number' ? ev.time : 0
        if (t >= win.endMs) break
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
          if (t < win.startMs) continue
          const u = d && d.usage
          if (!u || !model) continue
          const key = provider + '\u0000' + model
          let b = acc.get(key)
          if (!b) {
            b = { provider, model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, cost: null }
            acc.set(key, b)
          }
          b.input += typeof u.inputTokens === 'number' ? u.inputTokens : 0
          b.output += typeof u.outputTokens === 'number' ? u.outputTokens : 0
          b.cacheRead += typeof u.cacheReadTokens === 'number' ? u.cacheReadTokens : 0
          b.cacheWrite += typeof u.cacheWriteTokens === 'number' ? u.cacheWriteTokens : 0
          b.calls += 1
        }
      }
    }
  }
  const workers = []
  const count = Math.min(SCAN_CONCURRENCY, records.length)
  for (let i = 0; i < count; i += 1) workers.push(worker())
  await Promise.all(workers)
  const models = [...acc.values()].sort((a, b) => b.input + b.output + b.cacheRead + b.cacheWrite - (a.input + a.output + a.cacheRead + a.cacheWrite))
  return { models, truncated }
}

/**
 * Build one complete usage snapshot. Every exit path returns the same shape so
 * the browser contract (and the client's declared result schema) always holds;
 * `ok: false` means "nothing usable", never "a field is missing".
 *
 * The platform console is authoritative when it answers: the session scan is
 * skipped entirely in that case, since its rows would be discarded anyway.
 *
 * @param ctx - host context with optional `sessionQuery` / `credentials`.
 * @returns `{ ok, date, models, totalTokens, totalCost, balance, authState, currency }`.
 */
async function runUsage(ctx) {
  const win = dayWindow(Date.now())
  const balancePromise = fetchBalance(ctx)
  const platform = await fetchPlatformUsage(ctx, win.startSec, win.nowSec)

  const q = ctx.get('sessionQuery')
  const hasSessions = q !== undefined && q !== null
  let models = platform.auth === 'ok' ? platform.items : []
  if (platform.auth !== 'ok' && hasSessions) {
    try {
      const scan = await scanSessions(q, win)
      models = scan.models
      if (scan.truncated) {
        console.warn('[ui-whale] session scan exceeded ' + SCAN_BUDGET_MS + 'ms; today\'s tokens may be under-reported')
      }
    } catch (err) {
      console.error('[ui-whale] session scan failed:', err)
    }
  }

  let totalTokens = 0
  let totalCost = null
  for (const m of models) {
    totalTokens += m.input + m.output + m.cacheRead + m.cacheWrite
    if (typeof m.cost === 'number') totalCost = (totalCost === null ? 0 : totalCost) + m.cost
  }

  return {
    ok: platform.auth === 'ok' || hasSessions,
    date: win.label,
    models,
    totalTokens,
    totalCost,
    balance: await balancePromise,
    authState: platform.auth,
    currency: platform.currency,
  }
}

/** One aggregated-result cache slot (owned by a service instance). */
function createUsageCache() {
  return { at: 0, label: '', value: null, inflight: null }
}

/**
 * Serve {@link runUsage} through a short TTL cache with single-flight, so a
 * user clicking the whale repeatedly reuses one corpus scan and one pair of
 * platform requests instead of stacking them.
 *
 * The slot is keyed by the UTC+8 date label, so a cached snapshot can never
 * leak past midnight; concurrent callers share the in-flight promise.
 *
 * @param ctx - host context.
 * @param cache - slot from {@link createUsageCache}.
 * @returns the usage snapshot.
 */
function runUsageCached(ctx, cache) {
  const nowMs = Date.now()
  const label = dayLabel(nowMs)
  if (cache.value !== null && cache.label === label && nowMs - cache.at < USAGE_TTL_MS) {
    return Promise.resolve(cache.value)
  }
  if (cache.inflight !== null && cache.inflight.label === label) return cache.inflight.promise
  const promise = runUsage(ctx).then(
    (value) => {
      cache.at = Date.now()
      cache.label = value.date
      cache.value = value
      cache.inflight = null
      return value
    },
    (err) => {
      cache.inflight = null
      throw err
    },
  )
  cache.inflight = { label, promise }
  return promise
}

class WhaleUsageService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'whale')
    this._usageCache = createUsageCache()
    try {
      markRemote(this, 'usage')
    } catch (err) {
      // The registry contribution below is the load-bearing path; a marker
      // mismatch must not take the whole plugin down.
      console.error('[ui-whale] Remote marker registration failed (continuing):', err)
    }
    // Register the invocation through the host tree's typert registry so the
    // gateway (which reads the tree's own protocol copy) can claim and serve
    // `whale/usage` regardless of which package copy libraries resolve.
    ctx.inject(['typert'], (c) => {
      try {
        c.typert.register({
          package: 'ui-whale',
          face: 'host',
          schemas: [],
          model: { services: [], events: [], objects: [] },
          invocations: WHALE_USAGE_INVOCATIONS,
        })
      } catch (err) {
        console.error('[ui-whale] typert.register(ui-whale) failed; whale/usage will be unavailable:', err)
      }
    })
  }

  usage() {
    return runUsageCached(this.ctx, this._usageCache)
  }
}

export {
  name,
  WhaleUsageService,
  WhaleUsageService as default,
  createUsageCache,
  dayLabel,
  dayWindow,
  fetchPlatformUsage,
  runUsage,
  runUsageCached,
}
