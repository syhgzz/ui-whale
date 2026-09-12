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
globalThis.window = { __ModuleLoader__: { load: (definition) => { captured = definition } }, innerWidth: 1200, innerHeight: 800 }

/** Scripted hook state for the next render.
 * Order: sprayId, phase, data, shift, dragPos, pressed, swim, hovering, gripPulse, hidden. */
let stateQueue = []
/** Every setState argument recorded during a render, so handlers are observable. */
let setterLog = []
/** Node handed to the FIRST ref of a render (the whale element), for drag tests. */
let refCount = 0

const ReactShim = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (initial) => [
    stateQueue.length > 0 ? stateQueue.shift() : (typeof initial === 'function' ? initial() : initial),
    (next) => { setterLog.push(typeof next === 'function' ? next(undefined) : next) },
  ],
  useEffect: () => {},
  useRef: (initial) => {
    refCount += 1
    return { current: refCount === 1 && globalThis.__refStub !== undefined ? globalThis.__refStub : initial }
  },
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
  refCount = 0
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

/** Build the hook-state array (order must match the component's useState calls). */
function ST(over = {}) {
  const state = {
    sprayId: 0,
    phase: 'idle',
    data: null,
    shift: 0,
    dragPos: null,
    pressed: false,
    swim: { lane: null, delay: 0, key: 0 },
    hovering: false,
    gripPulse: false,
    hidden: false,
    ...over,
  }
  return [state.sprayId, state.phase, state.data, state.shift, state.dragPos, state.pressed, state.swim, state.hovering, state.gripPulse, state.hidden]
}

test('idle state renders the clickable whale and no bubble', () => {
  const tree = render(ST())
  assert.equal(textOf(tree), '', 'idle shows no text')
  assert.equal(tree.props.className, 'whl-frame')
  const whale = findAll(tree, (node) => node.props.role === 'button')[0]
  assert.ok(whale, 'the whale is exposed as a button')
  assert.equal(whale.props.tabIndex, 0)
  assert.equal(whale.props['aria-label'], '账户余额')
  assert.equal(typeof whale.props.onPointerDown, 'function', 'the whale is draggable')
})

test('loading state announces the balance query', () => {
  const tree = render(ST({ sprayId: 1, phase: 'loading' }))
  const text = textOf(tree)
  assert.match(text, /账户余额/)
  assert.match(text, /正在查询余额/)
  const bubble = byClass(tree, 'whl-bubble')
  assert.equal(bubble.props.role, 'status')
  assert.equal(bubble.props['aria-live'], 'polite')
})

test('ready state shows only the account balance and its availability', () => {
  const text = textOf(render(ST({ sprayId: 1, phase: 'ready', data: BALANCE_VALUE })))
  assert.match(text, /账户余额/)
  assert.match(text, /¥466\.03/, 'the balance amount is rendered in its own currency')
  assert.match(text, /可用/)
  assert.equal(text.includes('tokens'), false, 'no token totals any more')
  assert.equal(text.includes('deepseek'), false, 'no per-model rows any more')
  assert.equal(text.includes('赠送'), false, 'no granted/topped-up breakdown')
})

test('a USD balance uses the dollar symbol', () => {
  const data = { ok: true, balance: { currency: 'USD', total: '12.34', granted: null, toppedUp: null, available: true } }
  assert.match(textOf(render(ST({ sprayId: 1, phase: 'ready', data: data }))), /\$12\.34/)
})

test('an unavailable balance degrades to a friendly line, not a zero', () => {
  const text = textOf(render(ST({ sprayId: 1, phase: 'ready', data: { ok: true, balance: null } })))
  assert.match(text, /余额暂不可用/)
  assert.equal(text.includes('¥0'), false, 'no fabricated zero')
})

test('error state degrades to the same friendly line', () => {
  assert.match(textOf(render(ST({ sprayId: 1, phase: 'error' }))), /余额暂不可用/)
})

test('the bubble is shifted when the whale sits near a viewport edge', () => {
  const bubble = byClass(render(ST({ sprayId: 1, phase: 'ready', data: BALANCE_VALUE, shift: -120 })), 'whl-bubble')
  assert.deepEqual(bubble.props.style, { marginLeft: -120 })
})

test('the bubble offers icon close and hide actions, in that order', () => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  try {
    const tree = render(ST({ sprayId: 1, phase: 'ready', data: BALANCE_VALUE }))
    assert.equal(textOf(tree).includes('隐藏鲸鱼'), false, 'hide is an icon button, not a text button')

    const close = byClass(tree, 'whl-close')
    assert.equal(close.props['aria-label'], '关闭')
    assert.equal(close.props.title, '关闭')
    close.props.onClick()
    assert.deepEqual(setterLog, ['idle'], 'clicking × collapses the bubble')

    setterLog = []
    const hide = byClass(tree, 'whl-hide')
    assert.ok(hide, 'the bubble offers an icon hide button')
    assert.equal(hide.props['aria-label'], '隐藏鲸鱼')
    assert.equal(hide.props.title, '隐藏鲸鱼')
    hide.props.onClick()
    assert.deepEqual(setterLog, ['idle', true], 'clicking hide collapses the bubble and hides the whale')
    assert.equal(store.get('ui-whale:hidden'), '1', 'the hide choice is persisted')

    const buttons = findAll(tree, (node) => node.type === 'button')
    const closeIndex = buttons.findIndex((node) => node.props.className === 'whl-close')
    const hideIndex = buttons.findIndex((node) => node.props.className === 'whl-hide')
    assert.ok(hideIndex >= 0 && hideIndex < closeIndex, 'hide renders before (left of) close')
  } finally {
    delete globalThis.localStorage
  }
})

test('both icon buttons appear in every bubble state', () => {
  for (const phase of ['loading', 'ready', 'error']) {
    const tree = render(ST({ sprayId: 1, phase: phase, data: phase === 'ready' ? BALANCE_VALUE : null }))
    assert.ok(byClass(tree, 'whl-hide'), `hide icon in ${phase}`)
    assert.ok(byClass(tree, 'whl-close'), `close icon in ${phase}`)
  }
})

test('dragging keeps the whale under the pointer, and releasing resumes the swim', () => {
  globalThis.__refStub = { getBoundingClientRect: () => ({ left: 100, top: 200, width: 150, height: 100 }), setPointerCapture: () => {} }
  try {
    const tree = render(ST())
    const whale = findAll(tree, (node) => node.props.role === 'button')[0]

    whale.props.onPointerDown({ pointerId: 7, pointerType: 'mouse', button: 0, clientX: 100, clientY: 200 })
    assert.deepEqual(setterLog, [true], 'pressing flips to the closed hand immediately')

    setterLog = []
    whale.props.onPointerMove({ pointerId: 7, clientX: 103, clientY: 202 })
    assert.deepEqual(setterLog, [], 'a sub-threshold jiggle is not a drag')

    whale.props.onPointerMove({ pointerId: 7, clientX: 160, clientY: 240 })
    assert.deepEqual(setterLog, [{ left: 160, top: 240 }], 'the whale follows the pointer once past the threshold')

    setterLog = []
    whale.props.onPointerUp({ pointerId: 7, clientX: 160, clientY: 240 })
    assert.equal(setterLog[0], false, 'releasing opens the hand again')
    const swim = setterLog[1]
    assert.equal(swim.lane, 240, 'the drop lane is kept')
    const expectedPhase = (160 + 170) / (1200 + 250)
    assert.ok(Math.abs(swim.delay + expectedPhase * 70) < 1e-9, 'the drop phase seeds the swim animation')
    assert.equal(swim.key, 1, 'the swimmer is re-keyed so the new delay restarts the animation')
    assert.equal(setterLog[2], null, 'the drag position is cleared on release')
  } finally {
    delete globalThis.__refStub
  }
})

test('a dragged whale renders inline while dragging and animated after the drop', () => {
  const dragging = byClass(render(ST({ dragPos: { left: 40, top: 60 } })), 'whl-swimmer')
  assert.deepEqual(dragging.props.style, { left: '40px', top: '60px', animation: 'none' })
  assert.ok(dragging.props.className.includes('whl-placed'), 'the bob freezes while dragging')

  const dropped = byClass(render(ST({ swim: { lane: 300, delay: -12.5, key: 2 } })), 'whl-swimmer')
  assert.deepEqual(dropped.props.style, { top: '300px', animationDelay: '-12.5s' }, 'no animation override: the whale keeps swimming')
  assert.equal(dropped.props.className.includes('whl-placed'), false)
  assert.equal(dropped.props.key, 2, 'the key lets React restart the animation with the new delay')
})

test('the resume phase math clamps to the swim path', () => {
  const { resumeSwim, SWIM_PERIOD_S } = bundle.helpers
  const viewport = { width: 1200, height: 800 }
  assert.deepEqual(resumeSwim(-170, 100, viewport), { lane: 100, delay: 0 }, 'the left edge is phase zero')
  const mid = resumeSwim((1200 + 250) / 2 - 170, 50, viewport)
  assert.ok(Math.abs(mid.delay + SWIM_PERIOD_S / 2) < 1e-9, 'the middle of the path is half a period')
  assert.deepEqual(resumeSwim(99999, 50, viewport), { lane: 50, delay: -SWIM_PERIOD_S }, 'past the right edge clamps to a full period')
  assert.deepEqual(resumeSwim(-9999, 50, viewport), { lane: 50, delay: 0 }, 'before the left edge clamps to zero')
  assert.deepEqual(resumeSwim(10, 50, { width: 0 }), { lane: 50, delay: 0 }, 'a degenerate viewport cannot produce NaN')
})

test('the grip pulse honours prefers-reduced-motion', () => {
  const { prefersReducedMotion } = bundle.helpers
  const original = globalThis.window.matchMedia
  try {
    delete globalThis.window.matchMedia
    assert.equal(prefersReducedMotion(), false, 'no matchMedia means motion is allowed')
    globalThis.window.matchMedia = () => ({ matches: true })
    assert.equal(prefersReducedMotion(), true)
    globalThis.window.matchMedia = () => ({ matches: false })
    assert.equal(prefersReducedMotion(), false)
  } finally {
    if (original === undefined) delete globalThis.window.matchMedia
    else globalThis.window.matchMedia = original
  }
})

test('hovering arms the grip hint and leaving clears it', () => {
  const tree = render(ST())
  const whale = findAll(tree, (node) => node.props.role === 'button')[0]
  whale.props.onMouseEnter()
  assert.deepEqual(setterLog, [true], 'entering starts the hover state')
  setterLog = []
  whale.props.onMouseLeave()
  assert.deepEqual(setterLog, [false], 'leaving clears it')
})

test('the bubble no longer renders a resume action', () => {
  const tree = render(ST({ sprayId: 1, phase: 'ready', data: BALANCE_VALUE }))
  assert.equal(textOf(tree).includes('继续游动'), false, 'dragging resumes swimming by itself')
  assert.equal(byClass(tree, 'whl-actions'), undefined, 'no action row at all')
})

test('pressing the whale applies the closed-hand class', () => {
  const tree = render(ST({ pressed: true }))
  const whale = findAll(tree, (node) => node.props.role === 'button')[0]
  assert.ok(whale.props.className.includes('whl-grip'), 'pressed shows the gripping hand')
  const hovering = render(ST({ gripPulse: true }))
  const pulsed = findAll(hovering, (node) => node.props.role === 'button')[0]
  assert.ok(pulsed.props.className.includes('whl-grip'), 'the hover pulse also shows it')
})

test('hidden state renders only the bare whale restore chip', () => {
  const tree = render(ST({ hidden: true }))
  assert.equal(findAll(tree, (node) => node.props.role === 'button').length, 0, 'the whale itself is gone')
  const restore = byClass(tree, 'whl-restore')
  assert.ok(restore, 'a restore chip is offered instead')
  assert.equal(restore.props['aria-label'], '显示鲸鱼')
  const mark = findAll(restore, (node) => node.props.className === 'whl-mark')[0]
  assert.ok(mark, 'the restore affordance is the whale mark itself, not a chrome button')
  assert.equal(mark.type, 'svg')
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
