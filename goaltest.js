// 「今日の目標」の語数カウントを実際に動かして検証する
const fs=require('fs'), vm=require('vm'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];

const DAY=86400000;
function makeEl(){
  const store={style:{},dataset:{},classList:{add(){},remove(){},contains(){return false}},
    files:[],value:'',checked:false,textContent:'',innerHTML:'',open:false,disabled:false};
  return new Proxy(function(){},{
    get(t,p){ if(p===Symbol.toPrimitive) return ()=>'';
      if(p in store) return store[p];
      if(['appendChild','remove','scrollIntoView','addEventListener','click','focus','forEach'].includes(p)) return ()=>{};
      return store[p]!==undefined?store[p]:makeEl(); },
    set(t,p,v){ store[p]=v; return true; }, apply(){ return makeEl(); }});
}
function run(seed){
  const storage=new Map();
  if(seed) storage.set('accaStudy.v1', JSON.stringify(seed));
  const sb={ console,setTimeout,clearTimeout,setInterval,clearInterval,
    alert(){},confirm(){return true},URL:{createObjectURL:()=>''},Blob:function(){},
    FileReader:function(){this.readAsText=()=>{}},
    localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,
      setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    navigator:{}, document:{getElementById:()=>makeEl(),querySelectorAll:()=>[],
      querySelector:()=>makeEl(),createElement:()=>makeEl(),addEventListener(){},visibilityState:'visible'} };
  sb.window=sb; sb.globalThis=sb;
  vm.runInNewContext(code, vm.createContext(sb), {filename:'app.js'});
  return sb;
}
const now=Date.now();
const W=(en,extra)=>Object.assign({en,ja:'x',def:'',ex:'',ch:'1',box:1,due:0},extra||{});

let pass=0,fail=0;
function check(name,actual,expected){
  const ok=JSON.stringify(actual)===JSON.stringify(expected);
  console.log((ok?'PASS':'FAIL')+'  '+name+(ok?'':`\n      期待=${JSON.stringify(expected)} 実際=${JSON.stringify(actual)}`));
  ok?pass++:fail++;
}

// ① 今日「まだ/覚えた」を押した語だけ数える
check('①今日やった3語だけ数える',
  run({goal:0, words:[
    W('a',{lastStudied:now}), W('b',{lastStudied:now-3600000}), W('c',{lastStudied:now-7200000}),
    W('d',{lastStudied:now-2*DAY}),      // 一昨日 → 数えない
    W('e'),                               // 一度もやっていない → 数えない
  ]}).todayCount(), 3);

// ② 昨日の分は翌日には0に戻る
check('②昨日だけの日は0になる',
  run({goal:0, words:[W('a',{lastStudied:now-DAY}), W('b',{lastStudied:now-DAY})]}).todayCount(), 0);

// ③ 目標を設定するとその値が上限になる
check('③目標100が上限になる', run({goal:100, words:[]}).goalTarget(), 100);

// ④ 目標なし(0)なら上限なし
check('④目標なしは0（打ち切らない）', run({goal:0, words:[]}).goalTarget(), 0);

// ⑤ 同じ語を何度やっても1語（単語ごとに1回しか数えない）
const sb=run({goal:0, words:[W('a',{lastStudied:now}), W('a2',{lastStudied:now})]});
check('⑤語数は単語の数で数える', sb.todayCount(), 2);

// ⑥ 端末をまたいでも合算される（相手端末の学習記録をマージ）
const s2=run({goal:0, words:[W('a',{lastStudied:now, mtime:now})]});
const merged=s2.mergeWords(
  [W('a',{lastStudied:now, mtime:now})],                    // この端末で1語
  [W('b',{lastStudied:now, mtime:now}), W('c',{lastStudied:now, mtime:now})], // 別端末で2語
  {});
check('⑥PC+iPhoneの合計になる', merged.filter(w=>w.lastStudied>=new Date().setHours(0,0,0,0)).length, 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode=fail?1:0;
