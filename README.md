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

这行同时挂了两个面：

- **Host 面**：包主入口注册 `whale` 服务（聚合今日用量），经 Typert Gateway 暴露 `ctx.remote.whale.usage()`
- **Client 面**（`dsh.client`）：浏览器加载 `ui-whale` 的 `./client` 包，在 `shell.overlay` 渲染鲸鱼

### ③ 重启生效

```sh
# 以你平时启动 dsh web 的方式重启；组合只在启动时读取，没有热加载
dsh --profile web
```

重启后刷新页面即可看到鲸鱼。

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

**② 重启 dsh**（组合只在启动时读取，没有热加载）：

```sh
dsh --profile web
```

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
- 重启 dsh 进程后再看（组合只在启动时读取）
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
- 方式 1 / 3（链接安装）改完重启即生效；方式 2（tarball）需重新打包安装；git 安装用 `pnpm update ui-whale`

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
