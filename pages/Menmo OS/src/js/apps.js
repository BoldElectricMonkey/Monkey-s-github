'use strict';
/* ================================================================
 * Menmo OS — 应用层（文件系统 / 文件管理器 / 回收站 / 计算器
 *                / 记事本 / 浏览器 / 设置）
 * ================================================================ */

/* ================= 应用分发 ================= */
function initApp(name,win){
  if(name==='mycomputer') initFM(win);
  else if(name==='recyclebin') initRecycle(win);
  else if(name==='calculator') initCalc(win);
  else if(name==='notepad') initNotepad(win);
  else if(name==='browser') initBrowser(win);
  else if(name==='settings') initSettings(win);
  else if(name==='paint') initPaint(win);
  else if(name==='clock') initClock(win);
  else if(name==='minesweeper') initMine(win);
}

/* ================= 模拟文件系统 ================= */
let FS={type:'dir',children:{
  c:{type:'dir',name:'本地磁盘 (C:)',children:{
    'Program Files':{type:'dir',children:{}},
    'Users':{type:'dir',children:{'Menmo':{type:'dir',children:{'桌面':{type:'dir',children:{}},'文档':{type:'dir',children:{}}}}}},
    'Windows':{type:'dir',children:{}},
    'readme.txt':{type:'file',ext:'txt',size:1204,content:'欢迎使用 Menmo OS！\n这是一个纯 HTML/CSS/JS 模拟的操作系统。\n点击桌面图标打开应用吧。'},
    '说明.docx':{type:'file',ext:'docx',size:10240,content:'示例文档内容'}
  }},
  desktop:{type:'dir',name:'桌面',children:{}},
  documents:{type:'dir',name:'文档',children:{
    '作业.txt':{type:'file',ext:'txt',size:890,content:'今天要完成的作业：\n1. 数学练习册第 42 页\n2. 英语单词听写'},
    '周记.docx':{type:'file',ext:'docx',size:5120,content:'这是一篇示例周记。'}
  }},
  pictures:{type:'dir',name:'图片',children:{
    '风景.jpg':{type:'file',ext:'jpg',size:102400},
    '照片.png':{type:'file',ext:'png',size:204800}
  }},
  downloads:{type:'dir',name:'下载',children:{
    '安装包.exe':{type:'file',ext:'exe',size:52428800}
  }}
}};
let recycleBin=[];
let fm={path:['root'],histBack:[],histFwd:[]};
let pendingOpenFile=null;

function getNode(pathArr){
  let n=FS;
  for(let i=1;i<pathArr.length;i++){
    n=n.children[pathArr[i]]; if(!n) return null;
  }
  return n;
}
function pathLabel(pathArr){
  if(!pathArr||pathArr.length===0) return '本机';
  return '本机 > '+pathArr.slice(1).map((p,i)=>i===0?((getNode(pathArr.slice(0,i+2))||{}).name||p):p).join(' > ');
}

function renderFM(win){
  const node=getNode(fm.path);
  const files=$('.fm-files',win);
  files.innerHTML='';
  if(!node){ files.innerHTML='<div class="text-gray-400">路径不存在</div>'; return; }
  $('.fm-path',win).value='/'+fm.path.slice(1).map(p=>(getNode(fm.path.slice(0,fm.path.indexOf(p)+2))||{}).name||p).join('/');
  $('.fm-crumb',win).textContent=pathLabel(fm.path);
  const children=node.children||{};
  const names=Object.keys(children).sort((a,b)=> (children[a].type==='dir'?0:1)-(children[b].type==='dir'?0:1));
  const grid=document.createElement('div');
  grid.className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1';
  names.forEach(name=>{
    const ch=children[name];
    const cell=document.createElement('div');
    cell.className='file-cell flex flex-col items-center gap-1 p-2 rounded cursor-pointer text-center';
    cell.dataset.name=name; cell.dataset.type=ch.type;
    const ico= ch.type==='dir' ? 'fa-folder-open-o text-amber-400 text-3xl' : 'fa-file-text-o text-blue-400 text-3xl';
    cell.innerHTML='<i class="fa '+ico+'"></i><span class="text-xs text-gray-700 break-all leading-tight">'+name+'</span>';
    cell.addEventListener('click',e=>{
      e.stopPropagation(); hideCtx();
      $$('.file-cell',files).forEach(c=>c.classList.remove('selected'));
      cell.classList.add('selected');
    });
    cell.addEventListener('dblclick',()=>openFsItem(fm.path.concat(name),ch));
    cell.addEventListener('contextmenu',e=>{
      e.preventDefault(); e.stopPropagation();
      $$('.file-cell',files).forEach(c=>c.classList.remove('selected'));
      cell.classList.add('selected');
      const items= ch.type==='dir' ? [
        {label:'打开',icon:'fa-folder-open-o',fn:()=>goPath(fm.path.concat(name))},
        {label:'重命名',icon:'fa-i-cursor',fn:()=>renameItem(fm.path,name)},
        '-',
        {label:'删除到回收站',icon:'fa-trash-o',fn:()=>deleteItem(fm.path,name)}
      ] : [
        {label:'打开',icon:'fa-external-link',fn:()=>openFsItem(fm.path.concat(name),ch)},
        {label:'重命名',icon:'fa-i-cursor',fn:()=>renameItem(fm.path,name)},
        '-',
        {label:'删除到回收站',icon:'fa-trash-o',fn:()=>deleteItem(fm.path,name)}
      ];
      showCtx(e.clientX,e.clientY,items);
    });
    grid.appendChild(cell);
  });
  if(!names.length) files.innerHTML='<div class="text-gray-400 text-sm h-full flex items-center justify-center">此文件夹为空</div>';
  else files.appendChild(grid);
  const d=children?Object.keys(children).length:0;
  const dn=(children?Object.keys(children).filter(n=>children[n].type==='dir'):[]).length;
  $('.fm-status',win).textContent=d+' 个项目，其中 '+dn+' 个文件夹';
}
function openFsItem(pathArr,node){
  if(node.type==='dir'){ goPath(pathArr); return; }
  if(node.ext==='txt'){ pendingOpenFile={path:pathArr,name:pathArr[pathArr.length-1],node}; openApp('notepad'); }
  else if(node.ext==='jpg'||node.ext==='png'){ toast('图片文件：'+node.name+' ('+fmtBytes(node.size)+')'); }
  else toast('暂不支持打开此文件：'+node.name);
}
function goPath(pathArr){
  if(!getNode(pathArr)){ toast('路径不可用'); return; }
  fm.histBack.push(fm.path.slice()); fm.path=pathArr.slice(); fm.histFwd=[];
  renderFMAll();
}
function renderFMAll(){ const w=WinState.mycomputer&&WinState.mycomputer.win; if(w) renderFM(w); }
function upPath(){ if(fm.path.length>1) goPath(fm.path.slice(0,-1)); }
function fmBack(){ if(fm.histBack.length){ fm.histFwd.push(fm.path.slice()); fm.path=fm.histBack.pop(); renderFMAll(); } }
function fmFwd(){ if(fm.histFwd.length){ fm.histBack.push(fm.path.slice()); fm.path=fm.histFwd.pop(); renderFMAll(); } }
function newFolder(win){
  const nm=prompt('文件夹名称：','新建文件夹');
  if(!nm) return;
  const node=getNode(fm.path);
  if(!node||node.type!=='dir'){ toast('无法在此新建'); return; }
  if(node.children[nm]){ toast('已存在同名文件夹'); return; }
  node.children[nm]={type:'dir'};
  renderFM(win); toast('已创建文件夹');
}
function renameItem(basePath,name){
  const parent=getNode(basePath);
  const newName=prompt('新名称：',name);
  if(!newName||newName===name) return;
  if(parent.children[newName]){ toast('已存在同名项'); return; }
  parent.children[newName]=parent.children[name]; delete parent.children[name];
  renderFMAll(); toast('已重命名');
}
function deleteItem(basePath,name){
  const parent=getNode(basePath);
  if(!confirm('确定将「'+name+'」删除到回收站吗？')) return;
  recycleBin.push({name,node:parent.children[name],from:basePath.slice(),time:new Date().toLocaleString()});
  delete parent.children[name];
  renderFMAll(); toast('已删除到回收站');
}
function newDesktopFolder(){
  FS.desktop.children['新建文件夹'+(FS.desktop.children['新建文件夹']?' ('+Math.floor(Math.random()*99)+')':'')]={type:'dir'};
  toast('已在桌面文件夹创建文件夹');
}
function initFM(win){
  renderFM(win);
  $$('.fm-nav',win).forEach(b=>b.addEventListener('click',()=>{
    const a=b.getAttribute('data-act');
    if(a==='back')fmBack(); else if(a==='fwd')fmFwd(); else if(a==='up')upPath(); else renderFM(win);
  }));
  $('.fm-new',win).addEventListener('click',()=>newFolder(win));
  $$('.fm-side',win).forEach(s=>s.addEventListener('click',()=>{
    const p=s.getAttribute('data-path');
    if(p==='recycle')openApp('recyclebin'); else goPath(p==='root'?['root']:['root'].concat(p.split('/').slice(1)));
  }));
  $('.fm-files',win).addEventListener('contextmenu',e=>{
    if(e.target.closest('.file-cell'))return;
    e.preventDefault(); e.stopPropagation();
    showCtx(e.clientX,e.clientY,[
      {label:'新建文件夹',icon:'fa-folder-open-o',fn:()=>newFolder(win)},
      {label:'刷新',icon:'fa-refresh',fn:()=>renderFM(win)}
    ]);
  });
}

/* ================= 回收站 ================= */
function initRecycle(win){
  renderRecycle(win);
  $('.rb-restore',win).addEventListener('click',()=>restoreRecycle(win));
  $('.rb-empty',win).addEventListener('click',()=>{
    if(!recycleBin.length)return;
    if(confirm('确定要清空回收站吗？此操作不可恢复。')){ recycleBin=[]; renderRecycle(win); toast('回收站已清空'); }
  });
}
function renderRecycle(win){
  const box=$('.rb-files',win); box.innerHTML='';
  if(!recycleBin.length){ box.innerHTML='<div class="h-full flex flex-col items-center justify-center text-gray-400 gap-2"><i class="fa fa-trash-o text-5xl"></i><span class="text-sm">回收站是空的</span></div>'; return; }
  const list=document.createElement('div'); list.className='grid grid-cols-3 sm:grid-cols-4 gap-1';
  recycleBin.forEach((item,i)=>{
    const d=document.createElement('div');
    d.className='file-cell flex flex-col items-center gap-1 p-2 rounded cursor-pointer text-center';
    const ico=item.node.type==='dir'?'fa-folder-open-o text-amber-400 text-3xl':'fa-file-text-o text-blue-400 text-3xl';
    d.innerHTML='<i class="fa '+ico+'"></i><span class="text-xs text-gray-700 break-all">'+item.name+'</span><span class="text-[10px] text-gray-400">'+item.time+'</span>';
    d.addEventListener('click',()=>{ hideCtx(); $$('.file-cell',box).forEach(c=>c.classList.remove('selected')); d.classList.add('selected'); });
    d.addEventListener('contextmenu',e=>{
      e.preventDefault(); e.stopPropagation();
      $$('.file-cell',box).forEach(c=>c.classList.remove('selected')); d.classList.add('selected');
      showCtx(e.clientX,e.clientY,[
        {label:'还原',icon:'fa-undo',fn:()=>{ restoreItem(i); renderRecycle(win); }},
        '-',
        {label:'彻底删除',icon:'fa-trash-o',fn:()=>{ if(confirm('彻底删除该文件？')){ recycleBin.splice(i,1); renderRecycle(win); toast('已彻底删除'); } }}
      ]);
    });
    list.appendChild(d);
  });
  box.appendChild(list);
}
function restoreItem(i){ const item=recycleBin[i]; recycleBin.splice(i,1); toast('已还原「'+item.name+'」'); }
function restoreRecycle(win){
  if(!recycleBin.length) return;
  const sel=$('.file-cell.selected',win);
  if(sel){
    const idx=Array.from($('.rb-files',win).querySelectorAll('.file-cell')).indexOf(sel);
    restoreItem(idx); renderRecycle(win); return;
  }
  restoreItem(0); renderRecycle(win);
}

/* ================= 计算器 ================= */
function initCalc(win){
  const st={cur:'0',hist:'',op:'',reset:false};
  win.__calc=st;
  const disp=$('.c-display',win), hist=$('.c-hist',win);
  $$('.c-btn',win).forEach(b=>b.addEventListener('click',()=>calcInput(b.getAttribute('data-v'),st,disp,hist)));
}
function calcInput(v,st,disp,hist){
  if(/[0-9]/.test(v)){ st.cur=(st.cur==='0'||st.reset)?v:st.cur+v; st.reset=false; }
  else if(v==='.'){ if(st.reset){st.cur='0.';st.reset=false;} else if(!st.cur.includes('.'))st.cur+='.'; }
  else if(['+','-','*','/'].includes(v)){ if(st.op&&!st.reset)calcEq(st); st.hist=st.cur+' '+v; st.op=v; st.reset=true; }
  else if(v==='='){ calcEq(st); st.hist=''; st.op=''; hist.textContent='0'; }
  else if(v==='AC'){ st.cur='0';st.hist='';st.op='';st.reset=false; hist.textContent='0'; }
  else if(v==='sign'){ if(st.cur!=='0')st.cur=st.cur.startsWith('-')?st.cur.slice(1):'-'+st.cur; }
  else if(v==='%'){ st.cur=String(parseFloat(st.cur)/100); }
  disp.textContent=st.cur; hist.textContent=st.hist||'0';
}
function calcEq(st){
  const a=parseFloat((st.hist.split(' ')[0])||0), b=parseFloat(st.cur);
  let r;
  switch(st.op){case'+':r=a+b;break;case'-':r=a-b;break;case'*':r=a*b;break;case'/':r=b===0?'错误':a/b;break;}
  st.cur=String(r); st.reset=true;
}

/* ================= 记事本 ================= */
function initNotepad(win){
  const ed=$('.np-editor',win), key='menmo_notepad';
  ed.value=localStorage.getItem(key)||'';
  if(pendingOpenFile){ ed.value=pendingOpenFile.node.content||''; $('.np-fname',win).textContent=pendingOpenFile.name; pendingOpenFile=null; localStorage.setItem(key,ed.value); }
  $('.np-save',win).addEventListener('click',()=>{ localStorage.setItem(key,ed.value); toast('已保存'); });
  $('.np-clear',win).addEventListener('click',()=>{ if(confirm('清空内容？')){ed.value='';localStorage.setItem(key,'');toast('已清空');} });
}

/* ================= 浏览器 ================= */
function initBrowser(win){
  const addr=$('.b-addr',win), ifr=$('.b-frame',win);
  const load=()=>{ let u=addr.value.trim(); if(!u)return; if(!/^https?:\/\//i.test(u))u='https://'+u; addr.value=u; try{ ifr.src=u; }catch(e){ toast('无法访问该地址'); } };
  addr.addEventListener('keydown',e=>{ if(e.key==='Enter')load(); });
  $('.b-back',win).addEventListener('click',()=>{ try{ifr.contentWindow.history.back();}catch(e){} });
  $('.b-fwd',win).addEventListener('click',()=>{ try{ifr.contentWindow.history.forward();}catch(e){} });
  $('.b-reload',win).addEventListener('click',()=>{ try{ifr.contentWindow.location.reload();}catch(e){} });
}

/* ================= 设置 ================= */
function initSettings(win){
  $$('.theme-btn',win).forEach(b=>b.addEventListener('click',()=>{
    $$('.theme-btn',win).forEach(x=>x.style.borderColor='transparent');
    b.style.borderColor='#0078d7';
    applyTheme(b.getAttribute('data-theme'));
    toast(b.getAttribute('data-theme')==='dark'?'已切换为深色主题':'已切换为浅色主题');
  }));
  $$('.bg-btn',win).forEach(b=>b.addEventListener('click',()=>setBg(b.getAttribute('data-bg'))));
  $('.st-volrange',win).addEventListener('input',e=>{ State.volume=e.target.value; $('.st-vol',win).textContent=e.target.value+'%'; $('#volIcon i').className=(State.volume==='0'?'fa fa-volume-off':'fa fa-volume-up')+' text-white/85 text-sm'; });
  $('.st-scale',win).addEventListener('input',e=>{ State.scale=+e.target.value; $('#desktopBody').style.zoom=State.scale/100; });
  $('.st-volrange',win).value=State.volume; $('.st-scale',win).value=State.scale;
  $$('.theme-btn',win).forEach(b=>{ if(b.getAttribute('data-theme')===State.theme)b.style.borderColor='#0078d7'; });
  $$('.bg-btn',win).forEach(b=>b.classList.toggle('border-osblue',b.getAttribute('data-bg')===State.bg));
}
function scrollSettings(i){
  const s=WinState.settings&&WinState.settings.win;
  if(s){ const panels=$$('.wnd-body > .space-y-4 > div',s); if(panels[i])panels[i].scrollIntoView({behavior:'smooth',block:'center'}); }
}
//（注：内容由AI生成）
