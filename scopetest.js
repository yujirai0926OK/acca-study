// 出題範囲（今日の分／全部／覚えた語だけ）とリスト順の挙動を実際に動かして検証する
const fs=require('fs'), vm=require('vm'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const DAY=86400000, now=Date.now();

function makeEl(){
  const store={style:{},dataset:{},classList:{add(){},remove(){},contains(){return false}},
    files:[],value:'',checked:false,textContent:'',innerHTML:'',open:false,disabled:false,max:0};
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
const W=(en,o)=>Object.assign({en,ja:'x',def:'',ex:'',ch:'1',box:1,due:0},o||{});
// 1〜5語目。3・5語目は「覚えた」状態（箱4以上・期限は先）
const WORDS=[
  W('w1',{box:1,due:0}),                    // 今日やる
  W('w2',{box:1,due:0}),                    // 今日やる
  W('w3',{box:4,due:now+7*DAY}),            // 覚えた（まだ先）
  W('w4',{box:1,due:0}),                    // 今日やる
  W('w5',{box:5,due:now+16*DAY}),           // 覚えた（まだ先）
];
const names=a=>a.map(w=>w.en);

let pass=0,fail=0;
function check(name,actual,expected){
  const ok=JSON.stringify(actual)===JSON.stringify(expected);
  console.log((ok?'PASS':'FAIL')+'  '+name+(ok?'':`\n      期待=${JSON.stringify(expected)} 実際=${JSON.stringify(actual)}`));
  ok?pass++:fail++;
}

// ① 今日の分＝期限がきた語だけ
check('①「今日の分」は期限がきた3語',
  names(run({scope:'due',order:'smart',pos:0,words:WORDS}).scopeList()), ['w1','w2','w4']);

// ② 覚えた語も含めて全部＝5語
check('②「全部」は覚えた語も含む5語',
  names(run({scope:'all',order:'smart',pos:0,words:WORDS}).scopeList()), ['w1','w2','w3','w4','w5']);

// ③ 覚えた語だけ＝箱4-5の2語
check('③「覚えた語だけ」は箱4-5の2語',
  names(run({scope:'learned',order:'smart',pos:0,words:WORDS}).scopeList()), ['w3','w5']);

// ④ リスト順：21語目からと指定したらその語から出る
const many=Array.from({length:30},(_,i)=>W('word'+(i+1)));
check('④21語目からと指定したら word21 が出る',
  run({scope:'all',order:'list',pos:20,words:many}).nextInOrder().en, 'word21');

// ⑤ リスト順＋覚えた語だけ：位置以降で条件に合う最初の語
check('⑤リスト順でも範囲の条件を守る',
  run({scope:'learned',order:'list',pos:0,words:WORDS}).nextInOrder().en, 'w3');

// ⑥ リスト順は末尾まで行ったら先頭へ戻る
check('⑥末尾の次は先頭に戻る',
  run({scope:'all',order:'list',pos:4,words:WORDS}).nextInOrder().en, 'w5');
check('⑥-2 範囲外を飛ばして先頭へ',
  run({scope:'due',order:'list',pos:4,words:WORDS}).nextInOrder().en, 'w1');

// ⑦ 覚えた語だけで対象が無いときは null（＝完了メッセージになる）
check('⑦対象が無ければnull',
  run({scope:'learned',order:'list',pos:0,words:[W('a',{box:1})]}).nextInOrder(), null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode=fail?1:0;
