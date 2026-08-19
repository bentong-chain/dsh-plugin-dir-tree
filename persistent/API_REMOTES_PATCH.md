# api-remotes 挂载 dirTreeRemote 的改动

形态 B（持久化插件）需要让 `@deepseek-ai/dsh-api-remotes` 挂载 dir-tree 域包的 `/remote` 贡献，
从而提供 `remote.dirTree` 命名空间（UI 包 `inject: ['remote.dirTree']` 依赖它）。

共改 3 个文件，改动如下：

## 1. `packages/api/remotes/src/client/index.ts`

### 1a. 增加导入（在其它 `...Remote` 导入附近）：

```ts
import dirTreeRemote from '@deepseek-ai/dsh-dir-tree/remote'
```

### 1b. 增加类型导入（在 `export type {}` 附近）：

```ts
export type {} from '@deepseek-ai/dsh-dir-tree/remote'
```

### 1c. 把 `dirTreeRemote` 加进挂载列表：

```ts
for (const contribution of [
  commandsRemote, goalsRemote, dynamicRemote, pluginInventoryRemote, messageFeedbackRemote, dirTreeRemote,
]) {
  disposers.push(await ctx.remote.$mount(contribution))
}
```

## 2. `packages/api/remotes/package.json`

在 `peerDependencies` 和 `devDependencies` 里各加一行：

```json
"@deepseek-ai/dsh-dir-tree": "workspace:^"
```

## 3. `packages/api/remotes/tsconfig.client.json`

在 `references` 数组里加一条（指向 dir-tree 域包的 host face）：

```json
{ "path": "../../dir-tree/dir-tree/tsconfig.host.json" }
```

---

改动完成后，重新构建 api-remotes 的 client bundle（`pnpm run build:lib:client`），
`lib/client.js` 会把 `dirTreeRemote` 内联进去，浏览器端即可通过 `ctx.remote.dirTree` 访问。
