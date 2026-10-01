'use strict';
// Optional browser checks: requires Playwright and its Chromium installation.
// Pass lecture numbers to check a subset. SLIDE_QA_OUTPUT selects the report folder.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const ids=process.argv.length>2?process.argv.slice(2).map(Number):Array.from({length:15},(_,i)=>i+1).filter(i=>i!==6);
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
     return{outside,overlaps,svg:svg.outerHTML,instruction:t.builds[state.step],question:check.question,answer:check.answer};
    });
    if(result.outside.length||result.overlaps.length)problems.push({id,slide:i+1,step:step+1,title:scene.title,outside:result.outside,overlaps:result.overlaps});
    snapshots.push({id,slide:i+1,step:step+1,title:scene.title,steps:scene.steps,...result});
    await notes.waitForFunction(({i,step})=>CoursePlayer.getState().slide===i&&CoursePlayer.getState().step===step,{i,step});
    assert.equal(await notes.locator('.teaching-current p').last().innerText(),result.instruction);
    assert((await notes.locator('.teaching-question').innerText()).includes(result.question));
    assert.equal(await notes.locator('.teaching-answer p').textContent(),result.answer);
   }
   await notes.close();
   for(let start=1;start<=scenes.length;start+=6)await contact(snapshots.filter(x=>x.id===id&&x.slide>=start&&x.slide<start+6&&x.step===x.steps),`lecture-${id}-${start}`);
   for(const [i,scene]of scenes.entries())if(scene.native)await contact(snapshots.filter(x=>x.id===id&&x.slide===i+1),`sequence-${id}-${i+1}`);
   await gallery.goto(url+'?guide=1');
   assert.equal(await gallery.locator('article').count(),scenes.length);
   const guideText=await gallery.locator('body').textContent();
   for(const snap of snapshots.filter(x=>x.id===id))assert(guideText.includes(snap.instruction),'guide contains each build cue');
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
   console.log(`Lecture ${id}: ${scenes.length} scenes; rendered labels, synchronized presenter notes, and guide checked.`);
  }
  fs.writeFileSync(path.join(output,'problems.json'),JSON.stringify(problems,null,2));
  console.log(JSON.stringify({builds:snapshots.length,problemStates:problems.length,errors,output}));
  assert.deepEqual(errors,[],'no browser errors');
  assert.equal(problems.length,0,'all rendered labels fit without text overlaps; see problems.json');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
