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
assert.equal(slides,234);assert.equal(builds,864);
const resources=decks[10].scenes.at(-1);
assert.equal(resources.id,'more-models-with-duckdb');
const resourceLinks=V.sceneDrawing(resources,0).filter(item=>item.tag==='a');
assert.equal(resourceLinks.length,4,'final slide exposes three resources and the optional lab');
assert(resourceLinks.some(item=>item.attrs.href==='../labs/lab-08/duckdb.html#pytorch'));
assert(resourceLinks.some(item=>item.attrs.href==='https://duckdb.org/community_extensions/extensions/ml'));
assert(resourceLinks.some(item=>item.attrs.href.includes('python-udf')));
assert(resourceLinks.some(item=>item.attrs.href==='https://arxiv.org/abs/2312.17355'));
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
const storageOrder=['the-analytics-stack','the-workload-rotates','read-a-row-layout','read-a-column-layout','the-point-lookup-reverses-it','parquet-is-a-file-format','compression'];
assert.deepEqual(Array.from(decks[10].scenes.slice(0,7),s=>s.id),storageOrder);
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
// The batch example preserves the microdb query result and reveals each stage in order.
const batchScene=decks[10].scenes.find(s=>s.id==='batches-through-the-pipeline');
assert.equal(batchScene.steps,6);
assert.equal(decks[10].scenes[9].id,batchScene.id);
const fares=taxiRides.map(r=>Number(r[2].slice(1))),matchingFares=fares.filter(f=>f>25);
for(let step=0;step<6;step++) {
 const items=draw(10,batchScene.id,step);
 assert.equal(text(items,'pipeline-query'),'SELECT fare FROM rides WHERE fare > 25;');
 assert.equal(text(items,'row-operator-0-name'),'TableScan');
 assert.equal(text(items,'row-operator-1-name'),'SelectScan');
 assert.equal(text(items,'row-operator-2-name'),'ProjectScan');
 assert.equal(items.some(a=>a.key==='batch-operator-0-value'),step>=3);
 if(step>=3) {
  assert.equal(text(items,'batch-operator-0-value'),'['+fares.join(', ')+']');
  assert.equal(text(items,'batch-operator-1-value'),step>=4?'['+fares.map(f=>f>25?'keep':'drop').join(', ')+']':'—');
  assert.equal(text(items,'batch-operator-2-value'),step===5?'['+matchingFares.join(', ')+']':'—');
 }
}
assert.equal(text(draw(10,batchScene.id,1),'row-operator-2-value'),'get_val: '+matchingFares[0]);
assert.equal(text(draw(10,batchScene.id,2),'row-operator-2-value'),'get_val: '+matchingFares[1]);
assert.match(text(draw(10,batchScene.id,2),'row-operator-1-value'),/24 fails; 30 passes/);
assert.match(batchScene.notes,/one row per successful call does not mean one disk read/);
// The file-format introduction preserves the opening's data and separates storage from computation.
for(let step=0;step<4;step++) {
 const items=draw(10,'parquet-is-a-file-format',step);
 assert.equal(text(items,'parquet-filename'),'rides.parquet');
 assert.equal(items.some(a=>a.key==='parquet-answer-label'),step===3,'predict the result before revealing it');
 if(step>=1)taxiRides.forEach((ride,r)=>ride.forEach((value,f)=>assert.equal(text(items,'parquet-value-'+r+'-'+f),value)));
 if(step>=2) {
  assert.equal(text(items,'parquet-engine-label'),'DuckDB runs AVG(fare)');
  for(let f=0;f<3;f++)assert.equal(items.find(a=>a.key==='parquet-chunk-'+f).attrs.fill===V.palette.greenLight,f===2);
 }
}
assert.equal(text(draw(10,'parquet-is-a-file-format',3),'parquet-answer-label'),'Answer: $30');
// Pruning keeps only the December files; a folder represents the partition in this example.
for(let step=0;step<3;step++) {
 const items=draw(10,'skip-eleven-partitions',step);
 for(let month=0;month<12;month++) {
  assert.equal(text(items,'month-folder-'+month+'-name'),'month='+String(month+1).padStart(2,'0'));
  assert.equal(text(items,'month-status-'+month),step===0?'ride data':month!==11?'skip':step===2?'read fare only':'open');
 }
 assert.match(text(items,'partition-role'),/Partition = group of rows/);
}
// The grid keeps all values, one column, then one month's column, without changing cell size.
const byteScene=decks[10].scenes.find(s=>s.id==='predict-the-byte-ratio');
assert.equal(byteScene.steps,6);
const squareBytes=60000/12*8,allBytes=60000*12*8;
assert.equal(allBytes/squareBytes,144);
for(let step=0;step<6;step++) {
 const items=draw(10,byteScene.id,step),cells=items.filter(a=>/^payload-month-\d+-column-\d+$/.test(a.key));
 assert.equal(cells.length,144);
 const active=cells.filter(a=>a.attrs.fill!==V.palette.white);
 assert.equal(active.length,[0,144,12,1,1,1][step]);
 if(step===2)assert(active.every(a=>a.key.endsWith('-column-0')),'keep fare across all months');
 if(step>=3)assert.equal(active[0].key,'payload-month-11-column-0','keep only December fares');
 assert(cells.every(a=>a.attrs.width===34&&a.attrs.height===22),'equal-sized squares make the fraction visible');
 if(step>=1)assert.equal(text(items,'byte-card-0-bytes'),allBytes/1000000+' MB');
 if(step>=2)assert.equal(text(items,'byte-card-1-bytes'),60000*8/1000+' KB');
 if(step>=3)assert.equal(text(items,'byte-card-2-bytes'),squareBytes/1000+' KB');
 assert.equal(items.some(a=>a.key==='byte-ratio'),step===5,'pause for prediction before revealing the ratio');
 assert.match(text(items,'byte-caveat'),/not a speed ratio/);
}
assert.equal(text(draw(10,byteScene.id,5),'byte-ratio'),'5,760 KB ÷ 40 KB = 144');
// Project the reading's actual SQL, with the same train/test boundary and delayed results.
const mlReading=fs.readFileSync(path.join(root,'lectures/lecture-10/analytics.html'),'utf8').split('<h2 id="in-database-ml">')[1];
const normalizeSQL=sql=>sql.replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const sqlOnSlide=(id,step)=>draw(10,id,step).filter(a=>/^ml-sql-line-\d+$/.test(a.key)).map(a=>a.text).join('\n');
const mlTrain='train-inside-the-query-engine',mlScore='evaluate-and-apply-the-model';
assert.deepEqual(Array.from(decks[10].scenes.slice(16,20),s=>s.id),[mlTrain,mlScore,'duckdb-pytorch-fare-model','managed-model-sql']);
for(const [id,step] of [[mlTrain,0],[mlScore,0],[mlScore,3],[mlScore,4],['managed-model-sql',0],['managed-model-sql',1],['managed-model-sql',2]]) {
 const sql=sqlOnSlide(id,step);
 assert(normalizeSQL(mlReading).includes(normalizeSQL(sql)),'projected query matches analytics.html: '+id+'/'+step);
}
for(let step=0;step<5;step++) {
 const items=draw(10,mlTrain,step);
 assert.equal(sqlOnSlide(mlTrain,step),sqlOnSlide(mlTrain,0),'training query stays visible throughout the trace');
 assert.equal(items.some(a=>a.key==='ml-model-1-0-text'),step>=3,'reveal fitted model after the aggregates');
 assert.equal(items.some(a=>a.key==='ml-learned-line'),step===4);
}
assert.equal(text(draw(10,mlTrain,3),'ml-model-1-0-text'),'3');
assert.equal(text(draw(10,mlTrain,3),'ml-model-1-1-text'),'2');
assert.equal(text(draw(10,mlTrain,3),'ml-model-1-2-text'),'4');
for(const [r,distance,fare] of [[1,2.5,9],[2,4.5,11]]) {
 const items=draw(10,mlScore,2);
 assert.equal(Number(text(items,'ml-test-'+r+'-2-text')),3+2*distance);
 assert.equal(Number(text(items,'ml-test-'+r+'-1-text')),fare);
 assert.equal(text(draw(10,mlScore,1),'ml-test-'+r+'-2-text'),'?');
}
assert.equal(text(draw(10,mlScore,4),'ml-new-1-1-text'),'?');
assert.equal(Number(text(draw(10,mlScore,5),'ml-new-1-1-text')),3+2*3.5);
assert.match(text(draw(10,mlScore,3),'ml-error-result'),/\$1$/);
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
assert(!decks[10].scenes.some(s=>s.id==='analytical-workload'),'monthly running-total scene is removed');
assert.equal(decks[10].scenes[6].title,'Lossless compression');
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
