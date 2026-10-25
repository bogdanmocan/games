'use strict';
// Săgeți: fiecare săgeată e un "șarpe" pe grilă cu capul într-o direcție. Atingi o săgeată și iese pe linia
// capului, dar numai dacă drumul până la marginea tablei e liber.
// Rezolvabilitate: săgețile se plasează una câte una, iar raza fiecăreia trebuie să fie liberă de săgețile
// plasate înaintea ei; deci scoțându-le în ordine inversă se golește mereu tabla. Scoaterea unei săgeți nu
// blochează niciodată alta, deci orice ordine de mutări valide duce la final.
const AR=(function(){
function mulberry32(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]]; // sus, dreapta, jos, stânga

// Fără limită de nivel: după ce tabla atinge mărimea de bază (nivelul 24), continuă să crească încet,
// iar lanțurile de dependențe, densitatea și șerpii devin tot mai lungi. Pe ecrane mici tabla se derulează.
function params(L){
  const extra=Math.max(0,L-24);
  const cols=Math.min(5+Math.floor(L/3),12)+Math.floor(extra/8);
  const rows=Math.min(7+Math.floor(L/2),18)+Math.floor(extra/6);
  return {
    cols,rows,
    minLen:2,
    maxLen:Math.min(3+Math.floor(L/2),14)+Math.floor(extra/10),
    straight:Math.max(.25,.6-L*.01),            // mai mic = șerpi mai încolăciți
    cover:Math.min(.5+L*.015,.92),               // cât din tablă e ocupată
    blockedTarget:Math.min(.2+L*.012,.75),       // ponderea săgeților blocate la început
    depthTarget:2+Math.floor(L/4),               // câte "runde" de deblocare sunt necesare (fără plafon)
    lives:Math.max(2,3-Math.floor(L/60)),
    tries:Math.max(6,Math.min(60,Math.round(9000/(cols*rows))))
  };
}
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function rayCells(a,p){
  const h=a.path[a.path.length-1],d=DIRS[a.dir],out=[];
  let x=h[0]+d[0],y=h[1]+d[1];
  while(x>=0&&y>=0&&x<p.cols&&y<p.rows){out.push([x,y]);x+=d[0];y+=d[1]}
  return out;
}

// nivelul de blocare al fiecărei săgeți: 0 = liberă, altfel 1 + cel mai adânc blocaj din fața ei
function chainLevels(p,arrows,occ){
  const memo=new Map();
  function lv(a){
    if(memo.has(a.id))return memo.get(a.id);
    let m=-1;
    for(const [x,y] of rayCells(a,p)){
      const o=occ[y][x];
      if(o!==-1&&o!==a.id)m=Math.max(m,lv(arrows[o]));
    }
    memo.set(a.id,m+1);
    return m+1;
  }
  return arrows.map(lv);
}

function build(L,rnd){
  const p=params(L);
  const occ=Array.from({length:p.rows},()=>new Array(p.cols).fill(-1));
  const arrows=[];
  const total=p.cols*p.rows;
  const chainP=Math.min(.15+L*.02,.7); // cât de des prelungim cel mai lung lanț de dependențe
  let covered=0,fails=0;
  while(covered<total*p.cover&&fails<600){
    let sx=Math.floor(rnd()*p.cols),sy=Math.floor(rnd()*p.rows);
    if(arrows.length&&rnd()<chainP){
      // pornește noua săgeată în raza capătului celui mai lung lanț, ca lanțul să crească cu 1
      const lv=chainLevels(p,arrows,occ);
      let a=arrows[lv.indexOf(Math.max(...lv))];
      while(lv[a.id]>0){
        let nxt=null;
        for(const [x,y] of rayCells(a,p)){const o=occ[y][x];if(o!==-1&&o!==a.id&&(!nxt||lv[o]>lv[nxt.id]))nxt=arrows[o]}
        if(!nxt)break;a=nxt;
      }
      const free=rayCells(a,p).filter(([x,y])=>occ[y][x]===-1);
      if(free.length){const c=free[Math.floor(rnd()*free.length)];sx=c[0];sy=c[1]}
    }
    if(occ[sy][sx]!==-1){fails++;continue}
    const len=p.minLen+Math.floor(rnd()*(p.maxLen-p.minLen+1));
    const path=[[sx,sy]],used=new Set([sx+','+sy]);
    let dir=Math.floor(rnd()*4),lastDir=dir;
    while(path.length<len){
      const [cx,cy]=path[path.length-1];
      const order=shuffle([0,1,2,3],rnd);
      if(rnd()<p.straight)order.unshift(dir);
      let moved=false;
      for(const d of order){
        const nx=cx+DIRS[d][0],ny=cy+DIRS[d][1];
        if(nx<0||ny<0||nx>=p.cols||ny>=p.rows||occ[ny][nx]!==-1||used.has(nx+','+ny))continue;
        path.push([nx,ny]);used.add(nx+','+ny);dir=d;lastDir=d;moved=true;break;
      }
      if(!moved)break;
    }
    if(path.length<2){fails++;continue}
    const a={id:arrows.length,path,dir:lastDir};
    // raza capului trebuie să fie liberă de săgețile deja plasate și de propriul corp
    const ray=rayCells(a,p);
    if(ray.some(([x,y])=>occ[y][x]!==-1||used.has(x+','+y))){fails++;continue}
    for(const [x,y] of path)occ[y][x]=a.id;
    arrows.push(a);covered+=path.length;
  }
  return {p,arrows};
}

// id-ul săgeții care blochează raza lui a (față de arrowsLeft), sau -1 dacă e liber
function blocker(a,p,occ){
  for(const [x,y] of rayCells(a,p)){
    const o=occ[y][x];
    if(o!==-1&&o!==a.id)return o;
  }
  return -1;
}
function occupancy(p,arrows,alive){
  const occ=Array.from({length:p.rows},()=>new Array(p.cols).fill(-1));
  for(const a of arrows)if(alive[a.id])for(const [x,y] of a.path)occ[y][x]=a.id;
  return occ;
}

// adâncimea = câte runde de scos săgeți libere sunt necesare (mai mare = lanțuri de dependențe mai lungi)
function depth(g){
  const alive=g.arrows.map(()=>true);
  let left=g.arrows.length,rounds=0;
  while(left){
    const occ=occupancy(g.p,g.arrows,alive);
    const free=g.arrows.filter(a=>alive[a.id]&&blocker(a,g.p,occ)===-1);
    if(!free.length)return -1;
    for(const a of free){alive[a.id]=false;left--}
    rounds++;
  }
  return rounds;
}

// alege dintre mai multe variante pe cea mai apropiată de țintele nivelului (blocaje și adâncime)
function gen(L,seed){
  const rnd=mulberry32(seed);
  let best=null,bestScore=-1;
  for(let t=0;t<params(L).tries;t++){
    const g=build(L,rnd);
    if(g.arrows.length<3)continue;
    const occ=occupancy(g.p,g.arrows,g.arrows.map(()=>true));
    g.blockedRatio=g.arrows.filter(a=>blocker(a,g.p,occ)!==-1).length/g.arrows.length;
    g.depth=depth(g);
    if(g.depth<0)continue;
    const score=Math.min(1,g.blockedRatio/g.p.blockedTarget)+Math.min(1,g.depth/g.p.depthTarget);
    if(score>bestScore){best=g;bestScore=score}
    if(score>=2)break;
  }
  return best;
}

// verificare: se poate goli tabla scoțând doar săgeți libere?
function solvable(g){
  const alive=g.arrows.map(()=>true);
  let left=g.arrows.length,progress=true;
  while(left&&progress){
    progress=false;
    const occ=occupancy(g.p,g.arrows,alive);
    for(const a of g.arrows)if(alive[a.id]&&blocker(a,g.p,occ)===-1){alive[a.id]=false;left--;progress=true;break}
  }
  return left===0;
}

return {mulberry32,DIRS,params,gen,rayCells,blocker,occupancy,solvable};
})();
if(typeof module!=='undefined')module.exports=AR;
