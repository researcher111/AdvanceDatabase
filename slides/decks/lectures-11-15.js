/* Visual teaching decks, lectures 11–15. All geometry is editable SVG.
 * Each lecture is 60 teaching minutes; scheduled quizzes are additional.
 * Numerical examples are illustrative unless notes identify a course measurement. */
(function () {
'use strict';
const P = window.DeckViz.palette;
const D = window.COURSE_DECKS = window.COURSE_DECKS || {};
const mins = [3,4,4,4,3,4,4,4,4,3,4,4,4,4,3,4];
const lecturePacing = {
  // Lecture 12 assigns time from removed slides to evaluation, filtering, and diagnosis discussion.
  12: [3,4,4,4,3,6,4,4,3,4,4,6,4,7],
  // Allow time to trace the write, try the Bloom filter, and run both GoogleSQL queries.
  14: [1,2,3,4,2,3,4,4,5,5,4,6,4,4,5,4]
};
function scene(title, states, draw, notes, extra={}) {
  return Object.assign({id:title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),title,kind:'visual',steps:states.length,states,draw,notes},extra);
}
function register(id,title,date,source,scenes) {
  const pacing=lecturePacing[id] || mins;
  scenes.forEach((s,i)=>{s.minutes=s.minutes || pacing[i];if(!s.sources)s.sources=[source];});
  D[id]={id,title,date,source,scenes};
  window.CourseTraceSlides.apply(D[id]);
}
function token(d,k,x,y,label,color=P.green,r=23){d.circle(k,x,y,r,color);if(label!==undefined)d.text(k+'t',x,y+8,String(label),22,P.white);}
function card(d,k,x,y,label,fill=P.white,w=180,h=82){d.box(k,x,y,w,h,label,fill,P.line,27);}
function paper(d,k,x,y,color=P.white,w=90,h=115){d.rect(k,x,y,w,h,color,P.line,5);for(let i=0;i<4;i++)d.line(k+'l'+i,x+14,y+25+i*20,x+w-14,y+25+i*20,P.line,4);}
function axis(d,k,x,y,w,h,xLabel,yLabel){d.line(k+'x',x,y,x+w,y,P.muted,2);d.line(k+'y',x,y,x,y-h,P.muted,2);d.text(k+'xl',x+w/2,y+48,xLabel,25,P.muted);d.text(k+'yl',x+40,y-h-25,yLabel,25,P.muted,'start');}
function miniTree(d,k,x,y,color=P.green){d.circle(k+'r',x,y,14,color);[[-65,70],[65,70]].forEach(([dx,dy],i)=>{d.line(k+'e'+i,x,y,x+dx,y+dy,color,4);d.circle(k+'n'+i,x+dx,y+dy,13,color);[-24,24].forEach((a,j)=>{d.line(k+'q'+i+j,x+dx,y+dy,x+dx+a,y+dy+52,color,3);d.rect(k+'l'+i+j,x+dx+a-15,y+dy+40,30,26,P.greenLight,color,4);});});}
const VPTS=Array.from({length:72},(_,i)=>{const c=i%6,j=Math.floor(i/6),cx=[230,390,580,750,930,1040][c],cy=[325,470,310,500,315,465][c];return {x:cx+Math.cos(j*2.37+c)*45+(j%3)*8,y:cy+Math.sin(j*2.37+c)*55,c};});
// A small, computed k-means example for the IVF build slide. Stored vectors stay fixed.
const IVF_INITIAL_CENTERS=[[175,370],[445,420],[530,365],[805,450],[875,365],[1095,410]].map(([x,y])=>({x,y}));
function ivfAssignments(centers){
  return VPTS.map(p=>centers.reduce((best,c,i)=>Math.hypot(p.x-c.x,p.y-c.y)<Math.hypot(p.x-centers[best].x,p.y-centers[best].y)?i:best,0));
}
function ivfAverages(centers,assignments){
  return centers.map((center,c)=>{
    const members=VPTS.filter((_,i)=>assignments[i]===c);
    return members.length?{x:members.reduce((sum,p)=>sum+p.x,0)/members.length,y:members.reduce((sum,p)=>sum+p.y,0)/members.length}:center;
  });
}
const IVF_FIRST_ASSIGNMENTS=ivfAssignments(IVF_INITIAL_CENTERS);
const IVF_FIRST_AVERAGES=ivfAverages(IVF_INITIAL_CENTERS,IVF_FIRST_ASSIGNMENTS);
const IVF_LISTS=(()=>{
  let centers=IVF_INITIAL_CENTERS,assignments=IVF_FIRST_ASSIGNMENTS;
  for(let iteration=0;iteration<20;iteration++){
    centers=ivfAverages(centers,assignments);
    const next=ivfAssignments(centers),stable=next.every((c,i)=>c===assignments[i]);
    assignments=next;
    if(stable)break;
  }
  return centers.map((_,c)=>VPTS.map((p,i)=>i).filter(i=>assignments[i]===c));
})();
function buildIVF(d,step){
  if(step===3){
    IVF_LISTS.forEach((ids,c)=>{
      const x=155+c*190;
      d.text('center-label'+c,x,260,'Centroid '+(c+1),24,P.orange);
      d.circle('centroid'+c,x,290,15,P.orange);
      d.arrow('a'+c,x,315,x,350,P.orange);
      ids.slice(0,4).forEach((id,j)=>d.box('list'+c+j,x-55,365+j*53,110,42,'v'+id,P.greenLight,P.green,23));
      d.text('list-count'+c,x,590,Math.min(ids.length,4)+' of '+ids.length+' shown',23,P.muted);
    });
    return;
  }
  if(step>0)VPTS.forEach((p,i)=>{
    const center=IVF_INITIAL_CENTERS[IVF_FIRST_ASSIGNMENTS[i]];
    d.line('assign'+i,p.x,p.y,center.x,center.y,P.line,1.5);
  });
  VPTS.forEach((p,i)=>d.circle('point'+i,p.x,p.y,5,P.green));
  IVF_INITIAL_CENTERS.forEach((center,c)=>{
    d.circle('old-center'+c,center.x,center.y,13,P.white,P.orange,3);
    if(step===2){
      const average=IVF_FIRST_AVERAGES[c],angle=Math.atan2(average.y-center.y,average.x-center.x);
      d.arrow('center-move'+c,center.x+17*Math.cos(angle),center.y+17*Math.sin(angle),average.x-17*Math.cos(angle),average.y-17*Math.sin(angle),P.orange,4);
      d.circle('mean-center'+c,average.x,average.y,13,P.green,P.white,2);
    }
  });
  d.text('ivf-action',640,590,[
    'Small dots: stored vectors · Hollow circles: initial centroids',
    'Assign each vector to its nearest centroid.',
    'Hollow circle: old centroid · Green dot: new centroid at the average'
  ][step],25,step===2?P.ink:P.muted);
}
function vectorCloud(d,step,mode='query'){
  const q={x:495,y:390}, probe=mode==='probe'?Math.min(3,step+1):0;
  [0,1,2,3,4,5].forEach(c=>{if(probe&&[2,1,0].slice(0,probe).includes(c))d.circle('region'+c,[230,390,580,750,930,1040][c],[325,470,310,500,315,465][c],70,P.orangeLight);});
  const ordered=VPTS.map((p,i)=>[Math.hypot(p.x-q.x,p.y-q.y),i]).sort((a,b)=>a[0]-b[0]);
  const truth=new Set(ordered.slice(0,10).map(a=>a[1]));
  VPTS.forEach((p,i)=>{const active=mode==='exact'?i<Math.min(72,step*24):mode==='probe'?[2,1,0].slice(0,probe).includes(p.c):step>0&&truth.has(i);d.circle('point'+i,p.x,p.y,truth.has(i)&&step>0?8:5,active?P.green:P.line,truth.has(i)&&mode==='probe'&&!active?P.red:'none',3);});
  if(mode==='cluster'||mode==='probe')for(let c=0;c<6;c++){d.circle('cent'+c,[230,390,580,750,930,1040][c],[325,470,310,500,315,465][c],13,P.white,P.orange,3);}
  d.path('query',`M${q.x-14},${q.y}H${q.x+14} M${q.x},${q.y-14}V${q.y+14}`,'none',P.ink,4);
  if(mode==='exact')d.text('n',1050,600,Math.min(72,step*24)+' / 72',36,P.orange);
  if(mode==='probe')d.text('p',1020,600,'P = '+probe,36,P.orange);
}
function vectorAngle(d,step){const ox=400,oy=440;d.circle('unit',ox,oy,180,P.white,P.line,2);d.line('x',190,oy,635,oy,P.line,2);d.line('y',ox,250,ox,625,P.line,2);d.arrow('q',ox,oy,ox+161,oy-80.5,P.ink,5);d.text('ql',605,355,'q',31);const a=[-1.3,-.6,.15][step];d.arrow('v',ox,oy,ox+180*Math.cos(a),oy+180*Math.sin(a),P.green,5);d.text('vl',ox+203*Math.cos(a),Math.max(275,oy+203*Math.sin(a)),'v',31,P.green);d.text('f',910,340,'q · v',52);d.text('cos',910,415,'cos θ',35,P.green);d.line('barbase',775,520,1060,520,P.line,18);d.line('bar',775,520,775+285*Math.cos(a+.464),520,P.green,18);}

function hnsw(d,step){const xs=[190,365,545,740,935,1100],base=470;for(let i=0;i<6;i++){if(i<5)d.line('lowe'+i,xs[i],base,xs[i+1],base,P.line,3);d.circle('low'+i,xs[i],base,19,P.white,P.green,2);d.text('id'+i,xs[i],base+52,'v'+i,24);}[[0,2],[2,5]].forEach(([a,b],i)=>d.line('high'+i,xs[a],285,xs[b],285,step>i?P.orange:P.line,4));[0,2,5].forEach(i=>{d.circle('up'+i,xs[i],285,20,P.white,P.orange,3);d.line('down'+i,xs[i],310,xs[i],445,P.line,2,'6 6');});const positions=[[190,285],[545,285],[1100,285],[1100,470],[935,470]];const xy=positions[Math.min(step,4)];token(d,'walker',xy[0],xy[1],undefined,P.orange,13);d.text('star',955,540,'✦',47,P.ink);if(step===5){[740,935,1100].forEach((x,i)=>d.circle('candidate'+i,x,470,35,'none',P.blue,3));}d.text('layer1',115,285,'1',30,P.muted);d.text('layer0',115,475,'0',30,P.muted);}
function recallGrid(d,step){
  const exact=[1,2,3,4,5,6,7,8,9,10],got=[1,2,3,5,6,8,9,11,14,20];
  const shared=exact.filter(id=>got.includes(id)),missing=exact.filter(id=>!got.includes(id)),extra=got.filter(id=>!exact.includes(id));
  d.text('id-meaning',640,200,'Each number is a stored vector ID, not its rank in the results.',23,P.muted);
  [exact,got].forEach((row,r)=>{
    const y=275+r*125;
    d.text(r?'al':'el',175,y-13,r?'Approximate':'Exact search',27);
    d.text('row-count-'+r,175,y+22,'10 returned IDs',22,P.muted);
    row.forEach((id,i)=>{
      const key='r'+r+'i'+i,color=step===0?P.muted:shared.includes(id)?P.green:r===0?P.orange:P.blue;
      d.circle(key,350+i*85,y,28,color);
      d.text(key+'t',350+i*85,y,String(id),24,P.white);
    });
  });
  if(step===0)d.text('predict',640,530,'Which IDs appear in both results?',30);
  else{
    d.text('shared-ids',640,476,'In both: '+shared.join(', '),27,P.green);
    d.text('missing-ids',328,521,'Missed: '+missing.join(', '),25,P.orange);
    d.text('extra-ids',885,521,'Outside exact top 10: '+extra.join(', '),25,P.blue);
    if(step===1)d.text('unprobed-meaning',640,582,'An unprobed list is a list that IVF did not search.',25);
    else{
      d.text('ans',640,580,'Recall@10 = '+shared.length+' / '+exact.length+' = '+Math.round(100*shared.length/exact.length)+'%',40,P.green);
      d.text('relevance',640,633,'Read the passages separately to check whether they answer the question.',23,P.muted);
    }
  }
  if(step<2)d.text('toy-context',640,633,'Toy results for one query, using the same scores and tie rule.',23,P.muted);
}
register(11,'Vector databases','2026-10-15','lectures/lecture-11/vectors.html',[
scene('Meaning becomes geometry',['Question and passage','Exact phrase search','Vector search'],(d,s)=>{d.text('title',640,150,'Vector databases',59);if(s===0){[240,500,760].forEach((x,i)=>paper(d,'doc'+i,x,315,[P.greenLight,P.blueLight,P.orangeLight][i],140,190));}else vectorCloud(d,s);},"Maya’s model performs well on training data but poorly on new data. She searches her machine learning notes for an explanation. This is a fictional classroom example. Read the question and passage. Ask whether overfitting could explain the pattern. Pause for a prediction.\n\nSearch for the whole question as an exact phrase. The passage does not contain that phrase. This example does not describe every keyword search or B+ tree lookup.\n\nIntroduce vector search as a way to compare numeric representations of text. Follow the arrows to a possible passage. Read the passage to check whether it answers the question. Overfitting is one possible explanation, not a diagnosis of Maya’s model. The next slide explains embeddings. This fictional example does not show a measured or guaranteed search result.",{title:"Find a passage that can answer the question",kind:'title'}),
scene('Embedding',['Content','Coordinates','Shared space'],(d,s)=>{paper(d,'doc',130,310,P.white,145,185);d.arrow('embed',300,400,490,400,P.orange);card(d,'model',500,345,'model',P.orangeLight,210,110);d.arrow('to',730,400,880,400,P.orange);const vals=[.2,-.4,.8,.1];vals.forEach((v,i)=>d.box('v'+i,920,275+i*80,160,64,s>0?String(v):'·',s>0?P.greenLight:P.white));if(s===2){d.text('ver',610,535,'version A',29,P.orange);d.text('dim',1000,635,'d = 4',28);}},"Follow a passage through the embedding model. The four coordinates are example values, not actual model output. Ask which settings must match for question and passage vectors. Use compatible model versions, preprocessing, dimensions, and similarity metrics. Equal dimensions alone do not establish compatible coordinate systems. Compare this requirement with schema compatibility.",{kind:'definition',term:'Embedding',definition:'A numeric vector that represents the input data for comparison with other vectors.'}),
scene('Direction and normalization',['Different direction','Closer direction','Equal lengths'],vectorAngle,"Compare vector direction with vector length. Ask which arrow has the larger dot product with q. Both vectors must have unit length for the dot product to equal cosine similarity. Normalize (3, 4) to (0.6, 0.8). For unit vectors, squared Euclidean distance equals 2 − 2q·v.\n\nThus, increasing dot product and decreasing squared distance give the same ranking. Use the metric required by the embedding model.",{title:"Compare vector directions",kind:'definition',term:'Cosine similarity',definition:'The dot product of unit vectors. It measures the alignment of their directions.'}),
scene('The exact baseline',['Query','First 24','Next 24','All 72'],(d,s)=>vectorCloud(d,s,'exact'),"Ask which vectors this exact baseline can skip without another bound or index. It cannot skip any. Score all 72 vectors. Keep the ten highest scores. For n vectors with d coordinates, the baseline computes n dot products and selects the top k results.\n\nThe dot products can run in parallel. Save the result IDs to evaluate approximate nearest neighbor (ANN) search. Exact search can be suitable for small collections. Compare measured index performance with this baseline.",{title:"Save the exact result IDs",demo:'viz-space'}),
scene('Price the baseline',['Small corpus','Large corpus','Repeated queries'],(d,s)=>{const n=[4000,1000000,10000000][s],dim=[64,1536,1536][s];for(let i=0;i<12;i++)d.rect('matrix'+i,130+(i%4)*38,290+Math.floor(i/4)*66,26,54,P.greenLight,P.green,2);d.text('n',320,535,n.toLocaleString(),36);d.text('dim',660,375,'× '+dim,55,P.orange);d.text('out',1000,370,s===0?'256k':s===1?'1.536B':'15.36B',48,P.green);d.text('unit',1000,435,'multiplies/query',25);if(s===2)d.text('qps',660,585,'× 100/s → 1.536T/s',42,P.orange);},"Calculate 4,000 × 64 = 256,000 coordinate multiplications per query. Increase the number of vectors and dimensions. Then include the query rate. These calculations count operations. They do not measure latency or establish hardware limits.\n\nMemory traffic, batching, accelerators, top-k selection, and concurrency also affect runtime. Measure latency distributions, memory, construction time, update work, and recall.",{title:"Count exact-search operations"}),
scene('Skipping with a contract',['One candidate list','More candidates','Broader search'],(d,s)=>vectorCloud(d,s,'probe'),"Approximate nearest neighbor (ANN) search can score fewer vectors, but it can miss exact neighbors. Point to a nearby vector outside the searched regions. The search did not score that vector. An approximate index does not identify all its missed exact neighbors during a query. Use exact search to identify those misses.\n\nReserve questions for evaluation. The regions are a small example, not measured performance for many dimensions.",{title:"Approximate search can miss neighbors",kind:'definition',term:'Approximate nearest neighbor',definition:'A search method that can reduce work but can miss exact nearest neighbors.'}),
scene('Build an IVF index',['Initial centroids','Assign','Average and reassign','Lists'],buildIVF,"IVF means inverted file. Explain construction separately from query execution. Choose initial centroids. Assign each vector to its nearest centroid. Calculate new centroids from the group averages.\n\nRepeat assignment and averaging. Stop when assignments do not change or the iteration limit is reached. Store each group in a list. A list contains vector IDs and access to their vectors. Source passages can remain elsewhere.\n\nLab 9 supplies k-means. Projected groups can overlap, and actual lists can have different sizes.",{title:"Assign each vector to a centroid list"}),
scene('Probe the lists',['One list','Two lists','Three lists'],(d,s)=>vectorCloud(d,s,'probe'),"Predict how another probe changes work and recall. Probe means search a centroid list. Search lists in order of centroid score. With exact scoring, nested candidate sets, and the same rule for tied scores, recall cannot decrease when more lists are searched. This statement applies to the IVFFlat example.\n\nIt does not apply to every approximate pipeline. The separate two-dimensional widget at canvas position (100, 80) gives recall 0.70 with 46 comparisons at one probe. Two probes give recall 1.00 with 83 comparisons. These counts apply only to that widget.",{demo:'viz-space'}),
scene('Count the saved work',['Whole corpus','Centroids','Probed lists','Total'],(d,s)=>{d.text('n',230,275,'n = 4,000',36);d.rect('all',160,320,960,48,P.line,'none');if(s>0){d.rect('cent',160,410,20,60,P.orange,'none');d.text('C',225,450,'20',31,P.orange);}if(s>1){d.text('probe-count',680,395,'P = 4 lists searched',28,P.green);for(let i=0;i<4;i++)d.rect('probe'+i,360+i*158,410,150,60,P.greenLight,P.green,4);d.text('lists',680,535,'4 × 200',34,P.green);}if(s>2)d.text('cost',640,620,'20 + 4 × 200 = 820',45);},"Assume n = 4,000 vectors, C = 20 centroids, P = 4 searched lists, and equal list sizes. Each list then has 200 vectors. The search compares 20 centroids and 800 candidate vectors, for 820 comparisons. Exact search compares all 4,000 vectors. Actual list sizes differ, so measured counts can differ.\n\nMultiplication by d cancels from this simplified work ratio. Measure elapsed time separately.",{title:"Count IVF comparisons"}),
scene('Navigate a graph',['Entry','Upper hop','Long-range hop','Descend','Local hop','More candidates'],hnsw,"Follow the entry node through the upper layer. Continue at the same vector in the next lower layer. Examine nearby linked vectors. Long links can reach another region before local comparisons. The ef_search setting controls the candidate set during query execution.\n\nFull HNSW maintains candidate sets. The drawn path is an illustration. Each step need not halve the distance. The drawing does not establish logarithmic worst-case time. More links require memory and construction work.",{title:"Search linked vectors",demo:'viz-hnsw'}),
scene('Measure a miss',['Returned IDs','Matches and misses','Recall'],recallGrid,"Compare the example results for one query. Both rows contain IDs 1, 2, 3, 5, 6, 8, and 9. Approximate search missed exact IDs 4, 7, and 10. It returned IDs 11, 14, and 20 instead. The numbers identify stored vectors, not ranks.\n\nRecall@10 = 7/10 = 70%. These result sets illustrate overlap. They are not a recorded IVF or HNSW trace. IVFFlat scores candidates exactly inside searched lists. Assume the same metric and the same rule for tied scores as exact search.\n\nUnder these conditions, missed exact neighbors must be in lists that the search skipped. Evaluate many queries. Read the returned passages to assess relevance.",{title:"Compare exact and approximate result IDs",clarityNative:true}),
scene('Choose an operating point',['Measured points','Quality requirement','Work budget'],(d,s)=>{axis(d,'curve',190,570,880,285,'comparisons/query','recall@10');const rows=[[244,.6425],[471,.81],[924,.9175],[1756,.965],[4000,1]];rows.forEach(([x,y],i)=>{const px=190+x/4000*880,py=570-(y-.5)*570;d.circle('dot'+i,px,py,11,i===2&&s>0?P.orange:P.green);d.text('p'+i,px,py-22,i===4?'exact':'P='+[1,2,4,8][i],24);});if(s>0)d.line('req',190,342,1070,342,P.orange,2,'7 7');if(s>1)d.line('budget',410,570,410,260,P.blue,2,'7 7');},"These measurements use the current Lab 9 dataset and supplied IVFIndex. The dataset contains 4,000 arXiv vectors with 64 dimensions and 40 supplied questions. Probe counts 1, 2, 4, and 8 give mean recall 0.6425, 0.8100, 0.9175, and 0.9650. Their mean comparison counts, rounded down, are 244, 471, 924, and 1756. Exact search scores all 4,000 vectors.\n\nRequire mean recall of at least 0.90. Among these settings, P = 4 meets this requirement with the least work. It also meets a limit of 1,000 mean comparisons. Measure elapsed time separately. A production recall requirement must reflect the consequences of missed evidence.",{title:"Select a search setting"}),
scene('Memory and update budgets',['IVF lists','HNSW links','Compressed vectors'],(d,s)=>{for(let i=0;i<6;i++)d.box('list'+i,130,265+i*51,210,42,'C'+i,P.greenLight,P.green,24);if(s>0){for(let i=0;i<8;i++){const x=625+Math.cos(i*Math.PI/4)*115,y=415+Math.sin(i*Math.PI/4)*115;d.circle('g'+i,x,y,14,P.orange);d.line('ge'+i,x,y,625+Math.cos((i+3)*Math.PI/4)*115,415+Math.sin((i+3)*Math.PI/4)*115,P.orange,2);}}if(s>1){[0,1,2,3].forEach(i=>d.rect('float'+i,920+i*35,300,28,130,P.blueLight,P.blue,3));d.arrow('compress',980,460,980,500,P.blue);d.box('codes',915,525,155,60,'codes',P.blueLight,P.blue,25);}},"Compare all stored data. IVF needs vectors, centroids, and lists. HNSW also needs neighbor links. Include metadata and data structures needed during execution. Product quantization and other compression methods can reduce memory use.\n\nThey can also change rankings and recall. Measure construction time and update behavior with query performance.",{title:"Measure memory and update work"}),
scene('Where the index lives',['Matching versions','Changed text','Updated vector'],(d,s)=>{d.rect('outer',160,245,360,310,P.white,P.line,16);d.text('db',340,292,'database',30);d.table('rows',200,335,[115,125],[['id','vector'],['42','⋯'],['43','⋯']],{rowHeight:55,fontSize:25});miniTree(d,'idx',770,295);if(s===0)d.arrow('inside',520,415,675,415,P.green);if(s===1){d.rect('process',635,245,340,315,'none',P.orange,16);d.text('lib',805,600,'library',29,P.orange);}if(s===2){d.line('net',585,220,585,600,P.orange,3,'8 8');d.arrow('copy',530,405,675,405,P.orange);d.text('sync',635,480,'sync',28,P.orange);d.text('service',820,600,'service',29);}},"Passage 42 and its vector initially refer to text version 1. Maya changes the passage to text version 2. The old vector still represents version 1. The application sends the new text to a compatible embedding model. It replaces the vector in index entry 42.\n\nA database, embedded library, or separate service can hold the index. A separate vector service is optional. Each design needs a defined update process. Database storage alone does not create embeddings for changed text. The reading compares deployment choices.",{title:"What happens when a passage changes?"}),
scene('Diagnose the index',['Low recall','More probes','Still irrelevant'],(d,s)=>{vectorCloud(d,s,'probe');d.text('diagnosis',640,185,s===0?'0.70':s===1?'1.00':'1.00 → ?',57,s===2?P.orange:P.green);},"Compare approximate result IDs with exact result IDs. If useful exact neighbors are missing, increase probes or graph search breadth. Compare the IDs again. If exact and approximate results agree but do not answer the question, inspect embeddings, chunking, metadata, and ranking. Increasing probes does not change existing vector scores. Distinguish index recall from passage relevance before evaluating generated answers.",{title:"Check passage relevance",kind:'activity',demo:'viz-space'}),
scene('Rebuild the retrieval contract',['Exact baseline','Approximate search','Recall','Relevance'],(d,s)=>{[220,480,740,1000].forEach((x,i)=>{if(i<=s){if(i===0)for(let j=0;j<15;j++)d.circle('cloud'+j,x+(j%5)*16-32,360+Math.floor(j/5)*22,5,P.green);if(i===1)miniTree(d,'tree',x,330);if(i===2){d.circle('recall',x,395,80,P.greenLight,P.green,4);d.text('fraction',x,410,'9/10',40,P.green);}if(i===3){d.line('dial',x-70,410,x+70,410,P.line,14);d.circle('knob',x+20,410,19,P.orange);}}if(i<s)d.arrow('arr'+i,x+90,400,x+170,400,P.orange);});},"Ask a student to explain the four steps. Save exact result IDs. Search fewer candidates. Compare the result IDs. Read the passages.\n\nLab 9 uses 4,000 precomputed arXiv abstract vectors. The supplied data reduces 384 dimensions to 64 dimensions. The lab supplies k-means. Students need the starter files and embedding data. Choose a recall requirement to investigate.\n\nDistinguish agreement with exact search from the quality of a generated answer.",{title:"Evaluate the search results",kind:'recap'})
]);
function ragPipeline(d,s){const names=['Chunk','Embed','Index','Retrieve','Generate'];for(let i=0;i<5;i++){card(d,'stage'+i,90+i*232,365,names[i],i===s?P.orangeLight:P.white,190,105);if(i<4)d.arrow('link'+i,287+i*232,415,320+i*232,415,P.line);if(i<=s)token(d,'packet'+i,185+i*232,300,undefined,i===s?P.orange:P.green,15);}if(s>2){paper(d,'evidence',840,520,P.greenLight,60,75);d.arrow('evidencelink',920,550,1110,480,P.green);} }
function chunkPage(d,s){d.rect('doc',160,265,890,300,P.white,P.line,10);for(let i=0;i<12;i++){const y=285+i*21;d.line('text'+i,185,y,1020-(i%3)*80,y,i<4?P.green:i<8?P.blue:P.orange,8);}const cuts=s===0?[]:s===1?[348,432]:[326,390,454,518];cuts.forEach((y,i)=>d.line('cut'+i,130,y,1080,y,P.red,3,'8 6'));if(s===3){d.rect('overlap',155,361,900,46,P.orangeLight,P.orange,6);d.line('overlapline',190,381,1010,381,P.orange,8);} }
function ranking(d,s,kind='mrr'){const x0=335;for(let q=0;q<3;q++){d.text('qid'+q,210,310+q*115,'q'+(q+1),29);for(let rank=0;rank<4;rank++){const good=rank===[0,2,9][q],color=good&&s>0?P.greenLight:P.white;d.box('rank'+q+rank,x0+rank*160,265+q*115,130,80,String(rank+1),color,good&&s>0?P.green:P.line,31);}if(s>1)d.text('score'+q,1100,315+q*115,kind==='mrr'?['1','⅓','0'][q]:['1','1','0'][q],40,q===2?P.red:P.green);}if(s>2)d.text('mean',640,630,kind==='mrr'?'(1 + ⅓ + 0) / 3 = 0.44':'2 / 3 = 0.67',36,P.green);}
// Fictional team permissions and illustrative scores, not measured retrieval results.
const FILTER_PASSAGES=[
  {id:'A1',team:'A',topic:'Overfitting',score:0.90},
  {id:'A2',team:'A',topic:'Testing models',score:0.80},
  {id:'A3',team:'A',topic:'CSV files',score:0.70},
  {id:'B1',team:'B',topic:'Model error',score:0.95},
  {id:'B2',team:'B',topic:'Training tips',score:0.85},
  {id:'B3',team:'B',topic:'Data types',score:0.60}
];
function filterRetrieval(d,s){
  const rank=rows=>[...rows].sort((a,b)=>b.score-a.score);
  const allowed=rank(FILTER_PASSAGES.filter(p=>p.team==='A')),best=allowed.slice(0,2);
  d.text('filter-question',640,188,'Maya asks: “Why does my model fail on new data?”',27,P.ink);
  d.text('filter-user',640,228,'Maya belongs to Team A. Each team can read only its own passages.',23,P.blue);
  if(s<3){
    d.text('filter-library',415,272,'Six stored passages · one passage per card',23,P.muted);
    FILTER_PASSAGES.forEach((p,i)=>{
      const x=70+(i%3)*240,y=303+Math.floor(i/3)*135;
      const excluded=s>0&&p.team!=='A',selected=s===2&&best.includes(p);
      const fill=excluded?P.bg:selected?P.orangeLight:p.team==='A'?P.blueLight:P.white;
      const border=excluded?P.line:selected?P.orange:p.team==='A'?P.blue:P.line;
      d.rect('filter-passage-'+p.id,x,y,210,110,fill,border,9,selected?3:2);
      d.text('filter-id-'+p.id,x+105,y+24,p.id+(s===2&&p.team==='A'?' · '+p.score.toFixed(2):''),26,excluded?P.muted:P.ink);
      d.text('filter-topic-'+p.id,x+105,y+56,p.topic,21,excluded?P.muted:P.ink);
      d.text('filter-access-'+p.id,x+105,y+88,excluded?'Excluded from this search':'Team '+p.team+' only',excluded?17:21,excluded?P.muted:p.team==='A'?P.blue:P.ink);
    });
    d.rect('filter-explanation',830,303,385,245,P.white,P.line,10);
    if(s===0){
      d.text('filter-side-title',1022,335,'Think of shared folders',26,P.ink);
      d.text('filter-side-1',1022,387,'The team tag says who may read.',21,P.ink);
      d.text('filter-side-2',1022,424,'The tag is stored with the passage.',21,P.ink);
      d.text('filter-side-3',1022,484,'Which cards may Maya use?',24,P.blue);
    }else if(s===1){
      d.text('filter-side-title',1022,335,'Filter rule: team = A',27,P.blue);
      d.text('filter-side-1',1022,389,'Keep A1, A2, and A3.',26,P.ink);
      d.text('filter-side-2',1022,434,'These are the allowed candidates:',20,P.ink);
      d.text('filter-side-3',1022,469,'passages the search can return.',22,P.ink);
      d.text('filter-side-4',1022,513,'The B passages stay stored.',22,P.muted);
    }else{
      d.text('filter-side-title',1022,335,'Return two results (k = 2)',26,P.ink);
      best.forEach((p,i)=>d.text('filter-result-'+i,1022,394+i*45,'Rank '+(i+1)+': '+p.id+' · score '+p.score.toFixed(2),26,P.orange));
      d.text('filter-side-3',1022,500,'A3 is allowed, but ranks third.',22,P.muted);
    }
    const summary=[
      'A filter is a rule that excludes passages from a search.',
      '6 stored passages → 3 allowed candidates',
      '3 allowed candidates → rank by similarity → return A1 and A2'
    ][s];
    d.text('filter-summary',640,594,summary,27,P.green);
    d.text('filter-limit',640,639,s===2?'Example scores: higher means a closer match. A score does not grant permission.':'Fictional example · team tags are metadata: information stored about each passage.',21,P.muted);
  }else{
    const limited=rank(FILTER_PASSAGES).slice(0,2),remaining=limited.filter(p=>p.team==='A');
    d.rect('filter-correct',55,285,555,307,P.greenLight,P.green,12);
    d.rect('filter-late',650,285,575,307,P.white,P.orange,12);
    d.text('filter-correct-title',332,321,'Choose from allowed passages',27,P.green);
    d.text('filter-correct-pool',332,374,'A1: 0.90     A2: 0.80     A3: 0.70',25,P.ink);
    d.arrow('filter-correct-arrow',332,400,332,446,P.green,3);
    d.text('filter-correct-results',332,480,'Return '+best.map(p=>p.id).join(' and '),31,P.green);
    d.text('filter-correct-count',332,549,best.length+' results · both allowed',24,P.green);
    d.text('filter-late-title',937,321,'Take two first, then check permission',25,P.orange);
    d.text('filter-late-pool',937,374,limited.map(p=>p.id+': '+p.score.toFixed(2)).join('     '),27,P.ink);
    d.arrow('filter-late-arrow',937,400,937,446,P.orange,3);
    d.text('filter-late-results',937,480,'Remove B1 → only '+remaining.map(p=>p.id).join(', ')+' remains',28,P.orange);
    d.text('filter-late-count',937,549,'1 result · A2 was below the cutoff',23,P.orange);
    d.text('filter-summary',640,629,'The permission rule decides who may enter. Similarity decides the order.',27,P.green);
  }
}
register(12,'RAG as a systems problem','2026-10-27','lectures/lecture-12/rag.html',[
scene('Evidence reaches the answer',['Corpus','Retrieved evidence','Answer'],(d,s)=>{d.text('title',640,150,'RAG systems',61);for(let i=0;i<8;i++)paper(d,'source'+i,110+(i%4)*90,300+Math.floor(i/4)*140,i<2&&s>0?P.greenLight:P.white,65,100);d.arrow('retrieve',505,415,735,415,P.green);paper(d,'best',s>0?755:160,s>0?340:300,P.greenLight,110,150);if(s>1){d.arrow('generate',890,415,985,415,P.orange);d.rect('answer',1000,325,175,185,P.orangeLight,P.orange,14);d.text('cite',1085,435,'[doc_7]',28,P.orange);}},'Return to Maya’s fictional question from Lecture 11: Why does my model fail on new data? Her course notes say that overfitting can cause low training error but high test error. Ask what the language model needs to use this passage. Expected: the question, the passage, and its source ID. Show these together in the prompt.\n\nRead the proposed answer and citation. The passage supports overfitting as one possible explanation. It does not diagnose Maya’s prediction model. Compare the answer with the cited text. This is a fictional illustration, not a measured search or model output.',{title:"Carry a retrieved passage into the answer",kind:'title'}),
scene('Retrieval augmented generation',['Chunk','Embed','Index','Retrieve','Generate'],ragPipeline,'Introduce the definition, then trace document ingestion separately from question time. Ask which stages rerun when one document changes and which run for every question. Expected: when a source changes, update its chunks, vectors, and index entries. For each question, embed it, retrieve chunks, build the prompt, and generate an answer. Reusing an index keeps the whole corpus out of every prompt. The lab mocks generation so retrieval and assembly can be tested offline.',{kind:'definition',term:'Retrieval-augmented generation',definition:'Answering with a language model supplied with evidence retrieved from an external collection.',demo:'viz-pipe'}),
scene('Three places for knowledge',['Weights','Full context','Retrieved context'],(d,s)=>{const xs=[240,640,1040];xs.forEach((x,i)=>{d.rect('container'+i,x-135,320,270,240,i===s?P.orangeLight:P.white,i===s?P.orange:P.line,20);d.text('label'+i,x,295,['weights','context','retrieval'][i],30);});for(let i=0;i<12;i++){const x=s===0?240+(i%4-1.5)*35:s===1?640+(i%4-1.5)*40:1040+(i%2-.5)*60,y=370+Math.floor(i/(s===2?2:4))*50;if(s<2||i<4)d.circle('fact'+i,x,y,10,P.green);}if(s===1)d.text('budget',640,630,'tokens × requests',32,P.orange);},'Compare updating learned weights, sending the corpus, and retrieving a subset. Ask which method can show its sources and update them when a document changes. Expected: retrieval, provided source identities are preserved. Fine-tuning can teach behavior and domain conventions.\n\nIt is not a dependable substitute for exact fresh document lookup. Long context can work for bounded tasks, but cost, latency and evidence use still need evaluation. Avoid universal claims that no corpus can fit.',{title:"Weights, full context, and selected evidence"}),
scene('Design the retrieval record',['Document','Topic boundaries','Small fragments','Overlap'],chunkPage,'Treat the document as three topics rather than a bag of fixed-size cuts. Ask students where they would cut it to answer a question about the blue topic. Reveal topic boundaries, then smaller fragments that split a claim, then overlap. Expected: one coherent topic with enough context to resolve pronouns and references. Overlap consumes index and prompt space, so measure it. The drawn lines represent content structure, not a recommended universal word count.',{title:"Keep a claim with its context",kind:'definition',term:'Chunk',definition:'A stored unit of source content that can be retrieved and cited independently.'}),
scene('Keep the source identity',['Document id','Chunk position','Embedding version'],(d,s)=>{d.table('schema',125,280,[210,225,245,270],[['doc_id','chunk_id','position','model'],['D7','D7:v2:03','03',s>1?'E2':'E1'],['D7','D7:v2:04','04',s>1?'E2':'E1']],{rowHeight:75,fontSize:25,highlightCols:s===0?[0]:s===1?[1,2]:[3]});if(s>0){d.arrow('cite',340,530,850,530,P.green);d.text('cid',1040,540,'[D7]',36,P.green);}},'Ask what information must survive when a chunk becomes a vector and later an answer citation. Expected: document ID, stable/versioned chunk ID, source position, title or source reference, and embedding model version. Explain why reusing chunk positions after splitting the documents again can make old results point to different text. Map the visual record to the project documents/chunks/embeddings tables. Distinguish document-level relevance labels from passage-level evidence support.'),
scene('Build an evaluation set',['Questions','Relevant sources','Held-out questions'],(d,s)=>{for(let i=0;i<6;i++){d.circle('q'+i,200,280+i*52,15,i>3&&s>1?P.orange:P.blue);if(s>0){d.arrow('label'+i,250,280+i*52,690,280+(i%4)*72,P.line,2);paper(d,'p'+i,750,250+(i%4)*72,P.greenLight,70,58);}}if(s>1){d.rect('holdout',120,473,350,142,'none',P.orange,10);d.text('lock',435,557,'🔒',30,P.orange);}d.text('qcount',1030,410,'≥25',55);d.text('config',1030,490,'≥2',55,P.green);},'Give pairs one minute to propose a question that requires a specific passage. Ask how another person would label the relevant sources. Expected: read the sources and label which ones support an answer, rather than trusting the current system’s output. The project requires at least 25 questions and two configurations.\n\nPartner questions stay held out during tuning. Include paraphrases, hard negatives and unanswerable questions. A small evaluation set reveals failures but does not establish broad reliability.',{title:"Label the evidence before comparing settings"}),
scene('Presence in the top results',['Ranking','Relevant items','Hits','Mean'],(d,s)=>ranking(d,s,'hit'),'Introduce hit@k, then have students score the three visual questions at k=3. The first and second contain a relevant source in their first three results. The third misses. Expected: 2/3=.67.\n\nAsk whether moving the second relevant result from rank 3 to rank 1 changes hit@3. Expected: no. In the course lab, relevance is checked by document IDs. Document IDs tell us whether a source was found.\n\nWe still need to check its rank and whether the answer uses it correctly.',{kind:'definition',term:'hit@k',definition:'The fraction of questions with at least one relevant source among the first k results.'}),
scene('Rank changes the score',['Ranking','Relevant items','Reciprocals','Mean'],ranking,'Keep the same three questions to isolate the metric change. Ask students to compute reciprocal rank before showing each value: 1, 1/3, and 0. Mean=.444…. Explain that an unreturned relevant item scores zero. This classroom example uses a truncated list. Compare two retrievers with equal hit@3 but different first-relevant ranks. MRR measures ranking quality, not whether an answer faithfully uses that source.',{kind:'definition',term:'Mean reciprocal rank',definition:'The average reciprocal rank of the first relevant result. A miss scores zero.'}),
scene('Measure chunking instead of guessing',['10 words','60 words','90 words'],(d,s)=>{const row=window.CourseRagMeasurements.chunking.find(r=>r.max_words===[10,60,90][s]);const dat=[row.chunks,row.hit3,row.mrr3];d.text('w',640,250,[10,60,90][s]+' words',42);['hit@3','MRR@3'].forEach((label,i)=>{d.text('label'+i,260,380+i*110,label,29);d.rect('track'+i,390,348+i*110,650,47,P.line,'none');d.rect('fill'+i,390,348+i*110,650*dat[i+1],47,i?P.blue:P.green,'none');d.text('metric'+i,1110,383+i*110,dat[i+1].toFixed(2),32);});d.text('chunks',640,610,dat[0]+' chunks',35,P.muted);},'Recomputed from the current 24-document lab corpus, the supplied chunker/embedder, BruteForceIndex, and 12 labeled questions: 10 words produces 67 chunks with hit@3=.75 and MRR=.6667. 60 words produces 25 chunks with .9167/.7778. 90 words produces 24 chunks with the same scores. Ask which settings tie and why: 60 and 90 words, because the sources are already short and mostly single-topic. This does not mean whole long documents always work. The chunk target is soft at sentence boundaries. The reading, lab, and slides use the same regenerated measurements. Here MRR is truncated at three retrieved chunks, so report MRR@3.',{demo:'viz-chunk'}),
scene('Context has a budget',['All candidates','Reranked subset','Evidence placed first'],(d,s)=>{for(let i=0;i<9;i++){const chosen=[2,5,7].includes(i),order=s===2?[7,2,5]:[2,5,7],x=s===0?130+i*116:chosen?250+order.indexOf(i)*300:130+i*116,y=s===0?335:chosen?330:560;paper(d,'c'+i,x,y,chosen?P.greenLight:P.white,s===0?85:chosen?165:55,s===0?150:chosen?190:65);if(chosen)d.text('sourceid'+i,x+(s===0?42:82),y+(s===0?133:172),'D'+i,25,P.green);}if(s>0)d.line('window',160,295,1140,295,P.orange,4);if(s>1){d.arrow('reorder',860,260,350,260,P.green);d.text('cite',325,565,'[D7]',31,P.green);}},'Ask why sending every retrieved chunk can reduce usefulness. Expected: more tokens, longer waits, repeated or conflicting passages, and useful evidence buried in a long prompt. Reranking reassesses how well the retrieved passages answer the question. Sorting the same scores again is not a fix. Then assemble evidence with source IDs and deliberate ordering. Lost-in-the-middle is an observed phenomenon under studied conditions, not a guarantee for every model or prompt.',{title:"Choose what belongs in the evidence packet"}),
scene('Two retrieval paths',['Semantic','Exact token','Merged candidates','Reranked evidence'],(d,s)=>{d.text('query',175,420,'E104',42,P.ink);d.arrow('semantic',250,400,500,295,P.green);d.arrow('lexical',250,435,500,535,P.blue);card(d,'vec',510,250,'vector',P.greenLight,180,95);card(d,'lex',510,490,'keyword',P.blueLight,180,95);if(s>0){['A','B','C'].forEach((x,i)=>token(d,'v'+i,755+i*75,300,x,P.green));['C','D','E'].forEach((x,i)=>token(d,'l'+i,755+i*75,535,x,P.blue));}if(s>1){d.arrow('merge1',950,300,1080,400,P.green);d.arrow('merge2',950,535,1080,445,P.blue);['C','A','D'].forEach((x,i)=>token(d,'merged'+i,1100,365+i*68,x,s===3&&i===0?P.orange:P.green));}},'Use an error code as the motivating query: exact tokens may be distinctive while learned vectors can help with paraphrases. Ask why raw scores from unrelated retrievers should not simply be added. Expected: their numbers mean different things. Choose a method for combining the rankings and test its results. Reveal a merged candidate list, then a reranker that reads question and passage together. Explain that hybrid search and reranking address different stages and incur different costs.'),
scene('Filters change the candidate set',['Shared team folders','Apply the permission rule','Rank the allowed passages','Why the cutoff matters'],filterRetrieval,'Maya belongs to Team A and asks why her model fails on new data. Use six fictional passages to separate permission from similarity. A filter is a rule that excludes passages from a search. Team metadata records who may read each passage. Keep A1, A2, and A3, then rank these allowed candidates and return A1 and A2.\n\nCompare this with taking only two unrestricted results before checking permission. Removing B1 leaves only A1. A2 was never included. This illustrates a fixed cutoff without refilling. Actual engines can use different filtering plans, extra candidates, or another search. The system must enforce access rules before passages become evidence. A high similarity score cannot grant permission.',{title:'Filter by who can read each passage',clarityNative:true}),
scene('A changed source invalidates copies',['Version one','Document changes','Re-embed','Atomic switch'],(d,s)=>{paper(d,'source',150,300,s>0?P.orangeLight:P.greenLight,155,210);d.text('dv',225,560,s?'D7:v2':'D7:v1',30);d.arrow('embed',325,410,540,410,s>1?P.orange:P.line);d.table('emb',565,310,[170,175],[['model','source'],[s>1?'E2':'E1',s>1?'D7:v2':'D7:v1']],{rowHeight:85,fontSize:26,highlightRows:s>1?[1]:[]});d.arrow('switch',940,410,1050,410,s===3?P.green:P.line);d.circle('live',1115,410,50,s===3?P.green:P.muted);},'Ask what becomes stale when a source changes, then when the embedding model changes. Expected: changed-source chunks and vectors in the first case. Every stored vector in the second. Show a replacement index/version built alongside the old one, then a controlled switch. A model name alone is insufficient if its revision or preprocessing changed. Evaluation and citations should record the version they used so results remain reproducible.',{title:"Update the source and its stored derivatives"}),
scene('Failure diagnosis workshop',['Missing evidence','Wrong ranking','Unsupported claim'],(d,s)=>{ragPipeline(d,[3,3,4][s]);d.circle('failure',s<2?880:1110,415,70,'none',P.red,5);d.text('signal',640,585,['hit@3 = 0','hit@3 = 1 · RR = ⅓','citation ≠ support'][s],40,P.red);},'Give three short cases in sequence and ask partners to name the earliest failing stage and a useful next experiment. Missing evidence: inspect labels, chunking, representation, index recall and filters. Wrong rank: inspect retrieval scores or reranking. Unsupported answer despite the right evidence: inspect assembly and generation/citation support. Expected conclusion: a polished answer alone cannot identify the broken stage. Ask students to name what they would inspect, such as a missing chunk, a result ID, or the assembled prompt.',{title:"Find the first failing pipeline stage",kind:'activity'}),
]);
const KEYS=['ada','ben','cyd','dee','eli','fay','gus','ivy','jon','kim','lee','mia'];
function owner(k){return [...k].reduce((s,c)=>s+c.charCodeAt(0),0)%4;}
function rangeOwner(k){return k<'d'?0:k<'g'?1:k<'k'?2:3;}
function partitionDraw(d,s,kind='hash'){
 for(let p=0;p<4;p++){d.rect('part'+p,150+p*260,350,220,235,P.white,P.line,12);d.text('pid'+p,260+p*260,620,kind==='hash'?'P'+p:'P'+p+' · '+['a–c','d–f','g–j','k–z'][p],29,P.muted);}
 const ord=[[],[],[],[]];KEYS.forEach(k=>ord[(kind==='hash'?owner:rangeOwner)(k)].push(k));
 KEYS.forEach((k,i)=>{const p=(kind==='hash'?owner:rangeOwner)(k),j=ord[p].indexOf(k),landed=s>0,x=landed?260+p*260:145+i*89,y=landed?395+j*52:260;const hot=s===2?k==='kim':s===3?k>='dee'&&k<='fay':false;d.box('key'+i,x-40,y-21,80,42,k,hot?P.orangeLight:P.greenLight,hot?P.orange:P.green,22);});
 if(s>1)for(let p=0;p<4;p++){const active=s===2?p===(kind==='hash'?owner('kim'):rangeOwner('kim')):kind==='hash'||p===1;if(active)d.rect('wake'+p,145+p*260,345,230,245,'none',P.orange,14,4);}
}
const MR_PAPER='https://storage.googleapis.com/gweb-research2023-media/pubtools/4449.pdf';
function mrLabel(d,k,x,y,text,color=P.ink,size=26){d.text(k,x,y,text,size,color);}
function mrPanel(d,k,x,y,w,h,title,lines,color=P.green){
 d.rect(k,x,y,w,h,P.white,color,10,2);
 mrLabel(d,k+'-title',x+w/2,y+36,title,color,28);
 lines.forEach((line,i)=>mrLabel(d,k+'-line-'+i,x+w/2,y+84+i*39,line,P.ink,25));
}
function mrFoot(d,text){mrLabel(d,'mr-foot',640,636,text,P.muted,23);}
function mapLocal(d,s){
 mrPanel(d,'order',80,275,360,190,'Order 0',['“Pizza, pizza!”']);
 d.arrow('transform',455,367,555,367,P.blue,3);
 mrLabel(d,'function',760,244,'Map transforms one record',P.blue,28);
 if(s===0)d.box('predict',585,300,610,140,'What pairs should map output?',P.white,P.line,29);
 else for(let i=0;i<2;i++)d.box('occurrence-'+i,585+i*320,320,290,90,s===1?'pizza':'(pizza, 1)',P.blueLight,P.blue,30);
 mrFoot(d,['The runtime assigns records to tasks. Map defines what each record produces.','Lowercase and split punctuation. Keep both occurrences.','Two equal pairs represent two requests. Keeping only distinct pairs would lose one.'][s]);
}
function physicalShuffle(d,s){
 mrLabel(d,'map-side',330,215,'Map workers: local disk regions',P.blue,27);
 mrLabel(d,'reduce-side',1050,215,'Reduce workers',P.green,27);
 const regions=[['M0 → R0','pizza: 1, 1',P.blue],['M0 → R1','empty',P.green],['M1 → R0','pizza: 1',P.blue],['M1 → R1','salad: 1',P.green]];
 regions.forEach(([title,value,color],i)=>{
  const y=250+i*78;
  d.rect('region-'+i,70,y,500,62,color===P.blue?P.blueLight:P.greenLight,color,7,2);
  d.text('region-name-'+i,90,y+34,title,23,color,'start');
  d.text('region-value-'+i,550,y+34,value,24,P.ink,'end');
 });
 mrPanel(d,'r0',925,277,290,122,'R0: pizza',s===2?['[1, 1, 1]']:['waiting'],P.blue);
 mrPanel(d,'r1',925,447,290,122,'R1: salad',s===2?['[1]']:['waiting'],P.green);
 if(s>=1){
  mrLabel(d,'master',745,237,'Master',P.orange,26);
  mrLabel(d,'locations',745,269,'tracks locations',P.muted,21);
  d.arrow('location-info',820,256,905,256,P.orange,3);
 }
 if(s===2){
  d.path('fetch-pizza-0','M 580 281 L 632 281 L 632 333 L 910 333','none',P.blue,3);
  d.path('fetch-pizza-1','M 580 437 L 660 437 L 660 355 L 910 355','none',P.blue,3);
  d.arrow('pizza-tip-0',875,333,910,333,P.blue,3);
  d.arrow('pizza-tip-1',875,355,910,355,P.blue,3);
  d.arrow('fetch-salad',580,515,910,515,P.green,3);
  mrLabel(d,'remote-reads',744,590,'Fetch, then sort and group',P.muted,23);
 }
 mrFoot(d,['Partition each map output by reducer. Regions remain on the map worker’s disk.','The master sends file locations. Meal pairs do not pass through the master.','Each reducer reads its region from every map task. Disk and network work precede reduce.'][s]);
}
function localCombiner(d,s){
 mrPanel(d,'map0',80,255,370,245,'Map task M0',s?['(pizza, 2)']:['(pizza, 1)','(pizza, 1)'],P.blue);
 mrPanel(d,'map1',500,255,370,245,'Map task M1',['(salad, 1)','(pizza, 1)'],P.green);
 if(s>=1)mrLabel(d,'weight',265,552,'2 meals in one pair',P.blue,27);
 mrPanel(d,'totals',940,325,270,172,'Global reduce',s===2?['pizza = 3','salad = 1']:['still required'],P.orange);
 if(s===2){d.path('send0-route','M 265 245 L 265 220 L 1075 220 L 1075 310','none',P.blue,3);d.arrow('send0',1075,280,1075,310,P.blue,3);d.arrow('send1',880,435,925,435,P.green,3);}
 mrFoot(d,['Four emitted pairs represent four requests. Predict which pairs can merge locally.','Optional combiner: three pairs now represent the same four requests.','The result must also be correct when the runtime does not run a combiner.'][s]);
}
function averagePartials(d,s){
 mrLabel(d,'new-task',640,220,'Toy data: three completed food deliveries',P.muted,25);
 mrPanel(d,'times0',85,272,350,205,'Map task M0',['A: 10 min · B: 10 min',s>=2?'(sum, count) = (20, 2)':'local mean = 10 min'],P.blue);
 mrPanel(d,'times1',480,272,350,205,'Map task M1',['C: 40 min',s>=2?'(sum, count) = (40, 1)':'local mean = 40 min'],P.green);
 mrPanel(d,'average',900,272,310,205,'Final average',s===0?['Predict before reveal']:s===1?['(10 + 40) / 2','25 min: incorrect']:s===2?['Add sums and counts','(60, 3)']:['60 / 3','20 min: correct'],s===1?P.red:P.orange);
 if(s>=1)d.arrow('combine-times',842,375,885,375,P.orange,3);
 mrFoot(d,['Each record is one delivery. M0 reads A and B. M1 reads C. Predict the overall average.','The one-delivery group received as much weight as the two-delivery group.','Keep sufficient partial information: total minutes and number of deliveries.','Merge (sum, count) pairs. Divide once, after the final merge.'][s]);
}
function saltAndCombine(d,s){
 mrLabel(d,'salt-fixture',640,207,'Separate toy count: 100 occurrences of key A',P.muted,25);
 if(s===0){
  mrPanel(d,'unsalted-input',120,290,380,215,'One grouping key',['100 records with key A','All select one destination'],P.orange);
  d.arrow('unsalted-route',520,397,740,397,P.orange,3);
  mrPanel(d,'unsalted-reducer',760,290,380,215,'One reducer',['Count all 100 records','Other workers cannot help'],P.orange);
 }else{
  mrLabel(d,'salt-operation',640,247,s===1?'Number occurrences 0–99. Use number % 4 as the suffix, then route.':'First reduction: count each temporary key independently.',P.ink,24);
  for(let i=0;i<4;i++){
   const x=55+i*310,cx=x+120;
   d.rect('salt-group-'+i,x,281,240,150,P.orangeLight,P.orange,9,2);
   mrLabel(d,'salt-key-'+i,cx,316,'Key A:'+i,P.orange,27);
   mrLabel(d,'salt-records-'+i,cx,360,'25 occurrences',P.ink,24);
   mrLabel(d,'salt-worker-'+i,cx,402,s===1?'P'+i+' → W'+i:'W'+i+' counts 25',P.ink,24);
   if(s>=2){
    d.arrow('remove-salt-'+i,cx,438,cx,450,P.green,3);
    d.box('original-key-partial-'+i,x,495,240,58,'(A, 25)',P.greenLight,P.green,27);
    if(s===3)d.path('regroup-partial-'+i,'M '+cx+' 558 L '+cx+' 573 L 640 573','none',P.green,3);
   }
  }
  if(s>=2)mrLabel(d,'remove-suffix-label',640,480,'Next job’s map removes suffixes: all four partials now have key A.',P.ink,23);
  if(s===2)mrLabel(d,'regroup-next',640,602,'Next: regroup these four A partials for a second reduction.',P.green,26);
  if(s===3){
   d.arrow('second-reduce-arrow',640,573,640,584,P.green,3);
   d.box('salt-total',285,588,710,53,'Second reduce: A = 25 + 25 + 25 + 25 = 100',P.greenLight,P.green,26);
  }
 }
 mrLabel(d,'salt-foot',640,661,[
  'A repeated key concentrates work at one destination. Predict how to share this count.',
  'Each salted key selects a different partition, assigned to one worker here.',
  'The first reduction emits four counts. Restore A so those counts can meet again.',
  'The second shuffle moves four partial counts instead of the original 100 occurrences.'
 ][s],P.muted,22);
}
function lostMapFiles(d,s){
 mrLabel(d,'input-location',210,232,'Saved club orders',P.green,25);
 mrLabel(d,'output-location',622,232,'Temporary tally file',s===1?P.red:P.blue,25);
 mrPanel(d,'durable-input',65,280,290,220,'Group 0 order',['“Pizza, pizza!”','Saved shared copy','still accessible'],P.green);
 const workerLines=[['M0: process group 0','pizza values: [1, 1]','file saved only here'],['Laptop failed','tally file unavailable'],['Rerun task M0','reread “Pizza, pizza!”','rebuild pizza: [1, 1]'],['Same task M0','new pizza file: [1, 1]']];
 mrPanel(d,'map-worker',455,280,335,220,s>=2?'Borrowed laptop':'Maya’s laptop',workerLines[s],s===1?P.red:s===2?P.orange:P.blue);
 mrPanel(d,'waiting-reducer',900,280,310,220,'Pizza reducer R0',s===3?['Group 0: [1, 1]','Group 1: [1]','pizza = 3']:['From group 1: [1]','waiting for group 0'],P.blue);
 if(s===0||s>=2)d.arrow('read-input',367,390,440,390,s===2?P.orange:P.green,3);
 if(s===1){d.line('lost-file-mark-1',487,445,758,470,P.red,3);d.line('lost-file-mark-2',487,470,758,445,P.red,3);}
 if(s===3)d.arrow('fetch-replacement',802,390,885,390,P.blue,3);
 mrLabel(d,'storage-distinction',640,558,'The shared order has other copies. The temporary tally file has only one copy here.',P.muted,24);
 mrFoot(d,['M0 processes group 0. R0 needs its file before it can finish the pizza total.','The original order is still saved. What work must another worker repeat?','Repeat the map code on the same saved order. Recreate both pizza values.','R0 receives the recreated values: 2 + 1 = 3 pizzas. The order has not changed.'][s]);
}
function acceptedAttempts(d,s){
 mrLabel(d,'same-task',330,225,'Two attempts of logical map task M0',P.blue,27);
 mrPanel(d,'attempt-a',80,270,340,150,'Attempt A',['(pizza, 2)'],s>=2?P.muted:P.blue);
 if(s>=1)mrPanel(d,'attempt-b',80,455,340,150,'Attempt B',['(pizza, 2)'],P.blue);
 mrPanel(d,'reducer-slot',555,305,300,180,'R0: M0 input',s>=2?['one accepted output','(pizza, 2)']:['one logical task','one contribution'],P.orange);
 mrPanel(d,'other-task',925,255,285,145,'Other task M1',['(pizza, 1)'],P.green);
 if(s>=2){d.arrow('accept-b',435,530,540,430,P.blue,3);d.line('ignore-a',104,354,395,354,P.muted,3);}
 if(s===3){d.arrow('add-m0',867,435,920,435,P.orange,3);d.arrow('add-m1',1067,408,1067,425,P.green,3);d.box('retry-total',935,435,260,90,'pizza = 2 + 1 = 3',P.blueLight,P.blue,27);}
 mrFoot(d,['An attempt is one execution of a task. Task identity refers to assigned input work.','A retry or backup repeats M0. It is not another customer order.','For this reducer, use one attempt’s output from M0, not both copies.','This protects task output accounting. External writes need their own retry-safe design.'][s]);
}
function transferCount(d,s){
 mrLabel(d,'baseline-count',640,222,'Original two orders: pizza = 3, salad = 1',P.blue,28);
 const cases=[['Seven partitions','Same two orders',s>=1?'pizza = 3, salad = 1':'Predict the totals'],['Retry map task M0','Same assigned input',s>=1?'pizza = 3, salad = 1':'Predict the totals'],['New order 2','“Pizza, pizza!”',s>=2?'pizza = 5, salad = 1':'Predict the totals']];
 cases.forEach(([title,change,result],i)=>mrPanel(d,'case-'+i,65+i*415,295,320,225,title,[change,result],i===2?P.orange:P.blue));
 mrFoot(d,['Which changes create new meal requests? Explain before revealing the totals.','Changing placement or repeating execution does not add a new input record.','A separate order with identical text is real data. Keep its two additional occurrences.'][s]);
}
function enginePreview(d,s){
 mrPanel(d,'mapreduce-contract',65,275,330,240,'MapReduce today',['Transform each record','Group equal keys','Combine complete groups'],P.green);
 if(s>=1)mrPanel(d,'spark-preview',475,275,330,240,'Spark',['Build a data plan','Runtime runs the plan','Grouping is an operator'],P.blue);
 if(s>=2)mrPanel(d,'ray-preview',885,275,330,240,'Ray Core',['Submit Python calls','Runtime schedules tasks','Your code combines counts'],P.orange);
 d.link('next-lecture',466,586,'Lecture 13B: Spark and Ray', 'lecture-13b.html',25);
 mrFoot(d,'Next lecture traces the same lunch orders through both runtimes.');
}
function mapreduceRecap(d,s){
 const titles=['Map','Shuffle','Reduce','Recover'];
 const lines=[['Order → occurrences','Keep both pizzas'],['One destination per key','Fetch and group values'],['Sum all weights','pizza 3 · salad 1'],['Rerun lost work','Accept one task result']];
 titles.forEach((title,i)=>{
  mrPanel(d,'recap-'+i,55+i*300,295,270,195,title,i<=s?lines[i]:['Predict this step'],i===s?P.orange:P.green);
  if(i<3)d.arrow('flow-'+i,330+i*300,393,345+i*300,393,P.green,2);
 });
 mrFoot(d,['A correct count begins with every occurrence, including repeated meal names.','Routing changes location. It must not drop contributions from any map task.','A combiner can change pair counts while preserving their total weight.','Preserve input meaning and output accounting as placement, speed, and failures change.'][s]);
}
register(13,'MapReduce and distributed execution','2026-11-10','lectures/lecture-13/distributed.html',[
scene('One job many machines',['One reader','Many readers','A failed worker'],(d,s)=>{d.text('title',640,140,'Distributed compute',57);for(let i=0;i<8;i++){const x=s?190+(i%4)*260:550,y=s?315+Math.floor(i/4)*185:385;d.rect('worker'+i,x,y,170,110,s===2&&i===6?P.redLight:P.greenLight,s===2&&i===6?P.red:P.green,12);d.text('data'+i,x+85,y+65,s?'100 GB':'10 TB',30);}d.text('time',640,635,s?'~50 s ideal read':'5,000 s ideal read',35,P.orange);},'Begin with the same aggregation over 10 TB rather than 10 MB. At an assumed 2 GB/s, a single ideal scan takes 5,000 seconds. 100 independent readers of 100 GB each need 50 seconds before overhead. The diagram samples eight workers from that larger hypothetical cluster. Ask what else distribution changes. Expected: working set per worker, network movement, coordination, and partial failure. It is a capacity calculation, not a benchmark or guaranteed speedup.',{title:"The same count with more workers",kind:'title',minutes:3}),
scene('Partitioning',['Keys','Assigned partitions','Point query'],(d,s)=>partitionDraw(d,s),'Explain how the same key is always sent to the same partition during a job. Ask what must be true for records with the same grouping key. Expected: the operation must bring them together or combine correct partial results. Move names into four owners, then route kim to one. Explain that partitioning a job is distinct from making replicas: partitions divide the data. Replicas keep extra copies so other machines can serve requests or survive a failure.',{kind:'definition',term:'Partitioning',definition:'Dividing data into subsets so each worker handles part of the collection.',demo:'viz-part',minutes:4}),
scene('Hash routing',['Names','Hash owners','Point lookup','Range query'],(d,s)=>partitionDraw(d,s,'hash'),'Predict kim’s owner using the toy character-sum hash modulo four, then reveal the point lookup. Ask how to find every key from dee through fay without an ordering property. Expected: consult all hash partitions, though only some contain matches. A good hash spreads distinct keys. It does not promise equal row counts when key frequencies are uneven. The toy hash is deliberately transparent, not a recommended production hash.',{demo:'viz-part',minutes:3}),
scene('Range routing',['Names','Sorted ranges','Point lookup','Range query'],(d,s)=>partitionDraw(d,s,'range'),'Keep the same twelve keys so students can isolate the routing rule. Both designs can route a known point to one owner. Reveal the range query and ask why only the d–f interval is needed. Expected: neighboring keys are stored together. Discuss split-point selection and write hotspots before comparing a time-based scan with an equality-heavy aggregation. Range partitions preserve locality but may need active rebalancing.',{demo:'viz-part',minutes:3}),
scene("Map is local computation",["One input record", "Two occurrences", "Two emitted pairs"],mapLocal,"This fictional club lunch order requests two meals. The runtime assigns input records to tasks. The user map function transforms each record. Normalization keeps both occurrences. Each emitted value represents one requested meal.",{clarityNative:true,minutes:3,sources:[MR_PAPER,'lectures/lecture-13/distributed.html']}),
scene('Reduce sees the complete group',['Input orders','Map occurrences','Shuffle groups','Reduce totals'],physicalShuffle,'Trace the shared lunch fixture from two input orders to pizza 3 and salad 1. Map emits each occurrence, shuffle gathers matching keys, and reduce sums each complete group. The trace adapter supplies the shared build data. Retain every real contribution when placement changes.',{demo:'viz-mr',minutes:6}),
scene("Shuffle manufactures locality",["Local output regions", "Share file locations", "Fetch and group"],physicalShuffle,"Google\u2019s original implementation buffers map outputs, then writes intermediate regions on local disks. Each reducer reads its region from all map tasks. Sorting groups equal keys. The master forwards locations, not the intermediate payload. See paper section 3.1.",{clarityNative:true,minutes:5,sources:[MR_PAPER,'lectures/lecture-13/distributed.html'],title:"Shuffle moves files before reduce"}),
scene("Reduce network bytes early",["Four occurrence pairs", "Optional local sum", "Global sum"],localCombiner,"A combiner is an optional optimization. A local partial sum replaces two pizza pairs with one pair of weight two. All four meal requests remain represented. Global reduction is still necessary. See paper section 4.3.",{clarityNative:true,minutes:4,sources:[MR_PAPER,'lectures/lecture-13/distributed.html'],title:"Optional combiners preserve contribution weights"}),
scene("Preserve sum and count",["Unequal groups", "Wrong average of averages", "Keep sufficient partials", "Divide after merging"],averagePartials,"Each record describes one completed food delivery. Map task M0 reads records A and B, each showing ten minutes. Map task M1 reads record C, showing forty minutes. The correct average is twenty minutes. Preserve total minutes and delivery count through partial aggregation.",{clarityNative:true,minutes:4,sources:[MR_PAPER,'lectures/lecture-13/distributed.html']}),
scene('Skew creates idle time',['Uniform','40 percent hot','80 percent hot'],(d,s)=>{const share=[0,.4,.8][s],hot=8000*share,rest=(8000-hot)/8,max=hot+rest;for(let i=0;i<8;i++){const rows=rest+(i===0?hot:0);d.text('worker'+i,155,266+i*46,'W'+i,23);d.rect('idle'+i,225,244+i*46,max/8,28,P.line,'none');d.rect('work'+i,225,244+i*46,rows/8,28,i===0&&s?P.orange:P.green,'none');d.text('count'+i,1110,268+i*46,rows.toLocaleString(),25);}d.text('share',640,635,(share*100)+'% hot key',33,P.orange);},'Ask whether adding workers fixes one key carrying 40% of the rows. Expected: not if all rows for that key still go to one worker. At 40%, worker 0 gets 3,800 rows and the others 600. The total remains 8,000.\n\nExplain that the bars assume equal work per row. Grey area is waiting at the barrier, not literal measured utilization. A long-running task can also reflect slow hardware or an expensive per-row function.',{demo:'viz-skew',minutes:3}),
scene('Salt and combine',['One key, 100 records','Assign suffixes, then route','Count groups, then remove suffixes','Regroup and add partial counts'],saltAndCombine,'Ask students to split a hot count without losing correctness. Expected: add a salt, compute independent partial counts, then aggregate by the original key. Reveal 25 per bucket and final 100. Ask whether the same trick works for an average.\n\nExpected: retain sum and count, then combine. Averaging averages is wrong when bucket sizes differ. Salting adds another aggregation and is only valid when the operator can combine partial results correctly.',{clarityNative:true,minutes:4}),
scene("Rerun maps when local files disappear",["Completed local output", "Worker failure", "Repeat the map task", "Fetch replacement output"],lostMapFiles,"Maya saves the original lunch order in a shared club folder. Map task M0 processes group 0 and writes two pizza values on her laptop. Her laptop fails before the pizza reducer reads that temporary file. Another worker reads the saved order and repeats M0 to recreate the missing values. The original Google implementation stores map output locally and completed reduce output in the shared file system. See paper section 3.3.",{clarityNative:true,minutes:5,sources:[MR_PAPER,'lectures/lecture-13/distributed.html']}),
scene("Count one logical task contribution",["Logical task identity", "Repeated attempt", "One accepted input", "Same final count"],acceptedAttempts,"Deterministic task code and controlled output commits preserve the sequential result. A reducer consumes one output for each logical map task. Different reducers can consume different successful attempts. Output accounting does not make arbitrary external side effects exactly once. See paper sections 3.3 and 4.5.",{clarityNative:true,minutes:4,sources:[MR_PAPER,'lectures/lecture-13/distributed.html']}),
scene("Distinguish retries from new orders",["Predict three changes", "Placement and retry", "A separate new input"],transferCount,"Use the original lunch count as the baseline. Changing partition count and retrying an existing map task preserve its result. A newly submitted third order with identical text is a separate input record. Its two pizza requests must be counted.",{clarityNative:true,minutes:3,sources:[MR_PAPER,'lectures/lecture-13/distributed.html'],kind:"activity"}),
scene("Preview Spark and Ray",["Keep today\u2019s contract", "Spark data plans", "Ray Python tasks"],enginePreview,"Spend only three minutes on this preview. Lecture 13B explains Spark execution, dependencies, caching, Ray tasks, and stateful actors. Here compare only the programming interfaces. Spark provides grouping operators. Ray Core schedules tasks, while application code combines this example\u2019s returned counts.",{clarityNative:true,minutes:3,sources:['lectures/lecture-13/spark-ray.html','https://spark.apache.org/docs/latest/rdd-programming-guide.html','https://docs.ray.io/en/latest/ray-core/tasks.html']}),
scene("Place move recover",["Map occurrences", "Shuffle groups", "Reduce weights", "Recover task output"],mapreduceRecap,"Return to the fictional lunch orders and the MapReduce contract. Map preserves occurrences, shuffle gathers matching keys, reduce combines their values, and recovery restores task output. The offline lab implements the count. Spark and Ray extensions are optional and receive detailed treatment in Lecture 13B.",{clarityNative:true,minutes:3,sources:[MR_PAPER,'lectures/lecture-13/distributed.html'],kind:"recap",title:"Preserve the count through movement and failure"})
]);
function tabletDraw(d,s){const count=s===0?[3,3,3,3]:s===1?[0,0,0,12]:s===2?[0,0,0,6,6]:[0,0,0,6,18];count.forEach((n,i)=>{const w=count.length===4?210:175,x=120+i*(w+28);d.rect('tablet'+i,x,315,w,270,P.white,P.line,12);d.rect('fill'+i,x+22,553-n*10,w-44,n*10,n===Math.max(...count)&&s?P.orangeLight:P.greenLight,n===Math.max(...count)&&s?P.orange:P.green,4);d.text('range'+i,x+w/2,275,(i===count.length-1?'t…':['a–g','h–m','n–s','t–u'][i]),29);d.text('n'+i,x+w/2,625,String(n),35);});}
function bloomHash(key){let a=0,b=0,c=0;[...key].forEach((ch,i)=>{const n=ch.charCodeAt(0);a=(a*31+n)%32;b=(b*17+n*7)%32;c=(c*13+n*(i+3))%32;});return[a,b,c];}
function bloomDraw(d,s){const inserted=s?['k1','k2','k3','k4','k5','k6']:[],bits=new Set(inserted.flatMap(bloomHash)),q=s<2?'k1':s===2?'k7':'k17',hs=bloomHash(q);for(let i=0;i<32;i++){const x=170+(i%16)*59,y=335+Math.floor(i/16)*83;d.box('bit'+i,x,y,46,53,bits.has(i)?'1':'0',bits.has(i)?P.greenLight:P.white,hs.includes(i)&&s>1?P.orange:P.line,27);}d.text('query',640,295,s<2?'k1…k6':q,43,s>1?P.orange:P.ink);if(s>1){d.text('answer',640,570,s===2?'0 → ∅':'1 · 1 · 1 → ?',45,s===2?P.green:P.orange);}if(s===4){d.arrow('read',775,565,980,565,P.orange);d.text('absent',1070,578,'∅',47,P.red);}}
const bigtablePaper = 'https://www.usenix.org/legacy/event/osdi06/tech/chang/chang.pdf';
const bansalLsm = 'https://vivekbansal.substack.com/p/what-is-lsm-tree';
const heliusLsm = 'https://www.helius.dev/blog/lsm-tree-explained';
const bigtableQuote = [
  '“Bigtable is a distributed storage system for managing',
  'structured data that is designed to scale to a very large size:',
  'petabytes of data across thousands of commodity servers.',
  'Many projects at Google store data in Bigtable, including',
  'web indexing, Google Earth, and Google Finance.”'
];
const bigtableGoals = [
  [
    ['explain how Bigtable distributes a growing table across servers', 'and why the choice of row keys can concentrate writes.'],
    ['judge whether Bigtable’s NoSQL data model fits an application that', 'needs key lookups, range scans, joins, or transactions across rows.'],
    ['explain how an LSM tree protects a write, turns a memory batch into', 'a sorted file, and preserves current reads when files merge.']
  ],
  [
    ['use a Bloom filter to decide when a lookup can skip a sorted file', 'and when it must check the key.'],
    ['write BigQuery queries that count crawl visits and identify', 'when a school changes the words in its link.']
  ]
];
// One value per page key in this teaching example. All newer writes go into B.
const crawlWriteOrder = [['r3', 'Mars map'], ['r1', 'CNN morning'], ['r2', 'Moon map']];
const crawlFileA = [...crawlWriteOrder].sort(([left], [right]) => left.localeCompare(right));
const crawlFileB = [['r1', 'CNN noon'], ['r3', 'DELETE']];
const crawlFileC = [crawlFileB[0], crawlFileA[1]];

function lsmRecords(d, id, x, y, width, title, rows, focusKey) {
  const titleHeight = 44, headerHeight = 34, rowHeight = 42;
  d.rect(id+'-title-box', x, y, width, titleHeight, P.greenLight, P.green, 5);
  d.text(id+'-title', x+16, y+titleHeight/2, title, 25, P.ink, 'start', 650);
  d.text(id+'-key-heading', x+16, y+titleHeight+headerHeight/2, 'Key', 20, P.muted, 'start');
  const valueHeading = rows.some(([,value]) => value==='DELETE') ? 'Value or marker' : 'Page contents';
  d.text(id+'-value-heading', x+96, y+titleHeight+headerHeight/2, valueHeading, 20, P.muted, 'start');
  rows.forEach(([key, value], index) => {
    const top = y+titleHeight+headerHeight+index*rowHeight;
    const row = id+'-'+key;
    d.rect(row+'-cell', x, top, width, rowHeight, key===focusKey ? P.orangeLight : P.white, P.line, 0, 1);
    d.text(row+'-key', x+16, top+rowHeight/2, key, 24, P.ink, 'start', 650);
    d.text(row+'-value', x+96, top+rowHeight/2, value, 24, value==='DELETE' ? P.red : P.ink, 'start');
  });
}

function lsmStatus(d, id, x, y, width, title, detail, color) {
  d.rect(id+'-box', x, y, width, 106, P.white, color, 7, 2);
  d.text(id+'-title', x+width/2, y+33, title, 26, color, 'middle', 650);
  d.text(id+'-detail', x+width/2, y+76, detail, 22, P.ink);
}

function drawLsmWrite(d, step) {
  if (step === 5) return drawLsmOverview(d);
  if (step === 0) {
    lsmRecords(d, 'writes', 55, 241, 323, 'Write arrival order', crawlWriteOrder);
    d.box('branch', 709, 211, 230, 65, 'B+ tree index', P.blueLight, P.blue, 27);
    crawlFileA.forEach(([key, value], i) => {
      const x = 437+i*263;
      d.arrow('route-'+key, 774+i*50, 278, x+116, 376, P.blue, 3);
      d.rect('leaf-'+key, x, 386, 232, 122, P.white, P.orange, 6, 2);
      d.text('leaf-'+key+'-title', x+116, 416, 'Leaf page '+(i+1), 24, P.orange, 'middle', 650);
      d.text('leaf-'+key+'-key', x+22, 468, key, 24, P.ink, 'start', 650);
      d.text('leaf-'+key+'-value', x+77, 468, value, 22, P.ink, 'start');
    });
    d.text('write-consequence', 640, 598, 'Here the three updates change three different leaf pages in memory.', 25, P.ink);
    return;
  }
  if (step === 3) {
    d.text('tree-plain-title', 325, 211, 'Plain binary search tree', 27, P.ink, 'middle', 650);
    d.text('tree-balanced-title', 955, 211, 'Balanced binary search tree', 27, P.ink, 'middle', 650);
    d.line('separate-trees', 640, 219, 640, 538, P.line, 2);
    d.line('plain-r3-r1', 347, 284, 249, 371, P.orange, 4);
    d.line('plain-r1-r2', 249, 371, 347, 458, P.orange, 4);
    d.line('balanced-r2-r1', 955, 284, 841, 371, P.line, 3);
    d.line('balanced-r2-r3', 955, 284, 1069, 371, P.line, 3);
    function node(id, key, x, y, visited) {
      d.circle(id, x, y, 30, visited ? P.orangeLight : P.white, visited ? P.orange : P.line, 3);
      d.text(id+'-key', x, y, key, 25, P.ink, 'middle', 650);
    }
    node('plain-r3', 'r3', 347, 284, true);
    node('plain-r1', 'r1', 249, 371, true);
    node('plain-r2', 'r2', 347, 458, true);
    node('balanced-r2', 'r2', 955, 284, true);
    node('balanced-r1', 'r1', 841, 371, false);
    node('balanced-r3', 'r3', 1069, 371, false);
    d.text('plain-cost', 325, 539, 'Find r2 in 3 comparisons.', 25, P.ink);
    d.text('balanced-cost', 955, 539, 'Find r2 in 1 comparison.', 25, P.ink);
    d.text('tree-order', 640, 604, 'Both trees yield r1, r2, r3 in order. A memtable can also use a skip list.', 24, P.muted);
    return;
  }
  const walX = 55, memoryX = 471, fileX = 887, width = 338;
  lsmRecords(d, 'wal', walX, 236, width, 'Write-ahead log', crawlWriteOrder, 'r2');
  d.text('wal-order', walX, 481, 'Append in arrival order.', 23, P.muted, 'start');
  const waiting = step === 1;
  const frozen = step === 4;
  const memory = waiting ? crawlFileA.filter(([key]) => key!=='r2') : crawlFileA;
  lsmRecords(d, 'mem', memoryX, 236, width, frozen ? 'Frozen memtable' : 'Active memtable', memory, 'r2');
  d.text('mem-order', memoryX, 481, 'Keep entries in key order.', 23, P.muted, 'start');
  d.arrow('log-to-ram', walX+width+8, 346, memoryX-10, 346, P.blue, 3);
  if (frozen) {
    d.text('wal-location', walX, 203, 'On disk', 22, P.muted, 'start');
    d.text('ram-location', memoryX, 203, 'In memory', 22, P.muted, 'start');
    d.text('file-location', fileX, 203, 'On disk', 22, P.muted, 'start');
    lsmRecords(d, 'file-a', fileX, 236, width, 'SSTable A · level 0', crawlFileA, 'r2');
    d.text('file-a-order', fileX, 481, 'Write one sorted file.', 23, P.muted, 'start');
    d.arrow('flush-to-a', memoryX+width+8, 346, fileX-10, 346, P.green, 3);
    d.text('next-write', walX, 580, 'Next crawler write', 25, P.ink, 'start');
    d.arrow('next-batch', walX+247, 580, memoryX-10, 580, P.blue, 3);
    d.box('new-active', memoryX, 548, width, 65, 'New active memtable', P.blueLight, P.blue, 24);
  } else {
    lsmStatus(d, 'reply', fileX, 297, width, waiting ? 'Reply pending' : 'Reply to the crawler',
      waiting ? 'Insert r2 into memory next.' : 'Saved r2 = Moon map', waiting ? P.orange : P.green);
    if (!waiting) d.arrow('confirm-r2', memoryX+width+8, 346, fileX-10, 346, P.green, 3);
    d.text('recovery', 640, 583, waiting ? 'The new log record for r2 is durable.' :
      'If the server loses memory now, recovery can replay the durable log.', 25, P.ink);
  }
}

function drawLsmCompaction(d, step) {
  const focus = step===2 ? 'r3' : 'r1';
  lsmRecords(d, 'file-a', 66, 189, 421, 'SSTable A · older level 0 file', crawlFileA, focus);
  lsmRecords(d, 'file-b', 66, 416, 421, 'SSTable B · newer level 0 file', crawlFileB, focus);
  d.line('merge-a', 496, 295, 550, 295, P.green, 3);
  d.line('merge-b', 496, 493, 550, 493, P.green, 3);
  d.line('join-inputs', 550, 295, 550, 493, P.green, 3);
  d.arrow('to-output', 550, 395, 676, 395, P.green, 3);
  if (step === 0) {
    lsmStatus(d, 'choice', 694, 341, 498, 'Build SSTable C', 'Which value should C keep for r1?', P.orange);
  } else {
    lsmRecords(d, 'file-c', 694, 274, 498,
      step===1 ? 'SSTable C · merge in progress' : 'SSTable C · published at level 1', crawlFileC,
      step===1 ? 'r1' : undefined);
    d.text('output-status', 695, 495, step===1 ? 'Next, compare both records for r3.' : 'r3 is absent from the output.', 23, P.ink, 'start');
  }
  const notes = [
    'B holds the later write for each key that appears in both files.',
    'Take r1 from B and r2 from A. Both input files remain readable during the merge.',
    'This merge covers every older r3 record, and no reader needs an earlier version.'
  ];
  d.text('merge-condition', 640, 636, notes[step], 23, P.muted);
}

function drawLsmRead(d, step) {
  const xMem = 55, xB = 471, xA = 887, width = 338;
  d.text('read-time', 55, 212, 'Current lookup for r2 before the merge publishes C', 28, P.ink, 'start', 650);
  lsmStatus(d, 'mem', xMem, 320, width, 'Active memtable', 'Empty after the second flush', P.blue);
  if (step === 0) {
    lsmStatus(d, 'file-b', xB, 320, width, 'Read B · newer file', 'Contains r1 and r3', P.orange);
    lsmStatus(d, 'file-a', xA, 320, width, 'Read A · older file', 'Find r2 = Moon map', P.green);
  } else {
    lsmStatus(d, 'file-b', xB, 320, width, 'Bloom filter for B', 'Definitely absent · skip B', P.green);
    if (step === 1) {
      lsmStatus(d, 'file-a', xA, 320, width, 'SSTable A · older', 'Test its filter next.', P.orange);
    } else {
      lsmRecords(d, 'file-a', xA, 297, width, 'SSTable A · older', crawlFileA, 'r2');
      d.text('file-a-filter', xA, 262, 'A’s filter says “possibly present.”', 21, P.muted, 'start');
    }
  }
  d.arrow('next-b', xMem+width+8, 373, xB-10, 373, P.blue, 3);
  d.arrow('next-a', xB+width+8, 373, xA-10, 373, P.green, 3);
  if (step===2) {
    d.arrow('return-r2', xA+width/2, 512, xA+width/2, 543, P.green, 3);
    d.box('read-result', xA, 553, width, 59, 'Return Moon map', P.greenLight, P.green, 26);
    d.text('after-publish', xMem, 520, 'After compaction publishes C', 23, P.muted, 'start');
    d.box('new-file-set', xMem, 553, 263, 59, 'Look up r2 in C', P.blueLight, P.blue, 24);
    d.arrow('new-lookup', xMem+274, 582, xMem+349, 582, P.green, 3);
    d.box('new-result', xMem+362, 553, 318, 59, 'Return Moon map', P.greenLight, P.green, 26);
  } else {
    d.text('read-question', 640, 563, step===0 ? 'Both file ranges cover r2. Without filters, this lookup opens both files.' :
      'B’s filter rules out r2 without reading B’s data blocks.', 25, P.ink);
  }
}

function bigtableDefinition(d) {
  d.line('quote-rule', 90, 206, 90, 467, P.green, 4);
  bigtableQuote.forEach((line, i) => d.text('quote-line-' + i, 120, 233 + i * 51, line, 34, P.ink, 'start'));
  d.text('paper-authors', 120, 535, 'Fay Chang et al., OSDI 2006, abstract', 24, P.muted, 'start');
  d.link('paper-source', 120, 578, 'Bigtable: A Distributed Storage System for Structured Data', bigtablePaper, 25);
}
function drawLsmOverview(d) {
  d.rect('overview-memory-area', 55, 192, 1170, 145, P.blueLight, P.blue, 10);
  d.rect('overview-storage-area', 55, 390, 1170, 246, P.white, P.green, 10);
  d.text('overview-memory-heading', 78, 218, 'Working memory', 26, P.blue, 'start', 650);
  d.text('overview-storage-heading', 78, 419, 'Durable storage', 26, P.green, 'start', 650);
  d.text('overview-layout', 1198, 419, 'One possible leveled layout', 22, P.muted, 'end');

  d.box('overview-active', 103, 254, 290, 58, 'Active memtable', P.white, P.blue, 27);
  d.arrow('overview-freeze', 410, 283, 552, 283, P.blue, 3);
  d.text('overview-freeze-label', 481, 260, 'Freeze', 22, P.blue);
  d.box('overview-frozen', 568, 254, 275, 58, 'Frozen memtable', P.white, P.blue, 27);
  d.arrow('overview-flush', 706, 318, 706, 440, P.green, 3);
  d.text('overview-flush-label', 729, 363, 'Flush each batch', 23, P.green, 'start');

  d.rect('overview-wal', 99, 478, 284, 104, P.orangeLight, P.orange, 7);
  d.text('overview-wal-heading', 241, 511, 'Write-ahead log', 26, P.ink, 'middle', 650);
  d.text('overview-wal-function', 241, 551, 'Replay after a crash', 22, P.ink);
  d.text('overview-l0', 694, 467, 'Level 0 · immutable files', 24, P.ink, 'middle', 650);
  d.box('overview-a', 588, 494, 212, 46, 'A · first flush', P.greenLight, P.green, 22);
  d.box('overview-b', 588, 553, 212, 46, 'B · next flush', P.greenLight, P.green, 22);
  d.line('overview-a-input', 808, 517, 873, 546, P.green, 3);
  d.line('overview-b-input', 808, 576, 873, 546, P.green, 3);
  d.arrow('overview-merge', 873, 546, 973, 546, P.green, 3);
  d.text('overview-merge-label', 903, 513, 'Compact', 22, P.green);
  d.text('overview-l1', 1091, 467, 'Level 1', 24, P.ink, 'middle', 650);
  d.box('overview-c', 985, 515, 212, 62, 'C · merged file', P.greenLight, P.green, 22);
}

function bigtableLearningGoals(d, step) {
  bigtableGoals[step].forEach((lines, i) => {
    const key = 'goal-' + (step * 3 + i);
    const y = 230 + i * 135;
    d.circle(key + '-bullet', 91, y, 6, P.green);
    lines.forEach((line, j) => d.text(key + '-line-' + j, 118, y + j * 43, line, 30, P.ink, 'start'));
  });
}
function webTable(d, step) {
  const rowKeys = ['com.cnn.www', 'org.example.www'];
  const centers = [350, 930];
  if (step === 0) {
    d.text('page-heading', 350, 330, 'Page fetched', 29, P.ink);
    d.box('address', 170, 380, 360, 66, 'www.cnn.com', P.white, P.line, 29);
    d.arrow('form-key', 555, 413, 721, 413, P.blue, 3);
    d.text('row-heading', 930, 330, 'Row key', 29, P.ink);
    d.box('row-0', 750, 380, 360, 66, rowKeys[0], P.greenLight, P.green, 29);
    return;
  }
  const ranges = ['Row keys before org', 'Row keys from org onward'];
  rowKeys.forEach((key, i) => {
    const selected = step === 2 && i === 0;
    const x = centers[i];
    d.rect('server-' + i, x - 265, 300, 530, 236, P.white, selected ? P.orange : P.line, 12, selected ? 4 : 2);
    d.text('server-name-' + i, x, 351, 'Server ' + (i + 1), 32, P.ink);
    d.text('range-' + i, x, 397, ranges[i], 26, P.muted);
    d.box('row-' + i, x - 180, 428, 360, 66, key, selected ? P.orangeLight : P.greenLight, selected ? P.orange : P.green, 29);
  });
  if (step === 2) {
    d.box('lookup', 175, 185, 350, 60, 'Update com.cnn.www', P.blueLight, P.blue, 27);
    d.arrow('route', 350, 251, 350, 290, P.blue, 4);
  }
}
function cnnWebtableRow(d, step) {
  const selectCell = step >= 1;
  const left = 65, contentsStart = 345, anchorStart = 695, right = 1215;
  const headerTop = 335, rowTop = 462, bottom = 547;
  const rowCenter = (left + contentsStart) / 2;
  const contentsCenter = (contentsStart + anchorStart) / 2;
  const anchorCenter = (anchorStart + right) / 2;

  d.text('source-heading', rowCenter, 247, 'Crawler reads', 27, P.muted);
  d.rect('page-source', contentsStart + 8, 196, anchorStart - contentsStart - 16, 98, P.white, P.line, 8);
  d.text('page-source-site', contentsCenter, 226, 'www.cnn.com', 27, P.ink, 'middle', 650);
  d.text('page-source-value', contentsCenter, 266, 'CNN’s home page HTML', 24, P.ink);
  d.rect('link-source', anchorStart + 8, 196, right - anchorStart - 16, 98, P.white, P.line, 8);
  d.text('link-source-site', anchorCenter, 226, 'cnnsi.com', 27, P.ink, 'middle', 650);
  d.text('link-source-target', anchorCenter, 266, '“CNN” links to www.cnn.com', 24, P.ink);
  d.arrow('store-page', contentsCenter, 298, contentsCenter, headerTop - 6, P.blue, 3);
  d.arrow('store-link', anchorCenter, 298, anchorCenter, headerTop - 6, P.blue, 3);

  d.rect('row-table', left, headerTop, right - left, bottom - headerTop, P.white, P.line, 0);
  d.rect('row-key-cell', left, rowTop, contentsStart - left, bottom - rowTop, P.blueLight, P.blue, 0, 2);
  if (selectCell) {
    d.rect('selected-column', anchorStart, headerTop, right - anchorStart, rowTop - headerTop, P.greenLight, P.green, 0, 2);
    d.rect('selected-cell', anchorStart, rowTop, right - anchorStart, bottom - rowTop, P.orangeLight, P.orange, 0, 3);
  }
  d.line('contents-divider', contentsStart, headerTop, contentsStart, bottom, P.line, 2);
  d.line('anchor-divider', anchorStart, headerTop, anchorStart, bottom, P.line, 2);
  d.line('header-divider', left, rowTop, right, rowTop, P.line, 2);
  d.text('row-key-label', rowCenter, 400, 'Row key', 26, P.blue);
  d.text('row-key', rowCenter, 506, 'com.cnn.www', 31, P.blue, 'middle', 650);
  d.text('contents-label', contentsCenter, 364, 'Column', 23, P.muted);
  d.text('contents-column', contentsCenter, 400, 'contents:', 29, P.ink, 'middle', 650);
  d.text('contents-value', contentsCenter, 506, 'CNN’s HTML', 28, P.ink);
  d.text('anchor-label', anchorCenter, 364, 'Column', 23, P.muted);
  d.text('anchor-column', anchorCenter, 400, 'anchor:cnnsi.com', 29, P.ink, 'middle', 650);
  if (selectCell) {
    d.text('family', 825, 437, 'Column family: anchor', 22, P.green);
    d.text('qualifier', 1080, 437, 'Qualifier: cnnsi.com', 22, P.green);
    d.text('cell-label', anchorCenter, 486, 'Selected cell', 22, P.orange);
  }
  d.text('link-text', anchorCenter, selectCell ? 521 : 506, '“CNN”', 30, P.ink, 'middle', 650);
  if (step === 2) {
    d.arrow('select-version', anchorCenter, bottom + 5, anchorCenter, 578, P.orange, 3);
    d.box('version', anchorStart, 584, right - anchorStart, 62, 'Timestamp t9 → stored bytes b"CNN"', P.white, P.orange, 25);
  }
}

function webPagesAndStoredCells(d) {
  const pages = [
    ['r1', 'CNN’s home page', 'www.cnn.com/', 'anchor:example, contents:'],
    ['r2', 'Moon article', 'science.example/moon', 'anchor:news'],
    ['r3', 'Mars article', 'science.example/mars', 'anchor:example, contents:']
  ];
  const left = 80, right = 1200, top = 215, firstRow = 285, rowHeight = 110;
  const keyLeft = 545, columnsLeft = 725;
  const keyCenter = (keyLeft + columnsLeft) / 2;
  const bottom = firstRow + pages.length * rowHeight;
  d.rect('page-table', left, top, right - left, bottom - top, P.white, P.line, 0);
  d.rect('page-table-head', left, top, right - left, firstRow - top, P.greenLight, P.line, 0);
  d.line('key-divider', keyLeft, top, keyLeft, bottom, P.line, 2);
  d.line('columns-divider', columnsLeft, top, columnsLeft, bottom, P.line, 2);
  d.text('page-heading', left + 25, 250, 'Web page', 29, P.ink, 'start', 650);
  d.text('key-heading', keyCenter, 250, 'Row key', 29, P.ink, 'middle', 650);
  d.text('columns-heading', columnsLeft + 25, 250, 'Stored columns', 29, P.ink, 'start', 650);
  pages.forEach(([key, name, address, columns], i) => {
    const y = firstRow + i * rowHeight;
    d.line(key + '-divider', left, y, right, y, P.line, 2);
    d.text(key + '-name', left + 25, y + 37, name, 31, P.ink, 'start', 650);
    d.text(key + '-address', left + 25, y + 78, address, 27, P.muted, 'start');
    d.text(key + '-key', keyCenter, y + rowHeight / 2, key, 32, P.blue, 'middle', 650);
    d.text(key + '-columns', columnsLeft + 25, y + rowHeight / 2, columns, 30, P.ink, 'start');
  });
}

const crawlFields = ['visit_no', 'page_key', 'source_site', 'link_text'];
const crawlHistory = [
  [1, 'r2', 'school', 'Moon facts'],
  [2, 'r1', 'cnnsi.com', 'CNN'],
  [3, 'r2', 'school', 'Moon phases'],
  [4, 'r2', 'school', 'Moon phases'],
  [5, 'r2', 'school', 'Explore the Moon']
];
const crawlSqlFile = 'lectures/lecture-14/crawl-history.sql';

function bigQueryHistory(d, step) {
  const rowCount = [1, 3, 4, 5][step];
  d.text('table-name', 110, 223, 'crawl_history', 29, P.ink, 'start', 650);
  d.table('visits', 110, 262, [175, 190, 255, 435],
    [crawlFields, ...crawlHistory.slice(0, rowCount)], {
      rowHeight: 52, fontSize: 27,
      highlightRows: step === 2 ? [3, 4] : [],
      highlightCols: step === 3 ? [1] : []
    });
  d.text('history-note', 110, 620, [
    'visit_no orders observations in this example.',
    'Each row records the page, the source of the link, and the words the crawler saw.',
    'Two observations can contain the same words.',
    'To count visits by page, read page_key across the five rows.'
  ][step], 23, P.muted, 'start');
}

function drawGoogleSql(d, lines, highlights) {
  d.text('sql-heading', 69, 211, 'GoogleSQL', 27, P.ink, 'start', 650);
  d.rect('query-panel', 54, 242, 557, lines.length * 30 + 30, P.white, P.line, 6);
  lines.forEach((line, i) => {
    const y = 270 + i * 30;
    if (highlights.includes(i)) d.rect('query-emphasis-' + i, 61, y - 13, 541, 27, P.greenLight, 'none', 3);
    d.add('query-line-' + i, 'text', {
      x: 72, y, fill: P.ink, 'font-size': 22, 'text-anchor': 'start',
      'dominant-baseline': 'middle', 'xml:space': 'preserve',
      style: 'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre'
    }, line);
  });
}

function bigQueryVisitCounts(d, step) {
  const query = [
    'SELECT page_key, COUNT(*) AS visits',
    'FROM crawl_history',
    'GROUP BY page_key',
    'ORDER BY visits DESC, page_key;'
  ];
  drawGoogleSql(d, query, [[1], [2], [0], [3], [0]][step]);
  const groups = ['r1', 'r2'].map(key => ({
    key, visits: crawlHistory.filter(row => row[1] === key).map(row => row[0])
  }));
  d.text('result-heading', 700, 211, [
    'Input rows', 'Groups', 'Counts before sorting', 'Query result', 'Query result'
  ][step], 27, P.ink, 'start', 650);
  if (step === 0) {
    d.table('visit-keys', 699, 242, [200, 242], [
      ['visit_no', 'page_key'], ...crawlHistory.map(row => row.slice(0, 2))
    ], {rowHeight: 55, fontSize: 26, highlightCols: [1]});
  } else if (step === 1) {
    d.table('grouped-visits', 699, 242, [187, 325], [
      ['page_key', 'visit numbers'], ...groups.map(group => [group.key, group.visits.join(', ')])
    ], {rowHeight: 65, fontSize: 26});
  } else {
    if (step >= 3) groups.sort((a, b) => b.visits.length - a.visits.length || a.key.localeCompare(b.key));
    d.table('count-results', 699, 242, [200, 242], [
      ['page_key', 'visits'], ...groups.map(group => [group.key, group.visits.length])
    ], {rowHeight: 65, fontSize: 29, highlightRows: step >= 3 ? [1] : []});
    if (step === 4) {
      d.text('repeat-one', 700, 503, 'Visit 3: Moon phases', 26, P.ink, 'start');
      d.text('repeat-two', 700, 549, 'Visit 4: Moon phases', 26, P.ink, 'start');
    }
  }
}

function bigQueryLinkChanges(d, step) {
  const query = [
    'WITH history AS (',
    '  SELECT visit_no, link_text,',
    '    LAG(link_text) OVER (',
    '      ORDER BY visit_no) AS prior_text',
    '  FROM crawl_history',
    "  WHERE page_key = 'r2'",
    "    AND source_site = 'school'",
    ')',
    'SELECT visit_no, prior_text, link_text',
    'FROM history',
    'WHERE prior_text <> link_text',
    'ORDER BY visit_no;'
  ];
  drawGoogleSql(d, query, [[5,6], [2,3], [10], [8,11]][step]);
  const schoolVisits = crawlHistory.filter(row => row[1] === 'r2' && row[2] === 'school');
  const history = schoolVisits.map((row, i) => [row[0], i ? schoolVisits[i - 1][3] : null, row[3]]);
  d.text('result-heading', 640, 211, [
    'School links to r2', 'Adjacent observations', 'Compare the words', 'Query result'
  ][step], 27, P.ink, 'start', 650);
  if (step === 0) {
    d.table('school-visits', 640, 242, [155, 290], [
      ['visit_no', 'link_text'], ...schoolVisits.map(row => [row[0], row[3]])
    ], {rowHeight: 61, fontSize: 26});
  } else {
    const shown = step === 3 ? history.filter(([,prior,current]) => prior !== null && prior !== current) : history;
    d.table('changes', 640, 242, [105, 229, 242], [
      ['visit_no', 'prior_text', 'link_text'], ...shown.map(([visit,prior,current]) => [visit,prior ?? 'NULL',current])
    ], {rowHeight: 59, fontSize: 23, highlightRows: step === 2 ? [3] : []});
  }
}
register(14,'Bigtable, LSM Trees, Bloom Filters & BigQuery','2026-11-17','lectures/lecture-14/bigtable.html',[
scene('Bigtable, LSM Trees, Bloom Filters & BigQuery', ['The original Bigtable paper'], bigtableDefinition,
  bigtableQuote.join(' '),
  {id:'bigtable-definition', clarityNative:true, sources:[bigtablePaper],
   teaching:{
     idea:'Bigtable lets applications use one table even when its data must span many servers.',
     builds:[bigtableQuote.join(' ') + '\n\nPoint to web indexing in the authors’ examples. Ask the class to picture a crawler saving CNN’s home page twice in one day.'],
     question:'One server can store both copies of CNN’s home page. What changes as the crawler visits more sites?',
     answer:'The growing crawl can exceed one server’s storage capacity or its ability to keep up with writes.'
   }}),
scene('Learning goals', ['Row keys, queries, and writes', 'Bloom filters and BigQuery'], bigtableLearningGoals,
  'Follow one crawler update into a sorted file. Decide which files a lookup can skip. Then use the history of crawler visits to answer questions about many observations.',
  {id:'bigtable-learning-goals', clarityNative:true, sources:['lectures/lecture-14/bigtable.html#plan'],
   teaching:{
     idea:'Trace what happens to a web page on each visit, then use BigQuery to find patterns across visits.',
     builds:bigtableGoals.map(group => group.map(lines => '• ' + lines.join(' ')).join('\n\n')),
     question:'The crawler returns in the afternoon and finds a new headline. What can it use to find the same row?',
     answer:'The web address stays the same across visits. The crawler can use that address to build the same row key.'
   }}),
scene('Find the row for one web page', ['Name one page', 'Split the growing table', 'Route the morning update'], webTable,
  'The Webtable example comes from the original Bigtable paper. The crawler names a row for its morning update, finds the assigned server, and sends the update there. The two keys and the boundary shown here illustrate one possible assignment.',
  {id:'organize-writes-differently', clarityNative:true}),
scene('A multidimensional map', ['Group facts about CNN', 'Select the link-text cell', 'Read a stored version'], cnnWebtableRow,
  'Figure 1 in the original paper shows the CNN row with several columns and timestamps. The slide follows the HTML and one incoming link. The reading’s separate Python example uses anchor:example, timestamp 1, and b"example link text" to model the same address. Cell timestamps identify versions within a cell.',
  {title:'Where does CNN’s incoming link text go?', clarityNative:true,
   sources:['lectures/lecture-14/bigtable.html#model','https://www.usenix.org/legacy/event/osdi06/tech/chang/chang.pdf#page=2']}),
scene('Three web pages and the five cells the crawler has stored so far', ['Count the stored cells'], webPagesAndStoredCells,
  'The example uses short keys for three web pages. Each column listed beside a key identifies one stored cell in that row.',
  {id:'web-pages-and-stored-cells', clarityNative:true, sources:['lectures/lecture-14/bigtable.html#sparse'],
   teaching:{
     idea:'Each web page has its own row, and different rows can hold values in different columns.',
     builds:['Trace CNN’s home page across the first row. Use r1 as a short name for the CNN row in this example. Count the stored columns for each page. CNN has two, the Moon article has one, and the Mars article has two. Together they account for all five cells.'],
     question:'A school adds a link to the Moon article. Which row should gain a cell for the words in that link?',
     answer:'Row r2 identifies the Moon article. The crawler adds anchor:school to r2, bringing the total to six stored cells.'
   }}),
scene('Sparse cells and versions',['Sparse cells','New qualifier','Another version'],(d,s)=>{const cells=[[0,0],[0,2],[1,1],[2,0],[2,3]];for(let r=0;r<3;r++)for(let c=0;c<4;c++){d.rect('cell'+r+c,300+c*175,290+r*86,145,63,P.white,P.line,4);if(cells.some(([a,b])=>a===r&&b===c)||(s>0&&r===1&&c===3))d.rect('data'+r+c,310+c*175,300+r*86,125,43,P.greenLight,P.green,3);}['r1','r2','r3'].forEach((v,i)=>d.text('row'+i,215,334+i*86,v,29));if(s>1){[0,1,2].forEach(i=>d.box('version'+i,840+i*20,320+i*36,190,58,'t'+(3-i),i?P.white:P.orangeLight,P.orange,27));}},'Ask whether a missing qualifier needs a reserved fixed-width slot. Expected: sparse storage can omit absent cells, unlike microdb’s fixed slot layout, though metadata itself still costs space. Add a qualifier to one row without drawing it for every other row. Then stack versions of a cell and ask which timestamp a read requests. Distinguish retaining versions from full MVCC transaction semantics and explain retention/garbage-collection policy.'),
scene('Tablets separate placement from storage',['Sorted ranges','Assigned servers','Shared durable files','Reassignment'],(d,s)=>{for(let i=0;i<4;i++){d.box('tablet'+i,150+i*270,270,210,85,['a–g','h–m','n–s','t…'][i],P.greenLight,P.green,31);d.box('server'+i,150+i*270,425,210,80,'server '+i,s===3&&i===1?P.redLight:P.white,P.line,27);if(s>0)d.arrow('assigned'+i,255+i*270,370,255+i*270,410,P.green);if(s>1)d.line('storage'+i,255+i*270,520,640,580,P.blue,2);}if(s>1)d.box('gfs',350,575,580,60,'replicated files',P.blueLight,P.blue,30);if(s===3)d.arrow('move',525,365,795,410,P.orange,5);},'Define a tablet as a contiguous row-key range and trace assignment to a tablet server. Ask why losing a server need not mean losing its durable data. Expected: the original architecture stores logs and SSTables in replicated GFS, with caches and in-progress state on tablet servers. Replay and reassignment still take work. Explain that partitioning divides the table while replication protects durable pieces. They solve distinct problems.',{kind:'definition',term:'Tablet',definition:'A contiguous range of row keys managed as a unit of placement and service.'}),
scene('Splitting cannot fix a moving hotspot',['Distributed writes','Timestamp tail','Split','Next burst'],tabletDraw,'Predict where a burst of increasing timestamp-prefixed keys lands. Reveal all writes at the tail, split that tablet, then send another burst. Expected: the newest range remains hot. A split changes size but not the direction of incoming writes.\n\nDiscuss hash prefixes or a different key order and the range-scan locality each sacrifices. The counts are a deterministic toy load model, not observed Bigtable throughput. Reversed domains group related pages but do not inherently distribute all traffic.',{demo:'viz-tablet'}),
scene('From scattered writes to a sorted file',
  ['Change three pages', 'Append in arrival order', 'Keep keys sorted in memory', 'Compare two tree shapes', 'Flush one sorted file', 'Connect memory and storage'],
  drawLsmWrite, 'Follow the contents of the same three pages from the write-ahead log to a sorted file. The words stand in for the saved page contents.',
  {id:'the-log-protects-memory', clarityNative:true,
   sources:['lectures/lecture-14/bigtable.html#lsm', bansalLsm, heliusLsm, bigtablePaper]}),
scene('Merge two sorted files',
  ['Compare the inputs', 'Resolve matching keys', 'Publish the output'],
  drawLsmCompaction, 'The two files in this example contain every older record for these keys. The example keeps only current contents. Read the inputs in key order and work out what each page should return.',
  {id:'lsm-merge-crawl-files', clarityNative:true,
   sources:['lectures/lecture-14/bigtable.html#lsm-compaction', bansalLsm, heliusLsm]}),
scene('Find the Moon page before and after the merge',
  ['Look up r2 without filters', 'Rule out file B', 'Check the stored entry'],
  drawLsmRead, 'Ask for the current Moon page while readers still use the two inputs. Repeat that lookup after publication. A Bloom filter helps choose a file. The stored entry supplies the result.',
  {id:'lsm-read-crawl-files', clarityNative:true,
   sources:['lectures/lecture-14/bigtable.html#lsm-lookup', bansalLsm, bigtablePaper]}),
scene('A one-sided membership test',['Empty bits','Insert six keys','Definite absence','Possible presence','False positive'],bloomDraw,'Define the Bloom filter, then set bits for k1 through k6 with three deterministic hashes. Ask what a zero among a query’s bits proves. Expected: the key is absent, provided inserted keys set their bits correctly and no shared bits were cleared. Reveal k7 as absent and k17 as all bits set despite never being inserted.\n\nThat false positive costs an extra file check. It must not lose data. Ordinary Bloom filters cannot clear a key’s shared bits safely when deleting.',{title:'How a Bloom filter can skip a sorted file',kind:'definition',term:'Bloom filter',definition:'A compact membership filter returning definitely absent or possibly present.',demo:'viz-bloom'}),
scene('Skip files then find a block',['Filter','Sparse index','One block','Cached block'],(d,s)=>{const xs=[235,640,1045];d.box('bloom',125,300,220,160,'010110',P.greenLight,P.green,33);d.table('sparse',470,285,[160,150],[['key','block'],['k1','0'],['k8','1'],['k16','2']],{rowHeight:58,fontSize:26,highlightRows:s>0?[2]:[]});for(let i=0;i<4;i++)d.rect('block'+i,930,275+i*70,225,54,i===1&&s>1?P.orangeLight:P.white,i===1&&s>1?P.orange:P.line,5);if(s>0)d.arrow('toindex',355,385,450,385,P.green);if(s>1)d.arrow('todisk',795,385,910,385,P.orange);if(s>2){d.box('cache',920,585,235,60,'cache ✓',P.greenLight,P.green,28);d.arrow('cacheline',1040,545,1040,577,P.green);}},'Ask what each tool eliminates: a Bloom filter can skip an absent file. A sparse index narrows a possible file to a block. A block cache avoids repeated disk reads. Expected: each avoids a different kind of work, and a read can use all three.\n\nA possible Bloom match is not proof of presence. The index must bound the key’s block correctly, then the engine checks actual entries and version visibility. Compaction reduces the number/ranges of files considered.',{title:'Find one key in a sorted file'}),
scene('A crawl history in BigQuery',
  ['Record one observation', 'Add two visits', 'Keep the repeated observation', 'Choose the column to scan'],
  bigQueryHistory, 'The crawler records a history of its observations for analysis. Use GoogleSQL to ask questions across those rows.',
  {id:'bigquery-crawl-history', clarityNative:true,
   sources:['lectures/lecture-14/bigtable.html#bigquery-crawl-history',crawlSqlFile,'https://docs.cloud.google.com/bigquery/docs/introduction','https://docs.cloud.google.com/bigquery/docs/multi-statement-queries'],
   teaching:{
     idea:'A BigQuery history table can hold one row per observation, including repeated observations about the same page.',
     builds:[
       'We have followed one lookup through the LSM tree and its Bloom filter. Now the crawler team wants to analyze many observations. BigQuery is Google’s analytical data warehouse. The team records a separate history for this purpose. The first row says the school linked to r2 using the words “Moon facts.”',
       'Visit 2 observes a link to CNN from cnnsi.com. Visit 3 observes the school’s link to the Moon article again. Each new observation adds a row. The example assigns consecutive visit numbers across both pages. Earlier Bigtable cell timestamps identified versions within a cell.',
       'Visits 3 and 4 both say “Moon phases.” Ask how many rows the crawler should keep if it wants to count visits. Keeping both rows lets the team measure how often it saw the link, even when the words stayed the same.',
       'Visit 5 adds the latest words. BigQuery stores table data in columns, so an analytical query can read just the columns it needs. Ask which column identifies the page on every row. The full example script creates this temporary table and runs two GoogleSQL queries.'
     ],
     question:'Which column would you read to count how often each page appeared in the crawl?',
     answer:'Read page_key for each observation. The link text and source site can be omitted from the count query.',
     context:'This five-row teaching example uses one unique visit_no per observation. The script populates the analytical table explicitly. Bigtable serves the earlier page lookups.'
   }}),
scene('How often did each page appear in the crawl?',
  ['Read the page keys', 'Group the observations', 'Count each group', 'Sort the results', 'Check a repeat visit'],
  bigQueryVisitCounts, 'Count observations per page with GROUP BY and COUNT(*). The repeated Moon link at visit 4 still contributes one row.',
  {id:'bigquery-count-visits', clarityNative:true,
   sources:['lectures/lecture-14/bigtable.html#bigquery-count-visits',crawlSqlFile,'https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions#count'],
   teaching:{
     idea:'Grouping observations by page and counting rows gives the number of visits for each observed page.',
     builds:[
       'Read the page_key column downward. The selected values are r2, r1, r2, r2, and r2. The visit numbers on the diagram help us follow the input. The count query itself needs only the page keys.',
       'GROUP BY gives each observed page a group. The r2 group contains visits 1, 3, 4, and 5. Visit 2 alone belongs to r1. Ask students to predict the count beside each page.',
       'COUNT(*) counts the rows in each group. The Moon article has four visits, and CNN has one. These intermediate counts have no guaranteed order.',
       'ORDER BY visits DESC puts the larger count first. The second sort key orders equal counts by page key. The displayed query returns two rows, one per observed page.',
       'Compare visits 3 and 4. The school pointed to the same article with the same words each time. Each visit still counts. Ask what other information a query would need to count changes in the wording.'
     ],
     question:'Why does the Moon article have four visits when only three different link texts appear?',
     answer:'COUNT(*) counts observations. Two separate observations contain “Moon phases,” and each contributes one visit.'
   }}),
scene('When did the school change its link text?',
  ['Select the school’s Moon link', 'Find the previous words', 'Test for a change', 'Read the two changes'],
  bigQueryLinkChanges, 'Compare each observation of the school’s Moon link with the previous observation in visit order.',
  {id:'bigquery-link-changes', clarityNative:true, kind:'recap',
   sources:['lectures/lecture-14/bigtable.html#bigquery-link-changes',crawlSqlFile,'https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/navigation_functions#lag'],
   teaching:{
     idea:'LAG finds the preceding words for the same link, so a comparison reveals the visits when the crawler observed a change.',
     builds:[
       'Follow the WHERE clause inside history. Keep the Moon article, r2, and the school source. That selects one link. Its visit numbers are 1, 3, 4, and 5. Visit 2 belongs to CNN. Ask which earlier observation should be compared with visit 3.',
       'LAG(link_text) puts the preceding text beside each current text. ORDER BY visit_no defines the sequence. The first row has NULL for prior_text because the crawler has no earlier observation of this link in the sample.',
       'The outer WHERE keeps a row only if the comparison is true. At visit 1 the comparison with NULL is unknown. At visit 4 the two values are equal. Ask which two rows remain.',
       'Read the changes aloud. At visit 3 the crawler saw “Moon phases” in place of “Moon facts.” At visit 5 it saw “Explore the Moon” in place of “Moon phases.” The observations show when the crawler saw a change. The site could have edited the words between visits.'
     ],
     question:'If visit 6 sees “Explore the Moon” again, what changes in the two query results?',
     answer:'The count for r2 rises to five. The change query still returns visits 3 and 5 because visit 6 repeats the words observed at visit 5.',
     context:'The sample uses non-null link text and unique visit numbers. To compare many links in one query, partition the window by page_key and source_site, then order by visit_no within each pair.'
   }})
]);
const GN={ada:[185,330],ben:[420,290],cyd:[400,530],dee:[715,320],eli:[720,550],fay:[1090,440]};
const GE=[['ada','ben'],['ada','cyd'],['ben','dee'],['cyd','dee'],['dee','eli'],['eli','fay'],['fay','ada'],['cyd','eli'],['ben','ada']];
function graphDraw(d,s,mode='reach'){
 const dist={ada:0,ben:1,cyd:1,dee:2,eli:2,fay:3};
 const path=['ada','cyd','eli','fay'];
 GE.forEach(([a,b],i)=>{const [x1,y1]=GN[a],[x2,y2]=GN[b],l=Math.hypot(x2-x1,y2-y1),ux=(x2-x1)/l,uy=(y2-y1)/l;let hot=mode==='path'?path.indexOf(a)>=0&&path.indexOf(b)===path.indexOf(a)+1&&path.indexOf(b)<=s:dist[a]<s;d.arrow('edge'+i,x1+ux*40,y1+uy*40,x2-ux*45,y2-uy*45,hot?P.orange:P.line,hot?5:2);});
 Object.entries(GN).forEach(([name,[x,y]])=>{const reached=mode==='path'?path.includes(name)&&path.indexOf(name)<=s:dist[name]<=s;d.circle('node'+name,x,y,43,name==='ada'?P.orange:reached?P.greenLight:P.white,name==='ada'?P.orange:reached?P.green:P.line,3);d.text('name'+name,x,y+8,name,26,name==='ada'?P.white:P.ink);if(s>0&&reached&&name!=='ada')d.text('hop'+name,x+65,y+8,String(mode==='path'?path.indexOf(name):dist[name]),25,P.green);});
}
function followsPair(d, step, properties = false) {
  const people = [['ada', 310], ['ben', 970]];
  people.forEach(([name, x]) => {
    d.circle('person-' + name, x, 355, 65, P.greenLight, P.green, 3);
    d.text('person-label-' + name, x, 366, name, 33, P.ink);
    if (properties) d.text('student-' + name, x, 256, 'Student', 27, P.green);
  });
  d.arrow('follows', 390, 355, 884, 355, P.blue, 5);
  d.text('relationship', 640, 317, properties ? 'Follows' : 'follows', 29, P.blue);
  if (properties) {
    if (step >= 1) {
      d.line('gpa-link', 310, 428, 310, 487, P.orange, 3);
      d.box('gpa', 173, 493, 274, 74, 'gpa: 39  (3.9)', P.orangeLight, P.orange, 27);
    }
    if (step === 2) {
      d.line('since-link', 640, 369, 640, 487, P.orange, 3);
      d.box('since', 500, 493, 280, 74, 'since: 2026', P.orangeLight, P.orange, 27);
    }
  } else {
    if (step >= 1) {
      d.text('source', 310, 466, 'Source', 28, P.muted);
      d.text('destination', 970, 466, 'Destination', 28, P.muted);
    }
    if (step === 2) d.box('one-hop-result', 427, 520, 426, 71, 'One outgoing hop reaches ben', P.greenLight, P.green, 25);
  }
}

function storeFollows(d, step) {
  d.text('edge-table', 308, 235, 'Follows table', 30, P.ink);
  const rows = [['src', 'dst'], ['ada', 'ben']];
  if (step >= 1) rows.push(['ada', 'cyd']);
  d.table('edges', 98, 275, [210, 210], rows, {rowHeight: 66, fontSize: 29});
  if (step === 2) {
    d.arrow('group', 545, 377, 690, 377, P.green, 4);
    d.text('list-title', 950, 235, 'Outgoing neighbors of ada', 29, P.ink);
    d.box('out', 728, 337, 444, 80, '[ben, cyd]', P.greenLight, P.green, 32);
    d.text('maintain', 950, 474, 'Maintain the list when an edge changes.', 23, P.muted);
  }
}

const followsStorage = [
  {
    name:'Cache', input:['Storage block', 'ada → ben', 'ada → cyd'],
    output:['Buffer pool', 'Keep a copy of the block'],
    check:'Repeat the lookup for ada. Count storage reads on each run.'
  },
  {
    name:'Index', input:['Source lookup', 'src = ada'],
    output:['Outgoing neighbors', '[ben, cyd]'],
    check:'Add a follow on a copy. Which index entry or neighbor list must change?'
  },
  {
    name:'Log', input:['Durable log entry', 'Insert ada → ben'],
    output:['After a crash', 'Recover the confirmed edge'],
    check:'After a confirmed edge write, restart the engine and look up that edge.'
  },
  {
    name:'Plan', input:['Bounded walk expansion', '2 + 4 + 5 rows'],
    output:['Exclude ada and deduplicate', '5 other students'],
    check:'Check the five output names. Inspect the rows at each expansion.'
  },
  {
    name:'Partition', input:['Worker with a long list', 'Many outgoing edges'],
    output:['Worker with a short list', 'Few outgoing edges'],
    check:'Compare the edges each worker examines on the same query.'
  }
];

function followStorage(d, step, inspect = false) {
  const part = followsStorage[step];
  followsStorage.forEach(({name}, i) => {
    if (!inspect && i > step) return;
    const active = i === step;
    d.box('mechanism-' + i, 95 + 220*i, 217, 202, 56, name,
      active ? P.orangeLight : P.white, active ? P.orange : P.line, 25);
  });
  [part.input, part.output].forEach(([title,...lines], i) => {
    const x = i ? 714 : 126;
    d.rect('panel-' + i, x, 335, 440, 167, i ? P.greenLight : P.blueLight, i ? P.green : P.blue, 10, 2);
    d.text('panel-title-' + i, x+220, 379, title, 26, P.ink);
    lines.forEach((line, j) => d.text('panel-value-' + i + '-' + j, x+220, 429+40*j, line, 25, P.ink));
  });
  if (step < 4) d.arrow('operation', 583, 420, 693, 420, P.green, 4);
  if (inspect) d.text('check', 640, 597, part.check, 27, P.ink);
}

register(15,'Graphs and course synthesis','2026-12-01','lectures/lecture-15/graphs.html',[
scene('The path is the answer', ['Read the arrow', 'Trace its direction', 'Name the destination'], followsPair,
  'Use one fictional club relationship. Trace the arrow from Ada to Ben and read it aloud. Ask what else students would need to know to say that Ben follows Ada.',
  {title:'Who does Ada follow?', clarityNative:true}),
scene('Property graph', ['Label the two students', 'Attach a value to Ada', 'Attach a value to Follows'], (d, s) => followsPair(d, s, true),
  'Keep the first edge on screen. The value 39 belongs to Ada and represents a GPA of 3.9. The year describes when this particular relationship began. The supplied Kuzu demo stores GPA. The edge property is illustrative.',
  {kind:'definition', term:'Property graph', definition:'A graph whose nodes and typed relationships carry named property values.', clarityNative:true}),
scene('Store adjacency at write time', ['Store one relationship', 'Add Ada’s second relationship', 'Group Ada’s neighbors'], storeFollows,
  'Add an edge from Ada to Cyd. An edge table can use a scan or an index on src. A maintained adjacency list keeps the destination references together. Ask what a new follow or an unfollow changes in that list.',
  {title:'Find both of Ada’s neighbors', clarityNative:true}),
scene('One hop',['Start at ada','Expand outgoing edges','Result set'],(d,s)=>{graphDraw(d,Math.min(1,s));if(s===2)d.text('result',640,640,'{ben, cyd}',41,P.green);},'Ask students to predict the result of the first Kuzu query before revealing outgoing edges. Expected: ben and cyd. Contrast it with “who follows ada,” which reverses edge direction and returns ben and fay on this dataset. Show or read the simple MATCH pattern from the companion page if desired. The deck stays focused on the graph. The example can run with no live database dependency because the graph and results are deterministic.',{demo:'viz-walk',sources:['lectures/lecture-15/graphs.html#kuzu','lectures/lecture-15/kuzu_demo.py']}),
scene('Two hops with exclusions',['Expand ben','Expand cyd','Keep new contacts'],(d,s)=>{graphDraw(d,2);if(s>0)d.circle('excludeada',GN.ada[0],GN.ada[1],57,'none',P.red,4);if(s>1){['ben','cyd'].forEach(n=>d.circle('exclude'+n,GN[n][0],GN[n][1],57,'none',P.red,4));d.text('result',650,640,'{dee, eli}',42,P.green);}},'Ask for the raw two-hop endpoints: dee via ben, ada via ben, dee via cyd, and eli via cyd. Then apply the query’s exclusions: remove ada and anyone already directly followed. Expected distinct answer: dee, eli. The two routes reach the same person, Dee. Counting routes and counting distinct people answer different questions. This is the demo’s second query, not simply the set of all nodes reached within two hops.'),
scene('Breadth-first reachability',['Start','Distance one','Distance two','Distance three'],(d,s)=>graphDraw(d,s),'Introduce BFS as frontier expansion with a visited set. Before each build, ask which new nodes enter the next frontier. Expected: ben/cyd, then dee/eli, then fay. Repeated routes do not re-enqueue already visited nodes. Explain that expanding only frontiers under a depth bound finds nodes within that bound. A shortest-path property follows for equal-cost edges. Weighted edges require a different algorithm or priority order.',{kind:'definition',term:'Breadth-first search',definition:'Exploring a graph in distance layers, expanding each newly reached node once.',demo:'viz-walk'}),
scene('Paths are not unique vertices',['One route','Two routes to dee','Cycle','Different work counts'],(d,s)=>{graphDraw(d,Math.min(3,s+1));if(s>0){d.path('pathA','M185,330 L420,290 L715,320','none',P.blue,7);d.path('pathB','M185,330 L400,530 L715,320','none',P.orange,7);}if(s>1)d.path('cycle','M420,290 Q210,205 185,330','none',P.red,5);if(s>2)d.text('counts',640,640,'8 edge visits · 11 path rows',36,P.ink);},'Give pairs the graph and ask whether visiting dee twice represents two people or two paths. Expected: two paths to one vertex. For depth three from ada, the course widget’s visited-set traversal examines eight outgoing edges while its self-join path enumeration produces eleven rows across levels. These counts describe different outputs and different work.\n\nThey do not show that SQL must be slower. SQL can also deduplicate during recursion. An unbounded walk needs a stopping/cycle rule.',{kind:'activity',demo:'viz-walk'}),
scene('The query draws a shape',['One edge','Bounded path','Recursive SQL alternative'],(d,s)=>{d.circle('a',225,405,63,P.orangeLight,P.orange,3);d.circle('b',1060,405,63,P.greenLight,P.green,3);d.text('av',225,415,'a',38);d.text('bv',1060,415,'b',38);d.arrow('pattern',300,405,980,405,P.green,5);d.text('cypher',650,320,s===0?'[:Follows]':'[:Follows*1..3]',38,P.green);if(s>1){d.rect('loop',360,500,575,100,P.blueLight,P.blue,12);d.text('sql',647,561,'WITH RECURSIVE',36,P.blue);d.path('looparrow','M620,610 C510,660 480,625 490,610','none',P.blue,4);}},'Read the pattern: start at a and follow one to three outgoing Follows edges to b. Ask which condition removes the source. Ask which operation removes duplicate endpoints. Expected: b.name differs from ada and DISTINCT.\n\nThen contrast a recursive SQL CTE: a base row and an iterative edge join with a depth bound. Both compile to plans. Notation and physical storage are independent choices. Do not claim SQL cannot express recursive graph questions.',{title:"Express the same bounded path in SQL and Cypher"}),
scene('Find the shortest path',['Frontier one','Frontier two','Target discovered','Return predecessors'],(d,s)=>{graphDraw(d,Math.min(s+1,3),s===3?'path':'reach');if(s===3)d.text('path',640,640,'ada → cyd → eli → fay',40,P.green);},'Predict the shortest route from ada to fay before revealing the search. Expected: three edges via cyd and eli. The first target discovery under BFS establishes minimum hop count because all edges have equal cost. Record which node led to each new node, then follow those links backward to reconstruct the path. Kuzu’s demo expresses this with SHORTEST. The visualization explains the algorithmic shape without claiming an exact internal implementation or that SQL requires one particular hand-coded algorithm.',{sources:['lectures/lecture-15/graphs.html#kuzu','lectures/lecture-15/kuzu_demo.py']}),
scene('A supernode is skew again',['Ordinary degree','High degree','Expansion budget'],(d,s)=>{d.circle('hub',640,415,70,P.orangeLight,P.orange,4);d.text('hubname',640,425,'hub',31,P.orange);const n=s?30:5;for(let i=0;i<n;i++){const a=i*2*Math.PI/n,x=640+Math.cos(a)*430,y=415+Math.sin(a)*180;d.line('edge'+i,640,415,x,y,s===2&&i>7?P.line:P.orange,2);d.circle('neighbor'+i,x,y,13,s===2&&i>7?P.line:P.green);}if(s===2)d.text('budget',640,625,'30 → 8',45,P.orange);},'Ask whether constant-cost adjacency access makes a node with millions of neighbors cheap to expand. Expected: no, the number of neighbors still dominates. Connect this to the hot key in distributed aggregation. Possible responses include a more selective query, capped expansion, specialized indexes, or partitioned adjacency. Limiting expansion can omit valid results, so state the limit and measure what it misses. The diagram’s 30-to-8 budget is illustrative, not an engine recommendation.'),
scene('Choose a graph workload',['Fetch direct contacts','Trace a route','Rank the full network'],(d,s)=>graphDraw(d,s===0?1:3,s===1?'path':'reach'),
  'Start with three requests on the same Follows data. An indexed edge table can answer a one-hop lookup. The route to Fay takes successive expansions. Ranking all students requires work across the network. Compare suitable tools under the same output and update requirements.',
  {title:'What does this query have to do?'}),
scene('Connections augment similarity',['Nearby passages','Named entities','One-hop expansion','Evidence union'],(d,s)=>{paper(d,'p1',150,330,P.greenLight,150,190);paper(d,'p2',340,330,P.greenLight,150,190);d.circle('wal',760,355,62,P.orangeLight,P.orange,3);d.text('wallabel',760,365,'WAL',31,P.orange);d.circle('pool',1040,490,75,P.blueLight,P.blue,3);d.text('poollabel',1040,500,'buffer',29,P.blue);if(s>0)d.arrow('entity',505,420,680,365,P.green);if(s>1)d.arrow('edge',815,388,963,462,P.orange,5);if(s>2){paper(d,'p3',s>2?590:1110,525,P.blueLight,130,100);d.arrow('add',1010,578,760,595,P.blue);}},'Ask why a question about interactions between WAL and the buffer pool might need evidence from multiple passages. Similarity search can find useful starting chunks. Entity links can expand to related sources. Reveal one-hop graph expansion and union the evidence with vector results.\n\nEntity extraction and edge correctness become new failure modes. This manageable project extension illustrates graph-enhanced retrieval. It is not the complete Microsoft GraphRAG pipeline with its community summaries.',{title:"Connect evidence across related sources"}),
scene('Does graph expansion help',['Vector only','Add neighbors','Measure both'],(d,s)=>{d.text('cfgA',320,255,'vector',31,P.green);d.text('cfgB',930,255,'vector + graph',31,P.blue);for(let i=0;i<5;i++){d.circle('q'+i,130,325+i*57,10,P.orange);d.box('a'+i,220,300+i*57,205,43,i<3?'✓':'∅',i<3?P.greenLight:P.white,P.line,27);if(s>0)d.box('b'+i,805,300+i*57,245,43,i===4?'∅':i===1&&s===2?'?':'✓',i<4?P.blueLight:P.white,P.line,27);}if(s>1){d.text('cost',640,630,'support · noise · latency',35,P.orange);}},'Have pairs propose one question helped by following entity relationships and one likely harmed by irrelevant expansion. Expected: multi-document relationship questions may benefit, while ambiguous entities or high-degree hubs can add noise. The checkmarks are a hypothetical exercise, not project results. Compare retrieval metrics, answer support, context size and latency on the same held-out questions. Keep a vector-only baseline and report where expansion hurts as well as where it helps.',{kind:'activity'}),
scene('Five mechanisms recur',['Read a block twice','Locate Ada’s neighbors','Recover the edge','Plan the traversal','Divide the work'],followStorage,
  'Trace the same club relationship through storage and execution. Identify a saved storage read, a maintained access path, a recovery record, a query plan, and the work assigned to a partition. Each has a different cost or guarantee.',
  {title:'Follow one relationship through the database',clarityNative:true}),
scene('Read a new system',['Inspect stored blocks','Inspect the access path','Check durability','Inspect the plan','Check the busiest worker'],(d,s)=>followStorage(d,s,true),
  'Apply the five questions to a new engine running the same club query. Use the stored block, the edge list, the crash recovery record, the query plan, and the work per partition to design a comparison.',
  {title:'How would you test a new graph engine?',kind:'activity',clarityNative:true}),
scene('Finish with measured decisions',['Recall the original graph','Add one edge to a copy','Check three answers','Defend a project choice'],(d,s)=>graphDraw(d,Math.min(s,3)),
  'Add a hypothetical direct follow from Ada to Fay. Compare direct contacts, distinct people within three hops, and minimum hops to Fay. Then ask teams to defend a comparable project decision using their actual measurements. The workshop is December 3. Reports are due December 7 at 11:59 pm. Presentations are December 8. The report compares at least two configurations. Each presentation has eight minutes plus a live demo and questions.',
  {title:'What changes if Ada follows Fay?',kind:'recap'})
]);
})();
