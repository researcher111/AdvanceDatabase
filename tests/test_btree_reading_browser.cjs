'use strict';
// Optional UI checks: Playwright + Chromium. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE
// to use an existing browser; BTREE_READING_QA_OUTPUT selects a screenshot folder.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'lectures/lecture-06/btrees.html')).href;
const output=process.env.BTREE_READING_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'btree-reading-'));
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  // CDN syntax highlighting is optional; verify the lesson works offline.
  await context.route('https://**',route=>route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForSelector('[data-ready]');
  const figures=page.locator('[data-btree-scene]');assert.equal(await figures.count(),15);
  const ids=await figures.evaluateAll(es=>es.map(e=>e.dataset.btreeScene));let builds=0;
  for(const id of ids){
   const figure=page.locator(`[data-btree-scene="${id}"]`);
   const states=await page.evaluate(id=>COURSE_DECKS[6].scenes.find(s=>s.id===id).steps,id);
   for(let step=0;step<states;step++){
    await figure.locator('select').selectOption(String(step));
    assert.equal(await figure.getAttribute('data-step'),String(step));
    const diff=await figure.evaluate((e,step)=>{
     const scene=COURSE_DECKS[6].scenes.find(s=>s.id===e.dataset.btreeScene);
     const omitted=new Set(['title','heading','growth-title','caption','operation','growth-caption']);
     const expected=DeckViz.sceneDrawing(scene,step).filter(x=>!omitted.has(x.key));
     const svg=e.querySelector('svg'),items=[...svg.querySelectorAll('[data-key]')];
     const bad=expected.filter(x=>{
      const actual=items.find(a=>a.dataset.key===x.key);
      return !actual||Object.entries(x.attrs).some(([k,v])=>actual.getAttribute(k)!==String(v))||(x.text!==undefined&&actual.textContent!==x.text);
     });
     const outside=items.filter(x=>x.tagName==='text'&&x.textContent.trim()).filter(x=>{const b=x.getBBox();return b.x<0||b.x+b.width>1280||b.y<170||b.y+b.height>700;}).map(x=>x.dataset.key);
     return{bad:bad.map(x=>x.key),outside};
    },step);
    assert.deepEqual(diff,{bad:[],outside:[]},`${id} step ${step+1} matches the slide and fits its view`);
    builds++;
   }
   assert(await figure.locator('[data-action=next]').isDisabled());
   await figure.locator('[data-action=reset]').click();
   assert(await figure.locator('[data-action=previous]').isDisabled());
  }
  const growth=page.locator('[data-btree-scene="the-fifth-key"]');
  await growth.locator('select').selectOption('9');
  await growth.locator('.bt-reading-check > summary').click();
  await growth.locator('.bt-reading-answer > summary').click();
  await growth.locator('[data-action=next]').click();
  assert.equal(await growth.locator('.bt-reading-answer').getAttribute('open'),null);
  await growth.locator('[data-action=enlarge]').click();
  const dialog=page.locator('dialog');assert(await dialog.isVisible());
  await dialog.locator('select').selectOption('14');
  await dialog.screenshot({path:path.join(output,'enlarged-split.png')});
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);
  assert(await growth.locator('[data-action=enlarge]').evaluate(e=>e===document.activeElement));
  assert.equal(await growth.getAttribute('data-step'),'14','closing retains selected step');
  // Diagram arrows are local controls and do not alter another diagram.
  await growth.locator('[data-action=next]').focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await growth.getAttribute('data-step'),'13');
  assert.equal(await figures.first().getAttribute('data-step'),'0','other diagrams stay independent');
  // Re-enter at the growth section to check conflicts with presentation keys.
  const growthSlide=await page.evaluate(()=>{
   let slide=0;for(const e of document.querySelector('main').children){
    if(e.tagName==='H2'&&e.id||e.classList.contains('new-slide'))slide++;
    if(e.dataset.btreeScene==='the-fifth-key')return slide;
   }
  });
  await page.evaluate(n=>localStorage.setItem('lab.presentationSlide',String(n)),growthSlide);
  await page.locator('#present-toggle').click();await page.locator('#present-forward').focus();await page.keyboard.press('a');
  const counter=await page.locator('#present-counter').textContent();
  await growth.locator('[data-action=next]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await growth.getAttribute('data-step'),'14');
  assert.equal(await page.locator('#present-counter').textContent(),counter);
  await growth.locator('[data-action=enlarge]').click();await page.keyboard.press('Escape');
  assert(await page.locator('body').evaluate(e=>e.classList.contains('presentation-mode')),'closing a diagram leaves presentation mode active');
  await page.locator('#present-toggle').click();
  for(const [id,step]of [['b-tree',3],['four-storage-choices',9],['index-pages-and-heap-pages',4],['a-root-splits',6]]){
   const figure=page.locator(`[data-btree-scene="${id}"]`);await figure.locator('select').selectOption(String(step));
   await figure.screenshot({path:path.join(output,id+'.png')});
  }
  // Free-form insertions produce actual tree edges and a complete leaf chain.
  for(const key of [39,31,37,28,36,34]){await page.locator('#bt-key').fill(String(key));await page.locator('#bt-one').click();}
  assert.equal(await page.locator('#bt-canvas .bt-child-edge').count(),2);
  assert.equal(await page.locator('#bt-canvas .bt-next-edge').count(),1);
  await page.locator('#bt-skey').fill('36');await page.locator('#bt-search').click();
  assert.equal(await page.locator('#bt-canvas .bt-child-edge.active').count(),1);
  assert.equal(await page.locator('#bt-canvas .bt-found-key').count(),1);
  await page.locator('#viz-btree').screenshot({path:path.join(output,'sandbox.png')});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone page does not overflow horizontally');
  await growth.screenshot({path:path.join(output,'phone-split.png')});
  assert(await growth.locator('.bt-reading-viewport').evaluate(e=>e.scrollWidth>e.clientWidth),'phone keeps diagram labels readable with local scrolling');
  await growth.locator('[data-action=enlarge]').click();assert(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.bt-reading-static:visible').count(),15);
  assert.equal(await page.locator('.bt-reading-panel:visible').count(),0);
  await page.locator('[data-btree-scene="a-root-splits"]').screenshot({path:path.join(output,'print-tree.png')});
  const offline=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await offline.route('https://**',route=>route.abort());const plain=await offline.newPage();await plain.goto(url);
  assert.equal(await plain.locator('.bt-reading-static:visible').count(),15);
  for(const img of await plain.locator('.bt-reading-static').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());}
  assert(await plain.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no-script phone layout fits');
  assert.deepEqual(errors,[]);
  console.log(`${ids.length} diagrams, ${builds} states: shared drawings, controls, enlarged views, mobile, print, no-script, and live tree pointers pass. Screenshots: ${output}`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
