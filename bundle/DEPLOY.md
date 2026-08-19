# 部署与分发（形态 C：标准 bundle）

本目录是**形态 C 标准第三方 bundle**，应作为**独立 git 仓库 / npm 包**分发（不是放在三形态展示仓库的 `bundle/` 子目录里，那样 `dsh plugin add` 找不到根 package.json）。

## 一、目录结构

```
dsh-dir-tree/          ← 仓库根（package.json 在这里）
├── package.json       # dsh.bundle + dsh.client + prepare 构建脚本
├── cordis.patch.yml   # 插入插件行（id: dir-tree → name: dsh-dir-tree）
├── index.js           # Host 半（connection.rpc.handle + node:fs 列目录）
├── client.js          # Client 半源码（浮窗 UI + connection.rpc.call）
├── client.bundle.js   # 构建产物（prepare 生成，勿手改）
└── build.mjs          # prepare 脚本：esbuild 打包 client.js → client.bundle.js
```

## 二、本地构建（测试前必做）

`client.bundle.js` 是构建产物，安装前必须生成：

```bash
cd dsh-dir-tree
npm install        # 装 esbuild（devDependencies）
node build.mjs     # 生成 client.bundle.js
```

## 三、发布到 GitHub（供 git 安装）

1. 把**本目录的内容**建成一个独立 git 仓库：

```bash
git init
git add .
git commit -m "dsh-dir-tree: 浮窗目录树标准 bundle"
git branch -M main
git remote add origin https://github.com/<你的用户名>/dsh-dir-tree.git
git push -u origin main
```

2. 打 topics：`dsh-plugin`、`deepseek-harness`、`dsh`、`cordis`、`directory-tree`

## 四、用户安装

### git 安装

```bash
dsh plugin add github:<你的用户名>/dsh-dir-tree
```

首次会提示在 profile 的 `pnpm-workspace.yaml` 加：

```yaml
allowBuilds:
  dsh-dir-tree: true
```

复制后重新执行 `dsh plugin add`。之后重启 DSH 生效。

### npm 安装（可选）

```bash
npm publish          # 作者先构建并发布
# 用户安装
dsh plugin add dsh-dir-tree
```

## 五、验证清单

- [ ] 右下角出现「📁 当前工作区」浮窗
- [ ] 目录正常加载（不卡「加载中」）
- [ ] 点击 `▶` 懒加载展开子目录
- [ ] 拖拽文件/文件夹到对话框填入路径
- [ ] **切换工作区/会话，目录自动跟随**（核心）
- [ ] 点 `−`/`×` 最小化，右下角按钮恢复

## 六、已知待验证项

本 bundle 基于 DSH 源码调研编写，`connection.rpc` 的 API 已确认，但**整条链路尚未实测**，重点验证：

1. `build.mjs` 的 esbuild 打包格式（`window.__ModuleLoader__.load` 包装）是否被 `clientModules` 正确识别
2. client 半的 `inject: ['slots','sessions','connection']` 在 bundle 环境能否解析
3. `authority: 'loopback'` 是否适用于部署

测试报错请反馈，据此修正 bundle 代码。
