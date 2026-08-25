// 学習記録（日ごとの語数・連続日数・端末間のマージ）を実際に動かして検証する
const fs=require('fs'), vm=require('vm'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const DAY=86400000;

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
  sb._read=()=>JSON.parse(storage.get('accaStudy.v1'));   // 保存された中身を読む
  return sb;
}
const base=run({words:[]});
const key=(daysAgo)=>base.dateKey(Date.now()-daysAgo*DAY);

let pass=0,fail=0;
function check(name,actual,expected){
  const ok=JSON.stringify(actual)===JSON.stringify(expected);
  console.log((ok?'PASS':'FAIL')+'  '+name+(ok?'':`\n      期待=${JSON.stringify(expected)} 実際=${JSON.stringify(actual)}`));
  ok?pass++:fail++;
}

// ① 端末をまたぐと同じ日は大きい方、違う日は両方残る
check('①同じ日は大きい方・別の日は両方残る',
  base.mergeHistory({'2026-08-10':60,'2026-08-11':30}, {'2026-08-10':45,'2026-08-12':20}),
  {'2026-08-10':60,'2026-08-11':30,'2026-08-12':20});

// ② 何度マージしても結果が変わらない（二重加算しない）
const once=base.mergeHistory({'2026-08-10':60},{'2026-08-10':45});
check('②繰り返しマージしても増えない',
  base.mergeHistory(once,{'2026-08-10':45}), {'2026-08-10':60});

// ③ 連続日数：今日・昨日・一昨日やっていれば3日
check('③3日連続なら3',
  run({words:[], history:{[key(0)]:10,[key(1)]:10,[key(2)]:10}}).streakDays(), 3);

// ④ 今日まだでも、昨日までの連続は途切れない
check('④今日未着手でも昨日までを数える',
  run({words:[], history:{[key(1)]:10,[key(2)]:10}}).streakDays(), 2);

// ⑤ 間が空いたらそこで止まる
check('⑤1日空いたら連続は止まる',
  run({words:[], history:{[key(0)]:5,[key(2)]:5,[key(3)]:5}}).streakDays(), 1);

// ⑥ 記録なしなら0
check('⑥記録なしは0', run({words:[], history:{}}).streakDays(), 0);

// ⑦ 実際に「覚えた」を2回押すと、その日の記録が2語になる
const sb=run({words:[
  {en:'a',ja:'x',def:'',ex:'',ch:'1',box:1,due:0},
  {en:'b',ja:'x',def:'',ex:'',ch:'1',box:1,due:0},
  {en:'c',ja:'x',def:'',ex:'',ch:'1',box:4,due:Date.now()+7*DAY},
], history:{}, scope:'due', order:'smart', goal:0});
sb.nextCard(); sb.judge(true);   // 1語目
sb.judge(true);                  // 2語目
check('⑦「覚えた」2回でその日の記録が2語', sb._read().history[base.todayKey()], 2);

// ⑧ すでに大きい記録があれば下げない（同期で入った値を壊さない）
const sb2=run({words:[{en:'a',ja:'x',def:'',ex:'',ch:'1',box:1,due:0}],
  history:{[base.dateKey(Date.now())]:50}, scope:'due', order:'smart', goal:0});
sb2.nextCard(); sb2.judge(true);
check('⑧すでに大きい記録は下げない', sb2._read().history[base.todayKey()], 50);

// ⑨ 直近7日のキーが7個・末尾が今日
const d7=base.lastNDays(7);
check('⑨直近7日は7件で末尾が今日', [d7.length, d7[6]===base.todayKey()], [7,true]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode=fail?1:0;
