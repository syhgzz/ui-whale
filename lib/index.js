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

const DEFAULT_PRICE = { in: 0.28, cache: 0.028, out: 0.42 }
const PRICING = {
  'deepseek-chat': DEFAULT_PRICE,
  'deepseek-reasoner': DEFAULT_PRICE,
  'deepseek-v3': DEFAULT_PRICE,
  'deepseek-v3.1': DEFAULT_PRICE,
  'deepseek-v3.2': DEFAULT_PRICE,
}

function priceFor(model) {
  return PRICING[model] || DEFAULT_PRICE
}

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

async function runUsage(ctx) {
  const q = ctx.get('sessionQuery')
  if (!q) return { ok: false }
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayEnd = dayStart + 86400000
  let sessions
  try {
    sessions = await q.listSessions()
  } catch (err) {
    return { ok: false }
  }
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
  const models = Object.keys(acc).map((key) => {
    const b = acc[key]
    const p = priceFor(b.model)
    // Billed input = uncached input + cache writes; cache reads billed at the hit price.
    const cost = (b.cacheRead * p.cache + (b.input + b.cacheWrite) * p.in + b.output * p.out) / 1e6
    return {
      provider: b.provider,
      model: b.model,
      input: b.input,
      output: b.output,
      cacheRead: b.cacheRead,
      cacheWrite: b.cacheWrite,
      calls: b.calls,
      cost,
    }
  }).sort((a, b) => b.cost - a.cost)
  let totalTokens = 0
  let totalCost = 0
  for (const m of models) {
    totalTokens += m.input + m.output + m.cacheRead + m.cacheWrite
    totalCost += m.cost
  }
  return {
    ok: true,
    date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()),
    models,
    totalTokens,
    totalCost,
  }
}

class WhaleUsageService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'whale')
    markRemote(this, 'usage')
  }

  usage() {
    return runUsage(this.ctx)
  }
}

export { name, WhaleUsageService, WhaleUsageService as default, runUsage }
