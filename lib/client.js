/**
 * ui-whale client bundle (browser half).
 *
 * Served by the dsh client module system as the `dsh.client` package
 * `ui-whale`; the composition row in the profile's cordis.patch.yml mounts it.
 *
 * Renders a deep-sea whale swimming across the frame-wide overlay. Clicking
 * it sprays a water jet and pops today's per-model token / estimated-cost
 * billboard, fetched through `ctx.remote.whale.usage()` (the host service
 * registered in lib/index.js).
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
      '.whl-whale { position: relative; width: 150px; height: 100px; pointer-events: auto; cursor: pointer; transition: transform 0.25s ease; }',
      '.whl-whale:hover { transform: scale(1.07) rotate(-2deg); }',
      '@keyframes whl-hop { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-12px); } 50% { transform: translateY(0); } 75% { transform: translateY(-6px); } }',
      '.whl-hop { animation: whl-hop 0.9s cubic-bezier(0.4, 0, 0.6, 1) both; }',
      '.whl-whale-svg { display: block; filter: drop-shadow(0 7px 12px rgba(8, 36, 72, 0.45)); }',
      '.whl-tail { transform-box: fill-box; transform-origin: 95% 50%; animation: whl-tail 1.7s ease-in-out infinite; }',
      '@keyframes whl-tail { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-6deg); } }',
      '.whl-spray { position: absolute; left: 86px; top: 24px; width: 0; height: 0; }',
      '.whl-jet { position: absolute; left: -4px; top: -57px; width: 8px; height: 56px; border-radius: 50% 50% 40% 40%; background: linear-gradient(180deg, rgba(226,247,255,0.95), rgba(150,210,248,0.92) 45%, rgba(74,160,224,0.8)); filter: drop-shadow(0 2px 6px rgba(50,130,215,0.5)); transform-origin: 50% 100%; animation: whl-jet 1.5s ease both; }',
      '@keyframes whl-jet { 0% { transform: rotate(7deg) scaleY(0.05); opacity: 0; } 8% { opacity: 1; } 30% { transform: rotate(7deg) scaleY(1); } 65% { transform: rotate(6deg) scaleY(0.94); opacity: 0.85; } 100% { transform: rotate(6deg) scaleY(0.45); opacity: 0; } }',
      '.whl-puff { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #dbf3ff, #3f9de0); animation: whl-puff 0.75s ease-out both; }',
      '@keyframes whl-puff { 0% { transform: scale(0.4); opacity: 0.95; } 100% { transform: scale(1.9); opacity: 0; } }',
      '.whl-ring { position: absolute; left: -8px; top: -8px; width: 16px; height: 16px; border: 2.5px solid rgba(230,248,255,0.9); border-radius: 50%; animation: whl-ring 0.95s ease-out both; }',
      '@keyframes whl-ring { 0% { transform: scale(0.35); opacity: 0.95; } 100% { transform: scale(2.4); opacity: 0; } }',
      '.whl-drop { position: absolute; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #eaf8ff, #5cb8f0); box-shadow: 0 1px 3px rgba(16, 62, 110, 0.55); animation: whl-arc 1.6s cubic-bezier(0.3, 0.6, 0.35, 1) both; }',
      '@keyframes whl-arc { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 10% { opacity: 1; } 42% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 1; } 100% { transform: translate(calc(var(--dx) * 1.12), calc(var(--dy) + 54px)) scale(0.62); opacity: 0; } }',
      '.whl-bubble { position: absolute; left: 50%; bottom: calc(100% + 16px); transform: translateX(-50%); width: min(300px, 62vw); background: linear-gradient(180deg, #143354, #0c2440); border: 2px solid #2c6da5; border-radius: 16px; padding: 10px 12px; color: #d9e9f8; font: 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; box-shadow: 0 12px 28px rgba(8, 30, 60, 0.38); pointer-events: none; animation: whl-pop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both, whl-out 0.6s ease 6.5s forwards; }',
      '@keyframes whl-pop { from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.6); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }',
      '@keyframes whl-out { to { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.9); } }',
      '.whl-bubble::after { content: ""; position: absolute; left: 50%; bottom: -8px; width: 12px; height: 12px; background: #0c2440; border-right: 2px solid #2c6da5; border-bottom: 2px solid #2c6da5; transform: translateX(-50%) rotate(45deg); }',
      '.whl-bubble-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; }',
      '.whl-mark { display: inline-block; width: 18px; height: 14px; flex: none; }',
      '.whl-bubble-sub { color: #8fb6d6; font-size: 11px; margin-top: 2px; }',
      '.whl-rows { margin-top: 6px; display: flex; flex-direction: column; gap: 5px; }',
      '.whl-row { border: 1px solid #285a88; border-radius: 10px; background: #16395f; padding: 5px 8px; }',
      '.whl-row-main { display: flex; align-items: center; gap: 8px; }',
      '.whl-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }',
      '.whl-row-call { color: #8fb6d6; font-size: 11px; white-space: nowrap; }',
      '.whl-row-cost { font-weight: 700; color: #7fd8ff; white-space: nowrap; }',
      '.whl-row-toks { color: #8fb6d6; font-size: 11px; margin-top: 1px; }',
      '.whl-total { margin-top: 7px; padding-top: 6px; border-top: 2px dashed rgba(127, 216, 255, 0.4); display: flex; justify-content: space-between; gap: 8px; font-weight: 700; }',
      '.whl-est { font-size: 10px; color: #6d92b5; margin-top: 4px; }',
      '@media (prefers-reduced-motion: reduce) { .whl-swimmer { animation: none; transform: translateX(12vw); } .whl-bob, .whl-tail, .whl-hop { animation: none; } }',
    ].join('\n')

    const STYLE_ID = 'ui-whale-css'
    function injectStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById(STYLE_ID)) return
      const tag = document.createElement('style')
      tag.id = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    const el = React.createElement

    function fmtTokens(n) {
      n = typeof n === 'number' ? n : 0
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
      return String(n)
    }

    function fmtCost(c) {
      c = typeof c === 'number' ? c : 0
      return '$' + (c < 0.01 ? c.toFixed(4) : c.toFixed(2))
    }

    // Tiny whale mark for the bubble title.
    function WhaleMark() {
      return el('svg', { viewBox: '0 0 36 28', className: 'whl-mark', 'aria-hidden': true },
        el('path', { d: 'M 2 15 Q 8 8 16 9 Q 30 8 35 16 Q 30 20 18 19 L 16 19 Q 8 19 2 15 Z', fill: '#5fb5ef' }),
        el('path', { d: 'M 3 14 Q 16 21 22 16 Q 12 24 3 14 Z', fill: '#5fb5ef' }),
        el('circle', { cx: 28, cy: 14, r: 1.8, fill: '#0d2438' }),
        el('path', { d: 'M 25 17 Q 27.5 18.6 30 17', stroke: '#0d2438', strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round' }),
      )
    }

    // Whale silhouette: fat head at the right, tapered body, horizontal
    // two-lobe flukes, flipper, throat grooves.
    const BODY = 'M 142 52 C 140 36 124 24 100 25 C 68 27 42 34 28 42 C 22 44 22 58 28 60 C 40 68 62 74 84 73 C 112 71 132 66 142 52 Z'
    const FLUKES = 'M 30 50 C 25 40 15 33 6 33 C 11 41 15 47 18 51 C 14 54 10 60 6 71 C 14 71 24 62 30 50 Z'

    function WhaleSvg() {
      return el('svg', { viewBox: '0 0 150 100', width: 150, height: 100, className: 'whl-whale-svg', 'aria-hidden': true },
        el('defs', null,
          el('linearGradient', { id: 'whlBodyGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
            el('stop', { offset: '0%', stopColor: '#4b86b8' }),
            el('stop', { offset: '55%', stopColor: '#2c5f92' }),
            el('stop', { offset: '100%', stopColor: '#16375c' }),
          ),
          el('linearGradient', { id: 'whlFinGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
            el('stop', { offset: '0%', stopColor: '#35689a' }),
            el('stop', { offset: '100%', stopColor: '#173a5e' }),
          ),
          el('clipPath', { id: 'whlBodyClip' },
            el('path', { d: BODY }),
          ),
        ),
        el('g', { className: 'whl-tail' },
          el('path', { d: FLUKES, fill: 'url(#whlFinGrad)' }),
        ),
        el('g', null,
          el('path', { d: BODY, fill: 'url(#whlBodyGrad)' }),
          el('g', { clipPath: 'url(#whlBodyClip)' },
            el('ellipse', { cx: 74, cy: 68, rx: 58, ry: 15, fill: '#f2e9d6' }),
            el('path', { d: 'M 96 66 Q 92 71 86 71.5', stroke: '#d9cdb4', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' }),
            el('path', { d: 'M 84 67 Q 80 72 74 72', stroke: '#d9cdb4', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' }),
            el('path', { d: 'M 72 68 Q 68 72 62 72', stroke: '#d9cdb4', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' }),
          ),
          el('ellipse', { cx: 74, cy: 70, rx: 11, ry: 5.2, fill: 'url(#whlFinGrad)', transform: 'rotate(60 74 70)' }),
          el('path', { d: 'M 126 30 Q 133 36 135 44', stroke: 'rgba(255, 255, 255, 0.26)', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
          el('circle', { cx: 113, cy: 40, r: 4.6, fill: '#0f2c47' }),
          el('circle', { cx: 114.6, cy: 38.4, r: 1.6, fill: '#ffffff' }),
          el('path', { d: 'M 107 33 Q 113 29 119 33', stroke: '#0f2c47', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' }),
          el('path', { d: 'M 137 55 Q 127 62 112 59', stroke: '#e3d7bd', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' }),
          el('ellipse', { cx: 124, cy: 49, rx: 4.5, ry: 2.8, fill: '#ff9fb8', opacity: 0.85 }),
          el('ellipse', { cx: 86, cy: 27, rx: 5.5, ry: 1.6, fill: '#0d2a47', opacity: 0.85, transform: 'rotate(-8 86 27)' }),
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

    function WhaleBubble(props) {
      const phase = props.phase
      const data = props.data
      if (phase === 'loading') {
        return el('div', { className: 'whl-bubble' },
          el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 今日小账单'), el('span', { className: 'whl-bubble-sub' }, '咕噜咕噜…')),
          el('div', { className: 'whl-bubble-sub' }, '正在捞取今天的鱼泡泡…'),
        )
      }
      if (phase === 'error' || !data || !data.ok) {
        return el('div', { className: 'whl-bubble' },
          el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 哎呀')),
          el('div', { className: 'whl-bubble-sub' }, '账单掉进海里了，再戳一下试试～'),
        )
      }
      if (!data.models || data.models.length === 0) {
        return el('div', { className: 'whl-bubble' },
          el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 今日小账单'), el('span', { className: 'whl-bubble-sub' }, '· ' + data.date)),
          el('div', { className: 'whl-bubble-sub' }, '今天还没有吐过泡泡呢～'),
        )
      }
      return el('div', { className: 'whl-bubble' },
        el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 今日小账单'), el('span', { className: 'whl-bubble-sub' }, '· ' + data.date)),
        el('div', { className: 'whl-rows' }, data.models.map((m) => el('div', { className: 'whl-row', key: m.model },
          el('div', { className: 'whl-row-main' },
            el('span', { className: 'whl-row-name', title: m.provider + ' / ' + m.model }, m.model),
            el('span', { className: 'whl-row-call' }, '× ' + m.calls),
            el('span', { className: 'whl-row-cost' }, fmtCost(m.cost)),
          ),
          el('div', { className: 'whl-row-toks' }, '↑ ' + fmtTokens(m.input) + ' · ↓ ' + fmtTokens(m.output) + ' · 缓存 ' + fmtTokens(m.cacheRead) + (m.cacheWrite ? ' + ' + fmtTokens(m.cacheWrite) + ' 写入' : '')),
        ))),
        el('div', { className: 'whl-total' },
          el('span', null, '合计 ' + fmtTokens(data.totalTokens) + ' tokens'),
          el('span', null, '≈ ' + fmtCost(data.totalCost)),
        ),
        el('div', { className: 'whl-est' }, '费用按 DeepSeek 公开价格估算，仅供参考。'),
      )
    }

    function WhaleApp(props) {
      const callUsage = props.callUsage
      const [sprayId, setSprayId] = React.useState(0)
      const [phase, setPhase] = React.useState('idle')
      const [data, setData] = React.useState(null)
      React.useEffect(() => {
        if (!sprayId) return
        let alive = true
        setPhase('loading')
        Promise.resolve().then(callUsage).then((res) => {
          if (!alive) return
          if (res && res.ok) { setData(res); setPhase('ready') } else { setPhase('error') }
        }).catch(() => { if (alive) setPhase('error') })
        return () => { alive = false }
      }, [sprayId])
      const handleClick = () => setSprayId((n) => n + 1)
      return el('div', { className: 'whl-frame' },
        el('div', { className: 'whl-swimmer' },
          el('div', { className: 'whl-bob' },
            el('div', { key: sprayId, className: sprayId > 0 ? 'whl-whale whl-hop' : 'whl-whale', onClick: handleClick, title: '戳我喷水~' },
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
            phase !== 'idle' ? el(WhaleBubble, { key: 'b' + sprayId, phase: phase, data: data }) : null,
          ),
        ),
      )
    }

    // Hand-authored Typert Remote contribution for the `whale` host service.
    // `src-json` codecs keep the bundle free of a zod dependency.
    const TYPERT_REMOTE = {
      package: 'ui-whale',
      descriptors: [{
        id: 'ui-whale#whale/usage',
        service: 'whale',
        namespace: 'whale',
        method: 'usage',
        invocation: { kind: 'direct' },
        parameters: [],
        result: { mode: 'src-json' },
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
        }
      }
      const callUsage = () => {
        const r = ctx.get('remote')
        if (r === undefined || r === null || r.whale === undefined) return Promise.resolve({ ok: false })
        return r.whale.usage()
      }
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'whale-pet', order: 20, label: '鲸鱼' },
        () => React.createElement(WhaleApp, { callUsage }),
      ))
    }

    exports.apply = apply
    exports.inject = ['slots', 'remote']
    return module.exports
  },
})
