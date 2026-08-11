// index.html の <script> を、ブラウザ相当のスタブ環境で実際に実行して
// 起動時のランタイムエラー（TDZ・undefined参照など）を検出する。
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(process.argv[2], 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('NO SCRIPT BLOCK'); process.exit(1); }
const code = m[1];

// HTML内に実在する id を集める（存在しない id を触ったら検出するため）
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]));
const missingIds = new Set();

function makeEl(id) {
  const target = function () {};
  target._id = id;
  const store = { style: {}, dataset: {}, classList: { add(){}, remove(){}, contains(){return false;} },
                  files: [], value: '', checked: false, textContent: '', innerHTML: '', open: false,
                  disabled: false, className: '', metadata: {} };
  return new Proxy(target, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => '';
      if (p in store) return store[p];
      if (p === 'appendChild' || p === 'remove' || p === 'scrollIntoView' ||
          p === 'addEventListener' || p === 'click' || p === 'focus' || p === 'forEach') return () => {};
      if (typeof p === 'string') return store[p] !== undefined ? store[p] : makeEl(id + '.' + p);
      return undefined;
    },
    set(t, p, v) { store[p] = v; return true; },
    apply() { return makeEl(id); }
  });
}

const storage = new Map();
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  alert: () => {}, confirm: () => true,
  URL: { createObjectURL: () => 'blob:x' },
  Blob: function () {}, FileReader: function () { this.readAsText = () => {}; },
  localStorage: {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k),
  },
  navigator: {},
  document: {
    getElementById(id) { if (!ids.has(id)) missingIds.add(id); return makeEl(id); },
    querySelectorAll() { return []; },
    querySelector() { return makeEl('q'); },
    createElement() { return makeEl('new'); },
    addEventListener() {},
    visibilityState: 'visible',
  },
};
sandbox.window = sandbox;          // window.speechSynthesis は未定義 = 読み上げ非対応端末を再現
sandbox.globalThis = sandbox;

try {
  vm.runInNewContext(code, vm.createContext(sandbox), { filename: 'app.js' });
  console.log('RUNTIME OK — 起動時エラーなし');
} catch (e) {
  console.log('RUNTIME ERROR: ' + e.name + ': ' + e.message);
  const line = (e.stack || '').split('\n').slice(0, 4).join('\n');
  console.log(line);
  process.exitCode = 1;
}
if (missingIds.size) {
  console.log('WARN 存在しないid参照: ' + [...missingIds].join(', '));
}
