'use strict';
// Optional regression checks: Playwright + Chromium. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE
// to use an installed browser; HNSW_SLIDE_QA_OUTPUT selects the screenshot directory.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'slides/lecture-11.html')).href;
const output=process.env.HNSW_SLIDE_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'hnsw-slides-'));
fs.mkdirSync(output,{recursive:true});
const close=(actual,expected,message,tolerance=1e-7)=>assert(Math.abs(actual-expected)<=tolerance,message);
const distance=(a,b)=>Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
const edgeKey=(layer,[a,b])=>`hw-${layer}-edge-${a}-${b}`;
const pairKey=([a,b])=>[a,b].sort((x,y)=>x-y).join('-');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  await context.route(/^https?:\/\//,route=>route.abort());
  context.on('page',p=>p.on('pageerror',error=>errors.push(error.message)));
  const page=await context.newPage();await page.goto(url);await page.waitForFunction(()=>window.CoursePlayer&&window.HNSWWalkthrough);
  const scene=await page.evaluate(()=>{const index=CoursePlayer.deck.scenes.findIndex(s=>s.id==='navigate-a-graph'),s=CoursePlayer.deck.scenes[index];return {index,id:s.id,steps:s.steps,minutes:s.minutes,states:s.states,teaching:s.teaching,total:CoursePlayer.deck.scenes.reduce((n,s)=>n+s.minutes,0)};});
  assert.equal(scene.index,9);assert.equal(scene.steps,10);assert.equal(scene.minutes,3);assert.equal(scene.total,60);
  assert.equal(scene.teaching.builds.length,10);assert.equal(scene.teaching.checks.length,10);
  const fixture=await page.evaluate(()=>{const f=HNSWWalkthrough;return {nodes:f.nodes,centroids:f.centroids,edges:f.edges,upperNodes:f.upperNodes,upperEdges:f.upperEdges,query:f.query};});
  async function go(step){await page.evaluate(({slide,step})=>location.hash=`s=${slide+1}&b=${step+1}`,{slide:scene.index,step});await page.waitForFunction(({slide,step})=>CoursePlayer.getState().slide===slide&&CoursePlayer.getState().step===step,{slide:scene.index,step});}
  await go(0);
  const popup=page.waitForEvent('popup');await page.locator('#presenter').click();const notes=await popup;await notes.locator('.teaching-current').waitFor();await page.bringToFront();
  const frames=[];
  for(let step=0;step<10;step++){
   await go(step);
   const frame=await page.locator('#canvas').evaluate(svg=>{
    const elements=Object.fromEntries([...svg.querySelectorAll('[data-key]')].map(e=>[e.dataset.key,{tag:e.tagName,text:e.textContent,...Object.fromEntries([...e.attributes].map(a=>[a.name,a.value]))}]));
    const texts=[...svg.querySelectorAll('text')].filter(e=>e.textContent.trim()).map(e=>{const b=e.getBBox();return {key:e.dataset.key,x:b.x,y:b.y,w:b.width,h:b.height};}),overlaps=[];
    for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i],b=texts[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>3&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>3)overlaps.push([a.key,b.key]);}
    return {elements,overlaps,outside:texts.filter(t=>t.x<4||t.y<4||t.x+t.w>1276||t.y+t.h>716),svg:svg.outerHTML};
   });
   assert.deepEqual(frame.outside,[],`build ${step+1}: labels fit the slide`);assert.deepEqual(frame.overlaps,[],`build ${step+1}: labels do not overlap`);
   assert.equal(await page.locator('#canvas desc').textContent(),scene.states[step]);
   await notes.waitForFunction(({slide,step})=>CoursePlayer.getState().slide===slide&&CoursePlayer.getState().step===step,{slide:scene.index,step});
   assert.equal((await notes.locator('.teaching-current p:not(.build)').allTextContents()).join('\n\n'),scene.teaching.builds[step]);
   assert((await notes.locator('.teaching-question').innerText()).includes(scene.teaching.checks[step].question));
   assert.equal(await notes.locator('.teaching-answer p').textContent(),scene.teaching.checks[step].answer);
   assert.deepEqual(await notes.locator('#presenter-canvas text').allTextContents(),await page.locator('#canvas text').allTextContents());
   frames.push(frame);await page.locator('#canvas').screenshot({path:path.join(output,`build-${step+1}.png`)});
  }
  const position=(frame,id,upper=false)=>{const e=frame.elements[`hw-${upper?'upper':'node'}-${id}`];return {x:Number(e.cx),y:Number(e.cy)};};
  const nodeIds=fixture.nodes.map(n=>n.id);
  for(const [step,frame]of frames.entries()){
   assert.deepEqual(Object.keys(frame.elements).filter(k=>/^hw-node-v\d+$/.test(k)).sort(),nodeIds.map(id=>'hw-node-'+id).sort(),'all builds preserve the same stored vector IDs');
   for(const node of fixture.nodes)assert.equal(frame.elements['hw-node-label-'+node.id].text,node.id);
   assert.equal(Object.keys(frame.elements).filter(k=>/^hw-centroid-c\d+$/.test(k)).length,step===0?fixture.centroids.length:0,'centroid diamonds occur only in the introductory IVF view');
   if(step<4)for(const node of fixture.nodes)assert.deepEqual(position(frame,node.id),position(frames[0],node.id),'the plot overlay leaves vectors fixed');
  }
  // Derive the plot transformation from rendered vector positions, then check its
  // equal scales and all centroid means without using production math helpers.
  const first=fixture.nodes[0],last=fixture.nodes.at(-1),high=fixture.nodes[4],a=position(frames[0],first.id),b=position(frames[0],last.id),c=position(frames[0],high.id);
  const sx=(b.x-a.x)/(last.x-first.x),sy=(c.y-a.y)/(high.y-first.y),tx=a.x-sx*first.x,ty=a.y-sy*first.y;
  close(Math.abs(sx),Math.abs(sy),'plot uses equal scales on both axes');
  const project=n=>({x:tx+sx*n.x,y:ty+sy*n.y});
  for(const node of fixture.nodes){const actual=position(frames[0],node.id),expected=project(node);close(actual.x,expected.x,'plotted x matches vector coordinate');close(actual.y,expected.y,'plotted y matches vector coordinate');}
  for(const center of fixture.centroids){
   const members=center.members.map(i=>fixture.nodes[i]),mean={x:members.reduce((n,p)=>n+p.x,0)/members.length,y:members.reduce((n,p)=>n+p.y,0)/members.length},expected=project(mean);
   close(center.x,mean.x,'centroid x is the group mean');close(center.y,mean.y,'centroid y is the group mean');
   const values=frames[0].elements['hw-centroid-'+center.id].d.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=values.filter((_,i)=>i%2===0),ys=values.filter((_,i)=>i%2===1);
   close(xs.reduce((n,x)=>n+x,0)/xs.length,expected.x,'rendered centroid x matches mean');close(ys.reduce((n,y)=>n+y,0)/ys.length,expected.y,'rendered centroid y matches mean');
   const label=Object.values(frames[0].elements).find(e=>e.tag==='text'&&e.text.startsWith(center.id+' = ('));
   const shown=label.text.match(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/).slice(1).map(Number);
   close(shown[0],mean.x,'centroid coordinate label rounds computed x',0.005);close(shown[1],mean.y,'centroid coordinate label rounds computed y',0.005);
  }
  const candidates=Object.entries(frames[1].elements).filter(([key])=>/^hw-candidate-distance-\d+$/.test(key));
  assert.equal(candidates.length,3,'candidate comparison contains three numeric distances');
  for(const [key,element]of candidates)close(Number(element.text),distance(fixture.nodes[4],fixture.nodes[Number(key.split('-').at(-1))]),'candidate distance uses original coordinates',0.005);
  function verifyEdges(frame,edges,layer){
   const actual=Object.keys(frame.elements).filter(k=>k.startsWith(`hw-${layer}-edge-`)).sort();assert.deepEqual(actual,edges.map(edge=>edgeKey(layer,edge)).sort(),`${layer} adjacency stays consistent`);
   for(const edge of edges){const element=frame.elements[edgeKey(layer,edge)],from=position(frame,fixture.nodes[edge[0]].id,layer==='upper'),to=position(frame,fixture.nodes[edge[1]].id,layer==='upper');
    const values=element.tag==='line'?[Number(element.x1),Number(element.y1),Number(element.x2),Number(element.y2)]:element.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    close(values[0],from.x,'edge starts at correct node x');close(values[1],from.y,'edge starts at correct node y');close(values.at(-2),to.x,'edge ends at correct node x');close(values.at(-1),to.y,'edge ends at correct node y');
   }
  }
  verifyEdges(frames[1],fixture.edges.filter(edge=>edge.includes(4)),'base');
  for(let step=2;step<10;step++)verifyEdges(frames[step],fixture.edges,'base');
  for(let step=3;step<10;step++){
   verifyEdges(frames[step],fixture.upperEdges,'upper');
   assert.deepEqual(Object.keys(frames[step].elements).filter(k=>/^hw-upper-v\d+$/.test(k)).sort(),fixture.upperNodes.map(i=>'hw-upper-'+fixture.nodes[i].id).sort(),'upper nodes are a subset of the same stored IDs');
  }
  for(let step=4;step<10;step++)for(const i of fixture.upperNodes){
   const line=frames[step].elements['hw-same-node-'+i],top=position(frames[step],fixture.nodes[i].id,true),bottom=position(frames[step],fixture.nodes[i].id);
   assert(line['stroke-dasharray'],'same-vector connectors are dashed');close(Number(line.x1),top.x,'vertical line uses upper node ID');close(Number(line.x2),bottom.x,'vertical line uses identical base node ID');assert(Number(line.y1)>top.y&&Number(line.y2)<bottom.y,'connector lies between the two copies');
  }
  const route=[];
  for(let step=4;step<10;step++){
   const match=frames[step].elements['hw-query-distance'].text.match(/distance\(q, v(\d+)\) = (\d+\.\d+)/);assert(match,'query distance names a stored node');
   const node=Number(match[1]),actual=distance(fixture.query,fixture.nodes[node]);close(Number(match[2]),actual,'query distance uses original vector coordinates',0.005);route.push({node,distance:actual});
  }
  assert.deepEqual(route.map(p=>p.node),[0,2,5,5,4,4],'route includes upper hops, same-ID descent, then a base hop');
  for(let i=1;i<route.length;i++){
   if(route[i].node===route[i-1].node)close(route[i].distance,route[i-1].distance,'descent does not change vector distance');
   else{assert(route[i].distance<route[i-1].distance,'each highlighted hop improves query distance');assert((i<3?fixture.upperEdges:fixture.edges).some(edge=>pairKey(edge)===pairKey([route[i-1].node,route[i].node])),'highlighted hop uses an actual saved edge');}
  }
  assert.deepEqual(Object.keys(frames[9].elements).filter(k=>/^hw-candidate-\d+$/.test(k)).sort(),['hw-candidate-3','hw-candidate-4','hw-candidate-5']);
  // Animate the same SVG nodes from the plot into layer rows, rather than replacing them.
  await page.emulateMedia({reducedMotion:'no-preference'});await go(3);await page.waitForTimeout(600);
  await page.evaluate(()=>{window.hnswAnimatedNode=document.querySelector('[data-key="hw-node-v0"]');window.hnswAnimatedUpper=document.querySelector('[data-key="hw-upper-v0"]');window.hnswPreviousY=hnswAnimatedNode.getAttribute('cy');});
  await go(4);await page.waitForFunction(()=>document.querySelector('[data-key="hw-node-v0"]').getAttribute('cy')!==hnswPreviousY);
  assert(await page.evaluate(()=>hnswAnimatedNode===document.querySelector('[data-key="hw-node-v0"]')&&hnswAnimatedUpper===document.querySelector('[data-key="hw-upper-v0"]')),'projection-to-layer transition preserves vector DOM objects');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const viewport of [{width:1024,height:768},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   for(let step=0;step<10;step++){await go(step);const bounds=await page.locator('#canvas').boundingBox();assert(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,'complete slide fits responsive viewport');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'responsive slide has no horizontal page overflow');}
   await page.screenshot({path:path.join(output,`viewport-${viewport.width}.png`)});
  }
  const guide=await context.newPage();await guide.goto(url+'?guide=1');const article=guide.locator('article').nth(scene.index),guideText=await article.innerText();
  for(const cue of scene.teaching.builds)for(const paragraph of cue.split(/\n\s*\n|\n/))assert(guideText.includes(paragraph),'guide contains every construction and search cue paragraph');
  await guide.emulateMedia({media:'print'});assert(await article.locator('svg').isVisible(),'print retains the graph visual');await article.screenshot({path:path.join(output,'guide.png')});
  const gallery=await context.newPage();await gallery.setViewportSize({width:1800,height:1800});await gallery.setContent('<body style="margin:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#e8ede6;font:18px system-ui">'+frames.map((frame,i)=>'<article><h3>'+(i+1)+' · '+scene.states[i]+'</h3>'+frame.svg.replace('id="canvas"','style="display:block;width:100%;background:#f7f6f2"')+'</article>').join(''));
  await gallery.screenshot({path:path.join(output,'all-builds.png'),fullPage:true});
  assert.deepEqual(errors,[],'audience, presenter, and guide produce no browser errors');
  console.log(`Ten HNSW builds: fixed vector IDs, centroid means, distances, consistent adjacency, valid improving route, same-ID layer changes, node-preserving animation, presenter/guide, and responsive/offline operation pass. Screenshots: ${output}`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
