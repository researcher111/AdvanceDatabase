'use strict';
// Start discovery.py --serve, then run with Playwright/Chromium available.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'taxi-discovery-'));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
  for(const live of [false,true]){
   await page.goto(live?'http://127.0.0.1:8770/lectures/lecture-10/discovery.html':pathToFileURL(path.join(root,'lectures/lecture-10/discovery.html')).href);
   await page.waitForSelector('#case option',{state:'attached'});assert.equal(await page.locator('#case option').count(),7);
   assert.equal(await page.locator('#sql').evaluate(e=>e.readOnly),!live);
   for(let i=0;i<7;i++){
    await page.locator('#case').selectOption(String(i));await page.locator('#prediction').fill('My prediction '+i);
    await page.locator('#run').click();await page.locator('#evidence').waitFor({state:'visible'});
    assert(!(await page.locator('#query-status').textContent()).includes('error'));
    const bad=await page.locator('#chart svg').evaluate(svg=>{
     const view=svg.viewBox.baseVal;
     return [...svg.querySelectorAll('text')].filter(e=>{const b=e.getBBox();return b.x<0||b.y<0||b.x+b.width>view.width||b.y+b.height>view.height;}).map(e=>e.textContent);
    });assert.deepEqual(bad,[],`case ${i}: labels fit`);
    const metrics=await page.locator('#metric option').evaluateAll(es=>es.map(e=>e.value));
    for(const metric of metrics){await page.locator('#metric').selectOption(metric);assert(await page.locator('#chart svg').count());}
    if(live&&[2,3,6].includes(i))await page.locator('#case-panel').screenshot({path:path.join(output,'case-'+i+'.png')});
   }
   await page.locator('#case').selectOption('0');assert.equal(await page.locator('#prediction').inputValue(),'My prediction 0');
   if(live){
    const sql="SELECT pickup_name, count(*) AS rides FROM trips WHERE pickup_zone = 132 GROUP BY pickup_name";
    await page.locator('#sql').fill(sql);await page.locator('#run').click();await page.locator('#evidence').waitFor({state:'visible'});
    assert((await page.locator('#rows').textContent()).includes('3,102'));
    assert((await page.locator('#interpretation').textContent()).includes('You changed the query'));
    const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;
    const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(saved.sql,sql);assert.equal(saved.result.rows[0][1],3102);
    await page.locator('#sql').fill('SELECT missing_column FROM rides');await page.locator('#run').click();await page.waitForFunction(()=>document.getElementById('query-status').textContent.includes('Query error:'));
    assert(await page.locator('#evidence').isHidden());
    await page.locator('#restore').click();await page.locator('#run').click();await page.locator('#evidence').waitFor({state:'visible'});
    const response=await page.request.post('http://127.0.0.1:8770/api/query',{data:{sql:'DELETE FROM rides'}});assert.equal(response.status(),400);
    const malformed=await page.request.post('http://127.0.0.1:8770/api/query',{data:[]});assert.equal(malformed.status(),400);
   }
   await page.setViewportSize({width:390,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile page fits');
   await page.locator('#case').selectOption('3');await page.locator('#run').click();await page.locator('#evidence').waitFor({state:'visible'});
   assert(await page.locator('#chart').evaluate(e=>e.scrollWidth>e.clientWidth));
   await page.locator('#case-panel').screenshot({path:path.join(output,live?'phone-live.png':'phone-preview.png')});
   await page.setViewportSize({width:1440,height:1100});
  }
  await page.goto('http://127.0.0.1:8770/slides/index.html');
  assert.equal(await page.locator('#catalog .lecture').count(),12);assert.equal(await page.locator('#bonus-catalog .lecture').count(),3);
  assert.equal(await page.locator('#catalog .lecture').nth(6).getAttribute('href'),'lecture-10.html');
  await page.goto('http://127.0.0.1:8770/slides/lecture-07.html?guide=1');assert((await page.locator('.intro').textContent()).includes('Optional bonus'));
  assert.deepEqual(errors,[]);console.log('Live and saved query workflows, charts, notes, exports, error recovery, mobile, and reordered deck catalog pass. Screenshots: '+output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
