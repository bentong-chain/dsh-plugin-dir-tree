# dsh-plugin-dir-tree

> DeepSeek Harness (DSH) 插件：以浮窗展示**当前工作区**的目录树，支持**拖拽**文件/文件夹路径到对话框、双击复制、搜索过滤、懒加载展开。

A floating workspace **directory-tree** plugin for DeepSeek Harness (DSH), with drag-and-drop paths, double-click copy, search, and lazy-loading.

## 功能 Features

- 📁 浮窗展示工作区目录树，右下角可最小化
- 🌲 懒加载：点击 `▶` 展开子目录，避免大目录卡死
- 🖱️ 拖拽文件/文件夹到对话框，自动填入完整路径
- 📋 双击复制路径；单击选中
- 🔍 搜索过滤文件名
- 🎨 文件类型图标 + 目录 📁/📂 蓝色高亮 + 缩进树形线
- 🪟 可拖动浮窗位置

## 截图 Screenshots

### 主界面（浮窗 + 目录树）

![主界面](docs/screenshot-main.png)

右下角浮窗「📁 当前工作区」，顶部是完整路径，下面是树形目录：文件夹蓝色 + `📁` 图标 + `▶` 展开箭头，文件带类型图标。

### 拖拽路径到对话框（动图）

![拖拽演示](docs/drag-drop.gif)

拖拽任意文件/文件夹节点到对话框输入框，自动填入完整路径。

### 懒加载展开（动图）

![懒加载展开](docs/lazy-load.gif)

点击文件夹的 `▶` 展开子目录，只加载当前层，大目录不卡顿。

### 最小化 / 恢复

![最小化](docs/minimize.gif)

点 `−` 或 `×` 后浮窗收起，右下角出现蓝色「📁 目录树」按钮，点击恢复。

---

## 两种形态 Two Forms

本仓库提供两种形态，按需选用：

| 形态 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **A 动态插件**（`dynamic/`） | 自包含 JS 代码 | 开箱即用，无需 checkout/构建 | 重启后需重新运行 |
| **B 持久化插件**（`persistent/`） | 域包 + UI 包源码 | 重启自动加载，正确跟随会话工作区 | 需在 DSH checkout 里构建 |

---

## 形态 A：动态插件（最便携）

自包含代码，任何 DSH 用户都能直接使用。

### 安装 / 使用

1. 打开 `dynamic/host.js` 和 `dynamic/client.js`，把内容分别作为 `code.host` 和 `code.client`
2. 用 `cordis_define` 提交（`idPrefix` 如 `dirt`），再 `cordis_run` 激活
3. 右下角出现「📁 当前工作区」浮窗

### 注意

- **重启 DSH 后需重新 define + run**（动态插件只存在进程内存里）
- 动态插件展示的是 `workspaceRegistry` 的第一个工作区（最近创建的那个）；若需**精确跟随当前会话工作区**，用形态 B

---

## 形态 B：持久化插件（标准）

拆成两个包（对齐 DSH 官方 goal 的域包 + UI 包架构）：

- `@deepseek-ai/dsh-dir-tree`（**域包**，`persistent/domain/`）：Host `DirTreeService` + `@Remote` 服务，读 `agent.session.header.cwd` 精确取**当前会话工作区**
- `@deepseek-ai/dsh-client-ui-dir-tree`（**UI 包**，`persistent/ui/`）：客户端浮窗 UI
- api-remotes 挂载 `dirTreeRemote`（一处改动，见 `persistent/API_REMOTES_PATCH.md`）

### 安装步骤

1. 把 `persistent/domain/` 放到 DSH checkout 的 `packages/dir-tree/dir-tree/`
2. 把 `persistent/ui/` 放到 `packages/client/ui-dir-tree/`
3. 按 `persistent/API_REMOTES_PATCH.md` 修改 `packages/api/remotes/`（3 个文件）
4. 把两个包注册进根 `tsconfig.client.json` / `tsconfig.host.json`
5. 构建：

```bash
pnpm install
pnpm run build:lib:host     # tsc -b + tsdown（含 typert 代码生成）
pnpm run build:lib:client
```

6. 在宿主组合（`$DSH_HOME/profiles/<profile>/cordis.patch.yml`）里加两行：

```yaml
- insert:
    - id: dir-tree
      name: '@deepseek-ai/dsh-dir-tree'
    - id: ui-dir-tree
      name: '@deepseek-ai/dsh-client-ui-dir-tree'
```

7. 重启 DSH → 右下角出现浮窗，切换工作区自动跟随

### 为什么形态 B 能精确跟随工作区

域包的 `@Remote` 方法第一个参数是 `agent: Agent`（由网关从浏览器会话身份解析），用 `agent.session.header.cwd` 拿到**本会话**的工作区。每个会话各挂一份，切换工作区即切换到对应会话，目录树自动跟随。

---

## 技术要点 Technical Notes

- **目录判断**：`FsDirEntry.isDirectory` 是 getter 且不可靠（`!!` 也可能失效），对每个条目调用 `fs.stat`/`fs.listDir` 会卡死。故采用**文件名启发式**（无 `.` → 目录）+ **懒加载**（只列一层，展开时再列子目录）。
- **JSON 安全**：文件节点不设 `children` 字段（`undefined` 不是合法 JSON），目录节点设 `children: []`。
- **形态 B 的 RPC**：`@Remote` Service + Typert 代码生成（生成 `typert.host.js` / `typert.remote-client.js`），客户端通过 `ctx.remote.dirTree.listTree(sessionId, {})` 调用。

## License

MIT
