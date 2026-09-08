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
      '.whl-close { position: absolute; top: 6px; right: 8px; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; background: rgba(127, 216, 255, 0.16); color: #9fd0f2; font: 12px/18px sans-serif; text-align: center; cursor: pointer; pointer-events: auto; }',
      '.whl-close:hover { background: rgba(127, 216, 255, 0.32); color: #d9efff; }',
      '.whl-bubble::after { content: ""; position: absolute; left: 50%; bottom: -8px; width: 12px; height: 12px; background: #0c2440; border-right: 2px solid #2c6da5; border-bottom: 2px solid #2c6da5; transform: translateX(-50%) rotate(45deg); }',
      '.whl-bubble-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; }',
      '.whl-mark { display: inline-block; width: 18px; height: 14px; flex: none; }',
      '.whl-bubble-sub { color: #8fb6d6; font-size: 11px; margin-top: 2px; }',
      '.whl-balance { margin-top: 4px; display: flex; justify-content: space-between; gap: 8px; font-weight: 700; color: #7fd8ff; }',
      '.whl-balance-detail { color: #8fb6d6; font-size: 11px; margin-top: 1px; }',
      '.whl-rows { margin-top: 6px; display: flex; flex-direction: column; gap: 5px; }',
      '.whl-group { margin-top: 6px; }',
      '.whl-group-head { display: flex; justify-content: space-between; gap: 8px; font-weight: 700; font-size: 11px; color: #7fd8ff; }',
      '.whl-group-sub { color: #8fb6d6; font-weight: 400; }',
      '.whl-group-rows { margin-top: 4px; display: flex; flex-direction: column; gap: 5px; }',
      '.whl-row { border: 1px solid #285a88; border-radius: 10px; background: #16395f; padding: 5px 8px; }',
      '.whl-row-main { display: flex; align-items: center; gap: 8px; }',
      '.whl-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }',
      '.whl-row-call { color: #8fb6d6; font-size: 11px; white-space: nowrap; }',
      '.whl-row-cost { font-weight: 700; color: #7fd8ff; white-space: nowrap; }',
      '.whl-row-toks { color: #8fb6d6; font-size: 11px; margin-top: 1px; }',
      '.whl-total { margin-top: 7px; padding-top: 6px; border-top: 2px dashed rgba(127, 216, 255, 0.4); display: flex; justify-content: space-between; gap: 8px; font-weight: 700; }',
      '.whl-est { font-size: 10px; color: #6d92b5; margin-top: 4px; }',
      '.whl-auth { margin-top: 5px; padding: 6px 8px; border: 1px dashed #2c6da5; border-radius: 10px; color: #f0c98a; }',
      '.whl-auth-title { font-weight: 700; }',
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

    function fmtTokens(n) {
      n = typeof n === 'number' ? n : 0
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
      return String(n)
    }

    const CURRENCY_SYMBOLS = { CNY: '¥', USD: '$' }

    function currencySymbol(currency) {
      if (CURRENCY_SYMBOLS[currency]) return CURRENCY_SYMBOLS[currency]
      return typeof currency === 'string' && currency !== '' ? currency + ' ' : '¥'
    }

    function fmtCost(c, currency) {
      if (typeof c !== 'number') return '—'
      return currencySymbol(currency) + (c < 0.01 ? c.toFixed(4) : c.toFixed(2))
    }

    function fmtBalance(value, currency) {
      return typeof value === 'string' && value !== '' ? currencySymbol(currency) + value : '—'
    }

    // Cost is three-state: a number (billed by the platform), null while
    // logged in (the platform did not report it), null while logged out (the
    // platform token is missing) — never a fabricated zero.
    function costText(cost, authed, currency) {
      if (typeof cost === 'number') return fmtCost(cost, currency)
      return authed ? '—' : '费用需登录查看'
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

    function modelBucket(model) {
      const id = String(model || '').toLowerCase()
      if (id.includes('pro')) return 'pro'
      if (id.includes('vision-exp')) return 'vision'
      return 'other'
    }

    function bucketSub(models) {
      let tokens = 0
      let cost = 0
      let hasCost = false
      for (const m of models) {
        tokens += m.input + m.output + m.cacheRead + m.cacheWrite
        if (typeof m.cost === 'number') { cost += m.cost; hasCost = true }
      }
      return { tokens, cost: hasCost ? cost : null }
    }

    function ModelRows(props) {
      const rows = props.models
      if (!rows || rows.length === 0) {
        return el('div', { className: 'whl-row-toks' }, props.emptyText)
      }
      return el('div', { className: 'whl-group-rows' }, rows.map((m) => el('div', { className: 'whl-row', key: (m.provider || '') + '\u0000' + m.model },
        el('div', { className: 'whl-row-main' },
          el('span', { className: 'whl-row-name', title: m.provider ? m.provider + ' / ' + m.model : m.model }, m.model),
          el('span', { className: 'whl-row-call' }, '× ' + m.calls),
          el('span', { className: 'whl-row-cost' }, fmtCost(m.cost, props.currency)),
        ),
        el('div', { className: 'whl-row-toks' }, '↑ ' + fmtTokens(m.input) + ' · ↓ ' + fmtTokens(m.output) + ' · 缓存 ' + fmtTokens(m.cacheRead) + (m.cacheWrite ? ' + ' + fmtTokens(m.cacheWrite) + ' 写入' : '')),
      )))
    }

    function GroupSection(props) {
      const sub = bucketSub(props.models)
      const summary = props.models.length === 0
        ? fmtTokens(0) + ' tokens'
        : fmtTokens(sub.tokens) + ' tokens · ' + costText(sub.cost, props.authed, props.currency)
      return el('div', { className: 'whl-group' },
        el('div', { className: 'whl-group-head' },
          el('span', null, props.title),
          el('span', { className: 'whl-group-sub' }, summary),
        ),
        el(ModelRows, { models: props.models, emptyText: props.emptyText, currency: props.currency }),
      )
    }

    function AuthNotice(props) {
      const authState = props.authState
      let title
      let steps
      if (authState === 'missing') {
        title = '需要登录 DeepSeek 平台查看精确消费'
        steps = '① 浏览器登录 platform.deepseek.com ② F12 → Application → Local Storage，复制值以 eyJ 开头的 token ③ 写入 ~/.dsh/.credentials.yaml 的 DEEPSEEK_PLATFORM_TOKEN（或环境变量）④ 重启 dsh'
      } else if (authState === 'invalid') {
        title = '平台 Token 已失效，请重新登录并更新 DEEPSEEK_PLATFORM_TOKEN'
        steps = '登录 platform.deepseek.com 后重新复制 eyJ token（见上）并重启 dsh'
      } else {
        title = '平台用量数据获取失败（网络或风控拦截），稍后再试'
        steps = null
      }
      return el('div', { className: 'whl-bubble-sub whl-auth' },
        el('div', { className: 'whl-auth-title' }, title),
        steps ? el('div', null, steps) : null,
      )
    }

    function WhaleBubble(props) {
      const phase = props.phase
      const data = props.data
      const onClose = props.onClose
      // `role="status"` announces loading/error/ready content; `shift` keeps the
      // bubble inside the viewport when the whale is near an edge.
      const shell = { className: 'whl-bubble', role: 'status', 'aria-live': 'polite', style: props.shift ? { marginLeft: props.shift } : undefined }
      if (phase === 'loading') {
        return el('div', shell,
          el('button', { className: 'whl-close', onClick: onClose, 'aria-label': '关闭' }, '×'),
          el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 今日小账单'), el('span', { className: 'whl-bubble-sub' }, '咕噜咕噜…')),
          el('div', { className: 'whl-bubble-sub' }, '正在捞取今天的鱼泡泡…'),
        )
      }
      if (phase === 'error' || !data || !data.ok) {
        return el('div', shell,
          el('button', { className: 'whl-close', onClick: onClose, 'aria-label': '关闭' }, '×'),
          el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 哎呀')),
          el('div', { className: 'whl-bubble-sub' }, '账单掉进海里了，再戳一下试试～'),
        )
      }
      const models = Array.isArray(data.models) ? data.models : []
      const groups = { pro: [], vision: [], other: [] }
      for (const m of models) groups[modelBucket(m.model)].push(m)
      const balance = data.balance
      const authed = data.authState === 'ok'
      const currency = data.currency
      return el('div', shell,
        el('button', { className: 'whl-close', onClick: onClose, 'aria-label': '关闭' }, '×'),
        el('div', { className: 'whl-bubble-title' }, WhaleMark(), el('span', null, ' 今日小账单'), el('span', { className: 'whl-bubble-sub' }, '· ' + data.date)),
        balance
          ? el('div', null,
              el('div', { className: 'whl-balance' },
                el('span', null, '余额 ' + fmtBalance(balance.total, balance.currency)),
                el('span', null, (balance.available === true ? '可用' : '不可用')),
              ),
              (balance.granted || balance.toppedUp)
                ? el('div', { className: 'whl-balance-detail' }, '赠送 ' + fmtBalance(balance.granted, balance.currency) + ' · 充值 ' + fmtBalance(balance.toppedUp, balance.currency))
                : null,
            )
          : el('div', { className: 'whl-bubble-sub' }, '余额暂不可用'),
        el('div', { className: 'whl-total' },
          el('span', null, '今日总消耗 ' + fmtTokens(data.totalTokens) + ' tokens'),
          el('span', null, costText(data.totalCost, authed, currency)),
        ),
        !authed ? el(AuthNotice, { authState: data.authState }) : null,
        models.length === 0
          ? el('div', { className: 'whl-bubble-sub' }, '今天还没有吐过泡泡呢～')
          : el('div', { className: 'whl-rows' },
              el(GroupSection, { title: 'Pro 模型', models: groups.pro, emptyText: '今日无 Pro 模型调用', currency: currency, authed: authed }),
              el(GroupSection, { title: 'Flash-Vision-Exp', models: groups.vision, emptyText: '今日无 Flash-Vision-Exp 调用', currency: currency, authed: authed }),
              el(GroupSection, { title: '其他模型', models: groups.other, emptyText: '今日无其他模型调用', currency: currency, authed: authed }),
            ),
        authed
          ? el('div', { className: 'whl-est' }, '费用来自 DeepSeek 平台用量数据。')
          : el('div', { className: 'whl-est' }, 'token 为本机会话日志，费用需平台登录后查看。'),
      )
    }

    function WhaleApp(props) {
      const callUsage = props.callUsage
      const [sprayId, setSprayId] = React.useState(0)
      const [phase, setPhase] = React.useState('idle')
      const [data, setData] = React.useState(null)
      const [bubbleShift, setBubbleShift] = React.useState(0)
      const whaleRef = React.useRef(null)
      React.useEffect(() => {
        if (!sprayId) return
        let alive = true
        setPhase('loading')
        Promise.resolve().then(callUsage).then((res) => {
          if (!alive) return
          // The gateway client resolves to `{ ok, value?/error? }`; the
          // billboard data lives on `value` (its own `ok` is runUsage's).
          if (res && res.ok && res.value !== undefined) { setData(res.value); setPhase('ready') } else {
            console.error('[ui-whale] whale/usage failed:', res && res.error ? res.error : res)
            setPhase('error')
          }
        }).catch((err) => {
          if (alive) { console.error('[ui-whale] whale/usage rejected:', err); setPhase('error') }
        })
        return () => { alive = false }
      }, [sprayId])
      // The billboard outlives the spray; it fades out by itself after 30s
      // (or immediately via the × close button).
      React.useEffect(() => {
        if (phase === 'idle' || phase === 'loading') return
        const timer = setTimeout(() => setPhase('idle'), 30000)
        return () => clearTimeout(timer)
      }, [phase])
      // While the billboard is open the swimmer is frozen (`.whl-hold`), so a
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
      const handleClick = () => setSprayId((n) => n + 1)
      const handleClose = () => setPhase('idle')
      return el('div', { className: phase === 'idle' ? 'whl-frame' : 'whl-frame whl-hold' },
        el('div', { className: 'whl-swimmer' },
          el('div', { className: 'whl-bob' },
            el('div', {
              key: sprayId,
              ref: whaleRef,
              className: sprayId > 0 ? 'whl-whale whl-hop' : 'whl-whale',
              role: 'button',
              tabIndex: 0,
              'aria-label': '今日小账单',
              title: '戳我喷水~',
              onClick: handleClick,
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
            phase !== 'idle' ? el(WhaleBubble, { key: 'b' + sprayId, phase: phase, data: data, onClose: handleClose, shift: bubbleShift }) : null,
          ),
        ),
      )
    }

    // Hand-written result contract for the `whale` host service.
    //
    // The current dsh gateway applies no result codec at runtime (it returns
    // the raw value; `requireStrictDescriptor` gates only parameter/context
    // codecs), so this validator is declarative: it documents the wire shape
    // and keeps the bundle dependency-free (no zod), and it is exactly what
    // the host must keep satisfying if a runtime ever enforces result codecs.
    function assertUsageShape(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('whale/usage result must be an object')
      if (typeof value.ok !== 'boolean') throw new TypeError('whale/usage result.ok must be a boolean')
      if (typeof value.date !== 'string') throw new TypeError('whale/usage result.date must be a string')
      if (typeof value.totalTokens !== 'number') throw new TypeError('whale/usage result.totalTokens must be a number')
      if (value.totalCost !== null && typeof value.totalCost !== 'number') throw new TypeError('whale/usage result.totalCost must be a number or null')
      if (!['ok', 'missing', 'invalid', 'failed'].includes(value.authState)) throw new TypeError('whale/usage result.authState must be ok/missing/invalid/failed')
      if (typeof value.currency !== 'string') throw new TypeError('whale/usage result.currency must be a string')
      if (!Array.isArray(value.models)) throw new TypeError('whale/usage result.models must be an array')
      for (const m of value.models) {
        if (typeof m !== 'object' || m === null) throw new TypeError('whale/usage model must be an object')
        for (const key of ['provider', 'model']) if (typeof m[key] !== 'string') throw new TypeError('whale/usage model.' + key + ' must be a string')
        for (const key of ['input', 'output', 'cacheRead', 'cacheWrite', 'calls']) if (typeof m[key] !== 'number') throw new TypeError('whale/usage model.' + key + ' must be a number')
        if (m.cost !== null && typeof m.cost !== 'number') throw new TypeError('whale/usage model.cost must be a number or null')
      }
      if (value.balance !== null && value.balance !== undefined) {
        const b = value.balance
        if (typeof b !== 'object' || b === null || Array.isArray(b)) throw new TypeError('whale/usage result.balance must be an object or null')
        if (typeof b.total !== 'string') throw new TypeError('whale/usage result.balance.total must be a string')
        if (typeof b.currency !== 'string') throw new TypeError('whale/usage result.balance.currency must be a string')
        if (b.granted !== null && typeof b.granted !== 'string') throw new TypeError('whale/usage result.balance.granted must be a string or null')
        if (b.toppedUp !== null && typeof b.toppedUp !== 'string') throw new TypeError('whale/usage result.balance.toppedUp must be a string or null')
        if (typeof b.available !== 'boolean') throw new TypeError('whale/usage result.balance.available must be a boolean')
      }
    }

    const WHALE_RESULT_SCHEMA = {
      parse(value) {
        assertUsageShape(value)
        return value
      },
    }

    const TYPERT_REMOTE = {
      package: 'ui-whale',
      descriptors: [{
        id: 'ui-whale#whale/usage',
        service: 'whale',
        namespace: 'whale',
        method: 'usage',
        invocation: { kind: 'direct' },
        parameters: [],
        result: {
          mode: 'strict',
          typeSymbol: 'ui-whale#whale/usage:result',
          schema: WHALE_RESULT_SCHEMA,
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
          console.error('[ui-whale] failed to mount whale/usage remote:', err)
        }
      }
      const callUsage = () => {
        // The whale namespace is installed as a nested service
        // (`remote.whale`) by $mount; resolve it through the programmatic
        // lookup — reading `.whale` off the `remote` service value hits the
        // context trap, which requires an explicit inject of the nested key.
        const ns = ctx.get('remote.whale')
        if (ns === undefined || ns === null) {
          console.error('[ui-whale] remote namespace whale is unavailable')
          return Promise.resolve({ ok: false })
        }
        return ns.usage()
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
