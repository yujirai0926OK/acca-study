// 同期マージの挙動を実際に実行して検証する
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('C:/Dev/acca-study/index.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl() {
  const store = { style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false}},
                  files:[], value:'', checked:false, textContent:'', innerHTML:'', open:false, disabled:false };
  return new Proxy(function(){}, {
    get(t,p){ if(p===Symbol.toPrimitive) return ()=>'';
      if(p in store) return store[p];
      if(['appendChild','remove','scrollIntoView','addEventListener','click','focus','forEach'].includes(p)) return ()=>{};
      return store[p]!==undefined?store[p]:makeEl(); },
    set(t,p,v){ store[p]=v; return true; }, apply(){ return makeEl(); }
  });
}
const storage = new Map();
const sb = { console, setTimeout, clearTimeout, setInterval, clearInterval,
  alert(){}, confirm(){return true}, URL:{createObjectURL:()=>''}, Blob:function(){}, FileReader:function(){this.readAsText=()=>{}},
  localStorage:{ getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) },
  navigator:{}, document:{ getElementById:()=>makeEl(), querySelectorAll:()=>[], querySelector:()=>makeEl(),
    createElement:()=>makeEl(), addEventListener(){}, visibilityState:'visible' } };
sb.window = sb; sb.globalThis = sb;
vm.runInNewContext(code, vm.createContext(sb), { filename: 'app.js' });

const { mergeWords, mergeDeleted } = sb;
let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : `\n      期待=${JSON.stringify(expected)} 実際=${JSON.stringify(actual)}`));
  ok ? pass++ : fail++;
}
const names = r => r.map(w => w.en).sort();

// 1) 追加は両端末ぶん合流する
check('①PCとiPhoneの追加が両方残る',
  names(mergeWords([{en:'asset',mtime:0}], [{en:'equity',mtime:0}], {})),
  ['asset','equity']);

// 2) 新しく更新した方の進捗が勝つ
check('②新しい進捗が勝つ',
  mergeWords([{en:'asset',box:1,mtime:100}], [{en:'asset',box:5,mtime:200}], {})[0].box, 5);

// 3) PCで削除 → iPhoneに残っていても復活しない
check('③削除した単語が復活しない',
  names(mergeWords([{en:'asset',mtime:0},{en:'equity',mtime:0}], [{en:'asset',mtime:0}], {asset:100})),
  ['equity']);

// 4) 削除後にわざと再追加したものは生き残る
check('④削除後の再追加は生き残る',
  names(mergeWords([{en:'asset',mtime:500}], [], {asset:100})),
  ['asset']);

// 5) 削除記録は両端末で合流し、新しい方を採用
check('⑤削除記録のマージ', mergeDeleted({a:100},{a:300,b:50}), {a:300,b:50});

// 6) 大文字小文字の違いで重複しない
check('⑥大文字小文字を同一視',
  names(mergeWords([{en:'Asset',mtime:0}], [{en:'asset',mtime:0}], {})).length, 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
