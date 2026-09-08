/**
 * Host-half tests (`node --test test/`).
 *
 * These run against the real module, stubbing only `globalThis.fetch` and the
 * credential environment, so they exercise the same code path dsh loads.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  name,
  WhaleUsageService,
  createUsageCache,
  dayLabel,
  dayWindow,
  fetchPlatformUsage,
  runUsage,
  runUsageCached,
} from '../lib/index.js'

const NO_CREDENTIALS = { get: () => undefined }

/** Swap `fetch` and selected env vars for the duration of `fn`. */
async function withStubs({ fetch: fetchHandler, env = {} }, fn) {
  const originalFetch = globalThis.fetch
  const originalEnv = new Map()
  for (const [key, value] of Object.entries(env)) {
    originalEnv.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  if (fetchHandler) globalThis.fetch = fetchHandler
  try {
    return await fn()
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

/** Platform handler that answers the amount/cost endpoints by URL. */
function platformFetch(amount, cost, status = 200) {
  return async (url) => {
    const target = String(url)
    if (status !== 200) return { ok: false, status, json: async () => ({}) }
    const body = target.includes('/amount') ? amount : cost
    return { ok: true, status: 200, json: async () => body }
  }
}

const EMPTY_AMOUNT = { data: { biz_data: {} } }
const EMPTY_COST = { data: { biz_data: {} } }

const ONE_MODEL_AMOUNT = {
  data: {
    biz_data: {
      series: [{
        model: 'deepseek-chat',
        buckets: [{ usage: { PROMPT_CACHE_MISS_TOKEN: 10, RESPONSE_TOKEN: 5, PROMPT_CACHE_HIT_TOKEN: 90, REQUEST: 2 } }],
      }],
    },
  },
}

function sessionsStub(counter) {
  const now = Date.now()
  return {
    listSessions: async () => [{ header: { id: 's1' } }],
    readSession: async (id) => {
      counter.reads += 1
      return {
        events: [
          { type: 'request/header', time: now - 1000, data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } } } },
          { type: 'assistant/message', time: now - 500, data: { usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 1000, cacheWriteTokens: 0 } } },
        ],
      }
    },
  }
}

test('exports the whale service', () => {
  assert.equal(name, 'whale')
  assert.equal(typeof WhaleUsageService, 'function')
})

test('dayWindow follows the UTC+8 billing day, including boundaries', () => {
  const justBefore = Date.UTC(2026, 8, 7, 15, 59, 59, 999) // 2026-09-07 23:59:59.999 +08:00
  const midnight = Date.UTC(2026, 8, 7, 16, 0, 0) // 2026-09-08 00:00:00 +08:00
  const yearBoundary = Date.UTC(2025, 11, 31, 16, 0, 0) // 2026-01-01 00:00:00 +08:00

  const before = dayWindow(justBefore)
  assert.equal(before.label, '2026-09-07')
  assert.equal(before.startMs, Date.UTC(2026, 8, 6, 16, 0, 0))
  assert.equal(before.endMs, Date.UTC(2026, 8, 7, 16, 0, 0))
  assert.equal(before.startSec, before.startMs / 1000)

  const at = dayWindow(midnight)
  assert.equal(at.label, '2026-09-08')
  assert.equal(at.startMs, midnight)
  assert.equal(at.nowSec, midnight / 1000)

  assert.equal(dayLabel(yearBoundary), '2026-01-01')
  assert.equal(dayWindow(yearBoundary).startMs, yearBoundary)
})

test('fetchPlatformUsage: an empty day is ok, not a failure', async () => {
  await withStubs(
    { fetch: platformFetch(EMPTY_AMOUNT, EMPTY_COST), env: { DEEPSEEK_PLATFORM_TOKEN: 'token' } },
    async () => {
      const result = await fetchPlatformUsage(NO_CREDENTIALS, 0, 1)
      assert.equal(result.auth, 'ok')
      assert.deepEqual(result.items, [])
      assert.equal(result.currency, 'CNY')
    },
  )
})

test('fetchPlatformUsage: merges amount and cost, tags the provider, keeps unknown cost null', async () => {
  const cost = {
    data: {
      biz_data: {
        data: [{
          currency: 'USD',
          series: [
            { model: 'deepseek-chat', buckets: [{ cost: 0.25 }] },
            { model: 'deepseek-reasoner', buckets: [] },
          ],
        }],
      },
    },
  }
  const amount = {
    data: {
      biz_data: {
        series: [
          {
            model: 'deepseek-chat',
            buckets: [{ usage: { PROMPT_CACHE_MISS_TOKEN: 10, RESPONSE_TOKEN: 5, PROMPT_CACHE_HIT_TOKEN: 90, REQUEST: 2 } }],
          },
          { model: 'deepseek-reasoner', buckets: [{ usage: { PROMPT_CACHE_MISS_TOKEN: 7, RESPONSE_TOKEN: 3, REQUEST: 1 } }] },
        ],
      },
    },
  }
  await withStubs(
    { fetch: platformFetch(amount, cost), env: { DEEPSEEK_PLATFORM_TOKEN: 'token' } },
    async () => {
      const result = await fetchPlatformUsage(NO_CREDENTIALS, 0, 1)
      assert.equal(result.auth, 'ok')
      assert.equal(result.currency, 'USD')
      assert.equal(result.items.length, 2)

      const chat = result.items.find((m) => m.model === 'deepseek-chat')
      assert.equal(chat.provider, 'deepseek-platform')
      assert.equal(chat.input, 10)
      assert.equal(chat.output, 5)
      assert.equal(chat.cacheRead, 90)
      assert.equal(chat.calls, 2)
      assert.equal(chat.cost, 0.25)

      const reasoner = result.items.find((m) => m.model === 'deepseek-reasoner')
      assert.equal(reasoner.cost, null, 'a model the cost endpoint omits stays unknown')
      assert.equal(reasoner.input, 7)
      assert.equal(result.items[0].model, 'deepseek-chat', 'known cost sorts before unknown')
    },
  )
})

test('fetchPlatformUsage: 401 and missing token are distinct states', async () => {
  await withStubs(
    { fetch: platformFetch(null, null, 401), env: { DEEPSEEK_PLATFORM_TOKEN: 'token' } },
    async () => {
      assert.equal((await fetchPlatformUsage(NO_CREDENTIALS, 0, 1)).auth, 'invalid')
    },
  )
  await withStubs({ env: { DEEPSEEK_PLATFORM_TOKEN: undefined } }, async () => {
    assert.equal((await fetchPlatformUsage(NO_CREDENTIALS, 0, 1)).auth, 'missing')
  })
})

test('runUsage: platform data wins and the session corpus is not read', async () => {
  const counter = { reads: 0 }
  const ctx = { get: (key) => (key === 'sessionQuery' ? sessionsStub(counter) : undefined) }
  await withStubs(
    {
      fetch: platformFetch(ONE_MODEL_AMOUNT, { data: { biz_data: { data: [{ currency: 'CNY', series: [{ model: 'deepseek-chat', buckets: [{ cost: 1.25 }] }] }] } } }),
      env: { DEEPSEEK_PLATFORM_TOKEN: 'token', DEEPSEEK_API_KEY: undefined },
    },
    async () => {
      const result = await runUsage(ctx)
      assert.equal(result.ok, true)
      assert.equal(result.authState, 'ok')
      assert.equal(result.models.length, 1)
      assert.equal(result.models[0].provider, 'deepseek-platform')
      assert.equal(result.totalTokens, 105)
      assert.equal(result.totalCost, 1.25)
      assert.equal(result.balance, null)
      assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/)
      assert.equal(counter.reads, 0, 'the platform console is authoritative')
    },
  )
})

test('runUsage: without a platform token it falls back to session rows with unknown cost', async () => {
  const counter = { reads: 0 }
  const ctx = { get: (key) => (key === 'sessionQuery' ? sessionsStub(counter) : undefined) }
  await withStubs({ env: { DEEPSEEK_PLATFORM_TOKEN: undefined, DEEPSEEK_API_KEY: undefined } }, async () => {
    const result = await runUsage(ctx)
    assert.equal(result.ok, true)
    assert.equal(result.authState, 'missing')
    assert.equal(result.models.length, 1)
    assert.equal(result.models[0].provider, 'deepseek-official')
    assert.equal(result.models[0].model, 'deepseek-v4-pro')
    assert.equal(result.totalTokens, 1120)
    assert.equal(result.totalCost, null)
    assert.equal(counter.reads, 1)
  })
})

test('runUsage: a failed platform fetch without sessionQuery still returns the full shape', async () => {
  const ctx = { get: () => undefined }
  await withStubs(
    { fetch: platformFetch(null, null, 500), env: { DEEPSEEK_PLATFORM_TOKEN: 'token', DEEPSEEK_API_KEY: undefined } },
    async () => {
      const result = await runUsage(ctx)
      assert.equal(result.ok, false)
      assert.equal(result.authState, 'failed')
      assert.deepEqual(result.models, [])
      assert.equal(result.totalTokens, 0)
      assert.equal(result.totalCost, null)
      assert.equal(result.currency, 'CNY')
      assert.equal(result.balance, null)
      assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/)
    },
  )
})

test('runUsage: platform data is still served when sessionQuery is absent', async () => {
  const ctx = { get: () => undefined }
  await withStubs(
    { fetch: platformFetch(ONE_MODEL_AMOUNT, EMPTY_COST), env: { DEEPSEEK_PLATFORM_TOKEN: 'token', DEEPSEEK_API_KEY: undefined } },
    async () => {
      const result = await runUsage(ctx)
      assert.equal(result.ok, true)
      assert.equal(result.models.length, 1)
      assert.equal(result.models[0].cost, null)
      assert.equal(result.totalCost, null)
    },
  )
})

test('runUsageCached: repeats reuse one scan, concurrent callers share one flight', async () => {
  const counter = { reads: 0 }
  const ctx = { get: (key) => (key === 'sessionQuery' ? sessionsStub(counter) : undefined) }
  await withStubs({ env: { DEEPSEEK_PLATFORM_TOKEN: undefined, DEEPSEEK_API_KEY: undefined } }, async () => {
    const cache = createUsageCache()
    const [first, second] = await Promise.all([runUsageCached(ctx, cache), runUsageCached(ctx, cache)])
    assert.equal(counter.reads, 1, 'concurrent clicks share one in-flight scan')
    assert.equal(first.date, second.date)

    await runUsageCached(ctx, cache)
    assert.equal(counter.reads, 1, 'a warm cache serves without rescanning')

    await runUsageCached(ctx, createUsageCache())
    assert.equal(counter.reads, 2, 'a cold cache rescans')
  })
})

test('runUsageCached: a stale entry past the TTL rescans', async () => {
  const counter = { reads: 0 }
  const ctx = { get: (key) => (key === 'sessionQuery' ? sessionsStub(counter) : undefined) }
  await withStubs({ env: { DEEPSEEK_PLATFORM_TOKEN: undefined, DEEPSEEK_API_KEY: undefined } }, async () => {
    const cache = createUsageCache()
    await runUsageCached(ctx, cache)
    cache.at = Date.now() - 60000
    await runUsageCached(ctx, cache)
    assert.equal(counter.reads, 2)
  })
})

test('the service registers a complete typert contribution and serves usage through its cache', async () => {
  const counter = { reads: 0 }
  const registrations = []
  const ctx = {
    // Minimal cordis seam: Service's constructor calls ctx.reflect.provide().
    reflect: { provide: () => {} },
    get: (key) => (key === 'sessionQuery' ? sessionsStub(counter) : undefined),
    inject: (_deps, callback) => {
      callback({ typert: { register: (contribution) => { registrations.push(contribution); return () => {} } } })
    },
  }
  const service = new WhaleUsageService(ctx)
  assert.equal(service.name, 'whale')
  assert.equal(registrations.length, 1, 'the host registry is the load-bearing registration')

  const contribution = registrations[0]
  assert.equal(contribution.package, 'ui-whale')
  assert.equal(contribution.face, 'host')
  assert.deepEqual(contribution.schemas, [])
  assert.deepEqual(contribution.model, { services: [], events: [], objects: [] }, 'TypertContribution requires a model')
  assert.equal(contribution.invocations.length, 1)
  assert.equal(contribution.invocations[0].id, 'ui-whale#whale/usage')
  assert.equal(contribution.invocations[0].result.mode, 'src-json')

  await withStubs({ env: { DEEPSEEK_PLATFORM_TOKEN: undefined, DEEPSEEK_API_KEY: undefined } }, async () => {
    const first = await service.usage()
    const second = await service.usage()
    assert.equal(first.ok, true)
    assert.equal(first.models[0].model, 'deepseek-v4-pro')
    assert.equal(counter.reads, 1, 'the service instance owns a reusable cache slot')
    assert.equal(second.totalTokens, first.totalTokens)
  })
})
