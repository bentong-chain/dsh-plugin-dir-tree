// prepare 脚本：pnpm 在 git/npm 安装后运行，把 client.js（ESM 源码）
// 打包成 clientModules 需要的 CJS bundle（带 window.__ModuleLoader__.load 包装）。
import { build } from 'esbuild'

const ID = 'dsh-dir-tree'

await build({
  entryPoints: ['client.js'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'client.bundle.js',
  // React 由浏览器模块表/全局提供，不打包
  external: ['react', 'react-dom'],
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

console.log('[dsh-dir-tree] client bundle built → client.bundle.js')
