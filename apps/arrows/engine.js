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

function params(L){
  return {
    cols:Math.min(5+Math.floor(L/3),10),
    rows:Math.min(7+Math.floor(L/2),15),
    minLen:2,
    maxLen:Math.min(3+Math.floor(L/2),9),
    cover:Math.min(.5+L*.02,.84),
    lives:3
  };
}
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function rayCells(a,p){
  const h=a.path[a.path.length-1],d=DIRS[a.dir],out=[];
  let x=h[0]+d[0],y=h[1]+d[1];
  while(x>=0&&y>=0&&x<p.cols&&y<p.rows){out.push([x,y]);x+=d[0];y+=d[1]}
  return out;
}

function build(L,rnd){
  const p=params(L);
  const occ=Array.from({length:p.rows},()=>new Array(p.cols).fill(-1));
  const arrows=[];
  const total=p.cols*p.rows;
  let covered=0,fails=0;
  while(covered<total*p.cover&&fails<600){
    const sx=Math.floor(rnd()*p.cols),sy=Math.floor(rnd()*p.rows);
    if(occ[sy][sx]!==-1){fails++;continue}
    const len=p.minLen+Math.floor(rnd()*(p.maxLen-p.minLen+1));
    const path=[[sx,sy]],used=new Set([sx+','+sy]);
    let dir=Math.floor(rnd()*4),lastDir=dir;
    while(path.length<len){
      const [cx,cy]=path[path.length-1];
      const order=shuffle([0,1,2,3],rnd);
      if(rnd()<.6)order.unshift(dir);
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

// nivelul: cel puțin ~35% dintre săgeți trebuie să fie blocate la început, ca să existe de gândit
function gen(L,seed){
  const rnd=mulberry32(seed);
  let best=null;
  for(let t=0;t<30;t++){
    const g=build(L,rnd);
    if(g.arrows.length<3)continue;
    const alive=g.arrows.map(()=>true),occ=occupancy(g.p,g.arrows,alive);
    const blocked=g.arrows.filter(a=>blocker(a,g.p,occ)!==-1).length/g.arrows.length;
    g.blockedRatio=blocked;
    if(!best||blocked>best.blockedRatio)best=g;
    if(blocked>=Math.min(.2+L*.015,.5))break;
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
