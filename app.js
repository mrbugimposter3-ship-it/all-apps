/* All Apps launcher — one full-screen app at a time, tabs + swipe + clock-aligned auto-switch. */
(function(){
"use strict";
var LS="allapps.v1", $=function(id){return document.getElementById(id)};
var S=Object.assign({auto:true,interval:10,wake:true,keep:4,off:[],last:null},load());
function load(){try{return JSON.parse(localStorage.getItem(LS))||{}}catch(e){return {}}}
function save(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}

var APPS=[], cur=-1, frames={}, lru=[], stage=$("stage"), tabs=$("tabs"), nextAt=0;
var LOAD_WARN_MS=15000;

function toast(t){var el=$("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){el.classList.remove("show")},1800)}
function rotation(){var r=[];APPS.forEach(function(a,i){if(S.off.indexOf(a.repo)<0)r.push(i)});return r.length?r:APPS.map(function(_,i){return i})}

/* ---------- tabs ---------- */
function buildTabs(){
  tabs.innerHTML="";
  APPS.forEach(function(a,i){var b=document.createElement("button");b.textContent=a.name;b.title=a.description||a.name;
    b.setAttribute("role","tab");b.setAttribute("aria-selected","false");b.onclick=function(){show(i,true)};tabs.appendChild(b)});
}
function markTab(){
  [].forEach.call(tabs.children,function(b,i){b.setAttribute("aria-selected",i===cur?"true":"false")});
  var b=tabs.children[cur]; if(b){var l=b.offsetLeft-tabs.offsetLeft, w=b.offsetWidth;tabs.scrollLeft=l-(tabs.clientWidth-w)/2}
}

/* ---------- frames (lazy + LRU keep-alive) ---------- */
function frameFor(i){
  var a=APPS[i], f=frames[a.repo]; if(f) return f;
  f={wrap:null,ifr:null,loaded:false};
  if(a.frameable===false){f.wrap=fallback(a,"This app doesn't allow being shown inside another page.");stage.appendChild(f.wrap);frames[a.repo]=f;return f}
  var ifr=document.createElement("iframe");
  ifr.setAttribute("allow","autoplay; fullscreen; screen-wake-lock; microphone; camera; geolocation; clipboard-write");
  ifr.setAttribute("allowfullscreen","");ifr.title=a.name;ifr.loading="eager";ifr.referrerPolicy="strict-origin-when-cross-origin";
  var spin=document.createElement("div");spin.className="loading";spin.textContent="Loading "+a.name+"…";
  ifr.addEventListener("load",function(){f.loaded=true;spin.remove();if(f.warn){f.warn.remove();f.warn=null}});
  f.timer=setTimeout(function(){if(!f.loaded&&frames[a.repo]===f){f.warn=fallback(a,"Still loading. If it stays blank, the app may block being shown here.",true);stage.appendChild(f.warn);if(APPS[cur]!==a)f.warn.style.display="none"}},LOAD_WARN_MS);
  ifr.src=a.url; f.ifr=ifr; f.spin=spin; stage.appendChild(ifr); stage.appendChild(spin); frames[a.repo]=f; return f;
}
function fallback(a,msg,dismiss){
  var d=document.createElement("div");d.className="fallback";
  d.innerHTML='<h2></h2><p class="sub"></p><a target="_blank" rel="noopener">Open in new tab ↗</a>';
  d.querySelector("h2").textContent=a.name;d.querySelector(".sub").textContent=(a.description?a.description+" — ":"")+msg;
  d.querySelector("a").href=a.url;
  if(dismiss){var b=document.createElement("button");b.textContent="Keep waiting";b.onclick=function(){d.remove();var f=frames[a.repo];if(f)f.warn=null};d.appendChild(b)}
  return d;
}
function drop(repo){var f=frames[repo];if(!f)return;clearTimeout(f.timer);[f.ifr,f.wrap,f.spin,f.warn].forEach(function(n){if(n){if(n.tagName==="IFRAME")n.src="about:blank";n.remove()}});delete frames[repo]}
function setVisible(){
  Object.keys(frames).forEach(function(r){var f=frames[r],on=APPS[cur]&&APPS[cur].repo===r;
    if(f.ifr){f.ifr.classList.toggle("on",on);f.ifr.setAttribute("aria-hidden",on?"false":"true");f.ifr.tabIndex=on?0:-1}
    [f.wrap,f.spin,f.warn].forEach(function(n){if(n)n.style.display=on?"":"none"})});
}

/* ---------- switching ---------- */
function show(i,user){
  if(!APPS.length)return; i=(i%APPS.length+APPS.length)%APPS.length; if(i===cur)return;
  cur=i; var a=APPS[i]; frameFor(i);
  lru=lru.filter(function(r){return r!==a.repo});lru.unshift(a.repo);
  while(lru.length>S.keep){drop(lru.pop())}
  setVisible(); markTab();
  $("curName").textContent=a.name; $("pos").textContent=(i+1)+"/"+APPS.length;
  $("ext2").href=a.url; document.title=a.name+" · All Apps";
  S.last=a.repo; save();
  if(location.hash.slice(1)!==a.repo) history.replaceState(null,"","#"+a.repo);
  if(user) schedule();   /* manual switch keeps the clock alignment, just recomputes */
}
function step(d,auto){
  var r=rotation(), k=r.indexOf(cur);
  if(k<0){ /* current not in rotation: go to nearest one in direction */
    for(var j=1;j<=APPS.length;j++){var c=((cur+d*j)%APPS.length+APPS.length)%APPS.length;if(r.indexOf(c)>=0){show(c,!auto);return}}
  }
  show(r[((k+d)%r.length+r.length)%r.length],!auto);
}
$("prev").onclick=function(){step(-1)}; $("next").onclick=function(){step(1)};
$("ext").onclick=function(){if(APPS[cur])window.open(APPS[cur].url,"_blank","noopener")};
document.addEventListener("keydown",function(e){if(!$("panel").hidden){if(e.key==="Escape")closePanel();return}
  if(e.key==="ArrowLeft")step(-1);else if(e.key==="ArrowRight")step(1)});

/* ---------- swipe (bottom bar + screen edges + top bar outside tabs) ---------- */
function swipeOn(el,edge){
  var x0=0,y0=0,t0=0,active=false;
  function end(e){if(!active)return;active=false;document.body.classList.remove("dragging");
    var dx=e.clientX-x0,dy=e.clientY-y0,min=edge?30:40;
    if(e.type!=="pointercancel"&&Math.abs(dx)>min&&Math.abs(dx)>Math.abs(dy)*1.2&&Date.now()-t0<1500){step(dx<0?1:-1)}}
  el.addEventListener("pointerdown",function(e){active=true;x0=e.clientX;y0=e.clientY;t0=Date.now();
    document.body.classList.add("dragging"); /* iframes stop eating the gesture while dragging */
    try{el.setPointerCapture(e.pointerId)}catch(_){}});
  el.addEventListener("pointerup",end);window.addEventListener("pointerup",end);
  el.addEventListener("pointercancel",end);window.addEventListener("pointercancel",end);
}
swipeOn($("swipe")); swipeOn($("edgeL"),true); swipeOn($("edgeR"),true);

/* ---------- clock-aligned auto-switch ---------- */
function computeNext(now){
  var ms=S.interval*60000, d=new Date(now); d.setHours(0,0,0,0);
  var since=now-d.getTime(); return d.getTime()+(Math.floor(since/ms)+1)*ms; /* :00,:10,:20… for 10 min */
}
function schedule(){nextAt=computeNext(Date.now());tick()}
function fmt(ms){var s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")}
function tick(){
  var now=Date.now();
  if(S.auto&&nextAt&&now>=nextAt){ if(rotation().length>1||rotation()[0]!==cur){step(1,true);toast("Auto-switched to "+APPS[cur].name)} nextAt=computeNext(now) }
  if(!S.auto)nextAt=computeNext(now);
  var t=$("timer"); t.classList.toggle("paused",!S.auto);
  $("tIcon").textContent=S.auto?"⏸":"▶"; $("tTxt").textContent=S.auto?fmt(nextAt-now):"Paused";
  t.title=S.auto?"Next app at "+new Date(nextAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})+" — tap to pause":"Auto-switch paused — tap to resume";
}
setInterval(tick,1000);
document.addEventListener("visibilitychange",function(){if(!document.hidden){tick();if(S.wake)wakeOn()}});
$("timer").onclick=function(){S.auto=!S.auto;save();if(S.auto)schedule();tick();syncPanel();toast(S.auto?"Auto-switch on":"Auto-switch paused")};

/* ---------- wake lock ---------- */
var lock=null;
function wakeOn(){
  if(window.AndroidWake){try{AndroidWake.set(true)}catch(e){} return}
  if(!("wakeLock" in navigator)){$("wakeNote").textContent="This browser doesn't support keeping the screen on. On iPhone/iPad use iOS 16.4 or newer, or set Auto-Lock to Never.";return}
  if(lock)return;
  navigator.wakeLock.request("screen").then(function(l){lock=l;$("wakeNote").textContent="Screen will stay on while this app is open.";l.addEventListener("release",function(){lock=null})})
    .catch(function(){$("wakeNote").textContent="Tap anywhere once to keep the screen on."});
}
function wakeOff(){if(window.AndroidWake){try{AndroidWake.set(false)}catch(e){}} if(lock){lock.release();lock=null} $("wakeNote").textContent=""}
document.addEventListener("pointerdown",function(){if(S.wake&&!lock)wakeOn()},{passive:true});

/* ---------- settings panel ---------- */
function openPanel(){syncPanel();$("panel").hidden=false;showAyah(ay)}
function closePanel(){$("panel").hidden=true}
$("gear").onclick=openPanel; $("close").onclick=closePanel;
$("panel").addEventListener("click",function(e){if(e.target.id==="panel")closePanel()});
function syncPanel(){$("sAuto").checked=S.auto;$("sInt").value=String(S.interval);$("sWake").checked=S.wake;$("sKeep").value=String(S.keep)}
$("sAuto").onchange=function(){S.auto=this.checked;save();if(S.auto)schedule();tick()};
$("sInt").onchange=function(){S.interval=+this.value||10;save();schedule();toast("Switching every "+S.interval+" min")};
$("sWake").onchange=function(){S.wake=this.checked;save();S.wake?wakeOn():wakeOff()};
$("sKeep").onchange=function(){S.keep=+this.value||4;save();while(lru.length>S.keep)drop(lru.pop())};
function buildList(){
  var box=$("appList");box.innerHTML="";
  APPS.forEach(function(a){var l=document.createElement("label"),c=document.createElement("input"),d=document.createElement("div");
    c.type="checkbox";c.checked=S.off.indexOf(a.repo)<0;c.onchange=function(){S.off=S.off.filter(function(r){return r!==a.repo});if(!c.checked)S.off.push(a.repo);save()};
    var b=document.createElement("b");b.textContent=a.name;var s=document.createElement("small");s.textContent=a.description||a.url;
    d.appendChild(b);d.appendChild(s);l.appendChild(c);l.appendChild(d);box.appendChild(l)});
}
$("allOn").onclick=function(){S.off=[];save();buildList()};
$("allOff").onclick=function(){S.off=APPS.map(function(a){return a.repo});save();buildList()};

/* ---------- charity ayah card (rotates) ---------- */
var ay=Math.floor(Date.now()/86400000)%((window.INFAQ||[1]).length);
function showAyah(i){var L=window.INFAQ||[];if(!L.length)return;ay=(i%L.length+L.length)%L.length;var x=L[ay];
  $("ayAr").textContent=x.ar;$("ayEn").textContent=x.en;$("ayRef").textContent=x.surah+" · "+x.surahEn+" "+x.ref+" — Pickthall"}
$("ayPrev").onclick=function(){showAyah(ay-1)}; $("ayNext").onclick=function(){showAyah(ay+1)};
setInterval(function(){if(!$("panel").hidden)showAyah(ay+1)},20000);

/* ---------- boot ---------- */
fetch("apps.json",{cache:"no-cache"}).then(function(r){return r.json()}).then(function(j){
  APPS=j.apps||[]; buildTabs(); buildList();
  var h=decodeURIComponent(location.hash.slice(1)), want=APPS.findIndex(function(a){return a.repo===h});
  if(want<0)want=APPS.findIndex(function(a){return a.repo===S.last});
  show(want<0?0:want); schedule(); if(S.wake)wakeOn();
}).catch(function(){stage.innerHTML='<div class="fallback"><h2>Couldn\'t load the app list</h2><p class="sub">Check your connection and reload.</p></div>'});
window.addEventListener("hashchange",function(){var i=APPS.findIndex(function(a){return a.repo===location.hash.slice(1)});if(i>=0)show(i,true)});
window.addEventListener("resize",markTab);
window.AllApps={show:show,step:step,state:S,apps:function(){return APPS},cur:function(){return cur},nextAt:function(){return nextAt},frames:function(){return Object.keys(frames)}};
})();
