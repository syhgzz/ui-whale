# 🐳 ui-whale

一只可爱的小鲸鱼，缓缓从 **DeepSeek Harness**（dsh）网页界面的左边游向右边（70 秒一趟，无限循环；上下漂浮 + 摆尾 + 游动时轻微上下晃动）。

点击鲸鱼它会**喷水**（水柱 + 抛物线水珠 + 水花圆环 + 开心蹦跳），同时弹出一张「今日小账单」：

- **分模型**展示今天（本地时区 0 点起）的 token 用量：↑输入 / ↓输出 / 缓存（含缓存写入）
- 每个模型显示调用次数与估算费用（`$`）
- 底部显示合计 tokens 与总费用
- 数据来自 dsh 会话日志中供应商上报的真实 usage（按 `request/header` / `request/context` 归属到模型）；费用按 DeepSeek 公开 API 单价估算，卡片上有「仅供参考」标注

风格：深海蓝配色鲸鱼造型、纯 CSS/SVG 动画、无外部资源；系统开启 `prefers-reduced-motion` 时静止显示。

## 环境要求

- DeepSeek Harness Web 部署（`--profile web`），dsh ≥ `0.1.1-rc.2`
- pnpm 管理的 profile（dsh 默认即 `~/.dsh/profiles/web`）
- Node 与你的 dsh 部署一致（≥ 20）

## 包结构

```
ui-whale/
├── package.json              # name + exports["./client"] + dsh.client: { platform: "web" }
├── lib/index.js              # host 半边：`whale` 服务（TypertRemoteService），聚合今日用量
├── lib/client.js             # 浏览器 bundle：module-loader 注册 + shell.overlay 鲸鱼 UI
├── cordis.patch.yml.example  # 复制进 profile 的组合片段
└── README.md                 # 本文档
```

## 安装（git 方式，普通使用者推荐）

### ① 在 web profile 中安装依赖

```bash
cd ~/.dsh/profiles/web
pnpm add git+ssh://git@github.com:syhgzz/ui-whale.git
```

> npm / yarn 等价命令：`npm i git+ssh://git@github.com:syhgzz/ui-whale.git` / `yarn add git+ssh://git@github.com:syhgzz/ui-whale.git`

### ② 把插件加入组合

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，在顶层数组加入（可直接复制 `cordis.patch.yml.example`）：

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

这行是一个「组合补丁」：把 `id: ui-whale`、`name: 'ui-whale'` 这个条目追加进插件树，同时挂了两个面（逐字段解释、生效机制与排错见下文「组合行详解」）：

- **Host 面**：加载包主入口 `lib/index.js`，注册 `whale` 服务（聚合今日用量），经 Typert Gateway 暴露 `ctx.remote.whale.usage()`
- **Client 面**（`dsh.client`）：浏览器加载 `ui-whale` 的 `./client` 包，在 `shell.overlay` 渲染鲸鱼

### ③ 重启生效

```sh
# 以你平时启动 dsh web 的方式重启
dsh --profile web
```

重启后**刷新页面**即可看到鲸鱼。

> 说明：`cordis.patch.yml` 会被 dsh 的 HMR 按精确路径监听，保存后宿主侧一般无需重启即可应用；但浏览器端插件清单是页面加载时注入的，新增模块仍需刷新页面。若补丁没生效，重启 dsh 最稳妥。

---

## 安装（本地文件方式）

适用于：**内网 / 无 GitHub 权限**、**需要改源码做二次开发**、或**离线安装**。所有方式最终都是让 profile 的 `node_modules` 里出现 `ui-whale` 包，并在组合里加一行，与 git 安装等价。

先准备源码目录（任选一种）：

```bash
# 方式 A：clone（推荐）
git clone git@github.com:syhgzz/ui-whale.git ~/projects/dsh-ui-whale

# 方式 B：下载 zip 解压（GitHub 仓库页 → Code → Download ZIP）
unzip ui-whale.zip -d ~/projects && mv ~/projects/ui-whale-main ~/projects/dsh-ui-whale

# 方式 C：直接解压/复制别人发给你的源码包
```

> ⚠️ 源码目录放在**稳定路径**（如 `~/projects/`），不要放在会被清理的工作区；以下三种方式都以 `~/projects/dsh-ui-whale` 为例，请换成你自己的真实路径。

### 方式 1：pnpm `link:` 依赖（开发改码推荐）

修改源码后**无需重新安装**，重启 dsh 即生效（符号链接，改的是同一个文件）。

```bash
# ① 安装为 link 依赖（会自动在 package.json 写入 link: 依赖并建立符号链接）
cd ~/.dsh/profiles/web
pnpm add link:/home/<you>/projects/dsh-ui-whale

# 结果：package.json 的 dependencies 中出现
#   "ui-whale": "link:/home/<you>/projects/dsh-ui-whale"
# 并建立 node_modules/ui-whale -> /home/<you>/projects/dsh-ui-whale 符号链接
```

等价做法：手动编辑 `~/.dsh/profiles/web/package.json` 加入上述依赖行，再 `pnpm install`。

> npm 没有 `link:` 语义，等价写 `npm i /home/<you>/projects/dsh-ui-whale`（复制安装，改码后需重装）；yarn 用 `yarn add link:/home/<you>/projects/dsh-ui-whale`。

然后照常加入组合行（见下方「两种安装方式共用的步骤」）并重启。

**卸载（方式 1）**

```bash
cd ~/.dsh/profiles/web
pnpm remove ui-whale                       # 或手动删除 package.json 里的 link: 依赖行后 pnpm install
# 再从 cordis.patch.yml 删除 ui-whale 组合行
# 重启 dsh
```

### 方式 2：打包 tarball 离线安装（内网 / 无 git）

```bash
# ① 在源码目录打包（推荐 npm pack，只含 package.json + lib/ + README + LICENSE）
cd ~/projects/dsh-ui-whale
npm pack                                     # 生成 ui-whale-1.0.0.tgz
# 等效：git archive --format=tar.gz --output=ui-whale-1.0.0.tgz HEAD

# ② 把 tgz 拷到 profile 目录（或任意路径）
cp ui-whale-1.0.0.tgz ~/.dsh/profiles/web/

# ③ 安装为 file: 依赖（复制安装，不是链接）
cd ~/.dsh/profiles/web
pnpm add ./ui-whale-1.0.0.tgz
#   package.json 中出现 "ui-whale": "file:./ui-whale-1.0.0.tgz"
# 也可以用绝对路径：pnpm add file:/home/<you>/projects/dsh-ui-whale-1.0.0.tgz
```

> npm / yarn 等价：`npm i ./ui-whale-1.0.0.tgz` / `yarn add file:./ui-whale-1.0.0.tgz`

然后照常加入组合行（见下方「共用步骤」）并重启。

**卸载（方式 2）**

```bash
cd ~/.dsh/profiles/web
pnpm remove ui-whale
rm -f ui-whale-1.0.0.tgz                     # 可选：清理安装包
# 再从 cordis.patch.yml 删除 ui-whale 组合行
# 重启 dsh
```

升级：改完源码重新 `npm pack` → `pnpm add file:./ui-whale-新版本.tgz` → 重启。

### 方式 3：手动符号链接（最朴素，不依赖包管理器的 link 语法）

```bash
# ① 建立符号链接（profile 目录可能没有 node_modules，先创建）
mkdir -p ~/.dsh/profiles/web/node_modules
ln -sfn /home/<you>/projects/dsh-ui-whale ~/.dsh/profiles/web/node_modules/ui-whale

# ② 建议同时在 package.json 的 dependencies 写入（防止 pnpm install 时清理孤立的链接）
#   "ui-whale": "link:/home/<you>/projects/dsh-ui-whale"

# ③ 验证
ls -l ~/.dsh/profiles/web/node_modules/ui-whale
```

然后照常加入组合行（见下方「共用步骤」）并重启。

**卸载（方式 3）**

```bash
rm -f ~/.dsh/profiles/web/node_modules/ui-whale
# 若写了 package.json 依赖行，同时删除
# 再从 cordis.patch.yml 删除 ui-whale 组合行
# 重启 dsh
```

### 本地安装方式共用的最后两步

无论方式 1/2/3，安装完依赖后都还需要：

**① 加入组合行**（复制 `cordis.patch.yml.example` 内容到 `~/.dsh/profiles/web/cordis.patch.yml` 顶层数组）：

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

（与 git 安装方式完全相同；这一行的逐字段解释和生效机制见下方「组合行详解」。）

**② 重启 dsh**：

```sh
dsh --profile web
```

补丁文件本身由 HMR 监听（保存后无需重启）；但**首次**安装后重启 dsh 最稳妥，随后刷新页面即可。

---

## 组合行详解：这行 `insert` 在做什么

`cordis.patch.yml` 是 dsh 的**组合补丁文件**：顶层是一个 YAML 数组，每个元素称为一条补丁（patch）。dsh 启动时把各层的补丁按顺序叠起来——bundle 层（`package.json` 的 `dsh.profile.bundles` 声明）→ profile 自己的 `cordis.patch.yml` → 机器级 `~/.dsh/cordis.patch.yml` → `--patch` 覆盖层——得到最终的整棵插件树（`cordis.yml` 只是空根，每次启动都会被覆写，不需要也不能改它）。

```yaml
- insert:               # 插入型补丁：把下面的条目【追加】进组合列表
    - id: ui-whale      # 条目 id（省略则自动生成随机 id，建议写死）
      name: 'ui-whale'  # 条目要加载的模块说明符（必填）
```

### 补丁的两种形态

| 形态 | 写法 | 效果 |
|---|---|---|
| 插入型 | `insert: [...]` | 把数组里的条目对象追加进列表。**不写 `id`** 追加到顶层（本插件的用法；`dsh-web-app` 的 bundle 也是这么挂 `client-hmr`、`modules`、`ui-*` 等行的）；写了 `id` 则要求它指向一个 group 条目，追加进那个组的子列表 |
| 覆盖型 | `id: xxx` + 其余字段 | 按 `id` 定位已有条目并合并字段；`name` 不匹配或目标不存在时仅警告并跳过。例：`- id: ui-whale` / `disabled: true` 可临时禁用鲸鱼 |

### 这行的字段逐个看

- **`name`**：核心字段，模块说明符。loader 对它执行 `import('ui-whale')`，以 profile 为基准（`baseUrl` 锚定在 `cordis.yml`）解析到 `node_modules/ui-whale`，加载包主入口 `lib/index.js`（host 半边）。这解释了为什么必须先装依赖：没装会在启动时报 `failed to import loader entry ...`。
- **`id`**：条目在 loader 树里的唯一键，供日志与后续补丁定位（如上面的 `disabled: true`）。注意：浏览器侧 bundle 的 id 用的是**包名**（条目的 `name`），所以验证 URL 是 `/plugins/ui-whale/client.js`，与这里写的 `id` 无关。
- **`config` / `disabled`**：可选。ui-whale host 面没有可配置项，因此这行只有 `id` + `name`。

### 为什么「一行」能同时挂两个面

- **Host 面（直接）**：条目 `name` 导入 `lib/index.js`，`WhaleUsageService extends TypertRemoteService` 构造时注册 `whale` 服务并绑定 Typert Gateway——即 `ctx.remote.whale.usage()` 的源头。
- **Client 面（间接）**：`dsh-web-app` 里的 `modules` 行（`dsh-client-modules`）扫描**已挂载**的 loader 条目：只要条目 `name` 指向的包声明了 `dsh.client`（`platform: "web"`）且 `exports["./client"]` 存在，就把该包写进 web 启动图 `window.__DSH_BOOT__`（随 index.html 注入），并挂出 `/plugins/<包名>/client.js?rev=…` 路由。浏览器模块系统加载该 bundle（`lib/client.js` 内部 `window.__ModuleLoader__.load({ id: 'ui-whale', factory })`），按 `dsh.client.inject` 声明的运行时依赖就绪后调用 `apply(ctx)`，鲸鱼渲染进 `shell.overlay` 槽位。

  > 反例：声明了 `dsh.client` 但缺少 `exports["./client"]`（或产物缺失）会在启动时报 `client-modules:` 聚合错误；反之不声明 `dsh.client` 则只是没有浏览器半边——鲸鱼不出现，但 host 的 `whale` 服务照常工作。

### 生效时机

- 补丁文件由 dsh 的 HMR 按精确路径监听：保存 `cordis.patch.yml` 后宿主侧重新解析并应用，**一般无需重启**；但浏览器端插件清单是在页面加载时注入的，新增模块需要**刷新页面**才看得到鲸鱼。
- 排错顺序：① 缩进是否为顶层列表项（与原有条目同级）→ ② 依赖是否装好（`ls ~/.dsh/profiles/web/node_modules/ui-whale`）→ ③ 重启后看启动日志（`failed to import loader entry` / `client-modules:` / `patch:` 警告）→ ④ 刷新页面 → ⑤ 浏览器控制台。

---

## 使用

- 点击鲸鱼 → 喷水 + 弹今日账单（约 6.5 秒后自动消失）
- 悬浮层不遮挡页面交互（除鲸鱼本体外点击穿透）

## 验证安装成功

- 启动日志没有 `client-modules:` 开头的错误
- `curl http://127.0.0.1:<web端口>/plugins/ui-whale/client.js` 返回 200 与 bundle 内容
- 刷新页面后鲸鱼出现

## 卸载（总述）

无论用哪种方式安装，卸载都做三件事：

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `ui-whale` 的 `insert` 块
2. 移除依赖：`pnpm remove ui-whale`（方式 1 / 2）；方式 3 则是 `rm` 掉符号链接（+ 删 package.json 里的依赖行）
3. 重启 `dsh --profile web`

## 常见问题

**鲸鱼没出现？**
- 确认 `insert` 块缩进为顶层列表项、与原有条目同级
- 确认安装成功：`ls ~/.dsh/profiles/web/node_modules/ui-whale` 存在（方式 1/3 应看到 `->` 符号链接）
- 刚改过组合文件？先**刷新页面**（新增模块不会自动推送给已打开的页面）；没生效再重启 dsh 进程
- 浏览器控制台查看是否有 `ui-whale` 相关加载错误

**`pnpm add link:...` 报 peer 依赖警告？**
- `@deepseek-ai/cordis`、`@deepseek-ai/dsh-typert-protocol` 由 dsh 自带插件树提供，警告可忽略；确认 profile 的 lockfile 正常 `pnpm install` 即可

**点鲸鱼显示「账单掉进海里了」？**
- 一般是 host 面 `whale` 服务未注册（检查组合行或启动日志中的 typert 报错）
- 若完全没有任何调用记录，应显示「今天还没有吐过泡泡呢～」；显示错误则说明 RPC 链路有问题

**费用准吗？**
- token 是供应商上报的真实用量；费用按 DeepSeek 公开单价（输入 $0.28/M、缓存命中 $0.028/M、输出 $0.42/M）估算，不同计费计划有差异，界面已标注「仅供参考」

**改颜色 / 游速 / 大小？**
- 所有样式在 `lib/client.js` 顶部的 `CSS` 常量里（游速 `70s`、大小 `150px`、渐变颜色等）
- 方式 1 / 3（链接安装）改 `lib/client.js` 后**无需重启**：dsh 的 client-hmr 会轮询该 bundle，已打开的页面自动热替换；改 `lib/index.js`（host 半边）需重启 dsh
- 方式 2（tarball）需重新打包安装；git 安装用 `pnpm update ui-whale`

## 原理速览

```
浏览器 (lib/client.js)                    Host (lib/index.js)
─────────────────────                    ───────────────────
shell.overlay 渲染鲸鱼                     Service 'whale'
点击 → ctx.remote.whale.usage()  ───────→  sessionQuery 读取所有会话日志
今日账单泡泡卡 ←────── JSON 结果 ──────────  按模型聚合今日 usage + 价格表估算
```

Client ↔ Host 通过 dsh 自带 Typert Gateway 的 JSON RPC 通信；本包手写 `src-json` 编码的 Remote 贡献，无需依赖构建管线。

## License

MIT
