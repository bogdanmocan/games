// Înregistrează service worker-ul din rădăcina colecției (funcționează din orice pagină).
(function(){
  if(!('serviceWorker' in navigator))return;
  const base=new URL('.',document.currentScript.src);
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname}).catch(()=>{});
  });
})();
