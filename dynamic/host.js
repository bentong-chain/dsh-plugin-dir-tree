// ============================================================================
// 形态 A：动态插件 — Host 半（在 DSH 进程内运行）
//
// 用法：
//   1. 把本文件内容作为 code.host，配合 dynamic/client.js 作为 code.client，
//      通过 cordis_define 提交（idPrefix 如 "dirt"）
//   2. cordis_run 激活
//   3. 重启 DSH 后需重新 define + run（动态插件不持久化）
//
// 功能：读取工作区目录树（一层懒加载），供 Client 半的浮窗 UI 调用。
// ============================================================================

return {
  apply(ctx) {
    const fs = ctx.get('fs')
    if (fs === undefined) return

    // 工作区根目录：优先 workspaceRegistry 的第一个（最近创建的工作区）
    function getRoot() {
      const wr = ctx.get('workspaceRegistry')
      if (wr) {
        try {
          const list = wr.list()
          if (list.length > 0) return String(list[0].path)
        } catch (e) {}
      }
      const sp = ctx.get('sandboxPolicy')
      return sp ? String(sp.workspaceRoot) : ''
    }

    // 列一层目录。目录用文件名启发式判断（无 `.` → 目录），
    // 不对每个条目调用 fs.stat/fs.listDir（会卡死）。
    async function listOne(dir) {
      try {
        const target = await fs.resolve(dir)
        const entries = await fs.listDir(target)
        const result = []
        for (const e of entries) {
          const name = String(e.name)
          if (name.startsWith('.')) continue // 跳过隐藏文件
          const path = String(await fs.processPath(e.target))
          const isDirectory = name.indexOf('.') === -1
          const node = { name, path, isDirectory }
          if (isDirectory) node.children = [] // 目录：空 children，客户端懒加载填充
          result.push(node)
        }
        result.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        return result
      } catch (e) {
        return []
      }
    }

    harness.handle('list-tree', async (args) => {
      // 优先用 Client 传入的当前会话 cwd（args.root），缺省才回退到 getRoot()
      const root = (args && typeof args.root === 'string' && args.root) ? args.root : getRoot()
      return { root, tree: await listOne(root) }
    })

    harness.handle('list-children', async (args) => {
      if (!args || !args.path) return []
      return await listOne(args.path)
    })
  },
}
