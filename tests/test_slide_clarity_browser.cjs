'use strict';
// Optional browser checks: requires Playwright and its Chromium installation.
// Pass lecture numbers to check a subset. SLIDE_QA_OUTPUT selects the report folder.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const parseId=value=>/^\d+$/.test(value)?Number(value):value.toLowerCase();
const ids=process.argv.length>2?process.argv.slice(2).map(parseId):[...Array.from({length:13},(_,i)=>i+1),'13b',14,15].filter(i=>i!==6);
const output=process.env.SLIDE_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'slide-clarity-'));
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(),gallery=await context.newPage(),problems=[],errors=[],snapshots=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  page.on('pageerror',e=>errors.push(e.message));
  async function go(slide,step){
   await page.evaluate(({slide,step})=>{location.hash=`s=${slide+1}&b=${step+1}`},{slide,step});
   await page.waitForFunction(({slide,step})=>CoursePlayer.getState().slide===slide&&CoursePlayer.getState().step===step,{slide,step});
  }
  async function contact(items,name){
   await gallery.setViewportSize({width:1800,height:1000});
   await gallery.setContent('<body style="margin:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#e8ede6;font:18px system-ui">'+items.map(x=>`<article><h3>${x.id}.${x.slide} · Step ${x.step} · ${x.title}</h3>${x.svg.replace('id="canvas"','style="display:block;width:100%;background:#f7f6f2"')}</article>`).join(''));
   await gallery.screenshot({path:path.join(output,name+'.png'),fullPage:true});
  }
  for(const id of ids){
   const url=pathToFileURL(path.join(root,`slides/lecture-${String(id).padStart(2,'0')}.html`)).href;
   await page.goto(url);await page.waitForFunction(()=>window.CoursePlayer);
   const popup=page.waitForEvent('popup');await page.locator('#presenter').click();const notes=await popup;
   await notes.locator('.teaching-current').waitFor();await page.bringToFront();
   const scenes=await page.evaluate(()=>CoursePlayer.deck.scenes.map(s=>({id:s.id,title:s.title,steps:s.steps,native:!!s.clarityNative})));
   for(const [i,scene] of scenes.entries())for(let step=0;step<scene.steps;step++){
    await go(i,step);
    const result=await page.evaluate(()=>{
     const svg=document.querySelector('#canvas'),r=svg.getBoundingClientRect(),sx=1280/r.width,sy=720/r.height;
     const texts=[...svg.querySelectorAll('text')].filter(e=>e.textContent.trim()).map(e=>{const b=e.getBoundingClientRect();return{key:e.dataset.key,text:e.textContent,x:(b.x-r.x)*sx,y:(b.y-r.y)*sy,w:b.width*sx,h:b.height*sy};});
     const outside=texts.filter(a=>a.x<4||a.y<4||a.x+a.w>1276||a.y+a.h>716),overlaps=[];
     for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i],b=texts[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>3&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>3)overlaps.push([a.key,b.key]);}
     const state=CoursePlayer.getState(),t=CoursePlayer.deck.scenes[state.slide].teaching,check=t.checks?.[state.step]||t;
     return{outside,overlaps,svg:svg.outerHTML,instruction:t.builds[state.step],question:check.question,answer:check.answer,readAloud:CoursePlayer.deck.scenes[state.slide].readAloud?.[state.step]};
    });
    if(result.outside.length||result.overlaps.length)problems.push({id,slide:i+1,step:step+1,title:scene.title,outside:result.outside,overlaps:result.overlaps});
    snapshots.push({id,slide:i+1,step:step+1,title:scene.title,steps:scene.steps,...result});
    await notes.waitForFunction(({i,step})=>CoursePlayer.getState().slide===i&&CoursePlayer.getState().step===step,{i,step});
    assert.equal((await notes.locator('.teaching-current p:not(.build)').allTextContents()).join('\n\n'),result.instruction);
    assert((await notes.locator('.teaching-question').innerText()).includes(result.question));
    assert.equal(await notes.locator('.teaching-answer p').textContent(),result.answer);
    if(result.readAloud){
     assert.equal(await page.locator('.read-aloud-step').count(),0,'spoken script stays off the audience slide');
     const spoken=notes.locator('.read-aloud-step');
     assert.equal(await spoken.count(),1,'presenter shows only the current script build');
     assert.equal((await spoken.locator('p:not(.script-advance)').allTextContents()).join('\n\n'),result.readAloud);
     assert((await spoken.locator('.script-label').textContent()).includes(`Build ${step+1} of ${scene.steps}`));
     const advance=step<scene.steps-1?'[Advance once for the next build.]':i<scenes.length-1?`[Advance once to slide ${i+2}.]`:'[End of lecture.]';
     assert.equal(await spoken.locator('.script-advance').textContent(),advance);
     if(i===4&&step===4)await notes.screenshot({path:path.join(output,'lecture-12-script-presenter.png')});
    }else assert.equal(await notes.locator('.read-aloud-step').count(),0,'existing notes work without a spoken script');
   }
   await notes.close();
   for(let start=1;start<=scenes.length;start+=6)await contact(snapshots.filter(x=>x.id===id&&x.slide>=start&&x.slide<start+6&&x.step===x.steps),`lecture-${id}-${start}`);
   for(const [i,scene]of scenes.entries())if(scene.native)await contact(snapshots.filter(x=>x.id===id&&x.slide===i+1),`sequence-${id}-${i+1}`);
   await gallery.goto(url+'?guide=1');
   assert.equal(await gallery.locator('article').count(),scenes.length);
   const guideText=await gallery.locator('body').textContent();
   for(const snap of snapshots.filter(x=>x.id===id))for(const paragraph of snap.instruction.split(/\n\s*\n|\n/))assert(guideText.includes(paragraph),'guide contains each build cue paragraph');
   if(id==='13b'){
    assert.equal(await page.evaluate(()=>CoursePlayer.deck.id),'13b','lettered lecture keeps its registry ID');
    assert.equal(await page.evaluate(()=>CoursePlayer.deck.scenes.reduce((n,s)=>n+s.minutes,0)),60);
    assert.equal(await page.evaluate(()=>CoursePlayer.deck.discussionMinutes),15);
    assert.equal(await gallery.locator('#discussion h3').count(),3,'guide includes three discussion rounds');
    assert.match(await gallery.locator('#discussion').innerText(),/60–75 min/);
   }
   if(id===12){
    await gallery.getByRole('link',{name:'Read-aloud script'}).waitFor();
    await gallery.setViewportSize({width:390,height:844});
    assert(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'guide links fit a narrow window');
    await gallery.goto(url+'?script=1');
    assert.equal(await gallery.locator('article').count(),14);
    assert.equal(await gallery.locator('.read-aloud-step').count(),52);
    const scripts=snapshots.filter(x=>x.id===id),sections=gallery.locator('.read-aloud-step');
    for(const [i,snap]of scripts.entries())assert.equal((await sections.nth(i).locator('p:not(.script-advance)').allTextContents()).join('\n\n'),snap.readAloud);
    await gallery.selectOption('#script-jump','slide-5');
    assert.equal(new URL(gallery.url()).hash,'#slide-5','script selector reaches the requested slide');
    await gallery.evaluate(()=>{window.print=()=>{window.scriptPrintRequested=true;};});
    await gallery.getByRole('button',{name:'Print script',exact:true}).click();
    assert(await gallery.evaluate(()=>window.scriptPrintRequested),'print control calls the browser print function');
    await gallery.setViewportSize({width:1100,height:900});
    await gallery.locator('#slide-5').scrollIntoViewIfNeeded();
    await gallery.screenshot({path:path.join(output,'lecture-12-script-reader.png')});
    await gallery.setViewportSize({width:390,height:844});
    assert(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'script fits a narrow reading window');
    await gallery.locator('#slide-5').scrollIntoViewIfNeeded();
    await gallery.screenshot({path:path.join(output,'lecture-12-script-mobile.png')});
    await gallery.emulateMedia({media:'print'});
    assert.equal(await gallery.locator('.script-tools').isVisible(),false,'printing hides navigation controls');
    assert.equal(await gallery.locator('#slide-5 .script-spoken').first().isVisible(),true,'printing retains the spoken text');
    await gallery.emulateMedia({media:'screen'});
   }
   if(id===13){
    const i=scenes.findIndex(s=>s.id==='reduce-sees-the-complete-group');
    await page.emulateMedia({reducedMotion:'no-preference'});await go(i,1);
    await page.waitForTimeout(600);
    await page.evaluate(()=>{window.movingPair=document.querySelector('[data-key="pair-0-label"]');window.previousY=window.movingPair.getAttribute('y');});
    await go(i,2);
    await page.waitForFunction(()=>document.querySelector('[data-key="pair-0-label"]').getAttribute('y')!==window.previousY);
    assert(await page.evaluate(()=>window.movingPair===document.querySelector('[data-key="pair-0-label"]')),'shuffle preserves the animated DOM object');
    await page.emulateMedia({reducedMotion:'reduce'});
   }
   if(id===13||id==='13b'||id===14){
    // These readings embed their own deck scenes without loading full slide players.
    const reading=await context.newPage();
    await reading.route(/^https?:\/\//,route=>route.abort()); // All diagram assets are local.
    const readingFile=id===14?'lecture-14/bigtable.html':id===13?'lecture-13/distributed.html':'lecture-13/spark-ray.html';
    await reading.goto(pathToFileURL(path.join(root,'lectures',readingFile)).href);
    const widgets=reading.locator('.lecture-walkthrough');
    if(id===14){
     assert.equal(scenes.length,16,'Bigtable retains all sixteen lecture scenes');
    }
    assert.deepEqual(await widgets.evaluateAll(roots=>roots.map(r=>r.dataset.lectureScene)),scenes.map(s=>s.id));
    assert.equal(await reading.locator('.lecture-walkthrough[data-walkthrough-ready="true"]').count(),scenes.length);
    if(id==='13b'){
     const hostOverride=await reading.evaluate(()=>{
      const host=document.createElement('div');host.className='lecture-walkthrough';
      host.dataset.lectureDeck='13b';host.dataset.lectureScene='same-orders-two-runtimes';
      const bodyDeck=document.body.dataset.lectureDeck;document.body.dataset.lectureDeck='13';
      document.body.append(host);LectureSlideWalkthroughs.initialize(host);LectureSlideWalkthroughs.initialize(host);
      document.body.dataset.lectureDeck=bodyDeck;
      const result={ready:host.dataset.walkthroughReady,drawings:host.querySelectorAll('.lw-screen svg').length};
      host.remove();return result;
     });
     assert.deepEqual(hostOverride,{ready:'true',drawings:1},'host override selects its deck and repeated initialization does not duplicate controls');
    }
    for(const [index,scene]of scenes.entries()){
     const widget=widgets.nth(index);
     for(let step=0;step<scene.steps;step++){
      const state=await widget.evaluate((root,id)=>{
       const step=Number(root.dataset.step),scene=COURSE_DECKS[id].scenes.find(s=>s.id===root.dataset.lectureScene);
       const expected=DeckViz.sceneDrawing(scene,step).filter(i=>i.tag==='text'||i.tag==='a').map(i=>[i.key,i.text]);
       const actual=[...root.querySelector('.lw-screen svg').children].filter(e=>['text','a'].includes(e.tagName.toLowerCase())).map(e=>[e.dataset.key,e.textContent]);
       return{step,expected,actual,caption:root.querySelector('.lw-caption').textContent,status:root.querySelector('[role="status"]').textContent};
      },id);
      assert.equal(state.step,step);
      assert.deepEqual(state.actual,state.expected,'inline diagram retains the slide content');
      const source=snapshots.find(s=>s.id===id&&s.slide===index+1&&s.step===step+1);
      assert.equal(state.caption,source.instruction.split('\n\n')[0],'inline caption matches the deck build');
      assert(state.status.startsWith(`Step ${step+1} of ${scene.steps}:`));
      if(step<scene.steps-1)await widget.locator('[data-action="next"]').click();
     }
     assert(await widget.locator('[data-action="next"]').isDisabled());
     assert(await widgets.evaluateAll((roots,index)=>roots.every((r,i)=>i===index||r.dataset.step==='0'),index),'advancing one diagram leaves others unchanged');
     await widget.locator('[data-action="previous"]').click();
     assert.equal(await widget.getAttribute('data-step'),String(scene.steps-2));
     await widget.locator('[data-action="reset"]').click();
     assert.equal(await widget.getAttribute('data-step'),'0');
     assert(await widget.locator('[data-action="previous"]').isDisabled());
    }
    if(id===13)assert.equal(await reading.locator('[data-lecture-scene="preview-spark-and-ray"] .lw-screen a').getAttribute('href'),pathToFileURL(path.join(root,'slides/lecture-13b.html')).href);
    else if(id==='13b')assert.equal(await reading.locator('[data-lecture-scene="same-orders-two-runtimes"] .lw-screen a').getAttribute('href'),'https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/');
    if(id===14){
     // A range split redistributes existing rows, but increasing keys still target the tail.
     const tabletCounts=()=>reading.locator('#tb-stage .tb-count').evaluateAll(nodes=>nodes.map(n=>Number.parseInt(n.textContent,10)));
     await reading.locator('#tb-reset').click();
     await reading.locator('#tb-user').click();
     assert.deepEqual(await tabletCounts(),[3,3,3,3],'the distributed toy keys reach all four ranges');
     await reading.locator('#tb-reset').click();
     await reading.locator('#tb-time').click();
     assert.deepEqual(await tabletCounts(),[0,0,0,12]);
     await reading.locator('#tb-split').click();
     assert.deepEqual(await tabletCounts(),[0,0,0,6,6],'split preserves all twelve existing writes');
     await reading.locator('#tb-time').click();
     assert.deepEqual(await tabletCounts(),[0,0,0,6,18],'the next increasing-key burst still reaches only the final range');

     // Capacity counts distinct keys. Rewrites do not consume another slot.
     await reading.locator('#lsm-reset').click();
     let flushes=0,writes=0,rewriteSeen=false;
     while((flushes<2||!rewriteSeen)&&writes<60){
      const beforeKeys=await reading.locator('#lsm-stage .mem .lsm-kv').allTextContents();
      await reading.locator('#lsm-w1').click();writes++;
      const afterKeys=await reading.locator('#lsm-stage .mem .lsm-kv').allTextContents();
      const newFlushes=await reading.locator('#lsm-stage .sst').count();
      if(newFlushes>flushes){
       const fileKeys=await reading.locator('#lsm-stage .sst').first().locator('.lsm-kv').allTextContents();
       assert.equal(fileKeys.length,6,'a flush contains exactly six distinct keys');
       assert.equal(new Set(fileKeys.map(kv=>kv.split('=')[0])).size,6);
       assert.equal(afterKeys.length,0,'flush leaves a new empty memtable');
      }else{
       assert(afterKeys.length<6,'a full memtable is flushed');
       if(beforeKeys.length&&afterKeys.length===beforeKeys.length){
        rewriteSeen=true;
        assert.notDeepEqual(afterKeys,beforeKeys,'rewriting a resident key changes its value without adding a slot');
       }
      }
      flushes=newFlushes;
     }
     assert(flushes>=2,'the write widget creates multiple sorted files');
     assert(rewriteSeen,'the deterministic example includes a resident-key rewrite');
     const diskEntries=await reading.locator('#lsm-stage .sst .lsm-kv').allTextContents();
     const latest=new Map();
     for(const entry of diskEntries){
      const [key,value]=entry.split('='),version=Number(value.slice(1));
      latest.set(key,Math.max(latest.get(key)||0,version));
     }
     await reading.locator('#lsm-key').fill('k99');await reading.locator('#lsm-get').click();
     assert.match(await reading.locator('#lsm-get-msg').textContent(),new RegExp(`checked ${flushes+1} structures.*not present`));
     await reading.locator('#lsm-compact').click();
     assert.equal(await reading.locator('#lsm-stage .sst').count(),1);
     const compacted=await reading.locator('#lsm-stage .sst .lsm-kv').allTextContents();
     assert.deepEqual(compacted,[...latest].sort(([a],[b])=>a.localeCompare(b)).map(([key,version])=>`${key}=v${version}`),'compaction keeps each key and its newest value');
     await reading.locator('#lsm-get').click();
     assert.match(await reading.locator('#lsm-get-msg').textContent(),/checked 2 structures.*not present/,'compaction reduces the absent-key search');

     // An absent key can pass the filter, but an inserted key cannot be rejected.
     await reading.locator('#bloom-reset').click();await reading.locator('#bloom-seed').click();
     await reading.locator('#bloom-key').fill('k7');await reading.locator('#bloom-qry').click();
     assert.match(await reading.locator('#bloom-msg').textContent(),/definitely absent/);
     await reading.locator('#bloom-key').fill('k17');await reading.locator('#bloom-qry').click();
     assert.match(await reading.locator('#bloom-msg').textContent(),/false positive/);
     for(const key of ['k1','k2','k3','k4','k5','k6']){
      await reading.locator('#bloom-key').fill(key);await reading.locator('#bloom-qry').click();
      assert.match(await reading.locator('#bloom-msg').textContent(),/confirms that the key is present/);
     }

     // The shared delete trace keeps the marker until the older file is covered.
     const trace=reading.locator('[data-teaching-trace="lsm"]');
     if(!(await trace.locator('[data-trace-action="reset"]').isDisabled()))await trace.locator('[data-trace-action="reset"]').click();
     const states=[];
     for(let step=0;step<5;step++){
      assert.equal(await trace.getAttribute('data-trace-step'),String(step));
      states.push(await trace.locator('.trace-table').textContent());
      if(step<4)await trace.locator('[data-trace-action="next"]').click();
     }
     assert.match(states[2],/read at snapshot 9absent/);
     assert.match(states[3],/older file Astill contains old @ 5/);
     assert.match(states[3],/keep in merged outputDELETE @ 9/);
     assert.match(states[4],/safe output for kno record/);
     assert(await trace.locator('[data-trace-action="next"]').isDisabled());
     await trace.locator('[data-trace-action="reset"]').click();
    }
    // Keyboard controls remain local even while the reading's presentation mode is active.
    const first=widgets.first();
    await first.evaluate(root=>{
     let section=0;
     for(const element of document.querySelector('main').children){
      if(element===root)break;
      if((element.tagName==='H2'&&element.id)||element.classList.contains('new-slide'))section++;
     }
     localStorage.setItem('lab.presentationSlide',String(section));
    });
    await reading.locator('#present-toggle').click();await reading.keyboard.press('a');
    const readingPosition=await reading.locator('#present-counter').textContent();
    await first.locator('[data-action="next"]').focus();await reading.keyboard.press('ArrowRight');
    assert.equal(await first.getAttribute('data-step'),'1');
    assert.equal(await reading.locator('#present-counter').textContent(),readingPosition);
    await reading.keyboard.press('Home');
    assert.equal(await first.getAttribute('data-step'),'0');
    await reading.keyboard.press('Enter');
    assert.equal(await first.getAttribute('data-step'),'1','native Enter activates the focused Next button');
    await first.locator('.lw-viewport').focus();await reading.keyboard.press('ArrowRight');
    assert.equal(await reading.locator('#present-counter').textContent(),readingPosition,'scrolling the diagram does not navigate reading sections');
    await reading.keyboard.press('Escape');
    assert(!(await reading.locator('body').evaluate(body=>body.classList.contains('presentation-mode'))));
    for(const width of [390,320]){
     await reading.setViewportSize({width,height:844});
     assert(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'reading fits '+width+'px');
     const mobile=await widgets.evaluateAll(roots=>roots.map(r=>{
      const viewport=r.querySelector('.lw-viewport');
      return{localScroll:viewport.scrollWidth>viewport.clientWidth,buttons:[...r.querySelectorAll('button')].every(b=>{const box=b.getBoundingClientRect();return box.height>=44&&box.x>=0&&box.right<=innerWidth;})};
     }));
     assert(mobile.every(s=>s.localScroll&&s.buttons),'diagrams scroll locally and controls remain usable');
     await widgets.nth(6).screenshot({path:path.join(output,'lecture-'+id+'-inline-'+width+'.png')});
    }
    const beforePrint=await widgets.evaluateAll(roots=>roots.map(r=>r.dataset.step));
    await reading.emulateMedia({media:'print'});
    assert.equal(await reading.locator('.lw-controls:visible').count(),0);
    assert.equal(await reading.locator('.lw-print:visible').count(),scenes.length);
    const printed=await widgets.evaluateAll((roots,id)=>roots.map(root=>{
     const scene=COURSE_DECKS[id].scenes.find(s=>s.id===root.dataset.lectureScene);
     const expected=DeckViz.sceneDrawing(scene,scene.steps-1).filter(i=>i.tag==='text'||i.tag==='a').map(i=>[i.key,i.text]);
     const actual=[...root.querySelector('.lw-print svg').children].filter(e=>['text','a'].includes(e.tagName.toLowerCase())).map(e=>[e.dataset.key,e.textContent]);
     return{expected,actual};
    }),id);
    for(const state of printed)assert.deepEqual(state.actual,state.expected,'print retains the complete final drawing');
    await reading.emulateMedia({media:'screen'});
    assert.deepEqual(await widgets.evaluateAll(roots=>roots.map(r=>r.dataset.step)),beforePrint,'printing preserves interactive state');
    await reading.close();
   }
   console.log(`Lecture ${id}: ${scenes.length} scenes; rendered labels, synchronized presenter notes, and guide checked.`);
  }
  fs.writeFileSync(path.join(output,'problems.json'),JSON.stringify(problems,null,2));
  console.log(JSON.stringify({builds:snapshots.length,problemStates:problems.length,errors,output}));
  assert.deepEqual(errors,[],'no browser errors');
  assert.equal(problems.length,0,'all rendered labels fit without text overlaps; see problems.json');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
