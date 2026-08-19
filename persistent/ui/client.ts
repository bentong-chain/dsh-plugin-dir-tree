/**
 * Floating directory-tree plugin, browser half: a `shell.overlay` slot entry
 * that renders the current session's workspace tree and loads children
 * lazily through the generated `dirTree` Remote API.
 * @module @deepseek-ai/dsh-client-ui-dir-tree/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-layout SlotMap merge (the `shell.overlay` seat).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the generated `dirTree` Remote namespace into ctx.remote.
import type {} from '@deepseek-ai/dsh-dir-tree/remote'
// Type-only: the shared wire vocabulary now lives in the domain package.
import type { TreeData, TreeNode } from '@deepseek-ai/dsh-dir-tree/types'
import React from 'react'

const C = {
  bg: '#1e1e2e',
  bg2: '#313244',
  border: '#45475a',
  text: '#cdd6f4',
  text2: '#a6adc8',
  accent: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
}

function getFileIcon(name: string, isDir: boolean): string | null {
  if (isDir) return null
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext || ext === name) return '📄'
  const m: Record<string, string> = {
    js: '🟨', jsx: '🟨', mjs: '🟨', cjs: '🟨',
    ts: '🟦', tsx: '🟦', json: '📋', md: '📝',
    css: '🎨', scss: '🎨', less: '🎨',
    html: '🌐', htm: '🌐', py: '🐍', go: '🔵', rs: '🦀', java: '☕',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️', ico: '🖼️',
    pdf: '📕', zip: '📦', tar: '📦', gz: '📦', rar: '📦', '7z': '📦',
    vue: '💚', svelte: '🟠',
    yml: '⚙️', yaml: '⚙️', toml: '⚙️', lock: '⚙️',
    sh: '💻', bash: '💻', ps1: '💻', bat: '💻', sql: '🗄️',
    test: '🧪', spec: '🧪',
  }
  return m[ext] || '📄'
}

function filterTree(nodes: TreeNode[], term: string): TreeNode[] {
  if (!term) return nodes
  const lower = term.toLowerCase()
  const result: TreeNode[] = []
  for (const node of nodes) {
    const nameMatch = node.name.toLowerCase().includes(lower)
    const fc = node.children ? filterTree(node.children, term) : []
    if (nameMatch || fc.length > 0) {
      const clone: TreeNode = { name: node.name, path: node.path, isDirectory: node.isDirectory }
      if (node.children) clone.children = nameMatch ? node.children : fc
      result.push(clone)
    }
  }
  return result
}

function countNodes(nodes: TreeNode[]): number {
  let n = 0
  for (const node of nodes) {
    n++
    if (node.children) n += countNodes(node.children)
  }
  return n
}

function TreeNodeComponent(p: {
  node: TreeNode
  depth: number
  isLast: boolean
  ancestorIsLast: boolean[]
  expandedState: Record<string, boolean>
  onToggle: (path: string) => void
  loadingPaths: Record<string, boolean>
  onLoadChildren: (path: string) => void
  selectedPath: string | null
  onSelect: (path: string) => void
}): React.ReactElement {
  const { node, depth, isLast, ancestorIsLast } = p
  const expanded = !!p.expandedState[node.path]
  const hasChildren = node.isDirectory
  const isSelected = p.selectedPath === node.path
  const childrenLoading = p.loadingPaths[node.path]
  const [copied, setCopied] = React.useState(false)

  const doCopy = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(node.path).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [node.path])

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    p.onSelect(node.path)
    if (node.isDirectory && p.onToggle) {
      p.onToggle(node.path)
      if (!node.children || node.children.length === 0) {
        p.onLoadChildren(node.path)
      }
    }
  }, [node.isDirectory, node.path])

  const handleDragStart = React.useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'copy'
  }, [node.path])

  let linePrefix = ''
  for (let a = 0; a < depth; a++) {
    linePrefix += (a < ancestorIsLast.length && ancestorIsLast[a]) ? '    ' : '│   '
  }
  const fullLine = linePrefix + (isLast ? '└── ' : '├── ')
  const arrow = hasChildren ? (expanded ? '▼' : '▶') : ''
  const fileIcon = getFileIcon(node.name, node.isDirectory)
  const folderIcon = node.isDirectory ? (expanded ? '📂' : '📁') : ''

  const childAncestorIsLast = [...ancestorIsLast, isLast]
  const childNodes = node.children && node.children.length > 0 ? node.children : null
  const children: React.ReactElement[] | null = expanded && childNodes
    ? childNodes.map((child, idx): React.ReactElement =>
        React.createElement(TreeNodeComponent, {
          key: child.path, node: child, depth: depth + 1,
          isLast: idx === childNodes.length - 1,
          ancestorIsLast: childAncestorIsLast,
          expandedState: p.expandedState, onToggle: p.onToggle,
          loadingPaths: p.loadingPaths, onLoadChildren: p.onLoadChildren,
          selectedPath: p.selectedPath, onSelect: p.onSelect,
        }),
      )
    : null

  const rowS: React.CSSProperties = {
    display: 'flex', alignItems: 'center', padding: '2px 12px 2px 0',
    cursor: 'pointer', userSelect: 'none', lineHeight: '1.7', minHeight: '24px',
    fontFamily: 'system-ui', fontSize: '13px',
  }
  const lineS: React.CSSProperties = {
    color: C.border, flexShrink: 0, fontSize: '12px', whiteSpace: 'pre',
    fontFamily: '"Cascadia Code", Consolas, monospace', lineHeight: '1.7',
  }
  const arrowS: React.CSSProperties = {
    flexShrink: 0, width: '16px', textAlign: 'center', fontSize: '10px', color: C.text2,
  }
  const iconS: React.CSSProperties = { flexShrink: 0, width: '16px', textAlign: 'center', fontSize: '13px', marginRight: '2px' }
  const nameS: React.CSSProperties = {
    fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
    color: node.isDirectory ? C.accent : C.text, fontWeight: node.isDirectory ? 500 : 400,
  }
  const copyS: React.CSSProperties = {
    marginLeft: '6px', flexShrink: 0, fontSize: '10px', padding: '1px 6px',
    borderRadius: '3px', border: '1px solid ' + C.border,
    background: copied ? C.green : C.bg2, color: copied ? '#1e1e2e' : C.text2,
    cursor: 'pointer', lineHeight: '1.5',
  }

  return React.createElement('div', null,
    React.createElement('div', {
      className: 'dt-row' + (isSelected ? ' sel' : ''),
      style: rowS, draggable: true,
      onDragStart: handleDragStart, onClick: handleClick, onDoubleClick: doCopy,
      title: node.path + '\n单击选中/展开 | 双击复制 | 拖拽引用',
    },
      React.createElement('span', { style: lineS }, fullLine),
      arrow
        ? React.createElement('span', { style: arrowS }, '▶')
        : React.createElement('span', { style: { flexShrink: 0, width: '16px' } }),
      fileIcon ? React.createElement('span', { style: iconS }, fileIcon) : null,
      React.createElement('span', { style: nameS }, folderIcon ? folderIcon + ' ' : '', node.name),
      childrenLoading ? React.createElement('span', { style: { fontSize: '10px', color: C.text2, marginLeft: '4px' } }, '...') : null,
      React.createElement('span', {
        className: 'dt-copy' + (copied ? ' done' : ''),
        style: copyS, onClick: doCopy,
      }, copied ? '✓ 已复制' : '📋'),
    ),
    expanded && children ? React.createElement('div', null, children) : null,
  )
}

interface DirTreePanelProps {
  remote: ClientContext['remote']
  sessions: ClientContext['sessions']
}

function DirTreePanel(props: DirTreePanelProps) {
  const { remote, sessions } = props
  const listState = React.useSyncExternalStore(sessions.list.subscribe, sessions.list.getSnapshot)
  const sessionId = listState.current

  const [tree, setTree] = React.useState<TreeData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [visible, setVisible] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [pos, setPos] = React.useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [loadingPaths, setLoadingPaths] = React.useState<Record<string, boolean>>({})
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)
  const dragRef = React.useRef<HTMLDivElement>(null)
  const offsetRef = React.useRef({ x: 0, y: 0 })

  const fetchTree = React.useCallback(async () => {
    if (sessionId === undefined) {
      setTree(null)
      setError('无当前会话')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await remote.dirTree.listTree(sessionId, {})
      if (result.ok) setTree(result.value)
      else setError(result.error.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [sessionId, remote])

  React.useEffect(() => { void fetchTree() }, [fetchTree])

  const loadChildren = React.useCallback(async (path: string) => {
    if (sessionId === undefined) return
    setLoadingPaths(prev => {
      const next = { ...prev }
      next[path] = true
      return next
    })
    const result = await remote.dirTree.listChildren(sessionId, { path })
    if (result.ok) {
      const children = result.value
      setTree(prev => {
        if (!prev) return prev
        const next: TreeData = { root: prev.root, tree: JSON.parse(JSON.stringify(prev.tree)) as TreeNode[] }
        const updateNode = (nodes: TreeNode[]): boolean => {
          for (const node of nodes) {
            if (node.path === path) {
              node.children = children
              return true
            }
            if (node.children && updateNode(node.children)) return true
          }
          return false
        }
        updateNode(next.tree)
        return next
      })
    } else {
      console.error('Failed to load children:', result.error.message)
    }
    setLoadingPaths(prev => {
      const next = { ...prev }
      next[path] = false
      return next
    })
  }, [sessionId, remote])

  const handleToggle = React.useCallback((path: string) => {
    setExpanded(prev => {
      const next = { ...prev }
      next[path] = !prev[path]
      return next
    })
  }, [])

  const handleLoadChildren = React.useCallback((path: string) => {
    void loadChildren(path)
  }, [loadChildren])

  const collapseAll = React.useCallback(() => { setExpanded({}) }, [])

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return
    const rect = dragRef.current!.getBoundingClientRect()
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const onMove = (me: MouseEvent) => { setPos({ x: me.clientX - offsetRef.current.x, y: me.clientY - offsetRef.current.y }) }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  if (!visible) {
    return React.createElement('div', {
      className: 'dt-mini-btn',
      onClick: () => setVisible(true),
      title: '📁 点击展开目录树',
      style: {
        position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999,
        padding: '12px 18px', borderRadius: '12px',
        border: '2px solid ' + C.accent, background: C.bg2, color: C.accent,
        cursor: 'pointer', fontSize: '20px', fontWeight: 700,
        boxShadow: '0 4px 20px rgba(137,180,250,0.3)',
        fontFamily: 'system-ui', display: 'flex', alignItems: 'center', gap: '8px',
      },
    }, '📁', React.createElement('span', { style: { fontSize: '14px', fontWeight: 600 } }, '目录树'))
  }

  const floatS: React.CSSProperties = {
    position: 'fixed',
    bottom: pos.x !== null ? 'auto' : '20px',
    right: pos.x !== null ? 'auto' : '20px',
    left: pos.x !== null ? pos.x + 'px' : 'auto',
    top: pos.x !== null ? pos.y + 'px' : 'auto',
    width: '380px', height: '540px',
    background: C.bg, border: '1px solid ' + C.border,
    borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column',
    zIndex: 1000, fontSize: '13px', color: C.text, overflow: 'hidden',
  }
  const hdrS: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', flexShrink: 0, borderBottom: '1px solid ' + C.border,
    cursor: 'move', userSelect: 'none', background: C.bg2,
  }
  const h3S: React.CSSProperties = { margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'system-ui' }
  const btnS: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 7px', borderRadius: '4px', color: C.text2, lineHeight: '1', fontFamily: 'system-ui' }
  const tbarS: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', flexShrink: 0, borderBottom: '1px solid ' + C.border, background: C.bg }
  const tbBtnS: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', color: C.text2, fontFamily: 'system-ui', whiteSpace: 'nowrap' }
  const srchS: React.CSSProperties = { padding: '5px 10px', flexShrink: 0, borderBottom: '1px solid ' + C.border }
  const inpS: React.CSSProperties = { width: '100%', padding: '5px 10px', border: '1px solid ' + C.border, borderRadius: '6px', fontSize: '12px', outline: 'none', background: C.bg, color: C.text, boxSizing: 'border-box', fontFamily: 'system-ui' }
  const bodyS: React.CSSProperties = { flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '4px 0' }
  const rootS: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'default', fontWeight: 600, fontSize: '13px', color: C.text, fontFamily: 'system-ui', borderBottom: '1px solid ' + C.border, marginBottom: '2px' }
  const footS: React.CSSProperties = { padding: '5px 14px', flexShrink: 0, borderTop: '1px solid ' + C.border, display: 'flex', gap: '12px', fontSize: '11px', background: C.bg2, alignItems: 'center', fontFamily: 'system-ui', color: C.text2 }
  const loadS: React.CSSProperties = { padding: '32px', textAlign: 'center', color: C.text2, fontFamily: 'system-ui', fontSize: '13px' }
  const emptS: React.CSSProperties = { padding: '40px 16px', textAlign: 'center', color: C.text2, fontSize: '13px', fontFamily: 'system-ui' }

  const filteredTree = tree?.tree ? filterTree(tree.tree, search) : []
  const totalNodes = tree?.tree ? countNodes(tree.tree) : 0

  return React.createElement('div', { style: floatS, ref: dragRef },
    React.createElement('div', { style: hdrS, onMouseDown: handleMouseDown },
      React.createElement('h3', { style: h3S }, '📁 当前工作区'),
      React.createElement('div', { style: { display: 'flex', gap: '2px' } },
        React.createElement('button', { className: 'dt-btn', style: btnS, onClick: collapseAll, title: '折叠全部' }, '⊟'),
        React.createElement('button', { className: 'dt-btn', style: btnS, onClick: () => setVisible(false), title: '最小化' }, '−'),
        React.createElement('button', { className: 'dt-btn', style: { ...btnS, color: C.red }, onClick: () => setVisible(false), title: '关闭' }, '×'),
      ),
    ),
    React.createElement('div', { style: tbarS },
      React.createElement('button', { className: 'dt-btn', style: tbBtnS, onClick: collapseAll }, '📁 折叠全部'),
      React.createElement('button', { className: 'dt-btn', style: tbBtnS, onClick: () => { void fetchTree() } }, '🔄 刷新'),
    ),
    React.createElement('div', { style: srchS },
      React.createElement('input', {
        type: 'text', style: inpS,
        placeholder: '搜索文件 (' + totalNodes + ' 项)...',
        value: search, onChange: e => setSearch((e.target as HTMLInputElement).value),
      }),
    ),
    React.createElement('div', { className: 'dt-body', style: bodyS },
      loading
        ? React.createElement('div', { style: loadS }, '⏳ 加载中...')
        : error
          ? React.createElement('div', { style: loadS },
              React.createElement('div', null, '⚠️ ', error),
              React.createElement('button', {
                onClick: () => { void fetchTree() },
                style: { marginTop: '8px', cursor: 'pointer', padding: '4px 12px', borderRadius: '4px', border: '1px solid ' + C.border, background: C.bg2, color: C.text },
              }, '重试'),
            )
          : filteredTree.length > 0
            ? [
                React.createElement('div', { key: 'root', style: rootS },
                  '📂 ', React.createElement('span', { style: { color: C.text2, fontSize: '11px' } }, tree?.root || ''),
                ),
                ...filteredTree.map((node, idx) =>
                  React.createElement(TreeNodeComponent, {
                    key: node.path, node, depth: 0,
                    isLast: idx === filteredTree.length - 1,
                    ancestorIsLast: [],
                    expandedState: expanded, onToggle: handleToggle,
                    loadingPaths, onLoadChildren: handleLoadChildren,
                    selectedPath, onSelect: setSelectedPath,
                  }),
                ),
              ]
            : React.createElement('div', { style: emptS }, '📭 空目录'),
    ),
    React.createElement('div', { style: footS },
      React.createElement('span', null, totalNodes + ' 个文件/文件夹'),
      React.createElement('span', { style: { flex: 1, textAlign: 'right' } },
        selectedPath ? '已选: ' + (selectedPath.split('\\').pop()!.split('/').pop()) : '',
      ),
    ),
  )
}

/** Required services: the slot registry, the sessions service, and the typed Remote carrier. */
export const inject = ['slots', 'sessions', 'remote', 'remote.dirTree']

/** Scrollbar/hover styling injected as a plugin-owned <style> tag (no sandbox `styles` builtin). */
const DIRTREE_CSS = `
.dt-body::-webkit-scrollbar { width: 6px; height: 6px; }
.dt-body::-webkit-scrollbar-track { background: transparent; }
.dt-body::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.dt-row:hover { background: rgba(255,255,255,0.06); }
.dt-row.sel { background: rgba(137,180,250,0.18); }
.dt-btn:hover { background: rgba(255,255,255,0.1); color: #cdd6f4; }
.dt-copy { display: none; }
.dt-row:hover .dt-copy { display: inline-block; }
.dt-copy:hover { background: #89b4fa !important; color: #1e1e2e !important; border-color: #89b4fa !important; }
.dt-copy.done { background: #a6e3a1 !important; color: #1e1e2e !important; border-color: #a6e3a1 !important; }
.dt-mini-btn:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
`

/**
 * Client plugin body: the `dirTree` Remote contribution is mounted by the
 * api-remotes assembly (so `remote.dirTree` is available before this plugin's
 * inject resolves); here we only register the floating panel.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dirtree'
    style.textContent = DIRTREE_CSS
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'dir-tree: styles')

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'dirtree-plugin' },
    () => React.createElement(DirTreePanel, { remote: ctx.remote, sessions: ctx.sessions }),
  ))
}
