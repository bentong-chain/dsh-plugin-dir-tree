// 形态 C：标准第三方 bundle — Host 半
// 用 ctx.connection.rpc.handle 注册一条第三方 RPC 通道（不依赖 api-remotes / Typert）
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const name = 'dir-tree'
export const inject = ['connection']

// 列一层目录。用 readdir({ withFileTypes: true }) 直接拿 Dirent.isDirectory()，
// 不做逐条 stat，大目录不卡。
async function listOne(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const nodes = []
    for (const e of entries) {
      const n = e.name
      if (n.startsWith('.')) continue // 跳过隐藏文件
      const isDir = e.isDirectory()
      nodes.push({ name: n, path: join(dir, n), isDirectory: isDir })
    }
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return nodes
  } catch (e) {
    return []
  }
}

export function apply(ctx) {
  // 用 ctx.effect 包住，dispose 时自动移除路由
  ctx.effect(() => ctx.connection.rpc.handle(
    '/dirtree',
    async (endpoint, payload) => {
      if (endpoint !== 'list') {
        return { ok: false, error: { code: 'bad-request', message: `unknown method: ${endpoint}`, details: { issues: [] } } }
      }
      const path = (payload && typeof payload === 'object') ? payload.path : undefined
      if (typeof path !== 'string' || path === '') {
        return { ok: false, error: { code: 'bad-request', message: 'path is required', details: { issues: [] } } }
      }
      const nodes = await listOne(path)
      return { ok: true, value: { path, nodes } }
    },
    { authority: 'loopback' },
  ), 'dir-tree: rpc')
}
