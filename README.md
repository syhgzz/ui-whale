# dsh-client-ui-whale

一个纯浏览器端(Client)插件包:在 DeepSeek Harness Web GUI 的全局浮动层
(`shell.overlay`)注册一只卡通鲸鱼。

## 效果

- 鲸鱼从屏幕一侧缓缓游到另一侧(一圈约 58 秒),上下浮动、尾巴摆动
- 点击鲸鱼会喷出水花
- 挂在浮动层上,不挡任何操作;系统开启 `prefers-reduced-motion` 时静止显示

## 包结构

```
ui-whale/
├── package.json      # name + exports["./client"] + dsh.client: { platform: "web" }
├── lib/index.js      # host 半边:空 apply,只为让插件出现在 host loader 组合里
├── lib/client.js     # 浏览器 bundle:module-loader 注册 + shell.overlay 里的鲸鱼 UI
└── README.md         # 本文档
```

## 安装

### ① 放置包源码

把本目录放到一个**稳定路径**(不要放在会被重置的工作区),例如:

```sh
mv ui-whale ~/projects/dsh-ui-whale
```

### ② 接进 web profile(共 3 处)

**1. 在 `~/.dsh/profiles/web/package.json` 加依赖**(绝对路径):

```json
"dependencies": {
  "dsh-client-ui-whale": "link:/Users/<you>/projects/dsh-ui-whale"
}
```

**2. 让 loader 能解析到它**:建立符号链接;或在 profile 目录执行 `pnpm install`
(会自动按 `link:` 依赖建立)。

```sh
mkdir -p ~/.dsh/profiles/web/node_modules
ln -s /Users/<you>/projects/dsh-ui-whale \
      ~/.dsh/profiles/web/node_modules/dsh-client-ui-whale
```

**3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 插入组合行**:

```yaml
- insert:
    - id: ui-whale
      name: 'dsh-client-ui-whale'
```

### ③ 重启生效

```sh
dsh --profile web
```

重启后刷新页面即可看到鲸鱼。插件集合在启动时组合,**改完必须重启**,没有热加载。

## 原理

`cordis.patch.yml` 里 `ui-whale` 行的包在 `package.json` 中声明了
`dsh.client: { platform: "web" }`(由 `@deepseek-ai/dsh-client-modules` 节点半边识别):

1. 启动时它扫描组合树中声明了 `dsh.client` 的行,解析每个包的 `exports["./client"]`
2. 编入 `window.__DSH_BOOT__`,并经 `GET /plugins/<包名>/client.js` 提供给浏览器
3. 浏览器端 Cordis 挂载该插件后,在 `shell.overlay` 注册 `whale-friend` 视图

## 验证

- 启动日志没有 `client-modules:` 开头的错误
- `curl http://127.0.0.1:3080/plugins/dsh-client-ui-whale/client.js` 返回 200 与 bundle 内容
- 刷新页面后鲸鱼出现

## 卸载

1. 从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `ui-whale` 行
2. 从 `~/.dsh/profiles/web/package.json` 删除依赖
3. 删除 `~/.dsh/profiles/web/node_modules/dsh-client-ui-whale` 链接
4. 重启 `dsh --profile web`

## 修改与自检

`lib/client.js` 是手写的 module-loader bundle(plain JS,无 TS/JSX):
改完先 `node --check lib/client.js` 过语法,再重启 web 进程生效。

> 提示:`dsh-client-ui-whale` 是 out-of-tree 本地包,不随 `dsh` 升级;
> 卸载后重启即完全移除。

## 当前机器状态(已安装)

| 项目 | 状态 |
| --- | --- |
| 包源码 | `/Users/zhouzhuo/repos/test/packages/ui-whale` |
| profile 依赖 | `~/.dsh/profiles/web/package.json` → `link:` ✅ |
| 符号链接 | `~/.dsh/profiles/web/node_modules/dsh-client-ui-whale` ✅ |
| 组合行 | `~/.dsh/profiles/web/cordis.patch.yml` 的 `ui-whale` ✅ |
| 生效 | 需重启 `dsh --profile web` |
# ui-whale
