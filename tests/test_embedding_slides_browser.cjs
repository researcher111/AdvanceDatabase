'use strict';
// Optional UI checks: Playwright + Chromium. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE
// to use an existing browser; EMBEDDING_SLIDE_QA_OUTPUT selects a screenshot folder.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'slides/lecture-11.html')).href;
const output=process.env.EMBEDDING_SLIDE_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'embedding-slides-'));
fs.mkdirSync(output,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  await context.route(/^https?:\/\//,route=>route.abort());
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  const page=await context.newPage();await page.goto(url+'#s=2&b=1');
  await page.waitForFunction(()=>window.CoursePlayer&&window.EmbeddingWalkthrough);
  assert.equal(await page.locator('iframe').count(),0,'embedding explanation is part of the slide canvas');
  const scene=await page.evaluate(()=>{
   const deck=CoursePlayer.deck,index=deck.scenes.findIndex(scene=>scene.id==='embedding'),scene=deck.scenes[index];
   return {index,id:scene.id,steps:scene.steps,minutes:scene.minutes,total:deck.scenes.reduce((sum,s)=>sum+s.minutes,0),states:scene.states,teaching:scene.teaching};
  });
  assert.equal(scene.index,1,'existing embedding slide keeps its place in the lecture');
  assert.equal(scene.steps,7);assert.equal(scene.minutes,4);assert.equal(scene.total,60);
  assert.equal(scene.teaching.builds.length,7,'each build has a teaching cue');
  assert.equal(scene.teaching.checks.length,7,'each build has a question and expected answer');
  const popup=page.waitForEvent('popup');await page.locator('#presenter').click();const notes=await popup;
  await notes.locator('.teaching-current').waitFor();await page.bringToFront();
  const slides=[];

  async function go(step){
   await page.evaluate(({slide,step})=>{location.hash=`s=${slide+1}&b=${step+1}`;},{slide:scene.index,step});
   await page.waitForFunction(({slide,step})=>CoursePlayer.getState().slide===slide&&CoursePlayer.getState().step===step,{slide:scene.index,step});
  }
  async function drawing(){
   return page.locator('#canvas').evaluate(svg=>{
    const text=[...svg.querySelectorAll('text')].filter(e=>e.textContent.trim()).map(e=>{const b=e.getBBox();return{key:e.dataset.key,text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height};});
    const outside=text.filter(t=>t.x<4||t.y<4||t.x+t.w>1276||t.y+t.h>716),overlaps=[];
    for(let i=0;i<text.length;i++)for(let j=i+1;j<text.length;j++){
     const a=text[i],b=text[j];
     if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>3&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>3)overlaps.push([a.key,b.key]);
    }
    return {text,byKey:Object.fromEntries(text.map(t=>[t.key,t.text])),outside,overlaps,svg:svg.outerHTML};
   });
  }
  for(let step=0;step<7;step++){
   assert.equal(await page.evaluate(()=>CoursePlayer.getState().step),step);
   const rendered=await drawing();
   assert.deepEqual(rendered.outside,[],`build ${step+1}: all text fits the 1280×720 slide`);
   assert.deepEqual(rendered.overlaps,[],`build ${step+1}: text labels do not overlap`);
   assert(await page.locator('#canvas rect').count()>=2,`build ${step+1}: mechanism has visible diagram objects`);
   assert.equal(await page.locator('#canvas desc').textContent(),scene.states[step],'screen-reader description identifies the current build');
   await notes.waitForFunction(({slide,step})=>CoursePlayer.getState().slide===slide&&CoursePlayer.getState().step===step,{slide:scene.index,step});
   assert.equal(await notes.locator('.teaching-current p').last().innerText(),scene.teaching.builds[step],'presenter cue follows the audience build');
   const check=scene.teaching.checks?.[step]||scene.teaching;
   assert((await notes.locator('.teaching-question').innerText()).includes(check.question));
   assert.equal(await notes.locator('.teaching-answer p').textContent(),check.answer);
   assert.deepEqual(await notes.locator('#presenter-canvas text').allTextContents(),await page.locator('#canvas text').allTextContents(),'presenter preview matches the audience diagram');
   slides.push(rendered);
   await page.locator('#canvas').screenshot({path:path.join(output,`build-${step+1}.png`)});
   if(step<6)await page.locator('#forward').click();
  }
  assert.equal(new Set(slides.map(s=>s.svg)).size,7,'all seven builds show a distinct visual state');
  const fixtures=await page.evaluate(()=>({queries:EmbeddingWalkthrough.queries,passages:EmbeddingWalkthrough.passages}));
  function embedding(fixture){
   const average=fixture.context[0].map((_,dimension)=>fixture.context.reduce((sum,row)=>sum+row[dimension],0)/fixture.context.length);
   return {average,unit:average.map(value=>value/Math.hypot(...average))};
  }
  const vectorText=vector=>'['+vector.map(value=>value.toFixed(3)).join(', ')+']';
  const queryIds=['recovery','recovery','recovery','recovery','recovery','restart','speed'];
  for(let step=0;step<7;step++){
   assert.equal(slides[step].byKey['ew-query'],fixtures.queries[queryIds[step]].text,'every build keeps the actual question visible');
   assert(slides[step].byKey['ew-disclaimer']?.length>0,'invented model values remain explicitly labeled');
  }
  fixtures.queries.recovery.tokens.forEach((token,index)=>{
   assert.equal(slides[1].byKey[`ew-token-${index}-label`],token,`build 2: token ${index+1} matches the reading example`);
  });
  const contextBuild=slides[2].byKey,focus=fixtures.queries.recovery.focus;
  for(const example of ['health','database'])for(const part of ['sentence-0','clue','meaning']){
   assert(contextBuild[`ew-context-${example}-${part}`]?.trim(),`context stage shows the ${example} sentence, its clue, and the word's meaning`);
  }
  assert.notEqual(contextBuild['ew-context-health-meaning'],contextBuild['ew-context-database-meaning'],'the same word has different meanings in the two sentences');
  assert.equal([contextBuild['ew-context-database-sentence-0'],contextBuild['ew-context-database-sentence-1']].join(' '),fixtures.queries.recovery.text,'database context example preserves the current question');
  assert(contextBuild['ew-context-mechanism']?.trim(),'context stage connects the sentence comparison to the vector update');
  assert(contextBuild['ew-context-vector'].includes(vectorText(fixtures.queries.recovery.context[focus])),'context stage displays the focused token vector from the shared reading example');
  const recovery=embedding(fixtures.queries.recovery);
  recovery.average.forEach((value,dimension)=>{
   assert(Math.abs(Number(slides[3].byKey[`ew-mean-${dimension}`])-value)<=0.0005,'pooling displays the arithmetic mean of contextual coordinates');
   assert(Math.abs(Number(slides[3].byKey[`ew-embedding-${dimension}`])-recovery.unit[dimension])<=0.0005,'normalization displays the resulting unit vector');
  });
  for(const [step,id]of [[4,'recovery'],[5,'restart'],[6,'speed']]){
   const query=embedding(fixtures.queries[id]).unit;
   assert.equal(slides[step].byKey['ew-query-vector'],vectorText(query),'comparison uses the selected question vector');
   const ranking=fixtures.passages.map(passage=>{
    const vector=embedding(passage).unit;
    return {id:passage.id,vector,score:vector.reduce((sum,value,dimension)=>sum+value*query[dimension],0)};
   }).sort((a,b)=>b.score-a.score);
   assert.equal(ranking[0].id,id==='speed'?'index':'recovery');
   for(const [rank,passage]of ranking.entries()){
    assert.equal(Number(slides[step].byKey[`ew-rank-${passage.id}`]),rank+1,`${id}: passages are ranked by the recomputed cosine`);
    assert(slides[step].byKey[`ew-score-${passage.id}`].includes(passage.score.toFixed(3)),`${id}: score matches the reading's vector calculation`);
    assert.equal(slides[step].byKey[`ew-stored-${passage.id}`],vectorText(passage.vector),'stored passage coordinates stay fixed across questions');
   }
   const first=slides[step].text.find(t=>t.key===`ew-rank-${ranking[0].id}`),second=slides[step].text.find(t=>t.key===`ew-rank-${ranking[1].id}`);
   assert(first.y<second.y,'the visually first passage is the highest-scoring result');
  }

  // The presenter can navigate backward without desynchronizing the audience.
  await notes.getByRole('button',{name:'Previous build',exact:true}).click();
  await page.waitForFunction(()=>CoursePlayer.getState().step===5);
  await page.locator('#forward').click();
  await notes.waitForFunction(()=>CoursePlayer.getState().step===6);

  const gallery=await context.newPage();await gallery.setViewportSize({width:1600,height:1800});
  await gallery.setContent('<body style="margin:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#e8ede6;font:18px system-ui">'+slides.map((slide,index)=>`<article><h3>${index+1} · ${scene.states[index]}</h3>${slide.svg.replace('id="canvas"','style="display:block;width:100%;background:#f7f6f2"')}</article>`).join(''));
  await gallery.screenshot({path:path.join(output,'all-builds.png'),fullPage:true});
  await page.setViewportSize({width:1024,height:768});
  for(let step=0;step<7;step++){
   await go(step);
   const bounds=await page.locator('#canvas').boundingBox();
   assert(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=1025&&bounds.y+bounds.height<=769,`tablet build ${step+1}: complete canvas fits`);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'tablet has no page overflow');
   assert(await page.locator('#canvas [data-key]').evaluateAll(elements=>elements.every(e=>Number(getComputedStyle(e).opacity)===1)),'reduced motion renders a completed build immediately');
  }
  await page.screenshot({path:path.join(output,'tablet.png')});

  const guide=await context.newPage();await guide.goto(url+'?guide=1');
  const article=guide.locator('article').nth(scene.index);
  const guideText=await article.innerText();
  for(const cue of scene.teaching.builds)assert(guideText.includes(cue),'printable guide contains every build cue');
  assert.deepEqual(await article.locator('svg text').allTextContents(),await page.locator('#canvas text').allTextContents(),'guide visual shows the same final comparison');
  await guide.emulateMedia({media:'print'});
  assert(await article.locator('svg').isVisible(),'print retains the embedding visual');
  await article.screenshot({path:path.join(output,'guide.png')});
  assert.deepEqual(errors,[],'local deck, presenter, and guide produce no browser errors');
  console.log(`Seven embedding builds: diagrams, shared calculations, ranking changes, presenter synchronization, print guide, reduced motion, tablet, and offline operation pass. Screenshots: ${output}`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
