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

## 安装（第三方 / git 方式，推荐）

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

## 安装（本地开发方式）

改代码开发时，用相对路径依赖替代 git 依赖：

```bash
cd ~/.dsh/profiles/web
# package.json 的 dependencies 加入：
#   "ui-whale": "link:/绝对/路径/ui-whale"
pnpm install   # 自动建立 node_modules 链接
```

组合行同上（`cordis.patch.yml` 的 `ui-whale` 行），重启生效。

## 使用

- 点击鲸鱼 → 喷水 + 弹今日账单（约 6.5 秒后自动消失）
- 悬浮层不遮挡页面交互（除鲸鱼本体外点击穿透）

## 验证安装成功

- 启动日志没有 `client-modules:` 开头的错误
- `curl http://127.0.0.1:<web端口>/plugins/ui-whale/client.js` 返回 200 与 bundle 内容
- 刷新页面后鲸鱼出现

## 卸载

```bash
cd ~/.dsh/profiles/web

# 1. 从 cordis.patch.yml 删除上面的 insert 块
# 2. 移除依赖
pnpm remove ui-whale
#    （本地开发方式还需删除 package.json 里的 link: 依赖行）
# 3. 重启 dsh 进程
```

## 常见问题

**鲸鱼没出现？**
- 确认 `insert` 块缩进为顶层列表项、与原有条目同级
- 确认 `pnpm add` 成功、`node_modules/ui-whale` 存在
- 重启 dsh 进程后再看（组合只在启动时读取）
- 浏览器控制台查看是否有 `ui-whale` 相关加载错误

**点鲸鱼显示「账单掉进海里了」？**
- 一般是 host 面 `whale` 服务未注册（检查安装第 ② 步或启动日志中的 typert 报错）
- 若完全没有任何调用记录，应显示「今天还没有吐过泡泡呢～」；显示错误则说明 RPC 链路有问题

**费用准吗？**
- token 是供应商上报的真实用量；费用按 DeepSeek 公开单价（输入 $0.28/M、缓存命中 $0.028/M、输出 $0.42/M）估算，不同计费计划有差异，界面已标注「仅供参考」

**改颜色 / 游速 / 大小？**
- 所有样式在 `lib/client.js` 顶部的 `CSS` 常量里（游速 `70s`、大小 `150px`、渐变颜色等），git 依赖更新用 `pnpm update ui-whale`（本地开发方式直接改文件重启）

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
