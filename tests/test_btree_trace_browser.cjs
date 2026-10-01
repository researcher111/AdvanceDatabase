'use strict';
// Optional: Playwright + Chromium. No network services or Python runtime needed.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {examples}=require('../labs/_shared/teaching-traces.js');
const ids=['btree-search','btree-child-index','btree-descend','btree-split','btree-range'];
const output=fs.mkdtempSync(path.join(os.tmpdir(),'btree-code-trace-'));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
  let states=0;
  for(const filename of ['lectures/lecture-06/btrees.html','labs/lab-06/btree.html']){
   await page.goto(pathToFileURL(path.resolve(__dirname,'..',filename)).href);
   const root=page.locator('[data-teaching-trace]');await root.waitFor();
   for(const id of ids){
    await root.locator('select').selectOption(id);
    const example=examples[id];
    for(let step=0;step<example.frames.length;step++){
     const frame=example.frames[step];states++;
     assert.equal(await root.getAttribute('data-trace-step'),String(step));
     assert.equal(await root.locator('.trace-tree-result').textContent(),frame.tree.result);
     assert.deepEqual(await root.locator('.trace-active code').allTextContents(),frame.lines.map(n=>example.code[n-1]));
     assert.equal(await root.locator('svg title').textContent(),example.title+' — '+frame.label);
     assert.equal(await root.locator('[data-node]').count(),frame.tree.nodes.length);
     for(const node of frame.tree.nodes){
      assert.deepEqual(await root.locator(`[data-node="${node.id}"] .trace-tree-key`).allTextContents(),node.keys.map(String));
      assert.equal(await root.locator(`[data-node="${node.id}"]`).evaluate(e=>e.classList.contains('is-active')),frame.tree.active.includes(node.id));
     }
     const bounds=await root.locator('svg').evaluate(svg=>{
      const text=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent,box:e.getBBox()}));
      const outside=text.filter(({box:b})=>b.x<0||b.y<0||b.x+b.width>720||b.y+b.height>480).map(e=>e.text);
      const overlaps=[];
      text.forEach((a,i)=>text.slice(i+1).forEach(b=>{
       const x=Math.min(a.box.x+a.box.width,b.box.x+b.box.width)-Math.max(a.box.x,b.box.x);
       const y=Math.min(a.box.y+a.box.height,b.box.y+b.box.height)-Math.max(a.box.y,b.box.y);
       if(x>1&&y>1)overlaps.push([a.text,b.text]);
      }));
      return {outside,overlaps};
     });
     assert.deepEqual(bounds,{outside:[],overlaps:[]},`${filename} ${id} ${step+1}: diagram text fits without overlap`);
     if(step<example.frames.length-1)await root.locator('[data-trace-action=next]').click();
    }
    assert(await root.locator('[data-trace-action=next]').isDisabled());
    await root.locator('.trace-variables summary').click();
    assert(await root.locator('.trace-table').isVisible());
    assert.deepEqual(await root.locator('.trace-table td').allTextContents(),example.frames.at(-1).rows.map(r=>r[1]));
    await root.locator('.trace-variables summary').click();
    if(filename.startsWith('lectures'))await root.screenshot({path:path.join(output,id+'.png')});
    await root.locator('[data-trace-action=previous]').click();
    assert.equal(await root.getAttribute('data-trace-step'),String(example.frames.length-2));
    await root.locator('[data-trace-action=reset]').click();
    assert.equal(await root.getAttribute('data-trace-step'),'0');
    assert(await root.locator('[data-trace-action=previous]').isDisabled());
    await root.locator('[data-trace-action=next]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await root.getAttribute('data-trace-step'),'1');
   }
   await page.setViewportSize({width:390,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone page fits');
   const viewport=root.locator('.trace-tree-viewport');
   assert(await viewport.evaluate(e=>e.scrollWidth>e.clientWidth),'only the diagram scrolls');
   await viewport.evaluate(e=>e.scrollLeft=e.scrollWidth);
   assert(await viewport.evaluate(e=>e.scrollLeft>0),'right leaf is reachable on phone');
   assert(await root.locator('.trace-tree-scroll-hint').isVisible());
   await root.screenshot({path:path.join(output,filename.startsWith('lectures')?'reading-phone.png':'lab-phone.png')});
   await page.setViewportSize({width:1600,height:1100});
  }
  assert.deepEqual(errors,[]);
  console.log(`${states} states across reading and lab: code/tree sync, pointers, text bounds, controls, accessibility, and mobile pass. Screenshots: ${output}`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
