# 🐳 ui-whale

一只小鲸鱼缓缓从 **DeepSeek Harness**（dsh）web 界面左边游向右边（70 秒一趟，上下漂浮 + 摆尾）。点击它会喷水，并弹出一张「今日小账单」：按模型展示今天的 token 用量（↑输入 / ↓输出 / 缓存）与估算费用。纯 CSS/SVG 动画，无外部资源；系统开启 `prefers-reduced-motion` 时静止显示。

## 环境要求

- dsh ≥ `0.1.1-rc.2`（`--profile web` 方式启动），Node ≥ 20，pnpm 管理的 profile

## 包结构

```
ui-whale/
├── package.json        # exports["./client"] + dsh.client 声明（浏览器半边入口）
├── lib/index.js        # host 半边：`whale` 服务（TypertRemoteService），聚合今日用量
├── lib/client.js       # 浏览器 bundle：module-loader 注册 + shell.overlay 鲸鱼 UI
└── cordis.patch.yml.example
```

## 安装

两种方式任选其一：最终都是让 profile 的 `node_modules` 里出现 `ui-whale`，并在组合里加一行。

### 方式一：网络安装（git）

```bash
cd ~/.dsh/profiles/web
pnpm add git+ssh://git@github.com:syhgzz/ui-whale.git
```

> 依赖 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-typert-protocol` 是 `peerDependencies`，pnpm 安装时**自动**装好，无需手动处理。
> npm / yarn 等价命令：`npm i git+ssh://git@github.com:syhgzz/ui-whale.git` / `yarn add git+ssh://git@github.com:syhgzz/ui-whale.git`

### 方式二：本地 clone 源代码安装

```bash
git clone git@github.com:syhgzz/ui-whale.git ~/projects/dsh-ui-whale
cd ~/projects/dsh-ui-whale
pnpm install
cd ~/.dsh/profiles/web
pnpm add link:/home/<you>/projects/dsh-ui-whale
```

> ⚠️ 第 3 行 `pnpm install` **必须在源码目录执行**：它会装好 `@deepseek-ai/cordis`（^4.0.1）与 `@deepseek-ai/dsh-typert-protocol`（^0.1.1-rc.2）两个 peer 依赖到仓库的 `node_modules`。符号链接安装时包内 import 从仓库真实路径解析，缺了它们启动会报 `failed to import loader entry`（验证：`ls node_modules/@deepseek-ai` 应出现 `cordis`、`dsh-typert-protocol`）。
> 本方式改源码**无需重新安装**（符号链接）：改 `lib/client.js` 后已打开的页面自动热替换；改 `lib/index.js`（host 半边）需重启 dsh。
> npm / yarn 等价命令：`npm i /home/<you>/projects/dsh-ui-whale`（复制安装，改码后需重装）/ `yarn add link:/home/<you>/projects/dsh-ui-whale`

### 两种方式共用：加入组合 + 重启

编辑 `~/.dsh/profiles/web/cordis.patch.yml`（把默认的 `[]` 替换为；也可直接复制 `cordis.patch.yml.example`）：

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

```bash
dsh --profile web
```

重启后**刷新页面**即可看到鲸鱼。

> **这行是什么（简版）**：`cordis.patch.yml` 是 dsh 的组合补丁层（顶层 YAML 数组）。这条 `insert` 补丁把条目 `{ id: ui-whale, name: 'ui-whale' }` 追加进插件树——`name` 是模块说明符（loader 从 profile 解析 `node_modules/ui-whale`，加载 `lib/index.js` 挂 host 面的 `whale` 服务）；`id` 是行内唯一键（省略会随机生成；也可用 `- id: ui-whale` + `disabled: true` 临时禁用）。浏览器半边由 dsh 自动扫描 `dsh.client` 声明产生（`/plugins/ui-whale/client.js`）。**组合只在启动时读取，改完必须重启。**

## 使用

- 点击鲸鱼 → 喷水 + 弹今日账单（约 6.5 秒后自动消失）
- 悬浮层不遮挡页面交互（除鲸鱼本体外点击穿透）

## 验证安装成功

- 启动日志没有 `failed to import loader entry` 与 `client-modules:` 开头的错误
- `dsh --profile web --dump-config | grep -A1 ui-whale` 能看到组合行
- `curl -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<web端口>/plugins/ui-whale/client.js` 返回 200
- 刷新页面后鲸鱼出现

## 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `ui-whale` 的 `insert` 块
2. 移除依赖：`cd ~/.dsh/profiles/web && pnpm remove ui-whale`
3. 重启 `dsh --profile web`

## 常见问题

**鲸鱼没出现？**
- 确认 `insert` 块缩进为顶层列表项（`-` 顶格）；`dsh --profile web --dump-config | grep -A1 ui-whale` 能看到组合行
- 方式二先确认源码目录 `node_modules/@deepseek-ai` 有 `cordis`、`dsh-typert-protocol`
- **改完组合必须重启 dsh**，重启后刷新页面；浏览器控制台查看 `ui-whale` 相关错误

**点鲸鱼显示「账单掉进海里了」？**
- 一般是 host 面 `whale` 服务未注册（检查组合行或启动日志中的 typert 报错）；若完全没有调用记录会显示「今天还没有吐过泡泡呢～」

**费用准吗？**
- token 是供应商上报的真实用量；费用按 DeepSeek 公开单价（输入 $0.28/M、缓存命中 $0.028/M、输出 $0.42/M）估算，不同计费计划有差异，界面已标注「仅供参考」

**改颜色 / 游速 / 大小？**
- 所有样式在 `lib/client.js` 顶部的 `CSS` 常量里（游速 `70s`、大小 `150px`、渐变颜色等）
- 方式二改 `lib/client.js` 无需重启（自动热替换）；改 `lib/index.js` 需重启

## 原理速览

```
浏览器 (lib/client.js)                    Host (lib/index.js)
─────────────────────                    ───────────────────
shell.overlay 渲染鲸鱼                     Service 'whale'
点击 → ctx.remote.whale.usage()  ───────→  sessionQuery 读取所有会话日志
今日账单泡泡卡 ←────── JSON 结果 ──────────  按模型聚合今日 usage + 价格表估算
```

Client ↔ Host 通过 dsh 自带 Typert Gateway 的 JSON RPC 通信；本包手写 `src-json` 编码的 Remote 贡献，无构建管线。

## License

MIT
