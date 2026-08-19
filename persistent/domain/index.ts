/**
 * Floating directory-tree plugin, host half: a Typert Remote service that
 * lists the current session's workspace one level at a time (lazy listing,
 * filename-heuristic directory detection, no fs.stat probe).
 * @module @deepseek-ai/dsh-dir-tree
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { FileSystem } from '@deepseek-ai/dsh-fs'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { TreeData, TreeNode } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    dirTree: DirTreeService
  }
}

/**
 * List one directory level. Directories are detected with the filename
 * heuristic (a basename without `.` is treated as a directory) so no
 * `fs.stat` round-trip is needed; directories carry an empty `children` list
 * the client fills lazily on expansion.
 * @param fs - filesystem service (optional; absence yields an empty listing).
 * @param dirPath - absolute or backend-resolvable directory path.
 */
async function listOneLevel(fs: FileSystem | undefined, dirPath: string): Promise<TreeNode[]> {
  if (fs === undefined || dirPath === '') return []
  try {
    const target = await fs.resolve(dirPath)
    const entries = await fs.listDir(target)
    const result: TreeNode[] = []
    for (const entry of entries) {
      const entryName = entry.name
      if (entryName.startsWith('.')) continue
      const entryPath = fs.processPath(entry.target)
      const isDirectory = !entryName.includes('.')
      const node: TreeNode = { name: entryName, path: entryPath, isDirectory }
      if (isDirectory) node.children = []
      result.push(node)
    }
    result.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return result
  } catch {
    return []
  }
}

/** Host Remote service exposing the lazy directory tree over the session Agent identity. */
export class DirTreeService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'dirTree')
  }

  private fs(): FileSystem | undefined {
    return this.ctx.get('fs')
  }

  @Remote('listTree')
  async listTree(agent: Agent, args: { maxDepth?: number }): Promise<TreeData> {
    const root = agent.session.header.cwd ?? ''
    if (args.maxDepth !== undefined && args.maxDepth <= 0) return { root, tree: [] }
    const tree = await listOneLevel(this.fs(), root)
    return { root, tree }
  }

  @Remote('listChildren')
  async listChildren(agent: Agent, args: { path: string }): Promise<TreeNode[]> {
    // `agent` is resolved by the gateway from the wire identity; the listing
    // itself is path-scoped and reads no session state.
    void agent
    if (!args.path) return []
    return await listOneLevel(this.fs(), args.path)
  }
}

export default DirTreeService
