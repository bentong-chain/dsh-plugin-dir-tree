/**
 * Shared wire vocabulary for the directory tree. Type-only so both the Host
 * Remote service and the browser Client plugin compile this one file; the
 * generated Remote boundary imports these names from the package `./types`
 * subpath.
 * @module @deepseek-ai/dsh-dir-tree/types
 */

/** One directory-tree node. Directories carry an (initially empty) children list. */
export interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: TreeNode[]
}

/** Root listing result: the workspace root path plus its one-level tree. */
export interface TreeData {
  root: string
  tree: TreeNode[]
}
