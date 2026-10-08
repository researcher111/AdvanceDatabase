'use strict';
// Run with node tests/test_slide_clarity.js. Browser layout is checked separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context=vm.createContext({window:{},console});
const load=file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
['slides/_shared/visuals.js','labs/_shared/rag-measurements.js','labs/_shared/teaching-traces.js','slides/_shared/trace-scenes.js','slides/decks/lectures-01-05.js','slides/decks/lectures-06-10.js','slides/decks/lectures-11-15.js','slides/decks/teaching-notes.js','slides/decks/storage-choices.js','slides/decks/btree-growth.js','slides/decks/btree-clarity.js'].forEach(load);
const {COURSE_DECKS:decks,DeckViz:V,CourseTraces:{fixtures,models}}=context.window;
const before=JSON.stringify(Object.values(decks).map(d=>[d.id,d.scenes.map(s=>[s.id,s.steps,s.minutes])]));
const original6=JSON.stringify(decks[6].scenes.map(s=>Array.from({length:s.steps},(_,i)=>V.sceneDrawing(s,i))));
['clarity-captions','clarity-layout','clarity-diagrams','course-clarity'].forEach(f=>load('slides/decks/'+f+'.js'));
assert.equal(JSON.stringify(Object.values(decks).map(d=>[d.id,d.scenes.map(s=>[s.id,s.steps,s.minutes])])),before,'stable scene IDs, pacing, and build count');
assert.equal(JSON.stringify(decks[6].scenes.map(s=>Array.from({length:s.steps},(_,i)=>V.sceneDrawing(s,i)))),original6,'approved Lecture 6 stays unchanged');
let slides=0,builds=0;
for(const deck of Object.values(decks)){
 if(deck.id===6)continue;
 const html=fs.readFileSync(path.join(root,'slides/lecture-'+String(deck.id).padStart(2,'0')+'.html'),'utf8');
 assert(html.indexOf('decks/course-clarity.js')>html.indexOf('decks/teaching-notes.js'));
 assert(html.indexOf('decks/course-clarity.js')<html.indexOf('_shared/deck.js'));
 for(const scene of deck.scenes){
  const transforms=new Map();
  for(let step=0;step<scene.steps;step++){
   const items=V.sceneDrawing(scene,step),captions=items.filter(i=>i.key.startsWith('clarity-caption-'));
   assert(captions.length>=1&&captions.length<=2,'a caption fits in two lines');
   assert.equal(captions.map(i=>i.text).join(' '),scene.clarityCaptions[step]);
   assert(scene.teaching.builds[step].startsWith(scene.clarityCaptions[step]),'notes explain the visible state first');
   assert.equal(new Set(items.map(i=>i.key)).size,items.length,'unique animation keys');
   for(const item of items){
    const transform=item.attrs.transform;if(!transform)continue;
    if(transforms.has(item.key))assert.equal(transform,transforms.get(item.key),'fixed layout across builds');
    transforms.set(item.key,transform);
    const scale=Number(/scale\(([^)]+)\)/.exec(transform)[1]);
    if(item.tag==='text')assert(item.attrs['font-size']*scale>=17.99,'readable effective label size');
   }
   builds++;
  }
  slides++;
 }
}
assert.equal(slides,231);assert.equal(builds,843);
const draw=(lecture,id,step)=>V.sceneDrawing(decks[lecture].scenes.find(s=>s.id===id),step);
const text=(items,key)=>{const a=items.find(i=>i.key===key);assert(a,'missing '+key);return a.text;};
const strings=items=>items.filter(i=>i.tag==='text').map(i=>i.text).join('\n');
// The lecture opens with the reading's taxi example and delays the answer.
const opening=decks[10].scenes[0];
assert.equal(opening.id,'the-analytics-stack');
assert.equal(opening.title,'Same rides, two storage layouts');
const taxiRides=[['JFK','card','$36'],['LGA','card','$24'],['JFK','cash','$30']];
for(let step=0;step<5;step++) {
 const items=draw(10,opening.id,step);
 for(const side of ['row','column'])taxiRides.forEach((ride,r)=>ride.forEach((value,f)=>{
  const key=side+'-ride-'+r+'-field-'+f;
  assert.equal(text(items,key+'-value'),value,'both layouts retain the same ride data');
  assert.equal(items.find(a=>a.key===key).attrs.fill===V.palette.greenLight,step>=3&&f===2,'highlight only the fares at the query step');
 }));
 assert.equal(items.some(a=>a.key==='storage-average'),step===4,'let the class predict before the answer');
}
assert.match(text(draw(10,opening.id,4),'storage-average'),/\$30$/);
// Row 2 uses slot/position 1; gather that ordinal across columns without mixing rows.
const slotScene=decks[10].scenes[1];
assert.equal(slotScene.id,'the-workload-rotates');
assert.equal(slotScene.title,'Row slots and column positions');
for(let step=0;step<5;step++) {
 const items=draw(10,slotScene.id,step);
 taxiRides.forEach((ride,r)=>ride.forEach((value,f)=>{
  const rowKey='row-slot-'+r+'-field-'+f,colKey='chunk-'+f+'-position-'+r;
  assert.equal(text(items,rowKey+'-label'),value);
  assert.equal(text(items,colKey+'-label'),value);
  assert.equal(items.find(a=>a.key===rowKey).attrs.fill===V.palette.orangeLight,step>=1&&r===1);
  assert.equal(items.find(a=>a.key===colKey).attrs.fill===V.palette.blueLight,r===1&&step>=f+2);
 }));
 if(step>=2)assert.equal(text(items,'reconstructed-label'),'Ride 2:  '+taxiRides[1].map((v,i)=>step>=i+2?v:'?').join('   |   '));
 else assert(!items.some(a=>a.key==='reconstructed-label'));
}
// Storage examples hold data and the answer fixed; only grouping and needed fields differ.
const storageOrder=['the-analytics-stack','the-workload-rotates','read-a-row-layout','read-a-column-layout','the-point-lookup-reverses-it','analytical-workload'];
assert.deepEqual(Array.from(decks[10].scenes.slice(0,6),s=>s.id),storageOrder);
for(const [id,column] of [['read-a-row-layout',false],['read-a-column-layout',true]]) {
 for(let step=0;step<3;step++) {
  const items=draw(10,id,step);
  taxiRides.forEach((ride,r)=>ride.forEach((value,f)=>{
   const key='scan-ride-'+r+'-field-'+f;
   assert.equal(text(items,key+'-label'),value);
   const fill=items.find(a=>a.key===key).attrs.fill;
   assert.equal(fill===V.palette.greenLight,step>0&&f===2,'only fares contribute to the average');
   assert.equal(fill===V.palette.orangeLight,step>0&&!column&&f!==2,'only row layout highlights unused neighbors');
  }));
  assert.equal(items.some(a=>a.key==='fare-average-label'),step===2,'predict before revealing the average');
 }
 assert.equal(text(draw(10,id,2),'fare-average-label'),'Average = $30');
}
for(let step=0;step<3;step++) {
 const items=draw(10,'the-point-lookup-reverses-it',step);
 for(const side of ['one','many'])taxiRides.forEach((ride,r)=>ride.forEach((value,f)=>{
  const key=side+'-ride-'+r+'-field-'+f;
  assert.equal(text(items,key+'-label'),value);
  const fill=items.find(a=>a.key===key).attrs.fill;
  assert.equal(fill===V.palette.orangeLight,side==='one'&&r===1&&step!==1,'complete-ride query needs one row');
  assert.equal(fill===V.palette.greenLight,side==='many'&&f===2&&step!==0,'average query needs fares from every row');
 }));
}
// Recovery must replay changes backward, preserving committed work, and flush last.
let value=10;const finished=new Set(),restored=[];
for(const rec of fixtures.undoLog.slice().reverse()){
 if(rec.kind==='COMMIT')finished.add(rec.tx);
 else if(rec.kind==='SET_INT'&&!finished.has(rec.tx)){value=rec.old;restored.push(value);}
}
assert.deepEqual(restored,[40,60]);
[10,...restored,60,60,60].forEach((v,i)=>assert.equal(text(draw(7,'two-writes-reverse-undo',i),'page-detail'),String(v)));
assert.match(text(draw(7,'two-writes-reverse-undo',1),'durable-page-heading'),/buffer/);
assert.match(text(draw(7,'two-writes-reverse-undo',5),'mechanism-foot'),/Flush.*then.*ROLLBACK/);
// Row flow and grouping preserve the input records and result grain.
assert.match(strings(draw(1,'lecture-01-scene-03',4)),/Storage reads: 2.*Rows tested: 6.*Names returned: 3/);
assert.equal(text(draw(2,'lecture-02-scene-03',2),'frame-0-detail'),'contains block 8');
assert.equal(text(draw(3,'lecture-03-scene-07',3),'flag'),'1');
const product=[];for(let i=1;i<=4;i++)product.push(text(draw(4,'lecture-04-scene-09',i),'pair-label'));
assert.deepEqual(product,['(ada, ds)','(ada, stat)','(ada, econ)','(ben, ds)']);
for(let i=0;i<4;i++)assert.equal(text(draw(10,'analytical-workload',1),'trip-'+i+'-label'),String(fixtures.rides[i][1]+fixtures.rides[i][2]));
assert.equal(text(draw(10,'analytical-workload',4),'run2'),'running = '+fixtures.monthly.reduce((s,r)=>s+r[1],0));
assert.match(strings(draw(9,'price-the-work',2)),new RegExp('= '+models.cost(100).index+' page accesses'));
assert.match(strings(draw(9,'price-the-work',3)),/= 2,003 page accesses/);
assert.match(strings(draw(9,'price-the-work',4)),/Equal cost at 0.997%/);
assert.equal(text(draw(8,'statement-or-transaction-snapshot',3),'rc-detail'),'120');
assert.equal(text(draw(8,'statement-or-transaction-snapshot',3),'rr-detail'),'100');
// IVF cannot return an unprobed vector. Exact recall and work are separate.
assert.equal(models.ivf(1).result.length,1);
assert.match(text(draw(11,'probe-the-lists',2),'result'),/only v0/);
assert.match(text(draw(11,'probe-the-lists',3),'recall'),/1 \/ 2/);
assert.match(text(draw(11,'probe-the-lists',4),'result'),/v1 \(0.96\), v0 \(0.80\)/);
assert.match(text(draw(11,'probe-the-lists',4),'work'),/2 centroids \+ 4 vectors = 6/);
fixtures.chunks.forEach((c,i)=>assert.equal(text(draw(12,'keep-the-source-identity',4),'chunk-body-'+i),c.text));
assert.match(strings(draw(12,'keep-the-source-identity',3)),/\[wal, blocks, wal\]/);
const counts={};fixtures.mapped.forEach(([word,value])=>counts[word]=(counts[word]||0)+value);
for(const [word,total]of Object.entries(counts))assert.equal(text(draw(13,'reduce-sees-the-complete-group',3),word+'-total-label'),word+' = '+total);
// Stable keys move word occurrences intact across the shuffle.
const pairs=step=>draw(13,'reduce-sees-the-complete-group',step).filter(a=>/^pair-\d+-label$/.test(a.key));
assert.deepEqual(pairs(1).map(a=>[a.key,a.text]),pairs(2).map(a=>[a.key,a.text]));
assert(pairs(1).some((a,i)=>a.attrs.y!==pairs(2)[i].attrs.y));
assert.match(strings(draw(14,'read-the-newest-visible-value',3)),/Merged output keeps DELETE @ 9/);
assert.match(strings(draw(14,'read-the-newest-visible-value',3)),/SSTable C \(flushed\)/);
assert.match(strings(draw(14,'read-the-newest-visible-value',4)),/no active snapshot needs them/);
// Independent traversal counts expose the difference between walks and BFS.
let paths=['ada'],walks=0,frontier=['ada'],visited=new Set(frontier),edgeVisits=0;
for(let depth=1;depth<=3;depth++){
 paths=paths.flatMap(v=>fixtures.edges[v]);walks+=paths.length;
 const next=[];for(const v of frontier)for(const n of fixtures.edges[v]){edgeVisits++;if(!visited.has(n)){visited.add(n);next.push(n);}}frontier=next;
}
assert.equal(walks,11);assert.equal(edgeVisits,8);assert.equal(visited.size-1,5);
assert.match(strings(draw(15,'paths-are-not-unique-vertices',3)),/8 edges examined/);
assert.match(strings(draw(15,'paths-are-not-unique-vertices',4)),/11 walk rows[\s\S]*5 unique people/);
console.log(`${slides} clarified slides, ${builds} captions; fixture results, animation identity, and unchanged Lecture 6 pass.`);
