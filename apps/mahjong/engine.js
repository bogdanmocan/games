'use strict';
// Motorul Mahjong: layout-uri procedurale, atribuire de piese garantat rezolvabilă, modele de piese.
// Coordonate: x în lățimi de piesă, y în înălțimi de piesă (centrul piesei), z = stratul.
const MJ=(function(){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mulberry32(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
function shuffle(a,rnd){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

// creșterea treptată a dificultății
function levelParams(L){
  const N=Math.min(144,20+4*L);                       // nr. de piese (par)
  const Z=L<=2?1:L<=6?2:L<=12?3:L<=20?4:5;            // straturi
  const M=Math.min(36,5+L,N/2);                       // nr. de modele diferite
  return {N,Z,M};
}

const overlap=(a,b)=>Math.abs(a.x-b.x)<0.999&&Math.abs(a.y-b.y)<0.999;

function genLayout(N,Z,rnd){
  let best=[];
  for(let attempt=0;attempt<40;attempt++){
    const B=Math.min(64,Math.ceil(N/(1+0.55*(Z-1)))+Math.floor(attempt/2)*2);
    const R=clamp(Math.round(Math.sqrt(B/1.3)),Math.ceil(B/8),12);
    const avg=B/R,w=[];
    for(let r=0;r<R;r++)w.push(clamp(Math.round(avg+(rnd()*3-1.5)),1,8));
    let sum=w.reduce((a,b)=>a+b,0),guard=0;
    while(sum!==B&&guard++<2000){
      const r=Math.floor(rnd()*R);
      if(sum<B&&w[r]<8){w[r]++;sum++}else if(sum>B&&w[r]>1){w[r]--;sum--}
    }
    const tiles=[];
    for(let r=0;r<R;r++)for(let i=0;i<w[r];i++)tiles.push({x:-(w[r]-1)/2+i,y:r-(R-1)/2,z:0});

    for(let z=1;z<Z;z++){
      const prev=tiles.filter(t=>t.z===z-1);
      const has=new Set(prev.map(t=>t.x+','+t.y));
      const cand=[];
      for(const t of prev){
        cand.push({x:t.x,y:t.y});
        if(has.has((t.x+1)+','+t.y))cand.push({x:t.x+.5,y:t.y});
      }
      const classes=[];
      for(const c of cand){
        if(c.x>0)continue;
        classes.push(c.x===0?[c]:[c,{x:-c.x,y:c.y}]);
      }
      shuffle(classes,rnd);
      const p=clamp(0.85-0.08*z,0.4,0.85),mine=[];
      for(const cl of classes){
        if(rnd()>p)continue;
        if(cl.some(c=>mine.some(m=>m.y===c.y&&Math.abs(m.x-c.x)<0.999)))continue;
        for(const c of cl)mine.push({x:c.x,y:c.y,z});
      }
      tiles.push(...mine);
    }
    if(tiles.length>best.length)best=tiles;
    if(tiles.length>=N){best=tiles;break}
  }
  // taie piesele în plus de sus în jos (niciodată una pe care stă altă piesă)
  while(best.length>N){
    const tops=best.filter(t=>!best.some(o=>o.z===t.z+1&&overlap(o,t)));
    const maxZ=Math.max(...tops.map(t=>t.z));
    const pool=rnd()<.8?tops.filter(t=>t.z===maxZ):tops;
    best.splice(best.indexOf(pool[Math.floor(rnd()*pool.length)]),1);
  }
  return best;
}

function buildGraph(tiles){
  const n=tiles.length,above=[],left=[],right=[];
  for(let i=0;i<n;i++){above.push([]);left.push([]);right.push([])}
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    if(i===j)continue;
    const a=tiles[i],b=tiles[j];
    if(b.z===a.z+1&&overlap(a,b))above[i].push(j);
    else if(b.z===a.z&&Math.abs(b.y-a.y)<0.999){
      const dx=b.x-a.x;
      if(dx<0&&dx>=-1.001)left[i].push(j);
      else if(dx>0&&dx<=1.001)right[i].push(j);
    }
  }
  return {n,above,left,right};
}
function isFree(g,alive,i){
  if(!alive[i])return false;
  for(const j of g.above[i])if(alive[j])return false;
  let l=false,r=false;
  for(const j of g.left[i])if(alive[j]){l=true;break}
  for(const j of g.right[i])if(alive[j]){r=true;break}
  return !(l&&r);
}

// Construcție inversă: scoate perechi de piese libere până se golește tabla; fiecare pereche
// primește același model. Jucând perechile în aceeași ordine, nivelul se poate mereu termina.
// Întoarce tipul fiecărei piese, sau null dacă layout-ul nu se poate goli în perechi.
function assignTypes(g,aliveFlags,pairTypes,rnd){
  const ids=[];
  for(let i=0;i<g.n;i++)if(aliveFlags[i])ids.push(i);
  for(let attempt=0;attempt<200;attempt++){
    const al=aliveFlags.slice(),order=[];
    let cnt=ids.length;
    while(cnt>0){
      const free=[];
      for(const i of ids)if(isFree(g,al,i))free.push(i);
      if(free.length<2)break;
      const ai=Math.floor(rnd()*free.length);
      let bi=Math.floor(rnd()*(free.length-1));if(bi>=ai)bi++;
      const a=free[ai],b=free[bi];
      al[a]=al[b]=false;cnt-=2;order.push([a,b]);
    }
    if(cnt===0){
      const types=shuffle(pairTypes.slice(),rnd),out=new Array(g.n).fill(-1);
      order.forEach((p,k)=>{out[p[0]]=out[p[1]]=types[k]});
      return out;
    }
  }
  return null;
}

// ---- modele de piese ----
const SHAPES=13,COLORS=12;
const PALETTE=['#d32f2f','#1976d2','#388e3c','#f57c00','#7b1fa2','#00838f','#c2185b','#5d4037','#f9a825','#283593','#689f38','#455a64'];
const FACES=['#f6f1e1','#e9f0f7','#f7e9e9','#e9f5ec','#f3ecf8'];
function fixedPerm(k,seed){const a=[];for(let i=0;i<k;i++)a.push(i);return shuffle(a,mulberry32(seed))}
const SHAPE_PERM=fixedPerm(SHAPES,2024),COLOR_PERM=fixedPerm(COLORS,77);

// Un set nou apare la fiecare 10 niveluri și schimbă exact 20% dintre modele:
// în setul s se schimbă locurile cu slot % 5 === s % 5.
function setOf(L){return Math.floor((L-1)/10)}
function freshSlots(set){return set>0?[...Array(36).keys()].filter(i=>i%5===set%5):[]}
function designFor(slot,set){
  let v=0;
  for(let t=1;t<=set;t++)if(t%5===slot%5)v++;
  const n=slot+37*v; // injectiv în (formă, culoare, familie) pentru toate locurile unui set
  const r=mulberry32(n*7919+13);
  return {
    n,shape:SHAPE_PERM[n%SHAPES],color:COLOR_PERM[n%COLORS],
    fam:Math.floor(n/(SHAPES*COLORS)),dots:Math.floor(r()*4),accent:Math.floor(r()*COLORS),
    rot:[0,0,-18,18][Math.floor(r()*4)]
  };
}
function shapeSvg(shape,c,bg){
  const st=' stroke="rgba(0,0,0,.35)" stroke-width="2"';
  switch(shape){
    case 0:return '<circle cx="50" cy="44" r="27" fill="'+c+'"'+st+'/>';
    case 1:return '<circle cx="50" cy="44" r="22" fill="none" stroke="'+c+'" stroke-width="11"/>';
    case 2:return '<rect x="25" y="19" width="50" height="50" rx="8" fill="'+c+'"'+st+'/>';
    case 3:return '<polygon points="50,14 78,44 50,74 22,44" fill="'+c+'"'+st+'/>';
    case 4:return '<polygon points="50,16 79,70 21,70" fill="'+c+'"'+st+'/>';
    case 5:return '<polygon points="50,15 76,29 76,59 50,73 24,59 24,29" fill="'+c+'"'+st+'/>';
    case 6:return '<polygon points="50,14 59,36 82,38 64,53 70,76 50,63 30,76 36,53 18,38 41,36" fill="'+c+'"'+st+'/>';
    case 7:return '<path d="M40 16h20v22h22v20H60v22H40V58H18V38h22z" fill="'+c+'"'+st+'/>';
    case 8:return '<circle cx="50" cy="44" r="28" fill="'+c+'"'+st+'/><circle cx="62" cy="38" r="23" fill="'+bg+'"/>';
    case 9:return '<path d="M50 74C20 52 18 28 36 26C44 25 50 32 50 37C50 32 56 25 64 26C82 28 80 52 50 74Z" fill="'+c+'"'+st+'/>';
    case 10:return '<rect x="20" y="18" width="60" height="12" rx="5" fill="'+c+'"/><rect x="20" y="38" width="60" height="12" rx="5" fill="'+c+'"/><rect x="20" y="58" width="60" height="12" rx="5" fill="'+c+'"/>';
    case 11:{
      let s='';
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5-Math.PI/2;s+='<circle cx="'+(50+19*Math.cos(a)).toFixed(1)+'" cy="'+(44+19*Math.sin(a)).toFixed(1)+'" r="12" fill="'+c+'"'+st+'/>'}
      return s+'<circle cx="50" cy="44" r="8" fill="'+bg+'"/>';
    }
    default:return '<path d="M30 16l20 20 20-20 10 10-20 20 20 20-10 10-20-20-20 20-10-10 20-20-20-20z" fill="'+c+'"'+st+' transform="translate(0,-3) scale(.95)"/>';
  }
}
function tileSvg(slot,set){
  const d=designFor(slot,set),bg=FACES[d.fam%FACES.length];
  let s='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g transform="rotate('+d.rot+' 50 44)">'+shapeSvg(d.shape,PALETTE[d.color],bg)+'</g>';
  for(let k=0;k<d.dots;k++)s+='<circle cx="'+(50+(k-(d.dots-1)/2)*16)+'" cy="87" r="5" fill="'+PALETTE[d.accent]+'"/>';
  return {svg:s+'</svg>',face:bg};
}

return {mulberry32,shuffle,levelParams,genLayout,buildGraph,isFree,assignTypes,setOf,freshSlots,designFor,tileSvg};
})();
if(typeof module!=='undefined')module.exports=MJ;
