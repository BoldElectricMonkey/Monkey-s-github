'use strict';
/* ================================================================
 * Menmo OS — 核心系统（状态 / 窗口系统 / 任务栏 / 桌面 / 开始菜单
 *                / 右键菜单 / 主题壁纸 / 快捷键 / 锁屏开机）
 * ================================================================ */

/* ================= 全局状态 ================= */
const TASKBAR_H = 48;          // 任务栏高度（h-12）
const WIN_MIN_W = 360;         // 窗口最小宽
const WIN_MIN_H = 280;         // 窗口最小高
const State = { theme:'light', bg:'https://picsum.photos/id/1015/1920/1080', volume:75, scale:100, z:20, running:[], booted:false };

const APP_DEF = {
  mycomputer:{title:'我的电脑',icon:'fa-desktop',color:'text-sky-500',w:880,h:620},
  browser:{title:'浏览器',icon:'fa-chrome',color:'text-emerald-500',w:920,h:620},
  calculator:{title:'计算器',icon:'fa-calculator',color:'text-amber-500',w:400,h:530},
  notepad:{title:'记事本',icon:'fa-file-text-o',color:'text-blue-500',w:620,h:460},
  settings:{title:'设置',icon:'fa-cog',color:'text-gray-400',w:540,h:580},
  recyclebin:{title:'回收站',icon:'fa-trash-o',color:'text-gray-400',w:580,h:480},
  paint:{title:'画图',icon:'fa-paint-brush',color:'text-rose-500',w:860,h:640},
  clock:{title:'时钟',icon:'fa-clock-o',color:'text-violet-500',w:470,h:540},
  minesweeper:{title:'扫雷',icon:'fa-bomb',color:'text-red-500',w:540,h:580},
};
const DESKTOP_APPS=['mycomputer','browser','calculator','notepad','paint','minesweeper','settings'];

function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.from((r||document).querySelectorAll(s));}
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add('hidden'),1600);
}
function fmtBytes(n){ if(n<1024)return n+' B'; if(n<1048576)return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }

/* ================= 锁屏 / 开机 ================= */
function unlock(){ $('#lockScreen').classList.add('hidden'); State.booted=true; toast('欢迎回来'); }
function appLock(){ $('#lockScreen').classList.remove('hidden'); closeStart(); updateLockClock(); }
function appRestart(){ const b=$('#bootScreen'); b.classList.remove('hidden'); closeStart(); setTimeout(()=>{ $('#lockScreen').classList.add('hidden'); setTimeout(()=>b.classList.add('hidden'),1700); },200); }
function appShutdown(){
  const b=$('#bootScreen'); b.classList.remove('hidden'); closeStart();
  const bar=$('#bootBar'); bar.style.animation='none'; bar.style.width='0';
  setTimeout(()=>{ $('#desktopBody').style.backgroundImage=''; document.body.style.background='#000'; },300);
  setTimeout(()=>{ b.querySelectorAll('*').forEach(n=>n.style.display='none'); b.style.background='#000'; },1500);
}
function updateLockClock(){
  const d=new Date();
  $('#lockScreen .text-5xl').textContent = d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  $('#lockDate').textContent = d.toLocaleDateString('zh-CN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

/* ================= 任务栏时间 ================= */
function tickTime(){
  const d=new Date();
  $('#taskTime').textContent=d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  $('#taskDate').textContent=d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit',weekday:'short'});
}

/* ================= 窗口系统 ================= */
const WinState={};

function openApp(name){
  if(APP_DEF[name]===undefined) return;
  if(WinState[name]){ restoreWindow(name); return; }
  createWindow(name);
}
function addRecent(name){
  State.running=State.running.filter(n=>n!==name);
  State.running.unshift(name);
  updateTaskbar(); renderStartRecent();
}
function removeRecent(name){ State.running=State.running.filter(n=>n!==name); updateTaskbar(); }

function createWindow(name){
  const def=APP_DEF[name];
  const tpl=$('#winTemplate'); const w=tpl.cloneNode(true);
  w.id='wnd-'+name; w.classList.remove('hidden'); w.classList.add('window-open');
  w.querySelector('.wnd-title').textContent=def.title;
  const ico=w.querySelector('.wnd-ico'); ico.className='wnd-ico '+def.icon+' '+def.color;
  const body=w.querySelector('.wnd-body');
  body.innerHTML=$('#tpl-'+name).innerHTML;
  const pad=12, ww=def.w, wh=def.h;
  const bx=Math.max(8,(innerWidth-ww)/2+(Math.random()*80-40));
  const by=Math.max(8,60+Math.random()*80);
  w.style.width=Math.min(ww,innerWidth-pad)+'px';
  w.style.height=Math.min(wh,innerHeight-pad-TASKBAR_H-8)+'px';
  w.style.left=Math.max(8,Math.min(bx,innerWidth-140))+'px';
  w.style.top=Math.min(by,innerHeight-TASKBAR_H-70)+'px';
  w.style.zIndex=++State.z;
  $('#winLayer').appendChild(w);
  bindWindow(w,name);
  bindResize(w);
  applyThemeWin(w);
  WinState[name]={win:w,minimized:false};
  addRecent(name);
  initApp(name,w);
}

function bindWindow(w,name){
  w.addEventListener('mousedown',()=>{ if(!WinState[name].minimized) bringToFront(w); });
  w.querySelector('.wnd-min').addEventListener('click',e=>{ e.stopPropagation(); minimize(name); });
  w.querySelector('.wnd-max').addEventListener('click',e=>{ e.stopPropagation(); toggleMaximize(w); });
  w.querySelector('.wnd-close').addEventListener('click',e=>{ e.stopPropagation(); closeWindow(name); });
  makeDraggable(w);
}
function bringToFront(w){ if(w.style.zIndex<State.z){ w.style.zIndex=++State.z; updateTaskbar(); } }
function minimize(name){ const s=WinState[name]; if(!s)return; s.minimized=true; s.win.classList.add('minimized'); updateTaskbar(); }
function restoreWindow(name){
  const s=WinState[name]; if(!s)return;
  s.minimized=false; s.win.classList.remove('minimized'); bringToFront(s.win);
  updateTaskbar();
}
function closeWindow(name){
  const s=WinState[name]; if(!s)return;
  s.win.remove(); delete WinState[name]; removeRecent(name);
}
function toggleMaximize(w){
  const isM=w.classList.contains('maximized');
  if(isM){ unmaximize(w); return; }
  w.dataset.oW=w.style.width; w.dataset.oH=w.style.height; w.dataset.oL=w.style.left; w.dataset.oT=w.style.top;
  w.classList.add('maximized');
  w.style.width=innerWidth+'px';
  w.style.height=(innerHeight-TASKBAR_H)+'px';   /* 最大化不遮挡任务栏 */
  w.style.left='0'; w.style.top='0';
  w.querySelector('.wnd-max i').className='fa fa-clone text-xs';
  updateTaskbar();
}
function unmaximize(w){
  w.classList.remove('maximized');
  w.style.width=w.dataset.oW||'600px'; w.style.height=w.dataset.oH||'500px';
  w.style.left=w.dataset.oL||'80px'; w.style.top=w.dataset.oT||'60px';
  w.querySelector('.wnd-max i').className='fa fa-square-o text-xs';
  updateTaskbar();
}

/* ---- 窗口拖动：左右可自由穿越屏幕，底部止于任务栏上沿，拖到顶部最大化 ---- */
function makeDraggable(w){
  const hdr=w.querySelector('.wnd-hdr');
  hdr.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    if(w.classList.contains('maximized')){ unmaximize(w); return; }
    e.preventDefault();
    const sx=e.clientX,sy=e.clientY,ox=parseInt(w.style.left),oy=parseInt(w.style.top);
    bringToFront(w);
    let toTop=false;
    const mm=ev=>{
      let nx=ox+ev.clientX-sx, ny=oy+ev.clientY-sy;
      /* 左右：不限（可拖出屏幕）；上：不低于0；下：不越过任务栏上沿 */
      ny=Math.max(0, Math.min(ny, innerHeight-TASKBAR_H-40));
      w.style.left=nx+'px'; w.style.top=ny+'px';
      toTop = (ny<=4);
    };
    const mu=()=>{
      document.removeEventListener('pointermove',mm); document.removeEventListener('pointerup',mu);
      if(toTop) toggleMaximize(w);
      updateTaskbar();
    };
    document.addEventListener('pointermove',mm); document.addEventListener('pointerup',mu);
  });
}

/* ---- 窗口缩放：右下角手柄拖拽调整大小 ---- */
function bindResize(w){
  const h=w.querySelector('.wnd-resize');
  h.addEventListener('pointerdown',e=>{
    e.preventDefault(); e.stopPropagation();
    if(w.classList.contains('maximized')) return;
    bringToFront(w);
    const sx=e.clientX, sy=e.clientY;
    const ow=parseInt(w.style.width), oh=parseInt(w.style.height);
    const mm=ev=>{
      let nw=ow+(ev.clientX-sx), nh=oh+(ev.clientY-sy);
      nw=Math.max(WIN_MIN_W, Math.min(nw, innerWidth));
      nh=Math.max(WIN_MIN_H, Math.min(nh, innerHeight-TASKBAR_H));
      w.style.width=nw+'px'; w.style.height=nh+'px';
    };
    const mu=()=>{ document.removeEventListener('pointermove',mm); document.removeEventListener('pointerup',mu); };
    document.addEventListener('pointermove',mm); document.addEventListener('pointerup',mu);
  });
}

/* ================= 任务栏 ================= */
function updateTaskbar(){
  const bar=$('#taskbarApps'); bar.innerHTML='';
  State.running.forEach(name=>{
    const def=APP_DEF[name];
    const d=document.createElement('div');
    d.className='task-icon w-11 h-11 flex items-center justify-center rounded os-btn';
    d.title=def.title;
    d.innerHTML='<i class="fa '+def.icon+' text-white text-lg"></i>';
    if(name===activeTop()) d.classList.add('active');
    d.addEventListener('click',()=>{
      const s=WinState[name];
      if(s.minimized){ restoreWindow(name); }
      else if(name===activeTop()){ minimize(name); }
      else { restoreWindow(name); }
    });
    bar.appendChild(d);
  });
}
function activeTop(){
  let topName=null,topZ=-1;
  Object.keys(WinState).forEach(name=>{
    const s=WinState[name];
    if(s.minimized) return;
    const z=parseInt(s.win.style.zIndex);
    if(z>topZ){ topZ=z; topName=name; }
  });
  return topName;
}

/* ================= 桌面图标 ================= */
function initDesktop(){
  const box=$('#desktopIcons');
  DESKTOP_APPS.forEach(name=>{
    const def=APP_DEF[name];
    const d=document.createElement('div');
    d.className='desktop-icon flex flex-col items-center w-20 cursor-pointer p-2 rounded text-center';
    d.innerHTML='<i class="fa '+def.icon+' text-3xl text-white textshadow '+def.color+'"></i><span class="text-white text-xs mt-1.5 textshadow leading-tight">'+def.title+'</span>';
    d.addEventListener('click',()=>openApp(name));
    d.addEventListener('dblclick',()=>openApp(name));
    box.appendChild(d);
  });
}

/* ================= 开始菜单 ================= */
function toggleStart(){ const m=$('#startMenu'); m.classList.toggle('hidden'); if(!m.classList.contains('hidden')) renderStartRecent(); }
function closeStart(){ $('#startMenu').classList.add('hidden'); }
function renderStartRecent(){
  const box=$('#startRecent'); box.innerHTML='';
  State.running.slice(0,6).forEach(name=>{
    const def=APP_DEF[name];
    box.innerHTML+='<div class="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-white/10 cursor-pointer" onclick="openApp(\''+name+'\')"><div class="w-11 h-11 rounded flex items-center justify-center" style="background:rgba(255,255,255,.08)"><i class="fa '+def.icon+' text-xl '+def.color+'"></i></div><span class="text-[11px] text-white/85 text-center leading-tight">'+def.title+'</span></div>';
  });
  if(!box.innerHTML) box.innerHTML='<div class="col-span-4 text-white/40 text-sm">暂无最近应用</div>';
}

/* ================= 右键菜单 ================= */
function showCtx(x,y,items){
  const m=$('#contextMenu'); m.innerHTML=''; m.classList.remove('hidden');
  items.forEach(it=>{
    if(it==='-'){
      const s=document.createElement('div'); s.className='ctx-sep'; m.appendChild(s);
    }else{
      const d=document.createElement('div');
      d.className='context-menu-item px-3 py-1.5 flex items-center gap-2 cursor-pointer';
      d.innerHTML='<i class="fa '+it.icon+' w-5 text-center text-gray-500"></i><span>'+it.label+'</span>';
      d.addEventListener('click',()=>{ it.fn(); hideCtx(); });
      m.appendChild(d);
    }
  });
  m.style.left=Math.min(x,innerWidth-190)+'px'; m.style.top=Math.min(y,innerHeight-40)+'px';
}
function hideCtx(){ $('#contextMenu').classList.add('hidden'); }
document.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(e.target.id==='desktopBody'||e.target.id==='desktop'||$('#desktop').contains(e.target)&&e.target.closest('.desktop-icon')===null){
    showCtx(e.clientX,e.clientY,[
      {label:'新建文件夹',icon:'fa-folder-open-o',fn:newDesktopFolder},
      {label:'刷新',icon:'fa-refresh',fn:()=>toast('桌面已刷新')},
      '-',
      {label:'个性化',icon:'fa-palette',fn:()=>openApp('settings')},
      {label:'显示设置',icon:'fa-cog',fn:()=>openApp('settings')},
      {label:'更改桌面背景',icon:'fa-picture-o',fn:()=>{openApp('settings');setTimeout(()=>scrollSettings(0),80);}},
    ]);
    return;
  }
  hideCtx();
});
document.addEventListener('click',e=>{ if(!e.target.closest('#contextMenu')) hideCtx(); });

/* ================= 主题 / 壁纸 ================= */
function applyTheme(mode){
  State.theme=mode;
  document.body.classList.toggle('dark',mode==='dark');
  $$('.wnd').forEach(w=>applyThemeWin(w));
}
function applyThemeWin(w){
  const hdr=w.querySelector('.wnd-hdr'), t=w.querySelector('.wnd-title');
  if(State.theme==='dark'){ hdr.style.background='#2d2d2d'; t.style.color='#eee'; }
  else { hdr.style.background='linear-gradient(180deg,#f7f7f7,#e9e9e9)'; t.style.color='#333'; }
  $$('.wnd-min i,.wnd-max i,.wnd-close i',w).forEach(i=>i.style.color=State.theme==='dark'?'#ddd':'#666');
}
function setBg(url){
  State.bg=url; $('#desktopBody').style.backgroundImage="url('"+url+"')";
  $$('.bg-btn').forEach(b=>b.classList.toggle('border-osblue',b.getAttribute('data-bg')===url));
}

/* ================= 快捷键 ================= */
let altTabIdx=0;
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ hideCtx(); closeStart(); return; }
  if(e.altKey && e.key==='Tab'){
    e.preventDefault();
    const names=State.running.filter(n=>WinState[n]&&!WinState[n].minimized);
    if(names.length){ const n=names[++altTabIdx%names.length]; restoreWindow(n); }
    return;
  }
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='m'){ State.running.forEach(n=>minimize(n)); }
});

/* ================= 全局初始化 ================= */
document.addEventListener('DOMContentLoaded',()=>{
  initDesktop();
  tickTime(); setInterval(tickTime,1000); setInterval(updateLockClock,1000);
  $('#startBtn').addEventListener('click',toggleStart);
  $$('#startMenu .start-item').forEach(it=>it.addEventListener('click',()=>{ openApp(it.getAttribute('data-app')); closeStart(); }));
  $('#desktop').addEventListener('mousedown',()=>{ if(!event.target.closest('.desktop-icon')) hideCtx(); });
  window.addEventListener('resize',()=>{ $$('.wnd.maximized').forEach(w=>{ w.style.width=innerWidth+'px'; w.style.height=(innerHeight-TASKBAR_H)+'px'; }); });
  applyTheme('light');
  setTimeout(()=>{ $('#bootScreen').classList.add('hidden'); $('#lockScreen').classList.remove('hidden'); },1600);
});
//（注：内容由AI生成）
