/**
 * Client-half render tests.
 *
 * The browser bundle only needs `react` and the module-loader seam, so a tiny
 * React shim renders the registered component into a plain element tree and
 * lets us assert what the billboard would actually show — no DOM required.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

let captured = null
globalThis.window = { __ModuleLoader__: { load: (definition) => { captured = definition } } }

/** Scripted hook state for the next render (order: sprayId, phase, data, shift). */
let stateQueue = []

const ReactShim = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (initial) => [stateQueue.length > 0 ? stateQueue.shift() : initial, () => {}],
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
}

await import('../lib/client.js')

let WhaleApp = null
const slots = {
  inject: (_key, callback) => callback(),
  register: (_spec, component) => { WhaleApp = component },
}
const remote = { $mount: async () => () => {} }
const ctx = {
  get: (key) => {
    if (key === 'slots') return slots
    if (key === 'remote') return remote
    if (key === 'remote.whale') return { usage: async () => ({ ok: true, value: null }) }
    return undefined
  },
}

assert.ok(captured, 'client bundle registered itself with the module loader')
await captured.factory((specifier) => {
  if (specifier === 'react') return ReactShim
  throw new Error('unexpected require: ' + specifier)
}).apply(ctx)
assert.equal(typeof WhaleApp, 'function', 'the whale component is registered into shell.overlay')

function render(state, props) {
  stateQueue = state
  try {
    // `expand` invokes the component, which consumes the scripted hook state.
    return expand(WhaleApp(props || { callUsage: async () => ({ ok: true }) }))
  } finally {
    stateQueue = []
  }
}

/** Recursively invoke function components so the tree is plain host elements. */
function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(expand)
  if (typeof node.type === 'function') return expand(node.type(node.props))
  return { type: node.type, props: node.props, children: node.children.map(expand) }
}

/** Flatten every string in the element tree. */
function textOf(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.children)
}

/** Depth-first collect elements matching a predicate. */
function findAll(node, predicate, out = []) {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out)
    return out
  }
  if (node === null || typeof node !== 'object') return out
  if (predicate(node)) out.push(node)
  for (const child of node.children) findAll(child, predicate, out)
  return out
}

const PLATFORM_DATA = {
  ok: true,
  date: '2026-09-08',
  models: [{ provider: 'deepseek-platform', model: 'deepseek-chat', input: 10, output: 5, cacheRead: 90, cacheWrite: 0, calls: 2, cost: 1.25 }],
  totalTokens: 105,
  totalCost: 1.25,
  balance: { currency: 'USD', total: '12.34', granted: null, toppedUp: '12.34', available: true },
  authState: 'ok',
  currency: 'USD',
}

test('idle state renders the clickable whale and no billboard', () => {
  const tree = render([0, 'idle', null, 0])
  assert.equal(textOf(tree), '', 'idle shows no text')
  assert.equal(tree.props.className, 'whl-frame')
  const whale = findAll(tree, (node) => node.props.role === 'button')[0]
  assert.ok(whale, 'the whale is exposed as a button')
  assert.equal(whale.props.tabIndex, 0)
  assert.equal(whale.props['aria-label'], '今日小账单')
})

test('ready state renders platform rows with provider-aware tooltips and USD amounts', () => {
  const tree = render([1, 'ready', PLATFORM_DATA, 0])
  const text = textOf(tree)
  assert.match(text, /今日小账单/)
  assert.match(text, /deepseek-chat/)
  assert.match(text, /今日总消耗 105 tokens/)
  assert.match(text, /\$1\.25/, 'cost uses the platform currency')
  assert.match(text, /\$12\.34/, 'balance uses its own currency')
  assert.equal(text.includes('undefined'), false, 'no provider renders as "undefined"')

  const name = findAll(tree, (node) => node.props.className === 'whl-row-name')[0]
  assert.equal(name.props.title, 'deepseek-platform / deepseek-chat')
  const bubble = findAll(tree, (node) => node.props.className === 'whl-bubble')[0]
  assert.equal(bubble.props.role, 'status')
  assert.equal(bubble.props['aria-live'], 'polite')
})

test('logged-out state asks for the platform token instead of inventing a cost', () => {
  const data = {
    ok: true,
    date: '2026-09-08',
    models: [{ provider: 'deepseek-official', model: 'deepseek-v4-pro', input: 100, output: 20, cacheRead: 1000, cacheWrite: 0, calls: 1, cost: null }],
    totalTokens: 1120,
    totalCost: null,
    balance: null,
    authState: 'missing',
    currency: 'CNY',
  }
  const text = textOf(render([1, 'ready', data, 0]))
  assert.match(text, /今日总消耗 1\.1k tokens/)
  assert.match(text, /费用需登录查看/)
  assert.match(text, /需要登录 DeepSeek 平台查看精确消费/)
  assert.equal(text.includes('¥0'), false, 'no fabricated zero balance')
})

test('logged-in state shows an unknown cost as a dash, not a zero', () => {
  const data = { ...PLATFORM_DATA, models: [{ ...PLATFORM_DATA.models[0], cost: null }], totalCost: null }
  const text = textOf(render([1, 'ready', data, 0]))
  assert.match(text, /今日总消耗 105 tokens—/)
})

test('an authenticated empty day reads as empty, not as an error', () => {
  const data = { ok: true, date: '2026-09-08', models: [], totalTokens: 0, totalCost: null, balance: null, authState: 'ok', currency: 'CNY' }
  const text = textOf(render([1, 'ready', data, 0]))
  assert.match(text, /今天还没有吐过泡泡呢/)
  assert.equal(text.includes('获取失败'), false)
})

test('error state degrades to a friendly message', () => {
  const text = textOf(render([1, 'error', null, 0]))
  assert.match(text, /账单掉进海里了/)
})

test('the bubble is shifted when the whale sits near a viewport edge', () => {
  const tree = render([1, 'ready', PLATFORM_DATA, -120])
  const bubble = findAll(tree, (node) => node.props.className === 'whl-bubble')[0]
  assert.deepEqual(bubble.props.style, { marginLeft: -120 })
})
