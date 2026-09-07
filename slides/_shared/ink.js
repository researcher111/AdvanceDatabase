/* Slide-local annotations shared between audience and presenter windows. */
(function () {
  'use strict';
  const player=window.CoursePlayer;
  if(!player)return;
  const role=player.role||(document.getElementById('presenter-canvas')?'presenter':'audience');
  const canvas=document.getElementById(role==='presenter'?'presenter-canvas':'canvas');
  const host=document.getElementById(role==='presenter'?'preview':'stage');
  if(!canvas||!host)return;
  const NS='http://www.w3.org/2000/svg',make=tag=>document.createElementNS(NS,tag);
  const layer=make('svg');layer.id='ink';layer.setAttribute('viewBox','0 0 1280 720');layer.setAttribute('aria-label','Slide annotation layer');
  const surface=document.createElement('div');surface.id='slide-surface';host.append(surface);surface.append(canvas,layer);
  const strokes=make('g'),laser=make('g');layer.append(strokes,laser);laser.style.display='none';
  const halo=make('circle'),dot=make('circle');halo.setAttribute('r','20');halo.setAttribute('fill','#e23e32');halo.setAttribute('opacity','.14');dot.setAttribute('r','7');dot.setAttribute('fill','#df342c');dot.setAttribute('stroke','white');dot.setAttribute('stroke-width','2');laser.append(halo,dot);
  const key='course-slide-ink-v1-'+player.deck.id,knownSlides=new Set(player.deck.scenes.map(s=>s.id));
  const colors=['#20352e','#c13e35','#286daf','#30785b'];
  const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  function cleanStrokes(value){
    if(!Array.isArray(value))return [];
    return value.filter(s=>s&&Array.isArray(s.points)&&s.points.length&&s.points.every(validPoint)&&Number.isFinite(s.width)&&Number.isFinite(s.opacity))
      .map(s=>({points:s.points.map(p=>p.slice()),color:/^#[\da-f]{6}$/i.test(s.color)?s.color:colors[1],width:Math.min(100,Math.max(.1,s.width)),opacity:Math.max(0,Math.min(1,s.opacity))}));
  }
  let saved={};
  try{const value=JSON.parse(localStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))for(const id of knownSlides)if(value[id])saved[id]=cleanStrokes(value[id]);}catch(_){}
  const history={};
  let color=colors[1],size=4,mode='none',current=null,pointer=null,pointerType=null,dirty=false,saveTimer,stylusDetected=false;
  let activeSlide=player.deck.scenes[player.getState().slide].id,localLaser=null,syncTimer=null,pendingSync=null,lastSync=0;
  const slideId=()=>player.deck.scenes[player.getState().slide].id;
  const ink=(id=activeSlide)=>saved[id]||(saved[id]=[]);
  const pathD=pts=>pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  function path(stroke){const p=make('path');p.setAttribute('d',pathD(stroke.points));p.setAttribute('fill','none');p.setAttribute('stroke',stroke.color);p.setAttribute('stroke-width',stroke.width);p.setAttribute('stroke-opacity',stroke.opacity);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');return p;}
  function draw(){strokes.replaceChildren();for(const s of ink())strokes.append(path(s));}
  function pushHistory(){(history[activeSlide]||(history[activeSlide]=[])).push(JSON.stringify(ink()));if(history[activeSlide].length>30)history[activeSlide].shift();}
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){document.getElementById('ink-status').textContent='Ink remains in this window. Browser storage is full or unavailable.';}},200);}
  function transmit(id){
    lastSync=performance.now();
    if(player.sendInk)player.sendInk({slide:id,strokes:ink(id),laser:id===activeSlide?localLaser:null});
  }
  function sync(immediate=false,id=activeSlide){
    pendingSync=id;
    if(immediate){clearTimeout(syncTimer);syncTimer=null;pendingSync=null;transmit(id);return;}
    if(syncTimer!==null)return;
    const wait=Math.max(0,50-(performance.now()-lastSync));
    syncTimer=setTimeout(()=>{syncTimer=null;const next=pendingSync;pendingSync=null;if(next)transmit(next);},wait);
  }
  function undo(){finish();const stack=history[activeSlide];if(stack?.length){saved[activeSlide]=JSON.parse(stack.pop());draw();persist();sync(true);}}
  function clear(){finish();if(!ink().length)return;pushHistory();saved[activeSlide]=[];draw();persist();sync(true);}
  const tools=document.createElement('div');tools.id='ink-tools';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Drawing tools');tools.hidden=true;
  const btn=(text,label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.setAttribute('aria-label',label);b.onclick=fn;tools.append(b);return b;};
  const modes={};[['pen','✎','Pen (D)'],['highlighter','▰','Highlighter (H)'],['eraser','◇','Erase a stroke (E)'],['laser','⊙','Laser pointer (L)']].forEach(([name,glyph,label])=>modes[name]=btn(glyph,label,()=>setMode(name)));
  const divider=document.createElement('span');divider.className='ink-divider';tools.append(divider);
  const swatches=colors.map((c,i)=>{const b=btn('',['Dark green','Red','Blue','Green'][i]+' ink',()=>{color=c;swatches.forEach(x=>x.setAttribute('aria-pressed',x===b));if(mode==='none'||mode==='laser'||mode==='eraser')setMode('pen');});b.className='ink-swatch';b.style.setProperty('--swatch',c);b.setAttribute('aria-pressed',c===color);return b;});
  const width=document.createElement('input');width.type='range';width.min='2';width.max='12';width.step='1';width.value=size;width.setAttribute('aria-label','Pen width');width.title='Pen width';width.oninput=()=>size=Number(width.value);tools.append(width);
  btn('↶','Undo ink (U)',undo);btn('⌫','Clear this slide’s ink (C)',clear);btn('×','Close drawing tools (Escape)',()=>{setMode('none');tools.hidden=true;});
  const status=document.createElement('span');status.id='ink-status';status.className='sr-only';status.setAttribute('role','status');tools.append(status);
  const toolbar=document.querySelector(role==='presenter'?'.speaker-tools':'.toolbar');
  if(role==='presenter')toolbar.after(tools);else document.body.append(tools);
  const pen=document.createElement('button');pen.id='draw-toggle';pen.type='button';pen.textContent='✎';pen.title='Draw on slides (D)';pen.setAttribute('aria-label','Draw on slides (D)');pen.onclick=()=>{tools.hidden=!tools.hidden;setMode(tools.hidden?'none':'pen');};
  const pointerButton=document.createElement('button');pointerButton.id='laser-toggle';pointerButton.type='button';pointerButton.textContent='⊙';pointerButton.title='Laser pointer (L)';pointerButton.setAttribute('aria-label','Laser pointer (L)');pointerButton.onclick=()=>setMode(mode==='laser'?'none':'laser');
  const before=role==='audience'?document.getElementById('overview'):null;toolbar.insertBefore(pen,before);toolbar.insertBefore(pointerButton,before);
  function setMode(next){
    finish();const hadLaser=localLaser!==null;localLaser=null;mode=next;document.body.dataset.inkMode=mode;layer.style.pointerEvents=mode==='none'?'none':'auto';layer.style.cursor=mode==='laser'?'none':mode==='none'?'default':'crosshair';laser.style.display='none';
    for(const [k,b]of Object.entries(modes))b.setAttribute('aria-pressed',k===mode);
    pen.setAttribute('aria-pressed',['pen','eraser','highlighter'].includes(mode));pointerButton.setAttribute('aria-pressed',mode==='laser');
    if(['pen','eraser','highlighter'].includes(mode))tools.hidden=false;
    status.textContent=mode==='none'?'Drawing off':mode+' selected';if(hadLaser)sync(true);
  }
  function point(e){const p=layer.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const matrix=layer.getScreenCTM();if(!matrix)return null;const q=p.matrixTransform(matrix.inverse());return [Math.max(0,Math.min(1280,q.x)),Math.max(0,Math.min(720,q.y))];}
  function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function erase(p){const list=ink();let changed=false;for(let i=list.length-1;i>=0;i--){const pts=list[i].points;if(pts.some((q,j)=>segmentDistance(p,j?pts[j-1]:q,q)<15+list[i].width/2)){list.splice(i,1);changed=true;}}if(changed){dirty=true;draw();sync();}}
  function moveLaser(p,local=false){laser.style.display='';for(const c of [halo,dot]){c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);}if(local){localLaser=p;sync();}}
  layer.addEventListener('pointerdown',e=>{
    if(mode==='none'||e.button>0)return;
    if(e.pointerType==='pen')stylusDetected=true;
    if(e.pointerType==='touch'&&stylusDetected)return;
    if(pointer!==null){if(e.pointerType==='pen'&&pointerType==='touch')finish();else return;}
    const p=point(e);if(!p)return;e.preventDefault();pointer=e.pointerId;pointerType=e.pointerType;layer.setPointerCapture(pointer);
    if(mode==='laser'){moveLaser(p,true);return;}
    pushHistory();if(mode==='eraser'){erase(p);return;}
    const pressure=e.pointerType==='pen'?(.55+e.pressure*.9):1;
    const stroke={points:[p,[p[0]+.05,p[1]]],color,width:mode==='highlighter'?size*5:size*pressure,opacity:mode==='highlighter'?.24:1};
    ink().push(stroke);current={stroke,node:path(stroke)};strokes.append(current.node);dirty=true;sync();
  });
  layer.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'&&stylusDetected)return;
    const p=point(e);if(!p)return;
    if(mode==='laser'){if(pointer!==null&&e.pointerId!==pointer)return;moveLaser(p,true);return;}
    if(e.pointerId!==pointer)return;e.preventDefault();if(mode==='eraser'){erase(p);return;}if(!current)return;
    const samples=e.getCoalescedEvents?.()||[];
    for(const sample of (samples.length?samples:[e])){const q=point(sample);if(!q)continue;const prev=current.stroke.points.at(-1);if(Math.hypot(q[0]-prev[0],q[1]-prev[1])>.8)current.stroke.points.push(q);}
    current.node.setAttribute('d',pathD(current.stroke.points));sync();
  });
  function finish(broadcast=true){if(pointer!==null){try{layer.releasePointerCapture(pointer);}catch(_){}}pointer=null;pointerType=null;current=null;if(dirty){persist();dirty=false;if(broadcast)sync(true);}else if(broadcast&&pendingSync===activeSlide)sync(true);}
  layer.addEventListener('pointerup',e=>{if(e.pointerId===pointer)finish();});
  layer.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)finish();});
  layer.addEventListener('pointerleave',e=>{if(e.pointerType==='touch'&&stylusDetected)return;if(pointer===null){laser.style.display='none';if(localLaser){localLaser=null;sync(true);}}});
  window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||document.getElementById('overlay'))return;const k=e.key.toLowerCase();if(k==='d')setMode(mode==='pen'?'none':'pen');else if(k==='l')setMode(mode==='laser'?'none':'laser');else if(k==='h')setMode('highlighter');else if(k==='e')setMode('eraser');else if(k==='u')undo();else if(k==='c')clear();else if(e.key==='Escape'){setMode('none');tools.hidden=true;}else return;e.preventDefault();});
  // Remote snapshots are applied without sending an echo to the other window.
  window.addEventListener('deck-ink-remote',e=>{
    const detail=e.detail;if(!detail||!knownSlides.has(detail.slide)||!Array.isArray(detail.strokes))return;
    if(detail.slide===activeSlide){finish(false);clearTimeout(syncTimer);syncTimer=null;pendingSync=null;}
    saved[detail.slide]=cleanStrokes(detail.strokes);persist();
    if(detail.slide===activeSlide){draw();if(validPoint(detail.laser))moveLaser(detail.laser);else if(detail.laser===null)laser.style.display='none';}
  });
  window.addEventListener('deck-ink-sync-request',()=>{if(role==='audience')sync(true);});
  // Saving the old slide happens before rendering the newly selected slide's ink.
  const observer=new MutationObserver(()=>{
    const id=slideId();if(id===activeSlide)return;
    finish();localLaser=null;activeSlide=id;draw();laser.style.display='none';
    // Audience navigation is authoritative; presenter copies follow its snapshot.
    if(role==='audience')sync(true);
  });
  observer.observe(canvas,{attributes:true,attributeFilter:['aria-label']});
  draw();setMode('none');
  if(role==='presenter')player.requestInk?.();
  window.addEventListener('pagehide',()=>{finish();clearTimeout(saveTimer);try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}});
})();
