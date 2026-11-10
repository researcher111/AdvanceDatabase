/* Concrete mechanisms for the course-wide clarity pass. The shared lab fixtures
 * remain the source of the examples; these scenes replace their code/table view. */
(function () {
  'use strict';
  const decks=window.COURSE_DECKS, P=window.DeckViz.palette;
  function use(id,sceneId,draw) {
    const scene=decks[id]?.scenes.find(s=>s.id===sceneId);
    if(!decks[id])return;
    if(!scene)throw new Error('Missing clarity scene: '+id+'/'+sceneId);
    scene.draw=draw;scene.kind='visual';scene.clarityNative=true;
    if(scene.traceId){scene.clarityTraceId=scene.traceId;delete scene.traceId;}
    return scene;
  }
  function label(d,k,x,y,text,color=P.muted,size=24){d.text(k,x,y,text,size,color);}
  function foot(d,text){label(d,'mechanism-foot',640,643,text);}
  function card(d,k,x,y,w,h,title,detail,active=false) {
    d.rect(k,x,y,w,h,active?P.orangeLight:P.white,active?P.orange:P.line,9,active?3:2);
    d.text(k+'-title',x+w/2,y+30,title,26,P.ink,'middle',650);
    if(detail)d.text(k+'-detail',x+w/2,y+h-29,detail,Math.max(18,Math.min(24,(w-24)/(detail.length*.52))),active?P.orange:P.muted);
  }
  function chain(d,labels,active,{x=100,y=270,w=290,gap=95}={}){
    labels.forEach((text,i)=>{d.box('chain-'+i,x+i*(w+gap),y,w,70,text,i===active?P.orangeLight:P.white,i===active?P.orange:P.line,26);if(i<labels.length-1)d.arrow('chain-edge-'+i,x+i*(w+gap)+w+10,y+35,x+(i+1)*(w+gap)-15,y+35,P.green,3);});
  }

  use(1,'lecture-01-scene-03',(d,s)=>{
    const rows=[['ada',39],['ben',31],['cyd',37],['dee',28],['eli',36],['fay',34]];
    label(d,'query',640,209,'SELECT name FROM students WHERE gpa > 35',P.green,27);
    label(d,'disk-label',205,270,'Stored heap blocks');label(d,'ram-label',620,270,'Buffer frames');label(d,'out-label',1060,270,'Returned names');
    for(let b=0;b<2;b++){
      const y=307+b*143,loaded=s>=(b?3:1);
      card(d,'block-'+b,65,y,280,115,'Block '+b,rows.slice(b*3,b*3+3).map(r=>r.join(': ')).join(' · '));
      d.rect('frame-'+b,470,y,300,115,loaded?P.blueLight:P.white,loaded?P.blue:P.line,9,2);
      label(d,'frame-name-'+b,620,y+30,'Frame '+b,P.muted,22);
      label(d,'frame-value-'+b,620,y+74,loaded?'contains block '+b:'empty',loaded?P.blue:P.muted,26);
      if(loaded)d.arrow('read-'+b,357,y+57,455,y+57,P.orange,4);
    }
    const names=s>=4?['ada','cyd','eli']:s>=2?['ada','cyd']:[];
    names.forEach((name,i)=>d.box('result-'+name,950,310+i*84,210,64,name,P.greenLight,P.green,29));
    if(s>=2)d.arrow('filter',790,379,930,379,P.green,4);
    foot(d,'Storage reads: '+(s>=3?2:s>=1?1:0)+'  ·  Rows tested: '+(s>=4?6:s>=2?3:0)+'  ·  Names returned: '+names.length);
  });
  use(2,'lecture-02-scene-03',(d,s)=>{
    label(d,'stored',250,224,'Block numbers in the file');label(d,'resident',865,224,'Reusable memory frames');
    [7,8,9].forEach((n,i)=>card(d,'block-'+n,95,278+i*105,260,79,'Block '+n,'',s===2?n===8:n===7));
    for(let i=0;i<2;i++)card(d,'frame-'+i,675,306+i*150,370,105,'Frame '+i,s===0?'empty':i===0?'contains block '+(s===2?8:7):'empty',i===0&&s>0);
    if(s>0)d.arrow('load',370,s===2?423:318,655,360,P.orange,4);
    foot(d,s===2?'Frame 0 now contains block 8. Block 7 still exists in the file.':'A frame is a memory slot. A block number identifies data in a file.');
  });

  use(7,'two-writes-reverse-undo',(d,s)=>{
    label(d,'log-title',337,210,'Durable log · oldest at top');label(d,'durable-page-heading',930,210,s===5?'Repaired page A on disk':'Recovery buffer: A');
    const entries=['tx1: SET A, old = 100','tx1: COMMIT','tx2: SET A, old = 60','tx2: SET A, old = 40'];
    const active=[3,3,2,1,0,-1][s];
    entries.forEach((v,i)=>d.box('log-'+i,80,247+i*77,520,62,v,i===active?P.orangeLight:P.white,i===active?P.orange:P.line,25));
    if(active>=0){d.arrow('cursor',43,278+active*77,73,278+active*77,P.orange,3);label(d,'backward',335,592,'Read backward ↑',P.orange);}
    const value=s===0?10:s===1?40:60;
    card(d,'page',800,313,260,157,'A',String(value),s===1||s===2);
    if(s===1||s===2){d.arrow('restore',622,278+active*77,780,391,P.orange,4);label(d,'restore-label',930,513,'Restore the logged old value',P.orange);}
    if(s>=3)label(d,'finished',930,264,'Finished set: {tx1}',P.green,25);
    if(s===4){d.line('skip',92,262,585,292,P.muted,3);label(d,'skip-label',930,513,'Keep tx1’s committed 60',P.green);}
    foot(d,s===5?'Flush repaired A = 60, then record durable ROLLBACK for tx2.':'Reverse undo restores 10 → 40 → 60. Undoing forward would leave the wrong value.');
  });

  use(8,'statement-or-transaction-snapshot',(d,s)=>{
    label(d,'version-heading',640,210,'Committed row versions');
    card(d,'old-version',140,250,340,100,'Version before writer','balance = 100',s===1||s===3);
    if(s>=2){d.arrow('version-change',505,300,775,300,P.green,4);card(d,'new-version',800,250,340,100,'Writer commits','balance = 120',s===2||s===4);}
    const rc=s===0?'not read yet':s>=3?'120':'100',rr=s===0?'not read yet':s===4?'120 (new transaction)':'100';
    card(d,'rc',90,450,490,116,'Read Committed',rc,s===3);
    card(d,'rr',700,450,490,116,'Repeatable Read',rr,s===3);
    if(s>=1){
      d.arrow('rc-read',335,434,s>=3?950:310,365,P.blue,3);
      d.arrow('rr-read',945,434,s===4?950:310,365,P.orange,3);
    }
    foot(d,s===4?'The original Repeatable Read transaction has ended. Both new reads can see 120.':'PostgreSQL example: plain SELECTs. Statement snapshot versus transaction snapshot.');
  });

  use(9,'price-the-work',(d,s)=>{
    label(d,'assumptions',640,207,'N = 100,000 rows  ·  B = 1,000 heap pages  ·  tree height = 3',P.muted,25);
    const matches=s===3?2000:s===4?997:100,idx=3+matches;
    label(d,'scan-heading',320,271,'Full scan',P.green,29);label(d,'index-heading',930,271,'Index + heap fetches',P.orange,29);
    for(let i=0;i<30;i++)d.rect('heap-'+i,103+(i%10)*44,310+Math.floor(i/10)*47,34,34,P.greenLight,P.green,4,1);
    label(d,'heap-count',320,487,'1,000 page accesses',P.green,27);
    if(s>=1){
      [0,1,2].forEach(i=>{d.box('node-'+i,760+i*120,312,88,61,i+1,P.blueLight,P.blue,28);if(i<2)d.arrow('node-edge-'+i,852+i*120,342,875+i*120,342,P.blue,2);});
      label(d,'tree-pages',930,411,'3 index pages',P.blue,25);
      label(d,'fetch-pages',930,457,'+ '+matches.toLocaleString('en-US')+' matching RID fetches',P.orange,25);
      if(s>=2)label(d,'index-total',930,514,'= '+idx.toLocaleString('en-US')+' page accesses',P.orange,28);
    }
    if(s>=2)d.box('choice',360,552,560,58,s===4?'Equal cost at 0.997% selectivity':s===3?'Choose scan: 1,000 < 2,003':'Choose index: 103 < 1,000',P.greenLight,P.green,27);
    foot(d,'Toy model: one page access per RID. Caching, shared pages, and CPU costs are excluded.');
  });
  use(9,'review-sql-and-indexes',(d,s)=>{
    label(d,'sql',640,203,'SELECT name FROM students WHERE gpa > 35',P.green,27);
    if(s<4){
      const tok=['SELECT','name','FROM','students','WHERE','gpa','>','35'];
      const width=[130,110,105,155,130,100,65,85];let x=108;
      tok.forEach((t,i)=>{d.box('token-'+i,x,263,width[i],57,t,P.white,s===0?P.orange:P.line,24);x+=width[i]+10;});
      if(s>=1){card(d,'fields',155,402,270,108,'fields','[name]',s===1);card(d,'tables',485,402,300,108,'tables','[students]',s===1);}
      if(s>=2)card(d,'predicate',845,402,280,108,'predicate','gpa > 35',s===2);
      if(s===3){d.rect('query-data',115,370,1060,190,'none',P.green,10,3);label(d,'query-data-name',640,584,'QueryData: a description of the request',P.green,28);}
      foot(d,'Lexing and parsing read zero table rows. The schema gives GPA its integer meaning.');
    }else{
      const levels=[['ProjectScan(name)',247],['SelectScan(gpa > 35)',379],['TableScan(students)',511]];
      levels.forEach(([t,y],i)=>{d.box('plan-'+i,410,y,460,70,t,s===5?P.greenLight:P.white,P.green,26);if(i<2){d.arrow('request-'+i,453,y+78,453,y+122,P.blue,3);d.arrow('row-'+i,822,y+122,822,y+78,P.orange,3);}});
      label(d,'pull',276,413,'next() requests ↓',P.blue,24);label(d,'return',1014,413,'rows return ↑',P.orange,24);
      foot(d,s===5?'Scan: 6 rows tested → Select: 3 pass → Project: ada, cyd, eli':'The outer scan wraps the filter, which wraps the table scan.');
    }
  });

  // Link the existing geometric construction to a familiar grouping mechanism.
  // Keep its original animation, IDs, and build count; only add the final mapping.
  const shelfScene=decks[11]?.scenes.find(s=>s.id==='build-an-ivf-index');
  if(shelfScene){
    const original=shelfScene.draw;
    shelfScene.draw=(d,s)=>{
      original(d,s);
      if(s===3)label(d,'shelf-mapping',640,615,'Shelf analogy: centroid = label · list = shelf · vector = book',P.muted,25);
    };
  }

  use(11,'meaning-becomes-geometry',(d,s)=>{
    d.rect('question-card',70,220,520,180,s===1?P.orangeLight:P.white,s===1?P.orange:P.line,12,2);
    d.rect('passage-card',690,220,520,180,P.white,s===2?P.green:P.line,12,2);
    label(d,'question-heading',330,254,'Maya’s question',P.green,26);
    label(d,'question-line-1',330,310,'Why does my model fail',P.ink,30);
    label(d,'question-line-2',330,352,'on new data?',P.ink,30);
    label(d,'passage-heading',950,254,'From her course notes',P.green,26);
    label(d,'passage-line-1',950,310,'Overfitting can cause low',P.ink,30);
    label(d,'passage-line-2',950,352,'training error but high test error.',P.ink,29);
    if(s===0){
      label(d,'first-question',640,500,'Can this passage help answer the question?',P.ink,32);
      label(d,'compare-texts',640,556,'Compare the meaning of the two texts.',P.muted,26);
    }else if(s===1){
      d.box('exact-search',130,455,410,90,'Exact phrase search',P.orangeLight,P.orange,30);
      d.arrow('exact-result',560,500,700,500,P.orange,4);
      d.box('no-match',720,455,410,90,'No match in this passage',P.white,P.orange,28);
      label(d,'phrase-reason',640,590,'The passage does not contain the whole question.',P.ink,27);
    }else{
      d.line('question-to-search',330,414,330,500,P.green,3);
      d.arrow('search-input',330,500,475,500,P.green,3);
      d.box('vector-search',490,455,300,90,'Vector search',P.greenLight,P.green,30);
      d.line('search-output',805,500,950,500,P.green,3);
      d.arrow('possible-result',950,500,950,414,P.green,3);
      label(d,'candidate-label',1064,453,'Possible match',P.green,23);
      label(d,'check-passage',640,590,'Read the returned passage to check whether it answers the question.',P.ink,26);
    }
    label(d,'story-label',640,640,'Fictional classroom example',P.muted,22);
  });

  use(11,'diagnose-the-index',(d,s)=>{
    label(d,'diagnostic-question',640,235,'Is this passage relevant to Maya’s model problem?',P.ink,29);
    label(d,'index-heading',340,331,'Approximate search missed exact neighbors',P.orange,24);
    if(s>=1){
      d.arrow('index-test',340,359,340,438,P.orange,3);
      label(d,'index-fix',340,485,'Examine more candidates',P.ink,29);
      label(d,'index-check',340,534,'Compare with exact result IDs',P.muted,25);
    }
    if(s>=2){
      d.line('branches',640,305,640,570,P.line,2);
      label(d,'representation-heading',951,331,'Exact results do not answer',P.green,25);
      d.arrow('representation-test',951,359,951,438,P.green,3);
      label(d,'representation-fix',951,485,'Check chunks and embeddings',P.ink,28);
      label(d,'representation-check',951,534,'Check metadata and ranking',P.muted,25);
    }
    label(d,'diagnostic-foot',640,633,'Recall measures agreement with exact search. Read the passages to check relevance.',P.muted,24);
  });

  use(11,'rebuild-the-retrieval-contract',(d,s)=>{
    label(d,'opening-question',640,237,'“Why does my model fail on new data?”',P.ink,32);
    const names=['Save exact IDs','Search fewer candidates','Compare result IDs','Read the passage'];
    [180,490,800,1110].forEach((x,i)=>{
      if(i>s)return;
      d.circle('decision-'+i,x,400,55,i===3?P.orangeLight:P.greenLight,i===3?P.orange:P.green,3);
      label(d,'decision-number-'+i,x,412,String(i+1),i===3?P.orange:P.green,34);
      const lines=i===1?['Search fewer','candidates']:i===2?['Compare','result IDs']:[names[i]];
      lines.forEach((line,j)=>label(d,'decision-label-'+i+'-'+j,x,505+j*34,line,P.ink,26));
      if(i<s)d.arrow('next-decision-'+i,x+68,400,x+240,400,P.orange,3);
    });
    if(s===3)label(d,'closing-question',640,618,'Measure recall. Check passage relevance separately.',P.muted,25);
  });

  const probeScene=use(11,'probe-the-lists',(d,s)=>{
    // Exact shared fixture: all four vectors and both centroids have unit length.
    const ox=345,oy=430,scale=166,pos=([x,y])=>[ox+x*scale,oy-y*scale];
    d.line('x-axis',105,oy,585,oy,P.line,2);d.line('y-axis',ox,217,ox,600,P.line,2);
    label(d,'x-label',596,455,'x');label(d,'y-label',322,218,'y');
    const points=window.CourseTraces.fixtures.vectors,q=pos(window.CourseTraces.fixtures.query);
    points.forEach((v,i)=>{const [x,y]=pos(v),found=s>=4?(i===0||i===1):s>=2&&i===0;d.circle('v-'+i,x,y,12,found?P.orange:i===0?P.blue:P.green);label(d,'v-label-'+i,x+(i===1?45:0),y+(i===0||i===3?32:-29),'v'+i,found?P.orange:P.ink,25);});
    d.arrow('query-arrow',ox,oy,q[0],q[1],P.purple,4);label(d,'query-label',q[0]+40,q[1]+23,'q',P.purple,27);
    label(d,'coords',345,626,'q = (0.8, 0.6) · unit vectors',P.muted,24);
    card(d,'list0',715,235,430,99,'c0 = (1, 0) · score 0.8','list: [v0]',s>=1);
    card(d,'list1',715,360,430,99,'c1 = (0, 1) · score 0.6','list: [v1, v2, v3]',s>=4);
    if(s>=2)label(d,'result',930,514,s>=4?'Two probes: v1 (0.96), v0 (0.80)':'One probe: v0 (0.80)',P.green,25);
    if(s>=3)label(d,'recall',930,558,s>=4?'Recall@2 = 2 / 2 = 1':'Missed v1: Recall@2 = 1 / 2',s>=4?P.green:P.red,25);
    if(s>=2)label(d,'work',930,604,s===4?'Work: 2 centroids + 4 vectors = 6':'Work: 2 centroids + 1 vector = 3',P.orange,24);
  });

  if(probeScene){
    probeScene.title='Search selected IVF lists';
    probeScene.states=['Fixed lists','Select a centroid','Search one list','Identify the miss','Search both lists'];
    probeScene.teaching={
      idea:'A nearby group center does not guarantee that its list contains the nearest stored vector.',
      question:'Why can a search of the nearest centroid list miss v1?',
      answer:'v1 belongs to c1. A one-probe search selects c0 and scores only v0. It does not score v1.',
      builds:[
        'Identify the four stored vectors and two supplied centroids. This teaching fixture fixes the centroids rather than learning them with k-means. Nearest-centroid assignment puts v0 in c0 and the other three vectors in c1. The query requests two neighbors. Predict which list one probe will select.',
        'Calculate the centroid scores for q = (0.8, 0.6). The dot product with c0 is 0.8. The dot product with c1 is 0.6. One probe selects c0.',
        'Score v0 from the selected list. Its score is 0.80. Count two centroid comparisons and one stored-vector comparison. The query requests two results, but this candidate set contains only one vector.',
        'Compare the result with exact search, which returns v1 and v0. Vector v1 scores 0.96, higher than v0 at 0.80. The one-probe search misses v1 because it skips list c1. It returns one of the two exact neighbors, so recall@2 is 1/2.',
        'Before the reveal, predict the result and work for two probes. Searching both lists returns v1 and v0, so recall@2 is 1. Count two centroid comparisons and four stored-vector comparisons. Six comparisons exceed the four required by exact search. Searching every list removes this miss but adds centroid work.'
      ],
      context:'These unit vectors and fixed centroids form a small numerical example. They are not measured passage embeddings or the result of k-means training. The reading and Lab 9 use the same values.',
      reference:'IVFFlat is IVF with exact scoring inside the selected lists. Use the same similarity metric and tie rule as exact search. More probes add candidates without removing earlier candidates. Under these conditions, recall cannot decrease.'
    };
  }

  use(11,'where-the-index-lives',(d,s)=>{
    const textVersion=s===0?1:2,vectorVersion=s===2?2:1,changed=s>0,updated=s===2;
    const sourceColor=changed?P.orange:P.green,indexColor=s===1?P.orange:P.green;
    d.rect('source-record',60,260,385,290,P.white,sourceColor,12,3);
    label(d,'source-title',252,310,'Passage 42',P.ink,31);
    label(d,'source-version',252,379,'Text version '+textVersion,sourceColor,29);
    [0,1,2].forEach(i=>d.line('source-text-'+i,110,427+i*24,395-i*24,427+i*24,sourceColor,5));
    label(d,'source-status',252,513,s===0?'Original text':'Changed text',sourceColor,26);

    d.rect('model',503,340,274,105,updated?P.greenLight:P.white,updated?P.green:P.line,10,2);
    label(d,'model-title',640,382,'Embedding',updated?P.green:P.muted,28);
    label(d,'model-label',640,418,'model',updated?P.green:P.muted,28);
    if(updated){
      d.arrow('create-vector',457,391,490,391,P.green,3);
      d.arrow('replace-vector',790,391,823,391,P.green,3);
      label(d,'update-action',640,496,'Create new vector',P.green,24);
    }else{
      label(d,'model-wait',640,496,s===0?'Used for version 1':'Update required',s===1?P.orange:P.muted,24);
    }

    d.rect('index-record',835,260,385,290,P.white,indexColor,12,3);
    label(d,'index-title',1027,310,'Index entry 42',P.ink,31);
    label(d,'vector-version',1027,379,'Vector from text v'+vectorVersion,indexColor,27);
    [0,1,2,3].forEach(i=>{const h=(updated?[62,35,54,44]:[30,62,44,54])[i];d.rect('vector-coordinate-'+i,930+i*50,476-h,30,h,s===1?P.orangeLight:P.greenLight,indexColor,3,2);});
    label(d,'vector-status',1027,513,s===1?'Old vector':updated?'Updated vector':'Matching vector',indexColor,26);
    label(d,'optional-service',640,595,'A separate vector service is optional.',P.ink,27);
    label(d,'update-responsibility',640,635,'Database storage alone does not create a new embedding.',P.muted,24);
  });

  const ragOpening=use(12,'evidence-reaches-the-answer',(d,s)=>{
    label(d,'opening-question',640,214,'Why does my model fail on new data?',P.ink,31);
    d.rect('source-record',40,275,370,320,P.white,P.green,12,2);
    label(d,'source-heading',225,315,'Retrieved passage',P.green,29);
    label(d,'source-id',225,365,'Source ID: ml-notes',P.green,25);
    ['Overfitting can cause','low training error but','high test error.'].forEach((line,i)=>label(d,'source-text-'+i,225,417+i*33,line,P.ink,25));
    label(d,'source-origin',225,553,'From Maya’s course notes',P.muted,23);
    if(s>=1){
      d.arrow('select-evidence',419,435,446,435,P.orange,3);
      d.rect('model-prompt',455,275,370,320,P.greenLight,P.green,12,2);
      label(d,'evidence-heading',640,315,'Language model input',P.green,27);
      label(d,'prompt-question-1',640,358,'Why does my model fail',P.ink,24);
      label(d,'prompt-question-2',640,390,'on new data?',P.ink,24);
      label(d,'evidence-id',640,439,'[ml-notes]',P.green,25);
      ['Overfitting can cause','low training error but','high test error.'].forEach((line,i)=>label(d,'evidence-text-'+i,640,479+i*32,line,P.ink,25));
    }
    if(s>=2){
      d.arrow('check-evidence',834,435,861,435,P.orange,3);
      d.rect('proposed-answer',870,275,370,320,P.orangeLight,P.orange,12,2);
      label(d,'support-heading',1055,315,'Proposed answer',P.orange,29);
      label(d,'support-claim-1',1055,417,'Overfitting is one',P.ink,26);
      label(d,'support-claim-2',1055,450,'possible explanation.',P.ink,26);
      label(d,'support-source',1055,492,'[ml-notes]',P.orange,25);
      label(d,'support-action',1055,553,'Check this claim in the source.',P.ink,23);
    }
    foot(d,s===2?'The passage suggests a possibility. It does not diagnose Maya’s model.':'Fictional example · What should the language model receive?');
  });
  if(ragOpening){
    ragOpening.states=['Read the passage','Build the prompt','Check the proposed answer'];
    ragOpening.teaching.builds=[
      'Return to Maya’s fictional model-performance question from Lecture 11. Her prediction model performs well on training data but poorly on new data. Read the passage. Ask what the language model needs to receive before it can use this evidence. The source ID ml-notes identifies the course document.',
      'Reveal the prompt: the question, the passage, and its source ID. Context means the text supplied to the language model for this request. Compare an open-book answer with its page reference. A similarity score alone supplies neither the passage nor its source. Ask what claim the passage supports before revealing the answer.',
      'Read the proposed answer and its citation. Noor asks: “Does this passage prove that Maya’s model is overfitting?” No. It supports a possible explanation. The model and data need further checks before diagnosis.\n\nThe answer is written for this example, not produced by a model call. The lab’s echo mode exposes the assembled context before generation.'
    ];
    ragOpening.teaching.reference='Trace the same passage from Lecture 11 into the prompt, with source ID ml-notes. Then compare the proposed claim with the passage. The later source-mapping slide continues this fictional example. The reading and lab use a separate database-recovery fixture. Retrieval metrics measure source presence and rank. Claim support needs a separate check.';
  }

  const lsmOpening=use(14,'organize-writes-differently',(d,s)=>{
    label(d,'opening-question',640,230,'The old record remains. What should Noor report now?',P.ink,29);
    const xs=[240,640,1040],names=['Sealed file A','Later file B','Latest record'],values=['k = old','k = new','DELETE k'];
    xs.forEach((x,i)=>{
      if(i>s)return;
      label(d,'file-name-'+i,x,318,names[i],P.muted,26);
      d.rect('version-'+i,x-155,347,310,112,i===s?P.orangeLight:P.white,i===s?P.orange:P.line,9,2);
      label(d,'value-'+i,x,412,values[i],i===s?P.orange:P.ink,34);
      if(i<s)d.arrow('newer-'+i,x+170,403,x+230,403,P.green,3);
    });
    label(d,'current-result',640,548,'Current read: '+['old','new','absent'][s],s===2?P.orange:P.green,34);
    label(d,'fictional-note',640,596,'Fictional investigation · sealed files keep their entries unchanged',P.muted,23);
    foot(d,'LSM = log-structured merge tree · collect writes, then merge sorted files');
  });
  if(lsmOpening){
    lsmOpening.states=['An older file','A newer value','A visible deletion'];
    lsmOpening.teaching.reference='The opening uses plain records before naming the storage structures. Later, the worked trace assigns update sequence numbers 5, 8, and 9. The same old, new, and deleted states motivate read rules and safe removal of old records.';
  }

  use(14,'a-multidimensional-map',(d,s)=>{
    label(d,'address',640,218,['Choose a row','Then choose a column in that row','(row, family:qualifier, timestamp) → value'][s],P.ink,31);
    const titles=['Row key','Column name','Version timestamp'],values=['com.cnn.www','anchor:example','2026-11-10'];
    titles.forEach((title,i)=>{if(i<=s)card(d,'coordinate-'+i,65+i*420,280,310,112,title,values[i],i===s);});
    label(d,'row-order',220,442,'Rows stay in key order.',P.muted,23);
    if(s>=1){label(d,'family',640,438,'anchor = declared family',P.green,23);label(d,'qualifier',640,471,'example = qualifier',P.green,23);}
    if(s>=2){label(d,'time-label',1060,438,'One version of this cell',P.orange,23);d.arrow('value-arrow',640,493,640,530,P.green,3);d.box('cell-value',360,543,560,65,'Value bytes: “example link text”',P.greenLight,P.green,27);}
    foot(d,s===0?'Related reversed hostnames share a prefix: com.cnn.www and com.cnn.sports.':s===1?'A cell is one row–column intersection. A family must exist before its qualifiers are used.':'Each timestamp selects one stored version. The application interprets its value bytes.');
  });
  use(14,'sparse-cells-and-versions',(d,s)=>{
    const xs=[350,580,810,1040],columns=['anchor:example','anchor:news','contents:','anchor:school'];
    const cells=[[0,0],[0,2],[1,1],[2,0],[2,2]];
    for(let c=0;c<(s>0?4:3);c++){
      label(d,'column-'+c,xs[c],249,columns[c],c===3?P.orange:P.muted,23);
      for(let r=0;r<3;r++){
        const filled=cells.some(([rr,cc])=>rr===r&&cc===c)||(s>0&&r===1&&c===3);
        const selected=s>0&&r===1&&c===3;
        d.box('cell-'+r+'-'+c,xs[c]-100,281+r*91,200,66,filled?'value':'',selected?P.orangeLight:filled?P.greenLight:P.white,selected?P.orange:filled?P.green:P.line,26);
      }
    }
    ['r1','r2','r3'].forEach((row,r)=>label(d,'row-'+r,155,323+r*91,row,P.ink,29));
    if(s===0)label(d,'missing',1050,386,'No stored cell',P.muted,25);
    if(s>=1)label(d,'new-column',1040,586,'New qualifier in r2',P.orange,24);
    if(s===2){
      d.path('versions-path','M 1144 405 L 1210 405 L 1210 540 L 615 540','none',P.orange,3);
      d.arrow('versions-arrow',615,540,615,552,P.orange,3);
      ['t3: new','t2: prior','t1: old'].forEach((v,i)=>d.box('version-'+i,350+i*180,552,165,59,v,i===0?P.orangeLight:P.white,P.orange,24));
    }
    foot(d,s===2?'Three versions of one cell · a retention policy decides which versions remain':'Empty positions show missing cells; they do not reserve fixed-width slots in storage.');
  });
  use(14,'splitting-cannot-fix-a-moving-hotspot',(d,s)=>{
    const counts=s===0?[3,3,3,3]:s===1?[0,0,0,12]:s===2?[0,0,0,6,6]:[0,0,0,6,18];
    const ranges=counts.length===4?['[00,25)','[25,50)','[50,75)','[75,100)']:['[00,25)','[25,50)','[50,75)','[75,88)','[88,100)'];
    label(d,'interval-rule',640,217,'[a,b) includes a and excludes b · increasing timestamp keys →',P.ink,27);
    const w=counts.length===4?225:190,gap=25,start=(1280-counts.length*w-(counts.length-1)*gap)/2;
    counts.forEach((n,i)=>{
      const x=start+i*(w+gap),hot=s>0&&i===counts.length-1;
      label(d,'range-'+i,x+w/2,280,ranges[i],hot?P.orange:P.muted,26);
      d.rect('tablet-'+i,x,305,w,260,P.white,P.line,10,2);
      if(n)d.rect('load-'+i,x+24,545-n*11,w-48,n*11,hot?P.orangeLight:P.greenLight,hot?P.orange:P.green,5,2);
      label(d,'count-'+i,x+w/2,600,n+' writes',hot?P.orange:P.ink,27);
    });
    foot(d,s>=2?'Key 99 belongs to [88,100). These counts are a toy load model, not measured throughput.':'Four disjoint tablet ranges · each key belongs to the interval that contains it');
  });
  use(14,'the-log-protects-memory',(d,s)=>{
    label(d,'wal-expansion',640,223,'WAL = write-ahead log · recovery can repeat the stored update',P.ink,27);
    card(d,'request',70,300,280,120,'Write request','k2 = v3',s===0);
    card(d,'log',500,300,280,120,'Recovery log',s>=2?'durable record':'append k2 = v3',s===1||s===2);
    card(d,'memory',930,300,280,120,'Memory buffer',s===3?'contains k2 = v3':'not updated yet',s===3);
    d.arrow('to-log',370,360,480,360,P.orange,4);
    if(s===3)d.arrow('to-memory',800,360,910,360,P.orange,4);
    if(s>=2){d.box('durable-boundary',485,472,310,70,'Required log is durable',P.greenLight,P.green,25);}
    if(s===3)d.box('ack',940,472,260,70,'Success reply',P.greenLight,P.green,27);
    foot(d,s===3?'Crash after success: replay the durable log to rebuild the lost memory buffer.':'Memory can disappear after a crash. The durable log supplies recovery information.');
  });

  function repeatModel(d,s,question,labels){
    label(d,'return-question',640,236,question,P.ink,30);
    [175,485,795,1105].forEach((x,i)=>{
      if(i>s)return;
      d.circle('repeat-step-'+i,x,401,51,i===3?P.orangeLight:P.greenLight,i===3?P.orange:P.green,3);
      label(d,'repeat-number-'+i,x,413,String(i+1),i===3?P.orange:P.green,34);
      labels[i].forEach((line,j)=>label(d,'repeat-label-'+i+'-'+j,x,500+j*33,line,P.ink,26));
      if(i<s)d.arrow('repeat-next-'+i,x+67,401,x+243,401,P.orange,3);
    });
  }
  use(14,'trace-an-acknowledged-write',(d,s)=>{
    repeatModel(d,s,'Return to k: old@5, new@8, DELETE@9',[
      ['Log durably'],['Buffer in order'],['Flush sorted files'],['Read the newest','visible record']
    ]);
    if(s===3)foot(d,'A current read returns absent. Old bytes may remain until safe compaction');
  });

  // Slide-only passages continue Maya’s example without changing the lab corpus.
  const sourceExample={
    question:'Why does my model fail on new data?',
    relevantSource:'ml-notes',
    hits:[[0.9,2],[0.8,0],[0.7,1]],
    chunks:[
      {doc:'csv-guide',lines:['A CSV file stores table rows','as comma-separated values.']},
      {doc:'ml-notes',lines:['A model can learn random patterns in training data.','These patterns may not hold in new data.']},
      {doc:'ml-notes',lines:['Overfitting can cause low training error','but high test error.']}
    ]
  };
  const sourceIdentity=use(12,'keep-the-source-identity',(d,s)=>{
    const {question,relevantSource,hits,chunks}=sourceExample;
    label(d,'example-question',640,188,question,P.ink,28);
    label(d,'relevance-label',640,220,'Labeled relevant: ml-notes · Course notes on overfitting',P.green,23);
    label(d,'hits-title',260,258,'Top 3 results · example scores',P.muted,23);
    label(d,'chunks-title',937,258,'Original chunk records');
    hits.forEach(([score,pos],i)=>{
      const y=282+i*97,source=chunks[pos].doc,relevant=s===4&&source===relevantSource,selected=i===0&&s>=1&&s<4;
      d.rect('hit-'+i,70,y,380,88,relevant?P.greenLight:selected?P.orangeLight:P.white,relevant?P.green:selected?P.orange:P.line,9,2);
      label(d,'hit-'+i+'-title',260,y+30,'rank '+(i+1)+' · score '+score,P.ink,26);
      label(d,'hit-'+i+'-detail',260,y+64,s===4?'position '+pos+' · source '+source:'vector position '+pos,relevant?P.green:selected?P.orange:P.muted,23);
    });
    chunks.forEach((chunk,i)=>{
      const y=282+i*97,active=s===4?chunk.doc===relevantSource:i===2&&s>=1;
      d.rect('chunk-'+i,650,y,575,88,active?P.greenLight:P.white,active?P.green:P.line,8,2);
      label(d,'chunk-heading-'+i,937,y+25,'position '+i+' · source '+chunk.doc,P.ink,25);
      chunk.lines.forEach((line,j)=>label(d,'chunk-body-'+i+'-'+j,937,y+51+j*26,line,P.muted,22));
    });
    if(s>=1)d.arrow('resolve',466,326,634,520,P.orange,4);
    if(s===2||s===3)d.box('copy',70,603,1155,47,s===2?'Copy chunk 2 + score 0.9. Keep stored chunk unchanged':'Ranked source IDs: [ml-notes, csv-guide, ml-notes] · cite [ml-notes]',P.greenLight,P.green,23);
    if(s===4){
      const relevantRanks=hits.map(([,pos],i)=>chunks[pos].doc===relevantSource?i+1:0).filter(Boolean);
      const first=relevantRanks[0],hit=first?1:0;
      d.rect('hit-explanation',70,584,650,76,P.greenLight,P.green,9,2);
      label(d,'hit-result',395,608,'Hit@3 = '+hit+': '+relevantSource+' appears in the top 3',P.green,26);
      label(d,'hit-count',395,642,'Two relevant results still give this question one hit.',P.ink,23);
      d.rect('rank-explanation',740,584,485,76,P.white,P.line,9,2);
      label(d,'first-relevant',982,608,'First relevant rank = '+first,P.ink,25);
      label(d,'reciprocal-rank',982,642,'Reciprocal rank = 1/'+first+' = '+(1/first),P.muted,23);
    }
  });
  if(sourceIdentity){
    sourceIdentity.states=['Keep positions aligned','Resolve the first result','Copy the chunk','Preserve source IDs','Score this question'];
    Object.assign(sourceIdentity.teaching,{
      idea:'A search result is one returned chunk. A hit means at least one returned source matches a relevance label for the question.',
      question:'Two results have source ID ml-notes. Why does this question get one hit rather than two?',
      answer:'Hit@3 is a yes-or-no score for one question. At least one relevant source appears in its first three results, so the score is 1.',
      context:'This fictional example continues Maya’s question from the opening. The scores illustrate a ranking and were not measured with an embedding model. The reading and lab use different passages to demonstrate the same mapping.',
      reference:'The question asks about poor predictions on new data. Both ml-notes passages explain how overfitting can produce this pattern. The csv-guide passage describes a file format and does not explain the pattern. Label the relevant source before scoring the search results.',
      builds:[
        'Read Maya’s question and all three passages. The course notes on overfitting have source ID ml-notes. The evaluation labels this source as relevant before examining the ranking. The CSV guide is not relevant to this question. Each left-hand box is one search result, not an evaluation hit.',
        'Follow vector position 2 to chunk position 2. Read source ID ml-notes from that record. Its passage describes low training error with high test error. A rank identifies a position in the returned list. A vector position identifies a stored chunk. Neither number is the source ID.',
        'Copy chunk 2 and attach score 0.9 to the copy. Keep the original record unchanged. A later query can assign another similarity score to the same chunk. The similarity score does not define relevance.',
        'Read the ranked source IDs: ml-notes, csv-guide, ml-notes. Two chunks come from the same document. One describes the error pattern. The other describes learning random patterns that may not hold in new data. Preserve both selected passages and cite their source ID. A source label does not prove that every passage from that document answers the question.',
        'The 3 in Hit@3 limits the check to the first three results. A hit means at least one result has a relevant source ID. Score this question 1 if that happens, or 0 otherwise. Here ml-notes appears at ranks 1 and 3, so the score is 1. Two relevant chunks do not earn two hits.\n\nReciprocal rank measures where the first relevant result appears. Here its rank is 1, so reciprocal rank is 1/1 = 1. If ml-notes first appeared at rank 3, Hit@3 would remain 1 and reciprocal rank would become 1/3. Average the binary scores across questions to get hit rate. Average reciprocal ranks to get mean reciprocal rank. Read passages separately to check answer support.'
      ]
    });
  }

  const mapreduceScene=use(13,'reduce-sees-the-complete-group',(d,s)=>{
    label(d,'mappers',230,219,'Map each order');label(d,'shuffle',685,219,'Shuffle by meal');label(d,'reduce',1090,219,'Reduce: sum');
    card(d,'doc0',55,260,330,94,'Group order 0','“Pizza, pizza!”');card(d,'doc1',55,434,330,94,'Group order 1','“Salad pizza.”');
    if(s>=1){
      const entries=[['pizza',0],['pizza',0],['salad',1],['pizza',1]];
      entries.forEach(([word,doc],i)=>{
        const x=s>=2?565:405,y=s>=2?(word==='salad'?532:275+[0,1,3].indexOf(i)*72):278+i*76;
        d.box('pair-'+i,x,y,195,54,word+', 1',word==='pizza'?P.blueLight:P.greenLight,word==='pizza'?P.blue:P.green,25);
      });
    }
    if(s>=2){label(d,'owner0',850,328,'P0: pizza',P.blue,25);label(d,'owner1',850,557,'P1: salad',P.green,25);}
    if(s>=3){d.arrow('sum-pizza',936,343,994,343,P.blue,3);d.box('pizza-total',1005,311,190,64,'pizza = 3',P.blueLight,P.blue,28);d.arrow('sum-salad',936,557,994,557,P.green,3);d.box('salad-total',1005,525,190,64,'salad = 1',P.greenLight,P.green,28);}
    foot(d,[
      'Input: one record per group order. Each meal name becomes a key.',
      'Map: each order → (meal, 1) pairs. Repeated meals produce repeated pairs.',
      'Shuffle: collect all values for each meal. No totals are computed yet.',
      'Reduce: add each complete group to produce one total per meal.',
      'The runtime assigns work and performs shuffle. You supply map and reduce functions.'
    ][s]);
  });
  if(mapreduceScene)mapreduceScene.title='MapReduce: map, shuffle, reduce';

  const lsmRead=use(14,'read-the-newest-visible-value',(d,s)=>{
    const labels=['SSTable A','SSTable B',s>=3?'SSTable C (flushed)':'Memtable'],vals=['old @ 5','new @ 8','DELETE @ 9'];
    label(d,'versions',640,215,s<3?'Same key k · toy sequence numbers order these updates':'Compaction = merging sorted files',P.ink,28);
    labels.forEach((l,i)=>{if(i<=Math.min(s,2)){const removed=s===4;card(d,'version-'+i,90+i*400,267,300,122,l,removed?'safe to remove':vals[i],!removed&&i===Math.min(s,2));if(removed)d.line('remove-'+i,116+i*400,298,362+i*400,361,P.muted,3);}});
    if(s<3){const x=240+Math.min(s,2)*400;d.arrow('read',x,408,640,497,P.orange,4);d.box('read-result',380,515,520,72,s===0?'Read at 5 → old':s===1?'Read at 8 → new':'Read at 9 → absent',s===2?P.redLight:P.greenLight,s===2?P.red:P.green,29);}
    if(s===3){d.rect('merge-region',467,247,760,167,'none',P.orange,10,3);d.arrow('merge',850,431,850,485,P.orange,4);d.box('merge-output',585,500,535,78,'Merged output keeps DELETE @ 9',P.orangeLight,P.orange,26);label(d,'remaining',235,494,'A still holds old @ 5',P.red,25);}
    if(s===4){d.box('safe-output',340,479,600,100,'Safe output for k: no record',P.greenLight,P.green,30);}
    foot(d,s===4?'All older versions are included, and no active snapshot needs them.':s===3?'Dropping the tombstone now would let old @ 5 reappear.':s===2?'A tombstone is a deletion marker. The newest visible marker makes k absent.':'Visible means included by the read’s boundary. Higher sequence means a later update here.');
  });
  if(lsmRead){
    lsmRead.teaching.idea='A read uses the newest record allowed by its boundary. A deletion marker can win while older bytes remain.';
    lsmRead.teaching.question='Why must the merge keep DELETE@9 while file A still has old@5?';
    lsmRead.teaching.answer='Removing the deletion marker would let a later read find old@5. Keep it until older values cannot reappear and required read views remain valid.';
    lsmRead.teaching.builds=[
      'Define the toy sequence as an update-order number. A read boundary determines which updates the read includes. Visible means included by that boundary. At boundary 5, read old@5. This toy number is separate from a Bigtable cell timestamp.',
      'Advance the read boundary to 8. File B has new@8, so it determines the result. Ask why the old bytes can remain in file A without determining this read.',
      'Define tombstone as a deletion marker. At boundary 9, DELETE@9 is visible and newer than the other records. The current result is absent. The marker does not erase the old bytes.',
      'Define compaction as merging sorted files into new files. The deletion has been flushed to C. Merge B and C while A remains outside the merge. Predict the result if the marker were dropped. A later read could return old@5.',
      'Define snapshot as a retained earlier read view. Now include all older versions and assume no active snapshot needs them. The records can be removed safely. The following slides explain merging and deletion in more detail.'
    ];
    lsmRead.teaching.context='This is the existing deterministic shared trace: old@5, new@8, DELETE@9, a partial merge, then safe removal. It illustrates a general LSM version rule. It does not claim these sequence numbers are the original Bigtable timestamp API.';
  }
  use(14,'skip-files-then-find-a-block',(d,s)=>{
    label(d,'lookup-key',640,218,'Lookup: k9',P.ink,31);
    card(d,'filter',70,290,280,117,'Bloom filter','possibly present',s===0);
    if(s>=1){
      d.arrow('to-index',370,350,440,350,P.green,3);
      d.table('sparse-index',460,283,[165,145],[['first key','block'],['k1','0'],['k8','1'],['k16','2']],{rowHeight:61,fontSize:25,highlightRows:[2]});
      label(d,'bound',615,574,'k8 ≤ k9 < k16',P.orange,26);
    }
    if(s>=2){
      d.arrow('to-block',788,420,855,420,P.orange,3);
      card(d,'block',875,330,330,120,'Block 1','k8 · k9 · k12',true);
      label(d,'found',1040,489,'Inspect entries: k9 is present.',P.green,22);
    }
    if(s>=3)d.box('cached-block',905,542,270,65,'Memory copy cached',P.greenLight,P.green,25);
    foot(d,'Toy numeric key order · filter skips files; index chooses blocks; cache reuses bytes.');
  });
  const capScene=use(14,'a-network-partition-forces-a-choice',(d,s)=>{
    const xs=[290,990];
    xs.forEach((x,i)=>{
      card(d,'replica-'+i,x-170,314,340,148,'Replica '+(i+1),(i===0&&s>0)||s===4?'v2':'v1',i===0&&s>0);
      label(d,'copy-'+i,x,507,'A copy of the same data',P.muted,24);
    });
    d.line('network',475,387,805,387,s>0&&s<4?P.red:P.green,4,s>0&&s<4?'12 12':'');
    if(s>0&&s<4){d.path('cut','M610,353 L670,421 M670,353 L610,421','none',P.red,5);label(d,'partition-label',640,573,'Network partition: communication interrupted',P.red,27);}
    if(s>=2&&s<4){
      d.arrow('read-request',990,263,990,298,P.orange,3);
      label(d,'read-result',990,233,s===2?'Later read: wait or refuse':'Later read returns stale v1',s===2?P.red:P.orange,25);
    }
    if(s===4){d.arrow('reconcile',475,547,805,547,P.green,4);label(d,'reconcile-label',640,595,'Reconcile: bring the copies into agreement',P.green,26);}
    foot(d,s===3?'This response misses a completed write. It is not linearizable.':s===2?'A wait or error does not complete the requested read with a value.':s===4?'Generic two-copy example · the system must define its reconciliation rules.':'A network partition is a broken connection, not a row range such as a tablet.');
  });

  if(capScene)capScene.states=['Replicas agree','Communication cut; v2 completes','Wait','Serve stale','Reconcile'];

  const graphNodes={ada:[180,385],ben:[390,260],cyd:[390,505],dee:[620,260],eli:[620,505],fay:[825,385]};
  const graphEdges=[['ada','ben'],['ada','cyd'],['ben','dee'],['ben','ada'],['cyd','dee'],['cyd','eli'],['dee','eli'],['eli','fay'],['fay','ada']];
  function graphPicture(d,{frontier=[],visited=[],edges=[],showEdges=true}={}){
    if(showEdges)graphEdges.forEach(([from,to],i)=>{
      const [x,y]=graphNodes[from],[xx,yy]=graphNodes[to],a=Math.atan2(yy-y,xx-x),hot=edges.includes(from+'>'+to),color=hot?P.orange:P.line,width=hot?4:2;
      if(from==='fay'){
        d.path('edge-'+i,'M 825 430 L 825 591 L 180 591 L 180 436','none',color,width);
        d.arrow('edge-tip-'+i,180,461,180,434,color,width);
      }else if(from==='ben'&&to==='ada'){
        d.path('edge-'+i,'M 347 263 Q 205 253 183 330','none',color,width);
        d.arrow('edge-tip-'+i,189,312,183,339,color,width);
      }else d.arrow('edge-'+i,x+47*Math.cos(a),y+47*Math.sin(a),xx-47*Math.cos(a),yy-47*Math.sin(a),color,width);
    });
    Object.entries(graphNodes).forEach(([name,[x,y]])=>{
      const active=frontier.includes(name),seen=visited.includes(name);
      d.circle('person-'+name,x,y,44,active?P.orangeLight:seen?P.greenLight:P.white,active?P.orange:seen?P.green:P.line,3);
      label(d,'person-label-'+name,x,y+8,name,P.ink,26);
    });
  }
  use(15,'the-path-is-the-answer',(d,s)=>{
    graphPicture(d,{showEdges:s>0,frontier:s===0?['ada']:s===2?['fay']:[],visited:s===2?['ada','cyd','eli']:[],edges:s===2?['ada>cyd','cyd>eli','eli>fay']:[]});
    card(d,'question',922,248,305,125,'Maya asks','Who can ada reach?');
    if(s===1){label(d,'direction-1',1074,435,'ada → ben',P.green,30);label(d,'direction-2',1074,483,'ben → ada',P.green,30);}
    if(s===2){label(d,'route-one',1074,422,'ada → cyd',P.orange,29);label(d,'route-two',1074,469,'→ eli → fay',P.orange,29);label(d,'endpoint',1074,550,'One endpoint: fay',P.green,25);}
    foot(d,s===0?'Fictional classroom graph · a circle is a node, also called a vertex':s===1?'Each arrow means follows. A directed edge can only be followed in its shown direction.':'This route crosses three edges. One hop means crossing one edge.');
  });
  use(15,'property-graph',(d,s)=>{
    [300,980].forEach((x,i)=>{d.circle('node-'+i,x,360,76,P.greenLight,P.green,3);label(d,'node-name-'+i,x,370,i?'ben':'ada',P.ink,36);label(d,'node-label-'+i,x,240,'Label: Student',P.green,27);});
    if(s>=1){d.arrow('follows',395,360,885,360,P.blue,5);label(d,'type',640,310,'Type: Follows',P.blue,30);}
    if(s>=2){
      card(d,'node-property',145,492,310,91,'Node property','gpa: 39',true);
      d.line('node-property-link',300,448,300,480,P.orange,3);
      card(d,'edge-property',490,492,300,91,'Edge property','since: 2026',true);
      d.line('edge-property-link',640,378,640,480,P.orange,3);
    }
    foot(d,s===2?'GPA is stored in tenths: 39 means 3.9. The since property is illustrative.':'A property graph stores entities, typed relationships, and their named values.');
  });
  use(15,'one-hop',(d,s)=>{
    graphPicture(d,{frontier:s===0?['ada']:['ben','cyd'],visited:s>0?['ada']:[],edges:s>0?['ada>ben','ada>cyd']:[]});
    card(d,'one-hop-question',922,249,305,117,'One outgoing hop','Who does ada follow?');
    if(s>=1){d.box('one-hop-result',942,418,265,70,'{ben, cyd}',P.greenLight,P.green,29);}
    if(s===2){label(d,'incoming-heading',1074,547,'Who follows ada?',P.muted,24);label(d,'incoming-result',1074,584,'{ben, fay}',P.blue,29);}
    foot(d,'Outgoing and incoming edges answer different questions. Direction changes the result.');
  });
  use(15,'two-hops-with-exclusions',(d,s)=>{
    graphPicture(d,{frontier:s===2?['dee','eli']:[],visited:['ada','ben','cyd'],edges:['ada>ben','ada>cyd','ben>dee','ben>ada','cyd>dee','cyd>eli']});
    label(d,'candidate-heading',1074,224,s===2?'Distinct result':'Two-hop endpoints',P.ink,27);
    if(s<2){
      [['dee','ben'],['ada','ben'],['dee','cyd'],['eli','cyd']].forEach(([end,via],i)=>{
        const removed=s===1&&end==='ada';
        d.box('candidate-'+i,932,264+i*77,285,58,end+' via '+via,removed?P.redLight:P.white,removed?P.red:P.line,26);
        if(removed)d.line('remove-start',952,293+i*77,1197,293+i*77,P.red,3);
      });
    }else{
      d.box('distinct-dee',942,310,265,75,'dee',P.greenLight,P.green,31);
      d.box('distinct-eli',942,418,265,75,'eli',P.greenLight,P.green,31);
      label(d,'exclude-neighbors',1074,566,'Exclude direct ben, cyd',P.muted,23);
    }
    foot(d,s===0?'Two routes reach dee: ada → ben → dee and ada → cyd → dee.':s===1?'Remove the starting person. Keep both dee rows until the output is deduplicated.':'Direct neighbors do not occur in these candidates. The query still specifies that exclusion.');
  });
  use(15,'breadth-first-reachability',(d,s)=>{
    const layers=[['ada'],['ben','cyd'],['dee','eli'],['fay']],visited=layers.slice(0,s+1).flat();
    const expanded=s===0?[]:s===1?['ada']:s===2?['ben','cyd']:['dee','eli'];
    graphPicture(d,{frontier:layers[s],visited,edges:graphEdges.filter(([from])=>expanded.includes(from)).map(e=>e.join('>'))});
    card(d,'frontier',922,224,305,113,'Frontier at distance '+s,layers[s].join(', '),true);
    d.rect('visited',922,372,305,149,P.greenLight,P.green,9,2);
    label(d,'visited-title',1074,405,'Visited so far',P.green,26);
    const lines=s===0?['ada']:s===1?['ada, ben, cyd']:s===2?['ada, ben, cyd,','dee, eli']:['ada, ben, cyd,','dee, eli, fay'];
    lines.forEach((text,i)=>label(d,'visited-'+i,1074,446+i*34,text,P.ink,25));
    label(d,'edge-checks',1074,575,[0,2,6,8][s]+' edges examined',P.muted,24);
    foot(d,'Orange nodes: frontier · orange edges: last expansion · counter: all rounds');
  });
  const graphCounts=use(15,'paths-are-not-unique-vertices',(d,s)=>{
    const frontier=s===0?['ben','cyd']:s<=2?['dee','eli']:s===3?['fay']:['ben','cyd','dee','eli','fay'];
    const expanded=s===0?['ada']:s<=2?['ben','cyd']:['dee','eli'];
    graphPicture(d,{frontier,visited:['ada'],edges:graphEdges.filter(([from])=>expanded.includes(from)).map(e=>e.join('>'))});
    const lines=[['Walk endpoints','ben, cyd','BFS frontier','ben, cyd'],['Walk endpoints','dee, ada, dee, eli','BFS frontier','dee, eli'],['Visited people','ada, ben, cyd,','dee, eli','6 edges examined'],['Depth 3 walks: 5','All walk rows: 11','BFS frontier: fay','8 edges examined'],['Within 3 hops','11 walk rows','5 unique people','Different results']][s];
    d.rect('result-panel',922,237,305,353,P.white,P.line,10,2);
    lines.forEach((t,i)=>label(d,'result-line-'+i,1074,285+i*83,t,i===0?P.ink:P.green,i===1?23:24));
    foot(d,s===2?'Cycle: ada → ben → ada. Visited prevents adding ada to the frontier again.':'Walks can repeat nodes or edges. Distinct reachability adds each newly discovered person once.');
  });
  if(graphCounts)Object.assign(graphCounts.teaching,{
    idea:'Walk rows, edge inspections, and distinct people measure different things. State the required result before comparing work.',
    question:'Do eleven walk rows and eight BFS edge visits prove that SQL is slower?',
    answer:'No. The counts describe different operations and different outputs. Match the result requirements and count comparable work before measuring runtime.',
    builds:[
      'Define a walk as a sequence of connected edges that can repeat nodes or edges. The first round produces ben and cyd. A distinct-person search discovers the same two people. Predict the next endpoints before advancing.',
      'List four two-hop walks: ada → ben → dee, ada → ben → ada, ada → cyd → dee, and ada → cyd → eli. Their endpoints are dee, ada, dee, eli. The two dee entries represent different walks to one person.',
      'Define a cycle as a route returning to a node already on that route. The walk ada → ben → ada contains a cycle. BFS has already visited ada. Its new frontier contains dee and eli only once. Six outgoing edges have been examined so far.',
      'At depth three, walk enumeration produces five more rows. Across depths one through three, the total is 2 + 4 + 5 = 11. The visited search examines eight outgoing edges and discovers five other people. Fay is at the bound, so its outgoing edge is not expanded.',
      'Specify whether the result needs walks, distinct reachable people, or one shortest path. SQL can deduplicate during recursion when the query requires it. A final DISTINCT alone need not prevent repeated intermediate work. These toy counters are not an elapsed-time benchmark.'
    ],
    context:'This preserves the shared six-person, nine-edge trace. A shortest simple route, walk enumeration, and distinct reachability have different repeat rules. The example compares mechanisms while keeping their outputs explicit.'
  });
  use(15,'the-query-draws-a-shape',(d,s)=>{
    if(s<2){
      d.circle('a',220,350,65,P.orangeLight,P.orange,3);d.circle('b',1060,350,65,P.greenLight,P.green,3);
      label(d,'a-name',220,362,'a',P.ink,38);label(d,'b-name',1060,362,'b',P.ink,38);
      d.arrow('edge-pattern',310,350,970,350,P.green,5);
      label(d,'pattern',640,292,s===0?'[:Follows]':'[:Follows*1..3]',P.green,38);
      label(d,'node-variables',640,437,'a and b are node variables',P.muted,26);
      if(s===0)label(d,'one-edge',640,508,'MATCH (a)-[:Follows]->(b)',P.ink,31);
      else{
        label(d,'exclude-source',640,505,"WHERE b.name <> 'ada'",P.ink,28);
        label(d,'distinct',640,560,'RETURN DISTINCT b.name',P.ink,28);
      }
    }else{
      label(d,'cte-title',640,224,'WITH RECURSIVE: seed → repeated edge joins',P.ink,31);
      const names=['Seed','Depth 1','Depth 2','Depth 3'],details=['(ada, 0)','2 walk rows','4 walk rows','5 walk rows'];
      names.forEach((name,i)=>{card(d,'round-'+i,60+i*310,300,230,116,name,details[i],i===0);if(i<3)d.arrow('round-arrow-'+i,300+i*310,358,355+i*310,358,P.green,3);});
      label(d,'cte-rule',640,486,'UNION ALL keeps the repeated walk rows. Stop after depth 3.',P.muted,26);
      d.box('cte-result',235,543,810,62,'Exclude ada, then DISTINCT → ben, cyd, dee, eli, fay',P.greenLight,P.green,26);
    }
    foot(d,s===2?'The seed is not a walk row. The three expansion rounds contain 2 + 4 + 5 = 11 rows.':'Cypher describes a pattern. SQL recursion can express traversal too. Match the repeat rules.');
  });
  use(15,'find-the-shortest-path',(d,s)=>{
    const frontier=s===0?['ben','cyd']:s===1?['dee','eli']:['fay'];
    graphPicture(d,{frontier,visited:s===0?['ada']:s===1?['ada','ben','cyd']:['ada','ben','cyd','dee','eli'],edges:s===3?['ada>cyd','cyd>eli','eli>fay']:s===0?['ada>ben','ada>cyd']:s===1?['ben>dee','cyd>eli']:['eli>fay']});
    label(d,'predecessor-heading',1074,224,s===3?'Reconstruct backward':'First discovery links',P.ink,25);
    if(s<3){
      const pairs=[['ben','ada'],['cyd','ada'],['dee','ben'],['eli','cyd'],['fay','eli']];
      pairs.slice(0,s===0?2:s===1?4:5).forEach(([child,parent],i)=>d.box('predecessor-'+child,939,262+i*62,270,49,child+' ← '+parent,P.white,P.line,26));
    }else{
      ['fay ← eli','eli ← cyd','cyd ← ada'].forEach((text,i)=>d.box('backtrack-'+i,939,278+i*84,270,61,text,P.orangeLight,P.orange,28));
      label(d,'minimum-hops',1074,568,'Minimum: 3 hops',P.green,27);
    }
    foot(d,s===3?'Returned route: ada → cyd → eli → fay. Equal-cost edges make minimum hops the goal.':'A predecessor records who first discovered a node. It lets the search rebuild a route.');
  });
  use(15,'a-supernode-is-skew-again',(d,s)=>{
    const count=s===0?5:30,limit=s===2?8:count;
    label(d,'degree',640,222,s===2?'Expansion budget: 30 → 8':'Outgoing degree: '+count,P.ink,30);
    for(let i=0;i<count;i++){
      const angle=i*2*Math.PI/count,dx=Math.cos(angle)*430,dy=Math.sin(angle)*160,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
      const color=i<limit?P.orange:P.line;
      d.arrow('outgoing-'+i,640+ux*82,430+uy*82,640+dx-ux*19,430+dy-uy*19,color,i<limit?3:2);
      d.circle('neighbor-'+i,640+dx,430+dy,14,i<limit?P.greenLight:P.white,i<limit?P.green:P.line,2);
    }
    d.circle('hub',640,430,70,P.orangeLight,P.orange,3);label(d,'hub-label',640,441,'hub',P.orange,31);
    foot(d,s===2?'Eight inspected edges leave 22 possible next steps unexplored. This is a toy limit.':'Stored adjacency locates the list. Expanding the list still inspects its outgoing edges.');
  });
  use(15,'connections-augment-similarity',(d,s)=>{
    label(d,'retrieval-question',640,216,'Why must logging happen before a dirty page is written?',P.ink,29);
    d.rect('log-passage',55,274,420,174,P.greenLight,P.green,9,2);
    label(d,'log-source',265,307,'Source ID: log-notes',P.green,27);
    ['WAL records recovery','information before a changed','page reaches storage.'].forEach((line,i)=>label(d,'log-text-'+i,265,352+i*34,line,P.ink,24));
    if(s===0){
      card(d,'wal-definition',580,278,630,123,'WAL = write-ahead log','It stores changes needed for recovery.');
      card(d,'dirty-definition',580,464,630,123,'Dirty page = changed memory copy','Those changes have not reached storage.');
    }
    if(s>=1){
      d.arrow('mention-link',489,358,565,358,P.green,3);
      d.circle('wal',650,358,70,P.orangeLight,P.orange,3);label(d,'wal-name',650,369,'WAL',P.orange,32);
      label(d,'wal-expanded',650,473,'write-ahead log',P.muted,24);
    }
    if(s>=2){
      d.circle('buffer',1065,358,92,P.blueLight,P.blue,3);label(d,'buffer-name',1065,369,'buffer pool',P.blue,27);
      d.arrow('relation',735,358,956,358,P.orange,4);
      label(d,'relation-label',855,285,'protects page writes',P.orange,23);
    }
    if(s>=3){
      d.rect('buffer-passage',815,491,410,127,P.blueLight,P.blue,9,2);
      label(d,'buffer-source',1020,521,'Source ID: buffer-notes',P.blue,25);
      label(d,'buffer-text-1',1020,558,'A dirty page has changes',P.ink,24);
      label(d,'buffer-text-2',1020,591,'not yet written to storage.',P.ink,24);
      d.arrow('source-link',1065,463,1065,480,P.blue,3);
      d.box('retained-evidence',70,532,690,65,'Evidence IDs: log-notes + buffer-notes',P.greenLight,P.green,27);
    }
    foot(d,'Illustrative passages and relation · preserve source IDs and check the added text.');
  });

  use(4,'lecture-04-scene-02',(d,s)=>{
    card(d,'input-a',90,253,390,113,'Input A','1,000,000 rows');
    if(s>=1)card(d,'input-b',800,253,390,113,'Input B','1,000,000 rows');
    if(s===0){d.arrow('materialize',500,310,740,310,P.orange,4);card(d,'copy',775,250,400,120,'Materialized scan','Store all input rows');}
    if(s>=1){
      d.arrow('left-product',285,384,480,446,P.orange,3);d.arrow('right-product',995,384,800,446,P.orange,3);
      d.box('product',310,458,660,87,s===3?'Pull and test one candidate pair at a time':'10⁶ × 10⁶ = 10¹² candidate pairs',s===2?P.redLight:s===3?P.greenLight:P.orangeLight,s===2?P.red:s===3?P.green:P.orange,29);
    }
    if(s===2)label(d,'size',640,598,'At 16 bytes per pair: 16 TB of intermediate data',P.red,28);
    foot(d,s===3?'Streaming saves intermediate storage. A better plan is still needed to reduce pair count.':'Example sizes. Pair count equals the product of input sizes.');
  });
  use(4,'lecture-04-scene-09',(d,s)=>{
    const left=['ada','ben','cyd'],right=['ds','stat','econ'],li=s===4?1:0,ri=s===0?-1:s===4?0:s-1;
    label(d,'left-heading',275,232,'Outer scan: hold one row');label(d,'right-heading',1000,232,'Inner scan: advance every pull');
    left.forEach((v,i)=>d.box('left-'+v,140,283+i*86,270,64,v,i===li?P.orangeLight:P.white,i===li?P.orange:P.line,29));
    right.forEach((v,i)=>d.box('right-'+v,865,283+i*86,270,64,v,i===ri?P.blueLight:P.white,i===ri?P.blue:P.line,29));
    if(s>0){d.arrow('left-to-pair',425,315+li*86,510,528,P.orange,3);d.arrow('right-to-pair',850,315+ri*86,770,528,P.blue,3);d.box('pair',475,540,330,70,'('+left[li]+', '+right[ri]+')',P.greenLight,P.green,30);}
    if(s===4){d.path('rewind','M 1163 494 L 1200 494 L 1200 315 L 1163 315','none',P.blue,3);d.arrow('rewind-tip',1190,315,1163,315,P.blue,3);label(d,'rewind-label',640,364,'Advance outer; rewind inner',P.blue,25);}
    foot(d,'The full 3 × 3 product has 9 pairs. This sequence shows its first four.');
  });

  function repair(id,sceneId,edit){
    if(!decks[id])return;
    const scene=decks[id].scenes.find(s=>s.id===sceneId);if(!scene)throw new Error('Missing diagram repair: '+sceneId);
    const draw=scene.draw;scene.draw=(d,s)=>{draw(d,s);edit(d,s);};
  }
  const item=(d,key)=>d.items.find(x=>x.key===key);
  repair(3,'lecture-03-scene-07',(d,s)=>{if(s===3){item(d,'flag').text='1';item(d,'flag').attrs.fill=P.green;}});
  repair(8,'two-phases',d=>{label(d,'count-label',310,218,'Number of locks held');label(d,'time-label',1120,615,'time');});
  repair(8,'isolation-ladder',d=>{
    item(d,'name0').text='dirty read';item(d,'name1').text='changed row';
    label(d,'standard-legend',640,668,'✓ prevented · ○ permitted by the standard minimum. Implementations can be stronger',P.muted,22);
  });
  repair(9,'optimizer',d=>label(d,'statistics-legend',640,217,'N = row count · V = number of distinct values',P.muted,25));
  repair(9,'watch-the-access-path-flip',d=>label(d,'bar-units',640,623,'Estimated page accesses · logarithmic bar lengths',P.muted,25));
  repair(10,'a-table-over-files',(d,s)=>{
    label(d,'head-label',s<2?440:1110,200,'current',P.orange,24);
    if(s>0)d.path('shared-file-a','M 820 370 L 740 410 L 214 410 L 214 450','none',P.green,2);
    if(s===2)label(d,'reader-label',515,620,'reader of A',P.blue,24);
  });
  repair(11,'navigate-a-graph',d=>{
    item(d,'star').attrs.y=600;label(d,'query-name',1060,600,'query',P.ink,24);
    item(d,'layer1').text='layer 1';item(d,'layer0').text='layer 0';item(d,'layer1').attrs.x=78;item(d,'layer0').attrs.x=78;
  });
  repair(11,'choose-an-operating-point',(d,s)=>{
    label(d,'x-min',190,596,'0',P.muted,21);label(d,'x-max',1070,596,'4,000',P.muted,21);
    label(d,'y-low',147,570,'0.5',P.muted,21);label(d,'y-high',147,285,'1.0',P.muted,21);
    if(s>0)label(d,'quality-bound',850,365,'recall ≥ 0.90',P.orange,23);
    if(s>1)label(d,'work-bound',563,526,'budget: 1,000',P.blue,23);
  });
  const mapreducePaper='https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/';
  const distributionOpening=use(13,'one-job-many-machines',(d,s)=>{
    d.rect('report',65,270,330,230,P.blueLight,P.blue,10,2);
    label(d,'report-title',230,307,'Delivery report',P.blue,28);
    label(d,'report-data',230,360,'Stored records: 10 TB',P.ink,25);
    label(d,'report-window',230,407,'Window: 10 min',P.ink,27);
    label(d,'report-assumption',230,459,'Hypothetical requirement',P.muted,22);
    if(s===0){
      d.box('worker0',500,300,300,130,'One reader: 2 GB/s',P.greenLight,P.green,28);
      d.arrow('read-time',815,365,890,365,P.orange,3);
      label(d,'time',1050,342,'5,000 s',P.orange,36);
      label(d,'minutes',1050,397,'~85 min',P.orange,31);
      label(d,'missed-window',850,490,'Reading alone exceeds the window',P.red,28);
      label(d,'capacity-formula',640,560,'10 TB ÷ 2 GB/s = 5,000 seconds',P.ink,30);
    }else{
      label(d,'worker-count',825,225,'100 workers total · 8 shown',P.muted,27);
      for(let i=0;i<8;i++){
        const x=455+(i%4)*190,y=270+Math.floor(i/4)*145,failed=s===2&&i===6;
        d.rect('worker'+i,x,y,165,105,failed?P.redLight:P.greenLight,failed?P.red:P.green,10,2);
        label(d,'data'+i,x+82.5,y+42,'100 GB',failed?P.red:P.green,28);
        if(failed)label(d,'lost-result',x+82.5,y+79,'lost result',P.red,21);
      }
      label(d,'time',640,560,s===1?'100 GB ÷ 2 GB/s = 50 seconds per reader':'50 s ideal reading · recovery adds work',P.orange,30);
    }
    label(d,'capacity-limit',640,606,'Capacity estimate, not a benchmark · Computation, transfers, and scheduling add time',P.muted,22);
    d.link('mapreduce-paper',470,646,'Google MapReduce paper · 2004',mapreducePaper,22);
  });
  if(distributionOpening){
    distributionOpening.title='When one machine cannot finish in time';
    distributionOpening.states=['One reader misses the window','Parallel reads add capacity','Recover a lost result'];
    distributionOpening.sources=[mapreducePaper,...distributionOpening.sources.filter(src=>src!==mapreducePaper)];
  }
  repair(15,'finish-with-measured-decisions',(d,s)=>{if(s===3){item(d,'dates').attrs.y=691;item(d,'dates').attrs['font-size']=27;}});

  // Revisit the same deposits and reader/writer schedule rather than mixing
  // their balances with a separate version-chain fixture in the final recap.
  use(8,'exit-schedule',(d,s)=>{
    if(s<2){
      label(d,'deposit-question',640,233,'Two deposits of 10 into the same starting balance of 100',P.ink,28);
      const values=s===0?['read 100','read 100','final 110']:['read 100','read 110','final 120'];
      const titles=['Maya: +10','Noor: +10',s===0?'Lost update':'Completed deposits'];
      [85,490,895].forEach((x,i)=>card(d,'deposit-'+i,x,322,300,147,titles[i],values[i],i===2));
      d.arrow('first-operation',402,395,472,395,s===0?P.red:P.green,3);
      d.arrow('second-operation',807,395,877,395,s===0?P.red:P.green,3);
      foot(d,s===0?'Both read the old value and overwrite it with 110. No crash is needed.':'Resolve lock conflicts and retry as required. The second deposit uses the first result.');
    }else{
      label(d,'snapshot-schedule',640,230,'Reader sees 100 → writer commits 120 → reader selects again',P.ink,28);
      card(d,'rc-read',95,322,475,147,'Read Committed','Second read: 120',true);
      card(d,'rr-read',710,322,475,147,'Repeatable Read','Second read: 100');
      label(d,'rc-boundary',332,527,'New statement snapshot',P.orange,26);
      label(d,'rr-boundary',948,527,'Same transaction snapshot',P.green,26);
      foot(d,'Ordinary PostgreSQL SELECTs · a new transaction can see 120 · snapshot isolation can permit write skew');
    }
  });

  // Teacher cues for drawings whose sequence now differs from the code/table view.
  function cues(id,sceneId,states,builds){const scene=decks[id]?.scenes.find(s=>s.id===sceneId);if(!scene)return;if(states)scene.states=states;scene.teaching.builds=builds;}
  cues(1,'lecture-01-scene-03',null,[
    'Point to the two stored blocks and empty buffer frames. The six rows are in scan order. ada, cyd, and eli satisfy GPA > 35.',
    'Follow the orange storage-read arrow into frame 0. Loading the block alone has not returned a row.',
    'Test all three rows in block 0. The green result cards contain ada and cyd. ben fails the predicate.',
    'Follow the second orange arrow into frame 1. The earlier frame remains resident for later reuse.',
    'Test block 1 and add eli. Read the three separate counters: two storage reads, six row tests, and three results.'
  ]);
  cues(2,'lecture-02-scene-03',['Empty frames','Load a page','Replace the page'],[
    'Distinguish the block numbers in the persistent file from the numbered empty frames in memory.',
    'Load block 7 into frame 0. Point to the frame number and its separate resident block label.',
    'This replacement illustration assumes frame 0 is eligible. Load block 8 into that frame. Block 7 remains stored in the file.'
  ]);
  cues(13,'reduce-sees-the-complete-group',['Lunch orders','Map: emit pairs','Shuffle: group values','Reduce: sum each group','Separate functions from execution'],[
    'The runtime assigns input records to tasks. Map transforms each record into pairs. Splitting the input into tasks is a separate responsibility. Read the two fictional club lunch orders. Each mention requests one meal. Predict the pairs for each order before advancing.',
    'Apply map separately to each order. Convert letters to lowercase and treat punctuation as separators. Emit (meal, 1) for each occurrence, preserving repeats. The meal name is the key, and the value 1 represents one requested meal. Mapping does not combine the two orders.',
    'The runtime performs the shuffle. Move the three pizza cards to P0 and the salad card to P1. Gather all values for each meal before computing its total. P0 and P1 label the example partitions. A real partition can contain several keys, each with its own value group.',
    'Call reduce for each meal key and its complete group of values. For pizza, sum [1, 1, 1] to obtain 3. For salad, sum [1] to obtain 1. Emit one (meal, total) pair per group. Map created occurrences, shuffle gathered matching keys, and reduce calculated the totals.',
    'You write the map and reduce functions. The runtime assigns input records to tasks, schedules execution, and performs the shuffle. A different partition count can change placement and scheduling, but must preserve the meal totals. The toy owner labels are illustrative. Python hash bucket numbers can vary.'
  ]);
  // Add a prediction before each worked example’s first reveal.
  const tracePredictions=[
    [12,'keep-the-source-identity','Predict which source the integer position selects before following the result.'],
    [13,'reduce-sees-the-complete-group','Predict how many occurrences must survive and which values share a key group.'],
    [14,'read-the-newest-visible-value','Name the read boundary, then predict which included update is newest.'],
    [15,'paths-are-not-unique-vertices','State whether the question asks for walks or distinct people before counting.']
  ];
  for(const [id,sceneId,prediction] of tracePredictions){
    const sc=decks[id]?.scenes.find(s=>s.id===sceneId);if(!sc)continue;
    sc.teaching.builds[0]=prediction+' '+sc.teaching.builds[0];
    sc.teaching.context=[sc.teaching.context,'Ask for a prediction, reveal the operation, then have a student explain why the result follows.'].filter(Boolean).join(' ');
  }

  for (let lecture=1; lecture<=10; lecture++) {
    const deck=decks[lecture];
    if(deck)window.CourseClearLearning?.(deck);
  }
})();
