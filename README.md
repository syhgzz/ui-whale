# 🐳 ui-whale

## 安装

### 方式一：网络安装（git）

**① 安装依赖**

```bash
cd ~/.dsh/profiles/web
pnpm add git+ssh://git@github.com:syhgzz/ui-whale.git
```

> 依赖 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-typert-protocol` 是 `peerDependencies`，pnpm 会自动装好。
> npm / yarn 等价命令：`npm i git+ssh://git@github.com:syhgzz/ui-whale.git` / `yarn add git+ssh://git@github.com:syhgzz/ui-whale.git`

**② 加入组合**

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，把默认的 `[]` 替换为（也可直接复制 `cordis.patch.yml.example`）：

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

**③ 重启并刷新**

```bash
dsh --profile web
```

重启后刷新页面。

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

> ⚠️ 必须在源码目录执行：装好 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-typert-protocol` 两个 peer 依赖到仓库 `node_modules`。符号链接安装时包内 import 从仓库真实路径解析，缺了它们启动会报 `failed to import loader entry`。

**③ 安装到 profile**

```bash
cd ~/.dsh/profiles/web
pnpm add link:/home/<you>/projects/dsh-ui-whale
```

> npm / yarn 等价命令：`npm i /home/<you>/projects/dsh-ui-whale`（复制安装，改码后需重装）/ `yarn add link:/home/<you>/projects/dsh-ui-whale`

**④ 加入组合**（同方式一 ②，编辑 `~/.dsh/profiles/web/cordis.patch.yml`）

```yaml
- insert:
    - id: ui-whale
      name: 'ui-whale'
```

**⑤ 重启并刷新**

```bash
dsh --profile web
```

重启后刷新页面。

## 卸载

**① 移除依赖**（包名是 `ui-whale`，不是源码目录名 `dsh-ui-whale`）

```bash
cd ~/.dsh/profiles/web
pnpm remove ui-whale
```

**② 确认链接已删除**（`pnpm remove` 偶尔不会清掉旧的符号链接，残留的链接会让鲸鱼继续出现）

```bash
ls -l ~/.dsh/profiles/web/node_modules/ui-whale   # 应报 No such file
rm -f ~/.dsh/profiles/web/node_modules/ui-whale   # 若仍存在则手动删除
```

**③ 删除组合行**

从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `ui-whale` 的 `insert` 块。

**④ 重启**

```bash
dsh --profile web
```
