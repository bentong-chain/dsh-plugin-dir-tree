// ============================================================================
// 形态 A：动态插件 — Client 半（在浏览器运行）
//
// 与 dynamic/host.js 配套，通过 cordis_define 一起提交。
// 渲染右下角浮窗目录树，支持懒加载展开、拖拽路径、双击复制、搜索、最小化。
// ============================================================================

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    // 注入滚动条/悬停样式（动态沙箱的 styles builtin）
    const disposeStyles = styles.insert(`
      .dtb::-webkit-scrollbar{width:6px;height:6px}
      .dtb::-webkit-scrollbar-thumb{background:#45475a;border-radius:3px}
      .dtr:hover{background:rgba(255,255,255,.06)}
      .dtr.sel{background:rgba(137,180,250,.18)}
      .dtbtn:hover{background:rgba(255,255,255,.1)}
      .dtc{display:none}
      .dtr:hover .dtc{display:inline-block}
    `)

    const C = { bg:'#1e1e2e', bg2:'#313244', bd:'#45475a', tx:'#cdd6f4', t2:'#a6adc8', ac:'#89b4fa', gr:'#a6e3a1', rd:'#f38ba8' }

    // 文件类型图标
    function icon(n, d) {
      if (d) return null
      const ext = n.split('.').pop()
      if (!ext || ext === n) return '📄'
      const m = { js:'🟨', ts:'🟦', tsx:'🟦', json:'📋', md:'📝', css:'🎨', html:'🌐', py:'🐍', png:'🖼️', jpg:'🖼️', svg:'🖼️', pdf:'📕', zip:'📦', yml:'⚙️', sh:'💻' }
      return m[ext.toLowerCase()] || '📄'
    }

    // 搜索过滤
    function fil(nodes, term) {
      if (!term) return nodes
      const l = term.toLowerCase(), r = []
      for (const nd of nodes) {
        const m = nd.name.toLowerCase().indexOf(l) !== -1
        const c = nd.children ? fil(nd.children, term) : []
        if (m || c.length) {
          const cl = { name: nd.name, path: nd.path, isDirectory: nd.isDirectory }
          if (nd.children) cl.children = m ? nd.children : c
          r.push(cl)
        }
      }
      return r
    }

    function cnt(nodes) {
      let n = 0
      for (const x of nodes) { n++; if (x.children) n += cnt(x.children) }
      return n
    }

    // 树节点（递归组件）
    function Node(p) {
      const nd = p.node, d = p.depth, last = p.isLast, anc = p.ancestorIsLast || []
      const ex = !!p.expanded[nd.path]
      const isDir = nd.isDirectory
      const sel = p.sel === nd.path
      const cs = React.useState(false), cp = cs[0], sc = cs[1]

      const copy = React.useCallback((e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(nd.path).then(() => { sc(true); setTimeout(() => sc(false), 1500) })
      }, [nd.path])

      const click = React.useCallback((e) => {
        e.stopPropagation()
        if (p.onSel) p.onSel(nd.path)
        if (isDir && p.onTog) {
          p.onTog(nd.path)
          if (!nd.children || !nd.children.length) p.onLoad(nd.path)
        }
      }, [isDir, nd.path])

      const drag = React.useCallback((e) => {
        e.dataTransfer.setData('text/plain', nd.path)
      }, [nd.path])

      let lp = ''
      for (let a = 0; a < d; a++) lp += (a < anc.length && anc[a]) ? '    ' : '│   '
      const line = lp + (last ? '└── ' : '├── ')
      const arr = isDir ? (ex ? '▼' : '▶') : ''
      const ic = icon(nd.name, isDir)
      const fi = isDir ? (ex ? '📂' : '📁') : ''
      const na = anc.slice(); na.push(last)
      const kids = nd.children && nd.children.length ? nd.children : null
      const ch = ex && kids ? kids.map((c, i) => React.createElement(Node, {
        key: c.path, node: c, depth: d + 1, isLast: i === kids.length - 1,
        ancestorIsLast: na, expanded: p.expanded, onTog: p.onTog, onLoad: p.onLoad, sel: p.sel, onSel: p.onSel,
      })) : null

      const rowS = { display:'flex', alignItems:'center', padding:'2px 12px 2px 0', cursor:'pointer', userSelect:'none', lineHeight:'1.7', minHeight:'24px', fontSize:'13px', fontFamily:'system-ui' }
      const lineS = { color:C.bd, flexShrink:0, fontSize:'12px', whiteSpace:'pre', fontFamily:'monospace' }
      const nmS = { fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', flex:1, color:isDir ? C.ac : C.tx, fontWeight:isDir ? 500 : 400 }
      const cpS = { marginLeft:'6px', fontSize:'10px', padding:'1px 6px', borderRadius:'3px', border:'1px solid '+C.bd, background:cp ? C.gr : C.bg2, color:cp ? '#1e1e2e' : C.t2, cursor:'pointer' }

      return React.createElement('div', null,
        React.createElement('div', { className:'dtr'+(sel?' sel':''), style:rowS, draggable:true, onDragStart:drag, onClick:click, onDoubleClick:copy, title:nd.path+'\n单击展开/选中 | 双击复制 | 拖拽引用' },
          React.createElement('span', { style:lineS }, line),
          arr ? React.createElement('span', { style:{ width:'16px', textAlign:'center', fontSize:'10px', color:C.t2 } }, '▶') : React.createElement('span', { style:{ width:'16px' } }),
          ic ? React.createElement('span', { style:{ width:'16px', textAlign:'center', fontSize:'13px' } }, ic) : null,
          React.createElement('span', { style:nmS }, fi ? fi+' ' : '', nd.name),
          React.createElement('span', { className:'dtc', style:cpS, onClick:copy }, cp ? '✓' : '📋'),
        ),
        ex && ch ? React.createElement('div', null, ch) : null,
      )
    }

    // 主面板
    function Panel(p) {
      const { useSessions } = p
      // 当前激活会话的 cwd（切换工作区/会话会自动变化）
      const listState = useSessions()
      const current = listState.current
      const cwd = current !== undefined ? (listState.byId[current] || {}).cwd : undefined

      const ts = React.useState(null), tree = ts[0], st = ts[1]
      const ls = React.useState(true), ld = ls[0], sl = ls[1]
      const es = React.useState(null), er = es[0], se = es[1]
      const vs = React.useState(true), vis = vs[0], sv = vs[1]
      const ss = React.useState(''), q = ss[0], sq = ss[1]
      const xs = React.useState({}), ex = xs[0], sx = xs[1]
      const ps = React.useState({ x:null, y:null }), pos = ps[0], sp = ps[1]
      const selS = React.useState(null), sel = selS[0], ss2 = selS[1]
      const dr = React.useRef(null), off = React.useRef({ x:0, y:0 })

      const fetch = React.useCallback(async function() {
        sl(true); se(null)
        try {
          if (cwd === undefined) { se('无当前会话工作区'); return }
          const r = await host.call('list-tree', { root: cwd })
          st(r); sx({})
        } catch (e) { se(e.message || 'Failed') }
        finally { sl(false) }
      }, [cwd])

      // cwd 变化（切换工作区/会话）时，fetch 重新创建，自动触发重新拉取
      React.useEffect(function() { fetch() }, [fetch])

      const load = React.useCallback(async function(path) {
        const kids = await host.call('list-children', { path })
        st(function(prev) {
          if (!prev) return prev
          function upd(nodes) {
            for (const nd of nodes) {
              if (nd.path === path) { nd.children = kids; return true }
              if (nd.children && upd(nd.children)) return true
            }
            return false
          }
          const nx = { root: prev.root, tree: JSON.parse(JSON.stringify(prev.tree)) }
          upd(nx.tree)
          return nx
        })
      }, [])

      const tog = React.useCallback(function(path) {
        sx(function(prev) { const n = {}; for (const k in prev) n[k] = prev[k]; n[path] = !prev[path]; return n })
      }, [])

      const col = React.useCallback(function() { sx({}) }, [])

      const down = React.useCallback(function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return
        const r = dr.current.getBoundingClientRect()
        off.current = { x: e.clientX - r.left, y: e.clientY - r.top }
        function mv(me) { sp({ x: me.clientX - off.current.x, y: me.clientY - off.current.y }) }
        function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up) }
        document.addEventListener('mousemove', mv)
        document.addEventListener('mouseup', up)
      }, [])

      // 最小化状态：右下角醒目按钮
      if (!vis) return React.createElement('div', { className:'dtbtn', onClick:function(){ sv(true) }, title:'📁 展开目录树', style:{ position:'fixed', bottom:'16px', right:'16px', zIndex:9999, padding:'12px 18px', borderRadius:'12px', border:'2px solid '+C.ac, background:C.bg2, color:C.ac, cursor:'pointer', fontSize:'20px', fontWeight:700, boxShadow:'0 4px 20px rgba(137,180,250,.3)', fontFamily:'system-ui', display:'flex', alignItems:'center', gap:'8px' } },
        '📁', React.createElement('span', { style:{ fontSize:'14px', fontWeight:600 } }, '目录树'))

      const fS = { position:'fixed', bottom:pos.x!==null?'auto':'20px', right:pos.x!==null?'auto':'20px', left:pos.x!==null?pos.x+'px':'auto', top:pos.x!==null?pos.y+'px':'auto', width:'380px', height:'540px', background:C.bg, border:'1px solid '+C.bd, borderRadius:'10px', boxShadow:'0 8px 32px rgba(0,0,0,.3)', display:'flex', flexDirection:'column', zIndex:1000, fontSize:'13px', color:C.tx, overflow:'hidden' }
      const hS = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', flexShrink:0, borderBottom:'1px solid '+C.bd, cursor:'move', userSelect:'none', background:C.bg2 }
      const bS = { background:'none', border:'none', cursor:'pointer', fontSize:'14px', padding:'2px 7px', borderRadius:'4px', color:C.t2, lineHeight:'1', fontFamily:'system-ui' }
      const tS = { display:'flex', gap:'4px', padding:'4px 10px', flexShrink:0, borderBottom:'1px solid '+C.bd, background:C.bg }
      const qS = { padding:'5px 10px', flexShrink:0, borderBottom:'1px solid '+C.bd }
      const iS = { width:'100%', padding:'5px 10px', border:'1px solid '+C.bd, borderRadius:'6px', fontSize:'12px', outline:'none', background:C.bg, color:C.tx, boxSizing:'border-box', fontFamily:'system-ui' }
      const bdS = { flex:1, overflowY:'auto', overflowX:'auto', padding:'4px 0' }
      const rS = { display:'flex', alignItems:'center', padding:'6px 12px', fontWeight:600, fontSize:'13px', color:C.tx, fontFamily:'system-ui', borderBottom:'1px solid '+C.bd, marginBottom:'2px' }
      const fS2 = { padding:'5px 14px', flexShrink:0, borderTop:'1px solid '+C.bd, display:'flex', gap:'12px', fontSize:'11px', background:C.bg2, alignItems:'center', fontFamily:'system-ui', color:C.t2 }
      const lS = { padding:'32px', textAlign:'center', color:C.t2, fontFamily:'system-ui', fontSize:'13px' }

      const ft = tree && tree.tree ? fil(tree.tree, q) : []
      const tn = tree && tree.tree ? cnt(tree.tree) : 0

      return React.createElement('div', { style:fS, ref:dr },
        React.createElement('div', { style:hS, onMouseDown:down },
          React.createElement('h3', { style:{ margin:0, fontSize:'14px', fontWeight:600, fontFamily:'system-ui' } }, '📁 当前工作区'),
          React.createElement('div', { style:{ display:'flex', gap:'2px' } },
            React.createElement('button', { className:'dtbtn', style:bS, onClick:col, title:'折叠全部' }, '⊟'),
            React.createElement('button', { className:'dtbtn', style:bS, onClick:function(){ sv(false) }, title:'最小化' }, '−'),
            React.createElement('button', { className:'dtbtn', style:Object.assign({}, bS, { color:C.rd }), onClick:function(){ sv(false) }, title:'关闭' }, '×'),
          ),
        ),
        React.createElement('div', { style:tS },
          React.createElement('button', { className:'dtbtn', style:Object.assign({}, bS, { fontSize:'11px' }), onClick:col }, '📁 折叠全部'),
          React.createElement('button', { className:'dtbtn', style:Object.assign({}, bS, { fontSize:'11px' }), onClick:fetch }, '🔄 刷新'),
        ),
        React.createElement('div', { style:qS },
          React.createElement('input', { type:'text', style:iS, placeholder:'搜索文件 ('+tn+' 项)...', value:q, onChange:function(e){ sq(e.target.value) } }),
        ),
        React.createElement('div', { className:'dtb', style:bdS },
          ld ? React.createElement('div', { style:lS }, '⏳ 加载中...')
            : er ? React.createElement('div', { style:lS }, '⚠️ ', er)
            : ft.length
              ? [React.createElement('div', { key:'root', style:rS }, '📂 ', React.createElement('span', { style:{ color:C.t2, fontSize:'11px' } }, tree && tree.root ? tree.root : '')),
                  ft.map(function(nd, i) { return React.createElement(Node, { key:nd.path, node:nd, depth:0, isLast:i===ft.length-1, ancestorIsLast:[], expanded:ex, onTog:tog, onLoad:load, sel:sel, onSel:ss2 }) })]
              : React.createElement('div', { style:lS }, '📭 空目录'),
        ),
        React.createElement('div', { style:fS2 },
          React.createElement('span', null, tn+' 个文件/文件夹'),
          React.createElement('span', { style:{ flex:1, textAlign:'right' } }, sel ? '已选: '+(sel.split('\\').pop().split('/').pop()) : ''),
        ),
      )
    }

    slots.inject('shell.overlay', function() {
      // shell.overlay 标准 props 含 useSessions，透传给 Panel 以读取当前会话 cwd
      return slots.register({ name:'shell.overlay', id:'dirtree-plugin' }, function(props) { return React.createElement(Panel, props) })
    })

    ctx.effect(function() { return disposeStyles })
  },
}
