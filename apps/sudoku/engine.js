'use strict';
// Sudoku: generează o soluție completă, apoi scoate cifre cât timp soluția rămâne unică.
// Mai puține indicii = nivel mai greu. Fiecare puzzle are exact o soluție.
const SD=(function(){
function mulberry32(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

const ROW=i=>(i/9)|0,COL=i=>i%9,BOX=i=>((ROW(i)/3)|0)*3+((COL(i)/3)|0);

// numără soluțiile (până la limit), completând celula cu cele mai puține variante
function count(board,limit,rnd){
  const rows=new Array(9).fill(0),cols=new Array(9).fill(0),boxes=new Array(9).fill(0);
  for(let i=0;i<81;i++){
    const v=board[i];
    if(v){const b=1<<v;rows[ROW(i)]|=b;cols[COL(i)]|=b;boxes[BOX(i)]|=b}
  }
  let found=0,firstSolution=null;
  function rec(){
    let best=-1,bestMask=0,bestN=10;
    for(let i=0;i<81;i++){
      if(board[i])continue;
      const used=rows[ROW(i)]|cols[COL(i)]|boxes[BOX(i)];
      const free=~used&0x3FE;
      let n=0;for(let m=free;m;m&=m-1)n++;
      if(n<bestN){bestN=n;best=i;bestMask=free;if(n<=1)break}
    }
    if(best<0){found++;if(!firstSolution)firstSolution=board.slice();return found>=limit}
    if(bestN===0)return false;
    const digits=[];
    for(let d=1;d<=9;d++)if(bestMask&(1<<d))digits.push(d);
    if(rnd)shuffle(digits,rnd);
    const r=ROW(best),c=COL(best),b=BOX(best);
    for(const d of digits){
      const bit=1<<d;
      board[best]=d;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;
      const stop=rec();
      board[best]=0;rows[r]&=~bit;cols[c]&=~bit;boxes[b]&=~bit;
      if(stop)return true;
    }
    return false;
  }
  rec();
  return {n:found,solution:firstSolution};
}

function params(L){
  return {clues:Math.max(24,45-L)};
}

function gen(L,seed){
  const rnd=mulberry32(seed),p=params(L);
  const full=new Array(81).fill(0);
  const sol=count(full,1,rnd).solution;
  const puzzle=sol.slice();
  const order=shuffle([...Array(81).keys()],rnd);
  let clues=81;
  for(const i of order){
    if(clues<=p.clues)break;
    const v=puzzle[i];
    puzzle[i]=0;
    if(count(puzzle.slice(),2).n!==1)puzzle[i]=v;else clues--;
  }
  return {puzzle,solution:sol,clues};
}

return {gen,params,count,ROW,COL,BOX,mulberry32};
})();
if(typeof module!=='undefined')module.exports=SD;
