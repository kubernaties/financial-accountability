/**
 * Start-up safety net (classic script, NOT a module). Loaded by index.html BEFORE the app so it can catch
 * failures that happen while the app's own modules are loading (404, syntax error, crash on start).
 * If the app has not drawn anything, it shows a readable error panel with recovery buttons instead of a
 * blank page. It never deletes saved financial data.
 */
(function(){
  var shown=false, early=[];
  function appReady(){var a=document.getElementById("app");return !!(a&&a.children.length&&!document.getElementById("fa-fatal"));}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function fatal(msg){
    if(shown||appReady())return; shown=true;
    var a=document.getElementById("app"); if(!a)return;
    a.innerHTML='<div id="fa-fatal"><h2>The app could not start</h2>'+
      '<p>Your saved data was not changed. Try reloading. If it keeps failing, use "Clear app cache" (this does not delete your data).</p>'+
      '<pre>'+esc(msg)+(early.length?'\n\n'+esc(early.join('\n')):'')+'</pre>'+
      '<button class="p" id="fa-reload">Reload</button><button id="fa-cache">Clear app cache &amp; reload</button><button id="fa-backup">Download my saved data</button></div>';
    document.getElementById("fa-reload").onclick=function(){location.reload();};
    document.getElementById("fa-cache").onclick=function(){
      var jobs=[];
      try{if(navigator.serviceWorker)jobs.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister();}));}));}catch(e){}
      try{if(window.caches)jobs.push(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x);}));}));}catch(e){}
      Promise.all(jobs).catch(function(){}).then(function(){location.reload();});
    };
    document.getElementById("fa-backup").onclick=function(){
      try{
        var data={},i,k;
        for(i=0;i<localStorage.length;i++){k=localStorage.key(i);if(k&&k.indexOf("fa-")===0&&k!=="fa-device")data[k]=localStorage.getItem(k);}
        var b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),l=document.createElement("a");
        l.href=URL.createObjectURL(b);l.download="financial-local-data.json";l.click();
      }catch(e){alert("Could not read saved data: "+e.message);}
    };
  }
  window.__faFatal=fatal;
  window.addEventListener("error",function(ev){
    var t=ev.target;
    if(t&&t!==window&&(t.tagName==="SCRIPT"||t.tagName==="LINK")){early.push("Failed to load: "+(t.src||t.href));fatal("A required file failed to load.");return;}
    early.push((ev.message||"Script error")+(ev.filename?" ("+ev.filename+":"+ev.lineno+")":""));
    if(!appReady())fatal(ev.message||"Script error");
  },true);
  window.addEventListener("unhandledrejection",function(ev){
    var m=(ev.reason&&ev.reason.message)||String(ev.reason);early.push("Unhandled: "+m);
    if(!appReady())fatal(m);
  });
  // Watchdog: if nothing has been drawn after 6 seconds, something silently failed.
  setTimeout(function(){if(!appReady())fatal("The app did not start (no screen was drawn).");},6000);
})();
