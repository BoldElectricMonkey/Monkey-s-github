'use strict';
/* ================================================================
 * Menmo OS — 娱乐应用（画图 / 时钟 / 扫雷）
 * ================================================================ */

/* ================= 画图 ================= */
function initPaint(win){
  const cv=$('.pt-canvas',win), ctx=cv.getContext('2d');
  function fit(){
    const body=$('.wnd-body',win);
    cv.width=Math.max(320,body.clientWidth-24);
    cv.height=Math.max(240,body.clientHeight-64);
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.lineCap='round'; ctx.lineJoin='round';
  }
  setTimeout(fit,60);
  const colors=['#000000','#ffffff','#e74c3c','#f39c12','#f1c40f','#2ecc71','#3498db','#9b59b6','#95a5a6','#1abc9c'];
  const cbox=$('#paintColors',win);
  cbox.innerHTML=colors.map(c=>'<button class="pt-color os-btn w-6 h-6 rounded-full border border-black/20" style="background:'+c+'" data-c="'+c+'"></button>').join('');
  let curColor='#000',curSize=6,curTool='brush',drawing=false,lastX=0,lastY=0,startX=0,startY=0;
  const pos=e=>{ const r=cv.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; };
  cbox.addEventListener('click',e=>{ const b=e.target.closest('.pt-color'); if(b)curColor=b.getAttribute('data-c'); });
  $('.pt-tool',win).addEventListener('change',e=>curTool=e.target.value);
  $('.pt-size',win).addEventListener('input',e=>curSize=+e.target.value);
  cv.addEventListener('mousedown',e=>{ drawing=true; const [x,y]=pos(e); lastX=x;lastY=y;startX=x;startY=y; if(curTool==='brush'){ctx.fillStyle=curColor;ctx.beginPath();ctx.arc(x,y,curSize/2,0,Math.PI*2);ctx.fill();} });
  cv.addEventListener('mousemove',e=>{ if(!drawing)return; const [x,y]=pos(e);
    if(curTool==='brush'){ ctx.strokeStyle=curColor; ctx.lineWidth=curSize; ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); lastX=x;lastY=y; }
  });
  cv.addEventListener('mouseup',e=>{ if(!drawing)return; drawing=false; const [x,y]=pos(e);
    if(curTool==='eraser'){ ctx.strokeStyle='#fff'; ctx.lineWidth=curSize*2; ctx.beginPath(); ctx.moveTo(startX,startY); ctx.lineTo(x,y); ctx.stroke(); }
    if(curTool==='line'){ ctx.strokeStyle=curColor; ctx.lineWidth=curSize; ctx.beginPath(); ctx.moveTo(startX,startY); ctx.lineTo(x,y); ctx.stroke(); }
    if(curTool==='rect'){ ctx.strokeStyle=curColor; ctx.lineWidth=curSize; ctx.strokeRect(Math.min(startX,x),Math.min(startY,y),Math.abs(x-startX),Math.abs(y-startY)); }
  });
  cv.addEventListener('mouseleave',()=>drawing=false);
  $('.pt-clear',win).addEventListener('click',()=>{ if(confirm('清空画布？')){ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);} });
  $('.pt-download',win).addEventListener('click',()=>{ const a=document.createElement('a'); a.download='画图.png'; a.href=cv.toDataURL(); a.click(); toast('已下载图片'); });
}

/* ================= 时钟 ================= */
function initClock(win){
  const content=$('.clk-content',win);
  $$('.clk-tab',win).forEach(t=>t.addEventListener('click',()=>{
    $$('.clk-tab',win).forEach(x=>x.style.background='');
    t.style.background='rgba(0,120,215,.18)';
    renderClockTab(t.getAttribute('data-tab'),content,win);
  }));
  $$('.clk-tab',win)[0].style.background='rgba(0,120,215,.18)';
  renderClockTab('analog',content,win);
}
function renderClockTab(tab,content,win){
  clearInterval(win.__clockTimer);
  content.innerHTML='';
  if(tab==='analog'){
    const st=State.theme==='dark'?'#cfcfcf':'#333';
    content.innerHTML='<div class="flex flex-col items-center justify-center h-full gap-3">'+
      '<svg viewBox="0 0 200 200" class="w-56 h-56">'+
      '<circle cx="100" cy="100" r="92" fill="none" stroke="'+st+'" stroke-width="3"/>'+
      Array.from({length:12}).map((_,i)=>{const a=i*30*Math.PI/180;const x1=100+72*Math.sin(a),y1=100-72*Math.cos(a),x2=100+84*Math.sin(a),y2=100-84*Math.cos(a);return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+st+'" stroke-width="2"/>';}).join('')+
      '<line id="ah" x1="100" y1="100" x2="100" y2="58" stroke="'+st+'" stroke-width="5" stroke-linecap="round"/>'+
      '<line id="am" x1="100" y1="100" x2="100" y2="40" stroke="'+st+'" stroke-width="3" stroke-linecap="round"/>'+
      '<line id="as" x1="100" y1="108" x2="100" y2="30" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round"/>'+
      '<circle cx="100" cy="100" r="4" fill="'+st+'"/>'+
      '</svg><div class="text-2xl font-light tabular-nums text-gray-700" id="analogText"></div></div>';
    win.__clockTimer=setInterval(()=>{
      if(!content.isConnected){clearInterval(win.__clockTimer);return;}
      const d=new Date(), h=d.getHours()%12, m=d.getMinutes(), s=d.getSeconds();
      const rot=(id,ang)=>{ const el=content.querySelector(id); if(el)el.setAttribute('transform','rotate('+ang+' 100 100)'); };
      rot('#ah',h*30+m*0.5); rot('#am',m*6); rot('#as',s*6);
      content.querySelector('#analogText').textContent=d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    },500);
  } else if(tab==='stopwatch'){
    content.innerHTML='<div class="flex flex-col items-center justify-center h-full gap-5">'+
      '<div class="text-5xl font-light tabular-nums text-gray-700" id="swTime">00:00.0</div>'+
      '<div class="flex gap-3"><button class="sw-btn os-btn px-6 py-2 rounded bg-gray-200 hover:bg-gray-300" data-sw="start">开始</button><button class="sw-btn os-btn px-6 py-2 rounded bg-gray-200 hover:bg-gray-300" data-sw="reset">复位</button></div>'+
      '<div class="text-sm text-gray-400" id="swLaps"></div></div>';
    let ms=0,run=false,iv=null;
    const render=()=>{ content.querySelector('#swTime').textContent=String(Math.floor(ms/60000)).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+Math.floor(ms/100)%10; };
    render();
    $$('.sw-btn',content).forEach(b=>b.addEventListener('click',()=>{
      const a=b.getAttribute('data-sw');
      if(a==='start'){
        run=!run;
        if(run){ const t0=Date.now()-ms; iv=setInterval(()=>{ if(!content.isConnected){clearInterval(iv);return;} ms=Date.now()-t0; render(); },100); b.textContent='暂停'; }
        else { clearInterval(iv); b.textContent='开始'; }
      } else {
        clearInterval(iv); run=false; ms=0; render(); b.textContent='开始';
        content.querySelector('#swLaps').textContent='';
      }
    }));
  } else if(tab==='timer'){
    content.innerHTML='<div class="flex flex-col items-center justify-center h-full gap-5">'+
      '<div class="text-5xl font-light tabular-nums text-gray-700" id="tmTime">05:00</div>'+
      '<div class="flex gap-2"><button class="tm-set os-btn px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm">+1分</button><button class="tm-set os-btn px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm" data-m="-1">-1分</button></div>'+
      '<div class="flex gap-3"><button class="tm-start os-btn px-6 py-2 rounded bg-gray-200 hover:bg-gray-300">开始</button><button class="tm-reset os-btn px-6 py-2 rounded bg-gray-200 hover:bg-gray-300">重置</button></div></div>';
    let remain=300,iv=null;
    const render=()=>{ content.querySelector('#tmTime').textContent=String(Math.floor(remain/60)).padStart(2,'0')+':'+String(remain%60).padStart(2,'0'); };
    $$('.tm-set',content).forEach(b=>b.addEventListener('click',()=>{ remain=Math.max(0,remain+(b.getAttribute('data-m')==='-1'?-60:60)); render(); }));
    $('.tm-start',content).addEventListener('click',function(){
      if(iv){ clearInterval(iv); iv=null; this.textContent='开始'; return; }
      this.textContent='暂停';
      iv=setInterval(()=>{ if(!content.isConnected){clearInterval(iv);iv=null;return;} if(remain>0)remain--; render(); if(remain===0){clearInterval(iv);iv=null;toast('计时结束！');} },1000);
    });
    $('.tm-reset',content).addEventListener('click',()=>{ clearInterval(iv);iv=null; remain=300; render(); $('.tm-start',content).textContent='开始'; });
  } else if(tab==='alarm'){
    content.innerHTML='<div class="flex flex-col items-center justify-center h-full gap-4">'+
      '<div class="text-2xl text-gray-700 tabular-nums" id="alarmNow">--:--:--</div>'+
      '<div class="flex items-center gap-2"><input type="time" value="07:30" class="alarm-in border border-gray-300 rounded px-2 py-1 text-center text-xl"/>'+
      '<button class="alarm-toggle os-btn px-5 py-2 rounded text-sm text-white" style="background:#0078d7">开启闹钟</button></div>'+
      '<div class="text-sm text-gray-500" id="alarmMsg"></div></div>';
    let alarmSet=false, alarmVal='07:30', alarmFired=false;
    const nowEl=$('#alarmNow',content);
    win.__alarmIv=setInterval(()=>{
      if(!content.isConnected){clearInterval(win.__alarmIv);return;}
      const d=new Date();
      nowEl.textContent=d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      if(alarmSet){ const hh=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); if(hh===alarmVal&&!alarmFired){ alarmFired=true; toast('闹钟响了！'); } if(hh!==alarmVal) alarmFired=false; }
    },1000);
    $('.alarm-in',content).addEventListener('change',e=>{ alarmVal=e.target.value; alarmFired=false; });
    $('.alarm-toggle',content).addEventListener('click',function(){
      alarmSet=!alarmSet; this.style.background=alarmSet?'#00b7a3':'#0078d7'; this.textContent=alarmSet?'关闭闹钟':'开启闹钟';
      content.querySelector('#alarmMsg').textContent=alarmSet?('将在 '+alarmVal+' 提醒'):'闹钟已关闭';
    });
  }
}

/* ================= 扫雷 ================= */
function initMine(win){
  const grid=$('.ms-grid',win), flagsEl=$('.ms-flags',win), timeEl=$('.ms-time',win);
  let N=8,MINE=10,board=[],revealed=[],flags=[],first=true,time=0,tiv=null,over=false;
  function reset(){
    board=Array(N*N).fill(0); revealed=Array(N*N).fill(false); flags=Array(N*N).fill(false);
    first=true; time=0; over=false; clearInterval(tiv); tiv=null;
    timeEl.textContent='0'; flagsEl.textContent='0'; render();
  }
  function place(exclude){
    board=Array(N*N).fill(0); revealed=Array(N*N).fill(false); flags=Array(N*N).fill(false);
    let placed=0;
    while(placed<MINE){ const i=Math.floor(Math.random()*N*N); if(board[i]===-1||i===exclude)continue; board[i]=-1; placed++; }
    for(let i=0;i<N*N;i++){ if(board[i]===-1)continue; let c=0; const x=i%N,y=Math.floor(i/N); for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy)continue; const nx=x+dx,ny=y+dy; if(nx>=0&&ny>=0&&nx<N&&ny<N&&board[ny*N+nx]===-1)c++; } board[i]=c; }
  }
  function render(){
    grid.style.gridTemplateColumns='repeat('+N+',30px)';
    grid.innerHTML='';
    for(let i=0;i<N*N;i++){
      const c=document.createElement('div');
      c.className='mine-cell w-[30px] h-[30px] flex items-center justify-center text-sm font-bold rounded-sm';
      c.style.background=revealed[i]?'#d4d4d4':'#c0c0c0'; c.style.border='1px solid #999';
      if(revealed[i]){
        if(board[i]===-1)c.innerHTML='<i class="fa fa-bomb text-red-700"></i>';
        else if(board[i]>0){ c.textContent=board[i]; c.style.color=['','#2563eb','#16a34a','#dc2626','#7c3aed','#9333ea','#0d9488','#374151','#4b5563'][board[i]]; }
      } else if(flags[i]) c.innerHTML='<i class="fa fa-flag text-red-600"></i>';
      c.addEventListener('contextmenu',e=>e.preventDefault());
      c.addEventListener('mousedown',e=>{
        e.preventDefault(); if(over)return;
        if(e.button===2){ toggleFlag(i); return; }
        if(e.button===0&&!flags[i]) reveal(i);
      });
      grid.appendChild(c);
    }
  }
  function reveal(i){
    if(revealed[i]||flags[i]||over)return;
    if(first){ first=false; place(i); startTimer(); }
    if(board[i]===-1){ revealed[i]=true; over=true; clearInterval(tiv); render(); toast('踩到雷了！'); return; }
    flood(i); render();
    let safe=0; for(let k=0;k<N*N;k++)if(board[k]!==-1&&revealed[k])safe++;
    if(safe===N*N-MINE){ over=true; clearInterval(tiv); toast('恭喜通关！用时 '+time+' 秒'); }
  }
  function flood(i){
    const x=i%N,y=Math.floor(i/N);
    if(x<0||y<0||x>=N||y>=N||revealed[i]||flags[i]||board[i]===-1)return;
    revealed[i]=true;
    if(board[i]===0){ for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy)continue; flood((y+dy)*N+(x+dx)); } }
  }
  function toggleFlag(i){ if(revealed[i])return; flags[i]=!flags[i]; flagsEl.textContent=flags.filter(Boolean).length; render(); }
  function startTimer(){ tiv=setInterval(()=>{ if(over){clearInterval(tiv);return;} time++; timeEl.textContent=time; },1000); }
  $$('.ms-diff',win).forEach(b=>b.addEventListener('click',()=>{ const l=+b.getAttribute('data-lvl'); N=l; MINE=l===8?10:l===16?40:99; reset(); }));
  reset();
}
//（注：内容由AI生成）
