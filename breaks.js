// Memento de pauză, comun pentru toate jocurile din colecție.
// Numără timpul de joc cumulat (doar cât pagina e vizibilă). La limită (implicit 60 min) cere o pauză;
// poți amâna de 2 ori câte 10 minute, apoi jocurile se blochează până trece pauza obligatorie.
// Starea e salvată în localStorage, deci rămâne la fel dacă închizi sau redeschizi aplicația.
(function(){
'use strict';
const SK='gbreak_state_v1';
// Valorile sunt fixe, nu se pot schimba din interfață.
const LIMIT_MIN=60,BREAK_MIN=15,SNOOZE_MIN=10,MAX_SNOOZE=2;

const readCfg=()=>({limitMin:LIMIT_MIN,breakMin:BREAK_MIN});
function fresh(now){return {played:0,snoozes:0,lockUntil:0,last:now}}
function readState(now){
  try{
    const s=JSON.parse(localStorage.getItem(SK)||'null');
    if(s&&typeof s.played==='number')return {played:s.played,snoozes:s.snoozes|0,lockUntil:+s.lockUntil||0,last:+s.last||now};
  }catch(e){}
  return fresh(now);
}
function writeState(s){try{localStorage.setItem(SK,JSON.stringify(s))}catch(e){}}

// ---- interfață ----
let box=null,titleEl,textEl,btnA,btnB,shown='';
function ensureBox(){
  if(box)return;
  const st=document.createElement('style');
  st.textContent='#gbreak{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:rgba(8,12,20,.94);padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'+
    '#gbreak .gb{background:#fff;color:#111;border-radius:16px;padding:22px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.5)}'+
    '#gbreak h2{margin:0 0 8px;font-size:22px}#gbreak p{margin:0 0 16px;font-size:15px;line-height:1.4;color:#333}'+
    '#gbreak button{display:block;width:100%;margin:8px 0 0;font:inherit;font-weight:600;border:0;border-radius:10px;padding:11px 14px;background:#1f3a34;color:#fff;cursor:pointer}'+
    '#gbreak button.sec{background:#e3e8e6;color:#1f3a34}#gbreak button[hidden]{display:none}'+
    '#gbreak .big{font-size:34px;font-weight:700;margin:0 0 6px;font-variant-numeric:tabular-nums}';
  document.head.appendChild(st);
  box=document.createElement('div');box.id='gbreak';box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');
  const gb=document.createElement('div');gb.className='gb';
  titleEl=document.createElement('h2');
  textEl=document.createElement('p');
  btnA=document.createElement('button');btnA.type='button';
  btnB=document.createElement('button');btnB.type='button';btnB.className='sec';
  gb.append(titleEl,textEl,btnA,btnB);box.appendChild(gb);
  document.body.appendChild(box);
}
function setInert(on){
  for(const el of document.body.children){
    if(el===box)continue;
    if(on)el.setAttribute('inert','');else el.removeAttribute('inert');
  }
}
function show(kind,title,text,a,b){
  ensureBox();
  titleEl.textContent=title;textEl.textContent=text;
  for(const [btn,def] of [[btnA,a],[btnB,b]]){
    btn.hidden=!def;
    if(def){btn.textContent=def.label;btn.onclick=def.fn}
  }
  if(shown!==kind){
    shown=kind;box.style.display='flex';setInert(true);
    try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
    (btnA.hidden?btnB:btnA).focus();
  }
}
function hide(){
  if(!box||!shown)return;
  shown='';box.style.display='none';setInert(false);
}
const mmss=ms=>{const t=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};

const TIPS='Ridică-te, mișcă-te puțin, bea un pahar cu apă și privește departe de ecran.';

// ---- logică ----
function startBreak(){
  const now=Date.now(),s=readState(now),c=readCfg();
  s.lockUntil=now+c.breakMin*60000;s.last=now;writeState(s);tick();
}
function snooze(){
  const now=Date.now(),s=readState(now);
  if(s.snoozes<MAX_SNOOZE){s.snoozes++;s.last=now;writeState(s)}
  hide();
}
function resume(){
  hide();writeState(fresh(Date.now()));
}

function tick(){
  const now=Date.now(),c=readCfg();
  let s=readState(now);

  // pauză obligatorie în curs sau terminată
  if(s.lockUntil){
    if(now<s.lockUntil){
      show('lock','Pauză',TIPS+' Mai ai '+mmss(s.lockUntil-now)+' până poți juca din nou.',null,null);
    }else{
      show('done','Pauza s-a terminat','Poți continua să joci.',{label:'Continuă',fn:resume},null);
    }
    return;
  }

  // ai lipsit suficient de mult (a închis aplicația sau pagina era ascunsă) = pauză făcută
  if(now-s.last>=c.breakMin*60000&&(s.played>0||s.snoozes>0)){s=fresh(now);writeState(s)}

  const visible=document.visibilityState==='visible';
  if(visible&&!shown){
    s.played+=Math.min(2,Math.max(0,(now-s.last)/1000));
    s.last=now;writeState(s);
  }else if(visible){s.last=now;writeState(s)}

  const thr=c.limitMin*60+s.snoozes*SNOOZE_MIN*60;
  if(s.played>=thr){
    if(s.snoozes<MAX_SNOOZE){
      const left=MAX_SNOOZE-s.snoozes;
      show('prompt','E timpul pentru o pauză','Joci de aproximativ '+Math.round(s.played/60)+' de minute. '+TIPS,
        {label:'Fac pauza acum ('+c.breakMin+' min)',fn:startBreak},
        {label:'Amână '+SNOOZE_MIN+' minute (mai poți de '+left+(left===1?' dată':' ori')+')',fn:snooze});
    }else{
      startBreak();
    }
  }else if(shown==='prompt')hide();
}

window.GBreak={
  status(){
    const now=Date.now(),c=readCfg(),s=readState(now);
    const away=now-s.last>=c.breakMin*60000&&!s.lockUntil;
    return {limitMin:c.limitMin,breakMin:c.breakMin,playedMin:away?0:Math.floor(s.played/60),snoozes:away?0:s.snoozes,lockedMs:Math.max(0,s.lockUntil-now),maxSnooze:MAX_SNOOZE};
  }
};

function start(){
  ensureBox();tick();
  setInterval(tick,1000);
  document.addEventListener('visibilitychange',tick);
}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
