# 🐳 ui-whale

一只小鲸鱼缓缓从 **DeepSeek Harness**（dsh）web 界面左边游向右边（70 秒一趟，上下漂浮 + 摆尾）。点击它会喷水，并弹出一张「今日小账单」：按模型展示今天的 token 用量（↑输入 / ↓输出 / 缓存）与估算费用。纯 CSS/SVG 动画，无外部资源；系统开启 `prefers-reduced-motion` 时静止显示（点击也不再播放喷水动画）。

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

两种方式任选其一：

### 方式一：网络安装（git）

**① 安装依赖**

```bash
cd ~/.dsh/profiles/web
pnpm add git+ssh://git@github.com:syhgzz/ui-whale.git
```

> 依赖 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-typert-protocol` 是 `peerDependencies`，pnpm 安装时**自动**装好，无需手动处理。
> npm / yarn 等价命令：`npm i git+ssh://git@github.com:syhgzz/ui-whale.git` / `yarn add git+ssh://git@github.com:syhgzz/ui-whale.git`

**② 加入组合**

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，把默认的 `[]` 替换为：

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

**③ 重启并刷新**

```bash
dsh --profile web
```

重启后**刷新页面**即可看到鲸鱼。

### 方式二：本地 clone 源代码安装

**① 克隆源码**

```bash
git clone git@github.com:syhgzz/ui-whale.git ~/projects/dsh-ui-whale
```

**② 安装源码依赖**

```bash
cd ~/projects/dsh-ui-whale
pnpm install
```

> ⚠️ 必须在源码目录执行：装好 `@deepseek-ai/cordis`（^4.0.1）与 `@deepseek-ai/dsh-typert-protocol`（^0.1.1-rc.2）到仓库 `node_modules`。符号链接安装时包内 import 从仓库真实路径解析，缺了它们启动会报 `failed to import loader entry`（验证：`ls node_modules/@deepseek-ai` 应出现 `cordis`、`dsh-typert-protocol`）。

**③ 安装到 profile**

```bash
cd ~/.dsh/profiles/web
pnpm add link:/home/<you>/projects/dsh-ui-whale
```

**④ 加入组合**

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，把默认的 `[]` 替换为：

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

**⑤ 重启并刷新**

```bash
dsh --profile web
```

重启后**刷新页面**即可看到鲸鱼。

> 本方式改源码**无需重新安装**（符号链接）：改 `lib/client.js` 后已打开的页面自动热替换；改 `lib/index.js`（host 半边）需重启 dsh。
> npm / yarn 等价命令：`npm i /home/<you>/projects/dsh-ui-whale`（复制安装，改码后需重装）/ `yarn add link:/home/<you>/projects/dsh-ui-whale`

> **组合行是什么**：`cordis.patch.yml` 是 dsh 的组合补丁层（顶层 YAML 数组）；这条 `insert` 补丁把条目 `{ id: ui-whale, name: 'ui-whale' }` 追加进插件树——`name` 是模块说明符（加载 `lib/index.js` 挂 host 面的 `whale` 服务），`id` 是行内唯一键（省略会随机生成，也可用 `- id: ui-whale` + `disabled: true` 临时禁用）；浏览器半边由 dsh 自动扫描 `dsh.client` 声明产生（`/plugins/ui-whale/client.js`）。**组合只在启动时读取，改完必须重启。**

## 使用

- 点击鲸鱼 → 喷水 + 弹出**账户余额**气泡（30 秒后自动消失；再点一次鲸鱼或点右上角 × 立即收起）
- 余额为人民币（¥），来自 DeepSeek 官方 `/user/balance` 接口（原生 CNY）；拿不到时显示「余额暂不可用」，不做估算
- **拖动鲸鱼可换位置**：按下时小手变抓紧，松手后从落点继续向右游，并保留落点所在的上下泳道；悬停时小手会在「张开/抓紧」间轻微切换并出现淡蓝光晕
- 气泡右上角两个图标按钮：**隐藏鲸鱼**（眼睛带斜线）与**关闭**（×）。隐藏后右下角会出现一只小鲸鱼，点它可恢复（隐藏状态在刷新后保持）
- 悬浮层不遮挡页面交互（除鲸鱼本体和右上角两个小按钮外点击穿透）

> 宿主侧仍保留完整的 `whale.usage`（会话日志聚合 + 平台用量页精确消费）链路，当前弹窗只调用 `whale.balance`；如需恢复完整账单，改回客户端调用 `usage` 即可。

### 配置凭据（余额接口需要）

账单只读官方余额接口，用 `DEEPSEEK_API_KEY` 调用即可（写入 `~/.dsh/.credentials.yaml` 或环境变量）：

```yaml
version: 1
refs:
  DEEPSEEK_API_KEY: sk-xxxx              # 余额接口用
  DEEPSEEK_PLATFORM_TOKEN: eyJhbGci...   # 可选：仅当你要用 whale.usage 抓平台精确消费时才需要
```

> ⚠️ `version: 1` 是**必填**的顶层键：dsh 只读 version 1 的布局，缺了会在启动时报 `uses the pre-release flat layout`，整个 credentials 服务都起不来。该文件还必须仅属主可读 —— 建好后执行 `chmod 600 ~/.dsh/.credentials.yaml`，否则 dsh 会报 `readable beyond its owner` 并跳过整个 credentials 服务。
>
> 平台 Token 是登录 [platform.deepseek.com](https://platform.deepseek.com) 后 Local Storage 里以 `eyJ` 开头的 JWT（仅 `whale.usage` 用）。

