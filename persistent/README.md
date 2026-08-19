# 形态 B：持久化插件文件布局

本目录的源码文件按**扁平化命名**存放，重建到 DSH checkout 时需还原到各自的 `src/` 子目录。
映射关系如下：

## 域包 `@deepseek-ai/dsh-dir-tree`（→ `packages/dir-tree/dir-tree/`）

| 本目录文件 | checkout 落点 |
|-----------|---------------|
| `domain/index.ts` | `packages/dir-tree/dir-tree/src/index.ts` |
| `domain/types.ts` | `packages/dir-tree/dir-tree/src/types.ts` |
| `domain/package.json` | `packages/dir-tree/dir-tree/package.json` |
| `domain/tsconfig.json` | `packages/dir-tree/dir-tree/tsconfig.json` |
| `domain/tsconfig.host.json` | `packages/dir-tree/dir-tree/tsconfig.host.json` |
| `domain/tsdown.config.ts` | `packages/dir-tree/dir-tree/tsdown.config.ts` |

## UI 包 `@deepseek-ai/dsh-client-ui-dir-tree`（→ `packages/client/ui-dir-tree/`）

| 本目录文件 | checkout 落点 |
|-----------|---------------|
| `ui/index.ts` | `packages/client/ui-dir-tree/src/index.ts` |
| `ui/client.ts` | `packages/client/ui-dir-tree/src/client/index.ts` |
| `ui/package.json` | `packages/client/ui-dir-tree/package.json` |
| `ui/tsconfig.json` | `packages/client/ui-dir-tree/tsconfig.json` |
| `ui/tsdown.config.ts` | `packages/client/ui-dir-tree/tsdown.config.ts` |

## 根级 tsconfig 引用

### `tsconfig.client.json`（根）
- 新增：`{ "path": "./packages/client/ui-dir-tree" }`
- （域包 host face 已在 `tsconfig.host.json` 里，无需在 client 聚合里再加）

### `tsconfig.host.json`（根）
- 新增：`{ "path": "./packages/dir-tree/dir-tree/tsconfig.host.json" }`

## 构建顺序

```bash
pnpm install
pnpm run build:lib:host     # tsc -b + tsdown（含 typert 代码生成）
pnpm run build:lib:client
```

## 依赖说明

- 域包依赖：`@deepseek-ai/dsh-typert-protocol`、`@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-fs`、`@deepseek-ai/dsh-session`、`@deepseek-ai/cordis`、`zod`
- UI 包依赖：`@deepseek-ai/dsh-dir-tree`（remote 类型）、`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-api-remotes`、`@deepseek-ai/cordis`、`react`、`zod`

> 注：这两个包原为 DSH 内部的在制品包（`private: true`、版本 `0.1.0`），若要走 DSH 完整的
> release 门禁（`check-workspace-constraints` / `verify-package-invariants`），需对照
> `packages/client/ui-goal` 补 `invariant` 伴生包、`publishConfig`、`repository`、对齐版本号。
