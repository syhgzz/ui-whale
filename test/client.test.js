/**
 * Client-half render tests.
 *
 * The browser bundle only needs `react` and the module-loader seam, so a tiny
 * React shim renders the registered component into a plain element tree and
 * lets us assert what the balance bubble would actually show — no DOM required.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

let captured = null
globalThis.window = { __ModuleLoader__: { load: (definition) => { captured = definition } } }

/** Scripted hook state for the next render.
 * Order: sprayId, phase, data, shift, placed, dragging, hidden. */
let stateQueue = []
/** Every setState argument recorded during a render, so handlers are observable. */
let setterLog = []

const ReactShim = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (initial) => [
    stateQueue.length > 0 ? stateQueue.shift() : (typeof initial === 'function' ? initial() : initial),
    (next) => { setterLog.push(typeof next === 'function' ? next(undefined) : next) },
  ],
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
    if (key === 'remote.whale') return { balance: async () => ({ ok: true, value: BALANCE_VALUE }) }
    return undefined
  },
}

assert.ok(captured, 'client bundle registered itself with the module loader')
const bundle = captured.factory((specifier) => {
  if (specifier === 'react') return ReactShim
  throw new Error('unexpected require: ' + specifier)
})
await bundle.apply(ctx)
assert.equal(typeof WhaleApp, 'function', 'the whale component is registered into shell.overlay')

const BALANCE_VALUE = {
  ok: true,
  balance: { currency: 'CNY', total: '466.03', granted: '0.00', toppedUp: '466.03', available: true },
}

function render(state, props) {
  stateQueue = state
  setterLog = []
  try {
    // `expand` invokes the component, which consumes the scripted hook state.
    return expand(WhaleApp(props || { callBalance: async () => ({ ok: true, value: BALANCE_VALUE }) }))
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

const byClass = (tree, name) => findAll(tree, (node) => typeof node.props.className === 'string' && node.props.className.split(' ').includes(name))[0]

test('idle state renders the clickable whale and no bubble', () => {
  const tree = render([0, 'idle', null, 0, null, false, false])
  assert.equal(textOf(tree), '', 'idle shows no text')
  assert.equal(tree.props.className, 'whl-frame')
  const whale = findAll(tree, (node) => node.props.role === 'button')[0]
  assert.ok(whale, 'the whale is exposed as a button')
  assert.equal(whale.props.tabIndex, 0)
  assert.equal(whale.props['aria-label'], '账户余额')
  assert.equal(typeof whale.props.onPointerDown, 'function', 'the whale is draggable')
})

test('loading state announces the balance query', () => {
  const tree = render([1, 'loading', null, 0, null, false, false])
  const text = textOf(tree)
  assert.match(text, /账户余额/)
  assert.match(text, /正在查询余额/)
  const bubble = byClass(tree, 'whl-bubble')
  assert.equal(bubble.props.role, 'status')
  assert.equal(bubble.props['aria-live'], 'polite')
})

test('ready state shows only the account balance and its availability', () => {
  const text = textOf(render([1, 'ready', BALANCE_VALUE, 0, null, false, false]))
  assert.match(text, /账户余额/)
  assert.match(text, /¥466\.03/, 'the balance amount is rendered in its own currency')
  assert.match(text, /可用/)
  assert.equal(text.includes('tokens'), false, 'no token totals any more')
  assert.equal(text.includes('deepseek'), false, 'no per-model rows any more')
  assert.equal(text.includes('赠送'), false, 'no granted/topped-up breakdown')
})

test('a USD balance uses the dollar symbol', () => {
  const data = { ok: true, balance: { currency: 'USD', total: '12.34', granted: null, toppedUp: null, available: true } }
  assert.match(textOf(render([1, 'ready', data, 0, null, false, false])), /\$12\.34/)
})

test('an unavailable balance degrades to a friendly line, not a zero', () => {
  const text = textOf(render([1, 'ready', { ok: true, balance: null }, 0, null, false, false]))
  assert.match(text, /余额暂不可用/)
  assert.equal(text.includes('¥0'), false, 'no fabricated zero')
})

test('error state degrades to the same friendly line', () => {
  assert.match(textOf(render([1, 'error', null, 0, null, false, false])), /余额暂不可用/)
})

test('the bubble is shifted when the whale sits near a viewport edge', () => {
  const bubble = byClass(render([1, 'ready', BALANCE_VALUE, -120, null, false, false]), 'whl-bubble')
  assert.deepEqual(bubble.props.style, { marginLeft: -120 })
})

test('the bubble offers close and hide actions', () => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  try {
    const tree = render([1, 'ready', BALANCE_VALUE, 0, null, false, false])
    const close = byClass(tree, 'whl-close')
    assert.equal(close.props['aria-label'], '关闭')
    close.props.onClick()
    assert.deepEqual(setterLog, ['idle'], 'clicking × collapses the bubble')

    setterLog = []
    const hide = findAll(tree, (node) => node.props.className === 'whl-action' && node.children.includes('隐藏鲸鱼'))[0]
    assert.ok(hide, 'the bubble offers 隐藏鲸鱼')
    hide.props.onClick()
    assert.deepEqual(setterLog, ['idle', true], 'clicking 隐藏鲸鱼 collapses the bubble and hides the whale')
    assert.equal(store.get('ui-whale:hidden'), '1', 'the hide choice is persisted')
  } finally {
    delete globalThis.localStorage
  }
})

test('a placed whale offers 继续游动, and no other state does', () => {
  const placedTree = render([1, 'ready', BALANCE_VALUE, 0, { left: 40, top: 60 }, false, false])
  const resume = findAll(placedTree, (node) => node.props.className === 'whl-action' && node.children.includes('继续游动'))[0]
  assert.ok(resume, 'a dropped whale can resume swimming')
  resume.props.onClick()
  assert.deepEqual(setterLog, [null], 'resuming clears the dropped position')
  const swimmer = byClass(placedTree, 'whl-swimmer')
  assert.deepEqual(swimmer.props.style, { left: '40px', top: '60px', animation: 'none' })
  const idleTree = render([1, 'ready', BALANCE_VALUE, 0, null, false, false])
  assert.equal(textOf(idleTree).includes('继续游动'), false, 'a swimming whale has no resume action')
})

test('hidden state renders only the restore chip', () => {
  const tree = render([0, 'idle', null, 0, null, false, true])
  assert.equal(findAll(tree, (node) => node.props.role === 'button').length, 0, 'the whale itself is gone')
  const restore = byClass(tree, 'whl-restore')
  assert.ok(restore, 'a restore chip is offered instead')
  assert.equal(restore.props['aria-label'], '显示鲸鱼')
})

test('clampWhalePosition keeps the whole whale on screen', () => {
  const { clampWhalePosition } = bundle.helpers
  const viewport = { width: 1000, height: 800 }
  assert.deepEqual(clampWhalePosition(100, 200, viewport), { left: 100, top: 200 }, 'inside positions pass through')
  assert.deepEqual(clampWhalePosition(-50, -50, viewport), { left: 8, top: 8 }, 'top-left clamps to the margin')
  assert.deepEqual(clampWhalePosition(9999, 9999, viewport), { left: 842, top: 692 }, 'bottom-right clamps to width/height minus the whale')
  assert.deepEqual(clampWhalePosition(0, 0, { width: 100, height: 80 }), { left: 8, top: 8 }, 'tiny viewports never invert the range')
})

test('the hide flag round-trips through localStorage', () => {
  const helpers = bundle.helpers
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  try {
    assert.equal(helpers.readHidden(), false, 'nothing stored reads as visible')
    helpers.writeHidden(true)
    assert.equal(helpers.readHidden(), true)
    helpers.writeHidden(false)
    assert.equal(helpers.readHidden(), false)
  } finally {
    delete globalThis.localStorage
  }
})
