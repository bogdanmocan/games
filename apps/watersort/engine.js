'use strict';
// Sortare culori: tuburi cu 4 locuri; torni culoarea de sus într-un tub gol sau peste aceeași culoare.
// Fiecare nivel e verificat cu un solver înainte să-l primești, deci se poate mereu termina de la început.
const WS=(function(){
function mulberry32(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
const CAP=4;
// Creșterea nivelului: culori noi până la 20 (peste care solverul de verificare devine prea lent în browser),
// apoi dificultatea crește prin amestec: tot mai puține unități vecine de aceeași culoare.
const MAX_COLORS=20;
function params(L){
  const colors=Math.min(MAX_COLORS,3+Math.floor((L-1)/2));
  return {colors,empties:2,maxAdj:Math.max(0,6-Math.floor(L/4))};
}
function adjacent(tubes){let n=0;for(const t of tubes)for(let i=1;i<t.length;i++)if(t[i]===t[i-1])n++;return n}
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

const top=t=>t[t.length-1];
function run(t){ // câte unități de aceeași culoare sunt deasupra
  if(!t.length)return 0;
  let n=1;
  while(n<t.length&&t[t.length-1-n]===t[t.length-1])n++;
  return n;
}
function canPour(tubes,i,j){
  if(i===j)return false;
  const a=tubes[i],b=tubes[j];
  if(!a.length||b.length>=CAP)return false;
  return !b.length||top(b)===top(a);
}
function pour(tubes,i,j){ // întoarce tuburile noi (nu modifică originalul)
  const n=tubes.map(t=>t.slice());
  const a=n[i],b=n[j];
  const k=Math.min(run(a),CAP-b.length);
  for(let x=0;x<k;x++)b.push(a.pop());
  return n;
}
const uniform=t=>t.length>0&&t.every(c=>c===t[0]);
function solved(tubes){return tubes.every(t=>!t.length||(t.length===CAP&&uniform(t)))}
const key=tubes=>tubes.map(t=>t.join('')).sort().join('|');

// DFS cu memorie; întoarce lista de mutări [i,j] sau null (necunoscut/fără soluție în buget)
function solve(tubes,budget){
  const seen=new Set();let nodes=0;
  const path=[];
  function dfs(s){
    if(solved(s))return true;
    const k=key(s);
    if(seen.has(k))return false;
    seen.add(k);
    if(++nodes>budget)return false;
    const moves=[];
    for(let i=0;i<s.length;i++)for(let j=0;j<s.length;j++){
      if(!canPour(s,i,j))continue;
      if(uniform(s[i])&&!s[j].length)continue;            // inutil: mută un tub uniform într-unul gol
      if(uniform(s[i])&&s[i].length===CAP)continue;       // tub deja gata
      // preferă: peste aceeași culoare, care completează un tub, care golește tubul sursă
      const dest=s[j].length?1:0;
      const gain=Math.min(run(s[i]),CAP-s[j].length);
      moves.push([i,j,dest*10+gain+(gain===s[i].length?5:0)]);
    }
    moves.sort((a,b)=>b[2]-a[2]);
    for(const [i,j] of moves){
      path.push([i,j]);
      if(dfs(pour(s,i,j)))return true;
      path.pop();
      if(nodes>budget)return false;
    }
    return false;
  }
  return dfs(tubes)?path.slice():null;
}

function gen(L,seed){
  const p=params(L),rnd=mulberry32(seed);
  let maxAdj=p.maxAdj;
  for(let attempt=0;attempt<3000;attempt++){
    if(attempt&&attempt%60===0)maxAdj++; // dacă nu iese, relaxează puțin amestecul
    const units=[];
    for(let c=0;c<p.colors;c++)for(let k=0;k<CAP;k++)units.push(c);
    shuffle(units,rnd);
    const tubes=[];
    for(let i=0;i<p.colors;i++)tubes.push(units.slice(i*CAP,i*CAP+CAP));
    for(let i=0;i<p.empties;i++)tubes.push([]);
    if(tubes.some(t=>t.length===CAP&&uniform(t)))continue;
    if(adjacent(tubes)>maxAdj)continue;
    const sol=solve(tubes,40000);
    if(sol)return {tubes,solution:sol,colors:p.colors};
  }
  return null;
}

return {CAP,params,gen,solve,canPour,pour,solved,top,mulberry32};
})();
if(typeof module!=='undefined')module.exports=WS;
