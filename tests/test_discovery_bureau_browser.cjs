'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'discovery-bureau-'));
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
  const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../lectures/discovery/index.html')).href);
  assert.equal(await page.locator('.query-card .reveal').count(),4);
  await page.screenshot({path:path.join(output,'outline.png')});
  for(const id of ['city','weather','planets','evidence']){
   const card=page.locator('#'+id+' .query-card');
   assert(await card.locator('.result').isHidden());
   await card.locator('.reveal').click();assert.equal(await card.locator('.reveal').getAttribute('aria-expanded'),'true');
   const modes=await card.locator('option').evaluateAll(es=>es.map(e=>e.value));
   for(const mode of modes){
    await card.locator('select').selectOption(mode);
    const bad=await card.locator('svg').evaluate(svg=>{
     const view=svg.viewBox.baseVal;
     return [...svg.querySelectorAll('text')].filter(e=>{const b=e.getBBox();return b.x<0||b.y<0||b.x+b.width>view.width||b.y+b.height>view.height;}).map(e=>e.textContent);
    });assert.deepEqual(bad,[],id+' '+mode+' chart labels fit');
   }
   assert((await card.locator('tbody tr').count())>0);
   await card.screenshot({path:path.join(output,id+'.png')});
   const downloadPromise=page.waitForEvent('download');await card.getByText('Download result CSV',{exact:true}).click();
   const downloaded=await downloadPromise;assert(fs.statSync(await downloaded.path()).size>50);
   await card.locator('.reveal').click();assert(await card.locator('.result').isHidden());
  }
  assert((await page.locator('#planets .actions a.btn').getAttribute('href')).includes('query=SELECT'));
  await page.setViewportSize({width:390,height:844});
  for(const id of ['city','weather','planets','evidence']){
   const card=page.locator('#'+id+' .query-card');await card.locator('.reveal').click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' fits mobile');
   assert(await card.locator('.chart').evaluate(e=>e.scrollWidth>e.clientWidth),id+' chart scrolls locally');
  }
  await page.locator('#weather .query-card').screenshot({path:path.join(output,'phone-weather.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'offline page must not query external services');
  console.log('Four offline cases, nine visual states, exports, labels, and mobile layout pass. Screenshots: '+output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
