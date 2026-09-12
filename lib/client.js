/**
 * ui-whale client bundle (browser half).
 *
 * Served by the dsh client module system as the `dsh.client` package
 * `ui-whale`; the composition row in the profile's cordis.patch.yml mounts it.
 *
 * Renders a deep-sea whale swimming across the frame-wide overlay. Clicking
 * it sprays a water jet and pops the account-balance bubble, fetched through
 * `ctx.remote.whale.balance()` (the host service registered in lib/index.js).
 * Clicking the whale again (or the × button, or 30s of silence) collapses it.
 */
window.__ModuleLoader__.load({
  id: 'ui-whale',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    // ---- package-owned stylesheet (injected once per page) ----
    const CSS = [
      '.whl-frame { position: fixed; inset: 0; pointer-events: none; overflow: hidden; user-select: none; }',
      '.whl-swimmer { position: absolute; left: 0; top: 54vh; width: 150px; height: 100px; animation: whl-swim 70s linear infinite; }',
      '@keyframes whl-swim { from { transform: translateX(-170px); } to { transform: translateX(calc(100vw + 80px)); } }',
      '.whl-bob { position: absolute; inset: 0; animation: whl-bob 3.6s ease-in-out infinite; }',
      '@keyframes whl-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }',
      '.whl-whale { position: relative; width: 150px; height: 100px; pointer-events: auto; cursor: grab; touch-action: none; transition: transform 0.25s ease; }',
      '.whl-whale.whl-dragging { cursor: grabbing; }',
      '.whl-whale:hover { transform: scale(1.07) rotate(-2deg); }',
      '@keyframes whl-hop { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-12px); } 50% { transform: translateY(0); } 75% { transform: translateY(-6px); } }',
      '.whl-hop { animation: whl-hop 0.9s cubic-bezier(0.4, 0, 0.6, 1) both; }',
      '.whl-whale-svg { display: block; filter: drop-shadow(0 7px 12px rgba(3, 16, 32, 0.55)); }',
      '.whl-tail { transform-box: fill-box; transform-origin: 95% 50%; animation: whl-tail 1.7s ease-in-out infinite; }',
      '@keyframes whl-tail { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-6deg); } }',
      '.whl-spray { position: absolute; left: 92px; top: 16px; width: 0; height: 0; }',
      '.whl-jet { position: absolute; left: -4px; top: -57px; width: 8px; height: 56px; border-radius: 50% 50% 40% 40%; background: linear-gradient(180deg, rgba(226,247,255,0.95), rgba(150,210,248,0.92) 45%, rgba(74,160,224,0.8)); filter: drop-shadow(0 2px 6px rgba(50,130,215,0.5)); transform-origin: 50% 100%; animation: whl-jet 1.5s ease both; }',
      '@keyframes whl-jet { 0% { transform: rotate(7deg) scaleY(0.05); opacity: 0; } 8% { opacity: 1; } 30% { transform: rotate(7deg) scaleY(1); } 65% { transform: rotate(6deg) scaleY(0.94); opacity: 0.85; } 100% { transform: rotate(6deg) scaleY(0.45); opacity: 0; } }',
      '.whl-puff { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #dbf3ff, #3f9de0); animation: whl-puff 0.75s ease-out both; }',
      '@keyframes whl-puff { 0% { transform: scale(0.4); opacity: 0.95; } 100% { transform: scale(1.9); opacity: 0; } }',
      '.whl-ring { position: absolute; left: -8px; top: -8px; width: 16px; height: 16px; border: 2.5px solid rgba(230,248,255,0.9); border-radius: 50%; animation: whl-ring 0.95s ease-out both; }',
      '@keyframes whl-ring { 0% { transform: scale(0.35); opacity: 0.95; } 100% { transform: scale(2.4); opacity: 0; } }',
      '.whl-drop { position: absolute; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #eaf8ff, #5cb8f0); box-shadow: 0 1px 3px rgba(16, 62, 110, 0.55); animation: whl-arc 1.6s cubic-bezier(0.3, 0.6, 0.35, 1) both; }',
      '@keyframes whl-arc { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 10% { opacity: 1; } 42% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 1; } 100% { transform: translate(calc(var(--dx) * 1.12), calc(var(--dy) + 54px)) scale(0.62); opacity: 0; } }',
      '.whl-bubble { position: absolute; left: 50%; bottom: calc(100% + 16px); transform: translateX(-50%); width: min(300px, 62vw); background: linear-gradient(180deg, #143354, #0c2440); border: 2px solid #2c6da5; border-radius: 16px; padding: 10px 12px; color: #d9e9f8; font: 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; box-shadow: 0 12px 28px rgba(8, 30, 60, 0.38); pointer-events: none; animation: whl-pop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both; }',
      '@keyframes whl-pop { from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.6); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }',
      '.whl-close, .whl-hide { position: absolute; top: 6px; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; background: rgba(127, 216, 255, 0.16); color: #9fd0f2; font: 12px/1 sans-serif; cursor: pointer; pointer-events: auto; }',
      '.whl-close { right: 8px; }',
      '.whl-hide { right: 30px; }',
      '.whl-close:hover, .whl-hide:hover { background: rgba(127, 216, 255, 0.32); color: #d9efff; }',
      '.whl-icon { display: block; width: 12px; height: 12px; }',
      '.whl-bubble::after { content: ""; position: absolute; left: 50%; bottom: -8px; width: 12px; height: 12px; background: #0c2440; border-right: 2px solid #2c6da5; border-bottom: 2px solid #2c6da5; transform: translateX(-50%) rotate(45deg); }',
      '.whl-bubble-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; }',
      '.whl-mark { display: inline-block; width: 18px; height: 14px; flex: none; }',
      '.whl-bubble-sub { color: #8fb6d6; font-size: 11px; margin-top: 2px; }',
      '.whl-placed .whl-bob { animation: none; }',
      '.whl-actions { margin-top: 7px; display: flex; justify-content: flex-end; gap: 8px; }',
      '.whl-action { border: 1px solid #2c6da5; background: rgba(127, 216, 255, 0.1); color: #9fd0f2; border-radius: 8px; padding: 2px 8px; font-size: 11px; cursor: pointer; pointer-events: auto; }',
      '.whl-action:hover { background: rgba(127, 216, 255, 0.22); color: #d9efff; }',
      '.whl-restore { position: fixed; right: 14px; bottom: 14px; display: block; padding: 0; border: 0; background: none; opacity: 0.5; cursor: pointer; pointer-events: auto; line-height: 0; filter: drop-shadow(0 2px 6px rgba(3, 16, 32, 0.5)); }',
      '.whl-restore:hover { opacity: 1; }',
      '.whl-restore .whl-mark { width: 44px; height: 34px; }',
      '.whl-balance { margin-top: 6px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }',
      '.whl-balance-amount { font-size: 22px; font-weight: 700; color: #7fd8ff; letter-spacing: 0.5px; }',
      '.whl-balance-state { color: #8fb6d6; font-size: 11px; }',
      '.whl-hold .whl-swimmer, .whl-hold .whl-bob { animation-play-state: paused; }',
      '@media (prefers-reduced-motion: reduce) { .whl-swimmer { animation: none; transform: translateX(12vw); } .whl-bob, .whl-tail, .whl-hop { animation: none; } .whl-spray { display: none; } .whl-bubble { animation: none; } }',
    ].join('\n')

    const STYLE_ID = 'ui-whale-css'
    function injectStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById(STYLE_ID)) return
      const tag = document.createElement('style')
      tag.id = STYLE_ID
      // Claim the tag for HMR bookkeeping: an unowned <style> is claimed by
      // whichever package materializes next, so a reload would neither remove
      // nor refresh it (stylesheet edits would need a full page reload).
      tag.setAttribute('data-plugin', 'ui-whale')
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    const el = React.createElement

    const WHALE_W = 150
    const WHALE_H = 100
    const EDGE_MARGIN = 8
    const HIDDEN_KEY = 'ui-whale:hidden'

    /** Keep the whole whale inside the viewport with a small breathing margin. */
    function clampWhalePosition(left, top, viewport) {
      const maxLeft = Math.max(EDGE_MARGIN, viewport.width - WHALE_W - EDGE_MARGIN)
      const maxTop = Math.max(EDGE_MARGIN, viewport.height - WHALE_H - EDGE_MARGIN)
      return {
        left: Math.min(Math.max(left, EDGE_MARGIN), maxLeft),
        top: Math.min(Math.max(top, EDGE_MARGIN), maxTop),
      }
    }

    /** Read the persisted hide flag; storage may be unavailable, hence the guard. */
    function readHidden() {
      try { return localStorage.getItem(HIDDEN_KEY) === '1' } catch (err) { return false }
    }

    function writeHidden(hidden) {
      try {
        if (hidden) localStorage.setItem(HIDDEN_KEY, '1')
        else localStorage.removeItem(HIDDEN_KEY)
      } catch (err) { /* private mode / blocked storage: keep the in-memory state */ }
    }

    const CURRENCY_SYMBOLS = { CNY: '¥', USD: '$' }

    function currencySymbol(currency) {
      if (CURRENCY_SYMBOLS[currency]) return CURRENCY_SYMBOLS[currency]
      return typeof currency === 'string' && currency !== '' ? currency + ' ' : '¥'
    }

    function fmtBalance(value, currency) {
      return typeof value === 'string' && value !== '' ? currencySymbol(currency) + value : '—'
    }

    // Tiny chubby whale mark for the bubble title.
    function WhaleMark() {
      return el('svg', { viewBox: '0 0 36 28', className: 'whl-mark', 'aria-hidden': true },
        el('path', { d: 'M 33 13 C 33 6 26 2 17 2 C 8 2 3 6 3 13 C 3 20 9 25 17 25 C 26 25 33 20 33 13 Z', fill: '#3f83b8' }),
        el('path', { d: 'M 7 12 C 4 8 1 6 0 6 C 1 10 2 14 4 16 C 2 18 1 22 0 25 C 4 24 7 19 7 13 Z', fill: '#2c6392' }),
        el('circle', { cx: 25, cy: 11, r: 2.6, fill: '#0e2f4d' }),
        el('circle', { cx: 26.8, cy: 10.2, r: 0.9, fill: '#ffffff' }),
        el('path', { d: 'M 20 16 Q 24 19.5 28 16', stroke: '#0e2f4d', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' }),
      )
    }

    // Chubby cartoon whale: round head on the right, fat belly, short rounded
    // flukes on the left. Deep-blue palette (no light blues).
    const BODY = 'M 136 52 C 136 26 117 10 93 10 C 63 10 36 27 29 48 C 24 59 25 73 34 81 C 50 93 82 95 106 86 C 127 78 136 66 136 52 Z'
    const FLUKES = 'M 38 58 C 34 50 28 46 19 45 C 22 51 23 56 25 60 C 23 64 22 69 19 74 C 28 73 34 67 38 58 Z'

    function WhaleSvg() {
      return el('svg', { viewBox: '0 0 150 100', width: 150, height: 100, className: 'whl-whale-svg', 'aria-hidden': true },
        el('defs', null,
          el('linearGradient', { id: 'whlBodyGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
            el('stop', { offset: '0%', stopColor: '#3f83b8' }),
            el('stop', { offset: '55%', stopColor: '#2f6c9e' }),
            el('stop', { offset: '100%', stopColor: '#235a86' }),
          ),
          el('clipPath', { id: 'whlBodyClip' },
            el('path', { d: BODY }),
          ),
        ),
        el('g', { className: 'whl-tail' },
          el('path', { d: FLUKES, fill: '#2c6392' }),
        ),
        el('g', null,
          el('path', { d: BODY, fill: 'url(#whlBodyGrad)' }),
          el('g', { clipPath: 'url(#whlBodyClip)' },
            el('ellipse', { cx: 78, cy: 82, rx: 56, ry: 16, fill: '#ffffff' }),
            el('path', { d: 'M 100 80 Q 95 86 88 86.5', stroke: '#bcd9ee', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }),
            el('path', { d: 'M 86 82 Q 81 87 74 87.5', stroke: '#bcd9ee', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }),
            el('path', { d: 'M 72 83 Q 67 87 61 87', stroke: '#bcd9ee', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }),
          ),
          el('path', { d: 'M 88 74 C 84 82 74 88 64 87 C 67 80 70 75 73 71 C 77 69 83 71 88 74 Z', fill: '#2c6392' }),
          el('path', { d: 'M 122 26 Q 130 32 132 42', stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 3.4, fill: 'none', strokeLinecap: 'round' }),
          el('path', { d: 'M 90 17 Q 94 13.5 98 16.5', stroke: '#0e2f4d', strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' }),
          el('ellipse', { cx: 94, cy: 19.5, rx: 3.2, ry: 1.6, fill: '#061c33' }),
          el('circle', { cx: 110, cy: 44, r: 9, fill: '#0e2f4d' }),
          el('circle', { cx: 115, cy: 38.5, r: 3, fill: '#ffffff' }),
          el('circle', { cx: 107.5, cy: 47.5, r: 1.8, fill: '#ffffff', opacity: 0.85 }),
          el('path', { d: 'M 104 31 Q 111 27 118 30', stroke: '#0e2f4d', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' }),
          el('path', { d: 'M 114 53 Q 119 59 126 55', stroke: '#0e2f4d', strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' }),
          el('ellipse', { cx: 102, cy: 52, rx: 5, ry: 3, fill: '#e2708c', opacity: 0.5 }),
        ),
      )
    }

    const DROPS = [
      { dx: 0, dy: -50, s: 8, d: 100 },
      { dx: -16, dy: -46, s: 7, d: 140 },
      { dx: 16, dy: -46, s: 7, d: 180 },
      { dx: -30, dy: -38, s: 6.5, d: 220 },
      { dx: 30, dy: -38, s: 6.5, d: 260 },
      { dx: -44, dy: -26, s: 6, d: 300 },
      { dx: 44, dy: -26, s: 6, d: 340 },
      { dx: -8, dy: -54, s: 6, d: 160 },
      { dx: 8, dy: -54, s: 6, d: 200 },
      { dx: -56, dy: -12, s: 5.5, d: 380 },
      { dx: 56, dy: -12, s: 5.5, d: 420 },
    ]

    // Icon-style hide control: an eye with a slash, matching the × chrome.
    function HideIcon() {
      return el('svg', { viewBox: '0 0 24 24', className: 'whl-icon', 'aria-hidden': true },
        el('path', { d: 'M2.2 12 C5.3 7.3 8.6 5 12 5 C15.4 5 18.7 7.3 21.8 12 C18.7 16.7 15.4 19 12 19 C8.6 19 5.3 16.7 2.2 12 Z', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' }),
        el('circle', { cx: 12, cy: 12, r: 2.8, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
        el('path', { d: 'M4.5 19.5 L19.5 4.5', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
      )
    }

    function WhaleBubble(props) {
      const phase = props.phase
      const data = props.data
      const onClose = props.onClose
      // `role="status"` announces loading/error/ready content; `shift` keeps the
      // bubble inside the viewport when the whale is near an edge.
      const shell = { className: 'whl-bubble', role: 'status', 'aria-live': 'polite', style: props.shift ? { marginLeft: props.shift } : undefined }
      const head = (sub) => el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 账户余额'), sub ? el('span', { className: 'whl-bubble-sub' }, sub) : null)
      const close = () => el('button', { className: 'whl-close', onClick: onClose, 'aria-label': '关闭', title: '关闭' }, '×')
      const hide = () => el('button', { className: 'whl-hide', onClick: props.onHide, 'aria-label': '隐藏鲸鱼', title: '隐藏鲸鱼' }, HideIcon())
      const actions = props.placed
        ? el('div', { className: 'whl-actions' },
            el('button', { className: 'whl-action', onClick: props.onResume }, '继续游动'),
          )
        : null
      if (phase === 'loading') {
        return el('div', shell,
          hide(), close(),
          head('咕噜咕噜…'),
          el('div', { className: 'whl-bubble-sub' }, '正在查询余额…'),
          actions,
        )
      }
      const balance = phase === 'ready' && data && data.ok ? data.balance : null
      if (phase === 'error' || !data || !data.ok || !balance) {
        return el('div', shell,
          hide(), close(),
          head(null),
          el('div', { className: 'whl-bubble-sub' }, '余额暂不可用，再戳一下试试～'),
          actions,
        )
      }
      return el('div', shell,
        hide(), close(),
        head(null),
        el('div', { className: 'whl-balance' },
          el('span', { className: 'whl-balance-amount' }, fmtBalance(balance.total, balance.currency)),
          el('span', { className: 'whl-balance-state' }, (balance.available === true ? '可用' : '不可用')),
        ),
        actions,
      )
    }

    function WhaleApp(props) {
      const callBalance = props.callBalance
      const [sprayId, setSprayId] = React.useState(0)
      const [phase, setPhase] = React.useState('idle')
      const [data, setData] = React.useState(null)
      const [bubbleShift, setBubbleShift] = React.useState(0)
      const [placed, setPlaced] = React.useState(null)
      const [dragging, setDragging] = React.useState(false)
      const [hidden, setHidden] = React.useState(() => readHidden())
      const whaleRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const movedRef = React.useRef(false)
      const suppressClickRef = React.useRef(false)
      // Tracks whether the bubble is currently open so a late response from a
      // request the user already collapsed cannot reopen it.
      const openRef = React.useRef(false)
      React.useEffect(() => { openRef.current = phase !== 'idle' }, [phase])
      React.useEffect(() => {
        if (!sprayId) return
        let alive = true
        setPhase('loading')
        Promise.resolve().then(callBalance).then((res) => {
          if (!alive || !openRef.current) return
          // The gateway client resolves to `{ ok, value?/error? }`; the
          // balance snapshot lives on `value`.
          if (res && res.ok && res.value !== undefined) { setData(res.value); setPhase('ready') } else {
            console.error('[ui-whale] whale/balance failed:', res && res.error ? res.error : res)
            setPhase('error')
          }
        }).catch((err) => {
          if (alive && openRef.current) { console.error('[ui-whale] whale/balance rejected:', err); setPhase('error') }
        })
        return () => { alive = false }
      }, [sprayId])
      // The bubble outlives the spray; it fades out by itself after 30s
      // (or immediately via the × close button, or a second whale click).
      React.useEffect(() => {
        if (phase === 'idle' || phase === 'loading') return
        const timer = setTimeout(() => setPhase('idle'), 30000)
        return () => clearTimeout(timer)
      }, [phase])
      // While the bubble is open the swimmer is frozen (`.whl-hold`), so a
      // single measurement keeps it readable: shift the bubble back inside the
      // viewport when the whale happens to be near an edge.
      React.useEffect(() => {
        if (phase === 'idle') { setBubbleShift(0); return }
        const node = whaleRef.current
        if (!node || typeof window === 'undefined') return
        const rect = node.getBoundingClientRect()
        const width = Math.min(300, window.innerWidth * 0.62)
        const center = rect.left + rect.width / 2
        const minCenter = 8 + width / 2
        const maxCenter = window.innerWidth - 8 - width / 2
        let shift = 0
        if (center < minCenter) shift = minCenter - center
        else if (center > maxCenter) shift = maxCenter - center
        setBubbleShift(shift)
      }, [phase, sprayId])
      // A dropped whale must survive a window resize inside the viewport.
      React.useEffect(() => {
        if (!placed || typeof window === 'undefined') return
        const onResize = () => setPlaced((p) => (p ? clampWhalePosition(p.left, p.top, { width: window.innerWidth, height: window.innerHeight }) : p))
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [placed])
      const handleClick = () => {
        // A real drag suppresses the synthetic click that follows it.
        if (suppressClickRef.current) { suppressClickRef.current = false; return }
        if (openRef.current) { setPhase('idle'); return }
        setSprayId((n) => n + 1)
      }
      const handleClose = () => setPhase('idle')
      const handleHide = () => {
        setPhase('idle')
        setHidden(true)
        writeHidden(true)
      }
      const handleShow = () => {
        setHidden(false)
        writeHidden(false)
        setPlaced(null)
      }
      const handleResume = () => setPlaced(null)
      const handlePointerDown = (e) => {
        const node = whaleRef.current
        if (!node) return
        if (e.pointerType === 'mouse' && e.button !== 0) return
        const rect = node.getBoundingClientRect()
        dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originLeft: rect.left, originTop: rect.top }
        movedRef.current = false
        try { node.setPointerCapture(e.pointerId) } catch (err) { /* capture is best-effort */ }
      }
      const handlePointerMove = (e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (!movedRef.current) {
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
          movedRef.current = true
          setDragging(true)
        }
        setPlaced(clampWhalePosition(drag.originLeft + dx, drag.originTop + dy, { width: window.innerWidth, height: window.innerHeight }))
      }
      const handlePointerUp = (e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        dragRef.current = null
        if (movedRef.current) {
          suppressClickRef.current = true
          setDragging(false)
        }
      }
      if (hidden) {
        return el('div', { className: 'whl-frame' },
          el('button', { className: 'whl-restore', onClick: handleShow, title: '显示鲸鱼', 'aria-label': '显示鲸鱼' }, WhaleMark()),
        )
      }
      const swimmerStyle = placed ? { left: placed.left + 'px', top: placed.top + 'px', animation: 'none' } : undefined
      return el('div', { className: phase === 'idle' ? 'whl-frame' : 'whl-frame whl-hold' },
        el('div', { className: placed ? 'whl-swimmer whl-placed' : 'whl-swimmer', style: swimmerStyle },
          el('div', { className: 'whl-bob' },
            el('div', {
              key: sprayId,
              ref: whaleRef,
              className: (sprayId > 0 ? 'whl-whale whl-hop' : 'whl-whale') + (dragging ? ' whl-dragging' : ''),
              role: 'button',
              tabIndex: 0,
              'aria-label': '账户余额',
              title: '戳我喷水~（拖动可挪位置）',
              onClick: handleClick,
              onPointerDown: handlePointerDown,
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
              onPointerCancel: handlePointerUp,
              onKeyDown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() }
              },
            },
              WhaleSvg(),
              sprayId > 0 ? el('div', { className: 'whl-spray' },
                el('div', { className: 'whl-jet' }),
                el('div', { className: 'whl-puff' }),
                el('div', { className: 'whl-ring' }),
                DROPS.map((d, i) => el('div', {
                  key: i,
                  className: 'whl-drop',
                  style: { left: 0, top: 0, width: d.s, height: d.s, marginLeft: -d.s / 2, marginTop: -d.s / 2, animationDelay: d.d + 'ms', '--dx': d.dx + 'px', '--dy': d.dy + 'px' },
                })),
              ) : null,
            ),
            phase !== 'idle' ? el(WhaleBubble, { key: 'b' + sprayId, phase: phase, data: data, onClose: handleClose, shift: bubbleShift, placed: placed !== null, onHide: handleHide, onResume: handleResume }) : null,
          ),
        ),
      )
    }

    // Hand-written result contract for the `whale.balance` invocation.
    //
    // The current dsh gateway applies no result codec at runtime (it returns
    // the raw value; `requireStrictDescriptor` gates only parameter/context
    // codecs), so this validator is declarative: it documents the wire shape
    // and keeps the bundle dependency-free (no zod), and it is exactly what
    // the host must keep satisfying if a runtime ever enforces result codecs.
    function assertBalanceShape(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('whale/balance result must be an object')
      if (typeof value.ok !== 'boolean') throw new TypeError('whale/balance result.ok must be a boolean')
      if (value.balance !== null && value.balance !== undefined) {
        const b = value.balance
        if (typeof b !== 'object' || Array.isArray(b)) throw new TypeError('whale/balance result.balance must be an object or null')
        if (typeof b.total !== 'string') throw new TypeError('whale/balance result.balance.total must be a string')
        if (typeof b.currency !== 'string') throw new TypeError('whale/balance result.balance.currency must be a string')
        if (b.granted !== null && typeof b.granted !== 'string') throw new TypeError('whale/balance result.balance.granted must be a string or null')
        if (b.toppedUp !== null && typeof b.toppedUp !== 'string') throw new TypeError('whale/balance result.balance.toppedUp must be a string or null')
        if (typeof b.available !== 'boolean') throw new TypeError('whale/balance result.balance.available must be a boolean')
      }
    }

    const WHALE_BALANCE_SCHEMA = {
      parse(value) {
        assertBalanceShape(value)
        return value
      },
    }

    const TYPERT_REMOTE = {
      package: 'ui-whale',
      descriptors: [{
        id: 'ui-whale#whale/balance',
        service: 'whale',
        namespace: 'whale',
        method: 'balance',
        invocation: { kind: 'direct' },
        parameters: [],
        result: {
          mode: 'strict',
          typeSymbol: 'ui-whale#whale/balance:result',
          schema: WHALE_BALANCE_SCHEMA,
        },
      }],
    }

    async function apply(ctx) {
      injectStyles()
      const remote = ctx.get('remote')
      if (remote !== undefined && remote !== null && typeof remote.$mount === 'function') {
        try {
          await remote.$mount(TYPERT_REMOTE)
        } catch (err) {
          // The whale still renders; clicks degrade to the error state.
          console.error('[ui-whale] failed to mount whale/balance remote:', err)
        }
      }
      const callBalance = () => {
        // The whale namespace is installed as a nested service
        // (`remote.whale`) by $mount; resolve it through the programmatic
        // lookup — reading `.whale` off the `remote` service value hits the
        // context trap, which requires an explicit inject of the nested key.
        const ns = ctx.get('remote.whale')
        if (ns === undefined || ns === null) {
          console.error('[ui-whale] remote namespace whale is unavailable')
          return Promise.resolve({ ok: false })
        }
        return ns.balance()
      }
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'whale-pet', order: 20, label: '鲸鱼' },
        () => React.createElement(WhaleApp, { callBalance }),
      ))
    }

    exports.apply = apply
    exports.inject = ['slots', 'remote']
    exports.helpers = { clampWhalePosition, readHidden, writeHidden, WHALE_W, WHALE_H, EDGE_MARGIN }
    return module.exports
  },
})
