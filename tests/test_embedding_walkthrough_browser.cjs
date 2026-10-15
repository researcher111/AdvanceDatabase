'use strict';
// Optional UI checks: Playwright + Chromium. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE
// to use an existing browser; EMBEDDING_QA_OUTPUT selects a screenshot folder.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'lectures/lecture-11/vectors.html')).href;
const output=process.env.EMBEDDING_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'embedding-walkthrough-'));
fs.mkdirSync(output,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  // All examples and controls must work from a local file, without model APIs or CDNs.
  await context.route(/^https?:\/\//,route=>route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const widget=page.locator('#embedding-walkthrough'),query=widget.locator('#ew-query');
  await query.waitFor({state:'visible'});
  const previous=widget.locator('#ew-back'),next=widget.locator('#ew-next');
  const cases=['recovery','restart','speed'];let states=0,storedVectors;
  assert.deepEqual(await query.locator('option').evaluateAll(es=>es.map(e=>e.value)),cases);
  assert(await query.evaluate(e=>e.labels.length>0&&[...e.labels].some(l=>l.textContent.trim())),'query selection has a native label');

  async function goToStage(wanted){
   let stage=Number(await widget.getAttribute('data-stage'));
   for(let attempts=0;stage!==wanted&&attempts<5;attempts++){
    await (stage<wanted?next:previous).click();stage=Number(await widget.getAttribute('data-stage'));
   }
   assert.equal(stage,wanted,'stage navigation reaches the requested step');
  }
  for(const id of cases){
   await query.selectOption(id);await goToStage(0);
   const fixture=await page.evaluate(id=>window.EmbeddingWalkthrough.queries[id],id);
   assert(await previous.isDisabled(),'cannot move before the first stage');
   const labels=new Set(),views=new Set();
   for(let stage=0;stage<5;stage++){
    assert.equal(await widget.getAttribute('data-stage'),String(stage));
    labels.add((await widget.locator('#ew-stage-label').innerText()).trim());
    views.add((await widget.locator('#ew-stage').innerText()).trim());
    if(stage===1)assert.equal(await widget.locator('.ew-token').count(),fixture.tokens.length,'tokenization exposes every token in the fixture');
    if(stage===2)assert.equal(await widget.locator('[data-token-index]').count(),fixture.context.length,'each contextual vector has a selectable token');
    if(stage===3){
     const average=fixture.context[0].map((_,i)=>fixture.context.reduce((total,row)=>total+row[i],0)/fixture.context.length);
     const unit=average.map(value=>value/Math.hypot(...average));
     assert.deepEqual(await widget.locator('.ew-calculation .ew-coordinate > span').allTextContents(),[...average,...unit].map(value=>value.toFixed(3)),'pooling and normalization display the actual computed coordinates');
    }
    states++;
    if(stage<4)await next.click();
   }
   assert.equal(labels.size,5,`${id}: each stage has a distinct label`);
   assert.equal(views.size,5,`${id}: tokenization, context, pooling, and ranking reveal different content`);
   assert(await next.isDisabled(),'cannot move beyond the ranking');
   const results=await widget.locator('.ew-result').evaluateAll(es=>es.map(e=>({id:e.dataset.passage,score:Number(e.dataset.score),label:e.querySelector('.ew-score').textContent})));
   assert.equal(results.length,2);
   assert.equal(results[0].id,id==='speed'?'index':'recovery',`${id}: the relevant passage ranks first`);
   assert(results.every(r=>Number.isFinite(r.score)&&r.score>=-1&&r.score<=1),'cosine scores are finite and bounded');
   assert(results[0].score>=results[1].score,'results are sorted by similarity');
   const saved=await widget.locator('.ew-result').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.passage,e.querySelector('.ew-saved-vector').textContent])));
   if(storedVectors)assert.deepEqual(saved,storedVectors,'changing the question leaves stored passage vectors unchanged');
   else storedVectors=saved;
   // Recompute pooling, unit length, and cosine independently from the fixture rows.
   const independent=await page.evaluate(id=>{
    const api=window.EmbeddingWalkthrough;
    function vector(fixture){
     const average=fixture.context[0].map((_,i)=>fixture.context.reduce((total,row)=>total+row[i],0)/fixture.context.length);
     const length=Math.sqrt(average.reduce((total,x)=>total+x*x,0));
     return average.map(x=>x/length);
    }
    const q=vector(api.queries[id]);
    return {q,scores:api.passages.map(p=>({id:p.id,score:vector(p).reduce((total,x,i)=>total+x*q[i],0)}))};
   },id);
   assert(Math.abs(Math.hypot(...independent.q)-1)<1e-12,'pooled query is normalized');
   for(const result of results){
    assert(Math.abs(result.score-independent.scores.find(p=>p.id===result.id).score)<1e-6,`${id}/${result.id}: displayed ranking uses the shown coordinates`);
    assert(result.label.includes(result.score.toFixed(3)),`${id}/${result.id}: score label matches the numeric score`);
   }
   await widget.screenshot({path:path.join(output,`${id}-ranking.png`)});
  }

  await query.selectOption('recovery');await goToStage(2);
  const tokens=widget.locator('[data-token-index]');
  assert(await tokens.count()>1,'context stage exposes multiple selectable tokens');
  const detailBefore=await widget.locator('#ew-token-detail').innerText();
  await tokens.last().click();
  assert.notEqual(await widget.locator('#ew-token-detail').innerText(),detailBefore,'choosing another token changes its context explanation');
  assert.equal(await tokens.last().getAttribute('aria-pressed'),'true','selected token is announced');
  assert.equal(await widget.locator('[data-token-index][aria-pressed="true"]').count(),1,'exactly one token is selected');
  const unnamed=await widget.locator('button').evaluateAll(es=>es.filter(e=>!(e.getAttribute('aria-label')||e.textContent).trim()).map(e=>e.id));
  assert.deepEqual(unnamed,[],'all native buttons have an accessible name');
  await widget.screenshot({path:path.join(output,'token-context.png')});

  // The walkthrough is one slide build; its keyboard controls cannot move the deck.
  const slide=await widget.evaluate(widget=>{
   let index=0;for(const element of document.querySelector('main').children){
    if((element.tagName==='H2'&&element.id)||element.classList.contains('new-slide'))index++;
    if(element===widget)return index;
   }
  });
  assert(Number.isInteger(slide),'walkthrough remains a direct lecture section element');
  await page.evaluate(slide=>localStorage.setItem('lab.presentationSlide',String(slide)),slide);
  await page.locator('#present-toggle').click();await page.locator('#present-forward').focus();await page.keyboard.press('a');
  const counter=await page.locator('#present-counter').textContent();
  await next.focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#present-counter').textContent(),counter,'widget arrow key leaves the presentation on its slide');
  await query.focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('#present-counter').textContent(),counter,'query selection leaves the presentation on its slide');
  await page.keyboard.press('p');
  assert(await page.locator('body').evaluate(e=>e.classList.contains('presentation-mode')),'typing in query control cannot toggle presentation mode');
  await widget.screenshot({path:path.join(output,'presentation.png')});
  await page.locator('#present-toggle').click();

  await page.setViewportSize({width:390,height:844});
  for(let stage=0;stage<5;stage++){
   await goToStage(stage);
   assert(await widget.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`phone stage ${stage}: widget fits without horizontal overflow`);
   assert(await widget.evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=-1&&b.right<=innerWidth+1;}),`phone stage ${stage}: widget stays inside viewport`);
  }
  await widget.screenshot({path:path.join(output,'phone-ranking.png')});

  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({media:'print'});
  assert(await widget.locator('.ew-print').isVisible(),'printing retains a complete static explanation');
  assert(await query.isHidden(),'printing hides controls that cannot be used on paper');
  await widget.screenshot({path:path.join(output,'print.png')});
  const offline=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await offline.route(/^https?:\/\//,route=>route.abort());
  const plain=await offline.newPage();await plain.goto(url);
  const fallback=plain.locator('#embedding-walkthrough');
  assert(await fallback.locator('#ew-fallback').isVisible(),'the explanation remains available without JavaScript');
  assert(await fallback.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no-script phone widget fits');
  await fallback.screenshot({path:path.join(output,'no-script.png')});
  assert.deepEqual(errors,[],'no uncaught browser errors');
  console.log(`${cases.length} queries, ${states} stages: changing rankings, independent cosine calculations, token inspection, controls, presentation, mobile, print, and no-script pass. Screenshots: ${output}`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
