'use strict';
// Solver Klondike: caută o mână câștigabilă (cu informație completă, deci cu joc perfect).
// Mutările omise (ex. fundație -> coloană) fac doar căutarea incompletă, nu o fac greșită:
// orice mână acceptată are o soluție reală.
// Carte: id = culoare*13 + (rang-1); culori 0=♠ 1=♥ 2=♦ 3=♣.

const suitOf=id=>(id/13)|0;
const rankOf=id=>id%13+1;
const isRed=id=>{const s=suitOf(id);return s===1||s===2};

// pile = {d: nr. cărți întoarse (jos), c: cărți}; cărțile de la indexul d în sus sunt vizibile
function fixPile(c,d){
  if(c.length>0&&c.length===d)d--;
  return {d,c};
}

function solve(tab0,stock0,draw3,budget){
  let nodes=0;
  const seen=new Set();

  const safe=(id,f)=>{
    const r=rankOf(id),s=suitOf(id);
    if(f[s]!==r-1)return false;
    if(r<=2)return true;
    const o=isRed(id)?[0,3]:[1,2];
    return f[o[0]]>=r-1&&f[o[1]]>=r-1;
  };

  function key(st){
    const t=st.tab.map(p=>p.d+':'+p.c.join(',')).sort().join('|');
    return t+'#'+st.stock.join(',')+(draw3?'#'+st.waste.join(','):'');
  }

  // mută automat în fundații cărțile "sigure"
  function auto(st){
    let moved=true;
    while(moved){
      moved=false;
      for(let i=0;i<7;i++){
        const p=st.tab[i],n=p.c.length;
        if(n>p.d&&safe(p.c[n-1],st.found)){
          st.found[suitOf(p.c[n-1])]++;
          st.tab[i]=fixPile(p.c.slice(0,-1),p.d);moved=true;
        }
      }
      if(draw3){
        const n=st.waste.length;
        if(n&&safe(st.waste[n-1],st.found)){
          st.found[suitOf(st.waste[n-1])]++;st.waste=st.waste.slice(0,-1);moved=true;
        }
      }else{
        for(let k=0;k<st.stock.length;k++){
          if(safe(st.stock[k],st.found)){
            st.found[suitOf(st.stock[k])]++;
            st.stock=st.stock.slice(0,k).concat(st.stock.slice(k+1));moved=true;break;
          }
        }
      }
    }
  }

  const clone=st=>({tab:st.tab.slice(),found:st.found.slice(),stock:st.stock,waste:st.waste});

  function accepts(st,j,id){
    const q=st.tab[j];
    if(!q.c.length)return rankOf(id)===13;
    const t=q.c[q.c.length-1];
    return isRed(t)!==isRed(id)&&rankOf(t)===rankOf(id)+1;
  }

  function dfs(st){
    if(st.found[0]+st.found[1]+st.found[2]+st.found[3]===52)return true;
    const k=key(st);
    if(seen.has(k))return false;
    seen.add(k);
    if(++nodes>budget)return false;

    const next=[];
    const push=n=>{auto(n);next.push(n)};

    // coloană -> fundație (nesigure)
    for(let i=0;i<7;i++){
      const p=st.tab[i],n=p.c.length;
      if(n>p.d&&st.found[suitOf(p.c[n-1])]===rankOf(p.c[n-1])-1){
        const m=clone(st);m.found[suitOf(p.c[n-1])]++;m.tab[i]=fixPile(p.c.slice(0,-1),p.d);push(m);
      }
    }
    // coloană -> coloană
    for(let i=0;i<7;i++){
      const p=st.tab[i];
      for(let k=p.d;k<p.c.length;k++){
        const id=p.c[k];
        if(k>p.d&&st.found[suitOf(p.c[k-1])]!==rankOf(p.c[k-1])-1)continue; // mută parțial doar ca să elibereze o carte pentru fundație
        if(k===0&&rankOf(id)===13)continue;
        let emptyDone=false;
        for(let j=0;j<7;j++){
          if(j===i||!accepts(st,j,id))continue;
          if(!st.tab[j].c.length){if(emptyDone)continue;emptyDone=true}
          const m=clone(st);
          m.tab[i]=fixPile(p.c.slice(0,k),p.d);
          const q=st.tab[j];
          m.tab[j]={d:q.d,c:q.c.concat(p.c.slice(k))};
          push(m);
        }
      }
    }
    // pachet/rezervă -> coloană / fundație
    const cand=draw3?(st.waste.length?[st.waste.length-1]:[]):st.stock.map((_,k)=>k);
    for(const k of cand){
      const id=draw3?st.waste[k]:st.stock[k];
      const rem=()=>draw3?{stock:st.stock,waste:st.waste.slice(0,-1)}:{stock:st.stock.slice(0,k).concat(st.stock.slice(k+1)),waste:st.waste};
      if(st.found[suitOf(id)]===rankOf(id)-1){
        const m=clone(st);Object.assign(m,rem());m.found[suitOf(id)]++;push(m);
      }
      let emptyDone=false;
      for(let j=0;j<7;j++){
        if(!accepts(st,j,id))continue;
        if(!st.tab[j].c.length){if(emptyDone)continue;emptyDone=true}
        const m=clone(st);Object.assign(m,rem());
        const q=st.tab[j];m.tab[j]={d:q.d,c:q.c.concat([id])};push(m);
      }
    }
    // extragere din pachet (doar la 3 cărți; la 1 carte orice carte din pachet e deja accesibilă)
    if(draw3){
      if(st.stock.length){
        const m=clone(st),n=Math.min(3,st.stock.length);
        m.stock=st.stock.slice(0,st.stock.length-n);
        m.waste=st.waste.concat(st.stock.slice(-n).reverse());
        next.push(m);
      }else if(st.waste.length){
        const m=clone(st);m.stock=st.waste.slice().reverse();m.waste=[];next.push(m);
      }
    }
    for(const m of next)if(dfs(m))return true;
    return false;
  }

  const st={tab:tab0,found:[0,0,0,0],stock:stock0,waste:[]};
  auto(st);
  return {ok:dfs(st),nodes};
}

// împarte pachetul exact ca în joc: coloana i primește i+1 cărți, doar ultima e vizibilă
function dealDeck(deck){
  const d=deck.slice(),tab=[];
  for(let i=0;i<7;i++)tab.push({d:i,c:[]});
  for(let i=0;i<7;i++)for(let j=0;j<=i;j++)tab[i].c.push(d.pop());
  return {tab,stock:d};
}

function shuffled(){
  const a=[];for(let i=0;i<52;i++)a.push(i);
  for(let i=51;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

function findWinnable(draw3,budget,maxMs){
  const t0=Date.now();let tries=0,deck;
  do{
    deck=shuffled();tries++;
    const {tab,stock}=dealDeck(deck);
    if(solve(tab,stock,draw3,budget).ok)return {deck,verified:true,tries};
  }while(Date.now()-t0<maxMs);
  return {deck,verified:false,tries};
}

if(typeof importScripts==='function'){
  self.onmessage=e=>{
    self.postMessage(findWinnable(!!e.data.draw3,e.data.budget||40000,e.data.maxMs||20000));
  };
}
