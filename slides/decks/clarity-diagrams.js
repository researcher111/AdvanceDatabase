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
    label(d,'stored',250,224,'Persistent block identities');label(d,'resident',865,224,'Reusable memory frames');
    [7,8,9].forEach((n,i)=>card(d,'block-'+n,95,278+i*105,260,79,'Block '+n,'',s===2?n===8:n===7));
    for(let i=0;i<2;i++)card(d,'frame-'+i,675,306+i*150,370,105,'Frame '+i,s===0?'empty':i===0?'contains block '+(s===2?8:7):'empty',i===0&&s>0);
    if(s>0)d.arrow('load',370,s===2?423:318,655,360,P.orange,4);
    foot(d,s===2?'Frame 0 now contains block 8; block 7 still exists in the file.':'A frame is a memory slot. A block number identifies data in a file.');
  });

  use(7,'two-writes-reverse-undo',(d,s)=>{
    label(d,'log-title',337,210,'Durable log · oldest at top');label(d,'durable-page-heading',930,210,s===5?'Repaired durable page A':'Recovery buffer: A');
    const entries=['tx1: SET A, old = 100','tx1: COMMIT','tx2: SET A, old = 60','tx2: SET A, old = 40'];
    const active=[3,3,2,1,0,-1][s];
    entries.forEach((v,i)=>d.box('log-'+i,80,247+i*77,520,62,v,i===active?P.orangeLight:P.white,i===active?P.orange:P.line,25));
    if(active>=0){d.arrow('cursor',43,278+active*77,73,278+active*77,P.orange,3);label(d,'backward',335,592,'Read backward ↑',P.orange);}
    const value=s===0?10:s===1?40:60;
    card(d,'page',800,313,260,157,'A',String(value),s===1||s===2);
    if(s===1||s===2){d.arrow('restore',622,278+active*77,780,391,P.orange,4);label(d,'restore-label',930,513,'Assign logged old value',P.orange);}
    if(s>=3)label(d,'finished',930,264,'Finished set: {tx1}',P.green,25);
    if(s===4){d.line('skip',92,262,585,292,P.muted,3);label(d,'skip-label',930,513,'Keep tx1’s committed 60',P.green);}
    foot(d,s===5?'Flush repaired A = 60, then record durable ROLLBACK for tx2.':'Reverse undo restores 10 → 40 → 60; undoing forward would leave the wrong value.');
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
    foot(d,s===4?'The original Repeatable Read transaction has ended. Both new reads can see 120.':'PostgreSQL example: plain SELECTs; statement snapshot versus transaction snapshot.');
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
    foot(d,'Toy model: one page access per RID; caching, shared pages, and CPU costs are excluded.');
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

  use(10,'analytical-workload',(d,s)=>{
    const {rides,monthly}=window.CourseTraces.fixtures;
    const amounts=rides.map(r=>r[1]+r[2]),months=['January','February'];
    const running=monthly.map((_,i)=>monthly.slice(0,i+1).reduce((sum,r)=>sum+r[1],0));
    if(s>=5) {
      label(d,'comparison-task',640,182,'Find the first running total above $40 in each result.',P.ink,27);
      label(d,'trip-output-title',320,253,'Without monthly grouping',P.ink,28);
      label(d,'month-output-title',941,253,'After monthly grouping',P.ink,28);
      let total=0;
      d.table('trip-output',65,285,[125,160,230],[['Trip','Revenue','Running total'],...amounts.map((v,i)=>['Trip '+(i+1),'$'+v,'$'+(total+=v)])],{rowHeight:51,fontSize:25,highlightRows:s===6?[3]:[]});
      d.table('month-output',665,285,[170,155,225],[['Month','Revenue','Running total'],...monthly.map(([month,value],i)=>[months[month-1],'$'+value,'$'+running[i]])],{rowHeight:76,fontSize:25,highlightRows:s===6?[2]:[]});
      label(d,'trip-output-count',322,558,'4 output rows: one per trip',P.blue,23);
      label(d,'month-output-count',940,558,'2 output rows: one per month',P.green,23);
      label(d,'threshold-trip',322,595,s===6?'Trip 3: $44 > $40':'Which trip crossed $40?',s===6?P.orange:P.ink,27);
      label(d,'threshold-month',940,595,s===6?'February: $50 > $40':'Which month crossed $40?',s===6?P.orange:P.ink,27);
      label(d,'comparison-result',640,632,s===6?'Monthly totals identify the month, but not the trip.':'Same final total. Do we still have the same detail?',P.ink,28);
      label(d,'trip-order',640,662,'Trip totals use the shown order: trip 1, then 2, then 3, then 4.',P.muted,21);
      return;
    }
    if(s>=2) {
      d.rect('window-definition-box',65,166,1150,69,P.orangeLight,'none',9);
      label(d,'window-definition',640,186,'Window: the rows included in this running-total calculation.',P.ink,27);
      label(d,'frame-definition',640,218,'Here, include the first month through the current month.',P.ink,23);
    } else label(d,'revenue-definition',640,194,'Revenue = fare + tip. Four made-up trips from two months.',P.muted,27);
    label(d,'input-title',278,260,'Trips before grouping',P.ink,28);
    d.table('trips',65,283,[100,175,150],[['Trip','Month','Revenue'],...rides.map((r,i)=>[i+1,months[r[0]-1],'$'+amounts[i]])],{rowHeight:51,fontSize:25});
    if(s>=1) {
      d.arrow('group-arrow',510,397,598,397,P.green,4);
      label(d,'group-label',554,363,'Group',P.green,22);
      label(d,'monthly-title',920,260,'After GROUP BY month',P.ink,28);
      const widths=[180,165,230];let x=625;
      ['Month','Revenue','Running total'].forEach((heading,i)=>{
        d.rect('monthly-head-'+i,x,283,widths[i],53,P.greenLight,P.line,0,1);
        label(d,'monthly-heading-'+i,x+widths[i]/2,309.5,heading,P.ink,25);x+=widths[i];
      });
      monthly.forEach(([month,value],i)=>{
        const y=336+i*78,current=s===i+2;let cx=625;
        const values=[months[month-1],'$'+value,s>=i+2?'$'+running[i]:'—'];
        values.forEach((v,c)=>{
          d.rect('monthly-'+i+'-'+c,cx,y,widths[c],78,current&&c===2?P.greenLight:P.white,P.line,0,1);
          label(d,'monthly-'+i+'-'+c+'-value',cx+widths[c]/2,y+39,v,c===2&&s>=i+2?P.green:P.ink,28);cx+=widths[c];
        });
      });
      if(s===2||s===3) {
        d.rect('window',620,331,355,s===2?88:166,'none',P.orange,8,4);
        label(d,'window-label',912,537,s===2?'Current month: January':'Current month: February',P.orange,27);
      } else label(d,'monthly-count',912,537,'2 rows: one per month',P.green,27);
    } else {
      d.rect('goal',625,302,575,190,P.white,P.line,10);
      label(d,'goal-heading',912,343,'Our question',P.ink,28);
      label(d,'goal-line1',912,394,'How much revenue have we collected',P.ink,25);
      label(d,'goal-line2',912,434,'by the end of each month?',P.ink,25);
    }
    label(d,'step-result',640,587,[
      'Start with one revenue value per trip.',
      'January: $12 + $8 = $20. February: $24 + $6 = $30.',
      'January so far: $20.',
      'February so far: $20 + $30 = $50.',
      'Grouping combines rows. The running total adds a column.'
    ][s],P.ink,28);
    if(s>=2)label(d,'window-sql',640,637,'SUM(revenue) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING)',P.muted,23);
    else label(d,'grouping-takeaway',640,637,s===0?'Next, combine the trips that belong to the same month.':'The running-total calculation will use these two monthly rows.',P.muted,25);
  });

  use(11,'probe-the-lists',(d,s)=>{
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
    if(s>=2)label(d,'result',930,514,s>=4?'Top 2: v1 (0.96), v0 (0.80)':'One probe returns only v0 (0.80)',P.green,25);
    if(s>=3)label(d,'recall',930,558,s>=4?'Recall@2 = 2 / 2 = 1':'Missed v1: Recall@2 = 1 / 2',s>=4?P.green:P.red,25);
    if(s>=2)label(d,'work',930,604,s===4?'Work: 2 centroids + 4 vectors = 6':'Work: 2 centroids + 1 vector = 3',P.orange,24);
  });

  use(12,'keep-the-source-identity',(d,s)=>{
    label(d,'hits-title',260,223,'Ranked search hits');label(d,'chunks-title',915,223,'Original chunk records');
    const hits=window.CourseTraces.fixtures.hits,chunks=window.CourseTraces.fixtures.chunks.map(c=>[c.doc,c.text]);
    hits.forEach(([score,pos],i)=>card(d,'hit-'+i,95,263+i*108,330,86,'rank '+(i+1)+' · score '+score,'vector position '+pos,i===0&&s>=1));
    chunks.forEach(([source,text],i)=>{d.rect('chunk-'+i,715,263+i*108,475,86,i===2&&s>=1?P.greenLight:P.white,i===2&&s>=1?P.green:P.line,8,2);label(d,'chunk-heading-'+i,952,285+i*108,'position '+i+' · source '+source,P.ink,25);label(d,'chunk-body-'+i,952,321+i*108,text,P.muted,22);});
    if(s>=1)d.arrow('resolve',441,304,699,522,P.orange,4);
    if(s>=2){d.box('copy',420,603,665,47,s===2?'Copy chunk 2 + score 0.9; keep stored chunk unchanged':s===3?'Ranked source IDs: [wal, blocks, wal] · citation [wal]':'First relevant rank = 1 → Hit@3 = 1, RR@3 = 1',P.greenLight,P.green,23);}
  });

  use(13,'reduce-sees-the-complete-group',(d,s)=>{
    label(d,'mappers',230,219,'Map each document');label(d,'shuffle',685,219,'Group by key');label(d,'reduce',1090,219,'Reduce');
    card(d,'doc0',55,260,330,94,'Document 0','“WAL, wal!”');card(d,'doc1',55,434,330,94,'Document 1','“Page wal.”');
    if(s>=1){
      const entries=[['wal',0],['wal',0],['page',1],['wal',1]];
      entries.forEach(([word,doc],i)=>{
        const x=s>=2?565:405,y=s>=2?(word==='page'?532:275+[0,1,3].indexOf(i)*72):278+i*76;
        d.box('pair-'+i,x,y,195,54,word+', 1',word==='wal'?P.blueLight:P.greenLight,word==='wal'?P.blue:P.green,25);
      });
    }
    if(s>=2){label(d,'owner0',850,328,'P0: wal',P.blue,25);label(d,'owner1',850,557,'P1: page',P.green,25);}
    if(s>=3){d.arrow('sum-wal',936,343,994,343,P.blue,3);d.box('wal-total',1005,311,190,64,'wal = 3',P.blueLight,P.blue,28);d.arrow('sum-page',936,557,994,557,P.green,3);d.box('page-total',1005,525,190,64,'page = 1',P.greenLight,P.green,28);}
    foot(d,s===4?'Toy ownership: wal → P0, page → P1. Use a consistent partition function on all workers.':'Every occurrence survives mapping; the shuffle co-locates equal words before addition.');
  });

  use(14,'read-the-newest-visible-value',(d,s)=>{
    const labels=['SSTable A','SSTable B',s>=3?'SSTable C (flushed)':'Memtable'],vals=['old @ 5','new @ 8','DELETE @ 9'];
    label(d,'versions',640,215,'Versions of the same key k · higher sequence is newer');
    labels.forEach((l,i)=>{if(i<=Math.min(s,2)){const removed=s===4;card(d,'version-'+i,90+i*400,267,300,122,l,removed?'safe to remove':vals[i],!removed&&i===Math.min(s,2));if(removed)d.line('remove-'+i,116+i*400,298,362+i*400,361,P.muted,3);}});
    if(s<3){const x=240+Math.min(s,2)*400;d.arrow('read',x,408,640,497,P.orange,4);d.box('read-result',380,515,520,72,s===0?'Read at 5 → old':s===1?'Read at 8 → new':'Read at 9 → absent',s===2?P.redLight:P.greenLight,s===2?P.red:P.green,29);}
    if(s===3){d.rect('merge-region',467,247,760,167,'none',P.orange,10,3);d.arrow('merge',850,431,850,485,P.orange,4);d.box('merge-output',585,500,535,78,'Merged output keeps DELETE @ 9',P.orangeLight,P.orange,26);label(d,'remaining',235,494,'A still holds old @ 5',P.red,25);}
    if(s===4){d.box('safe-output',340,479,600,100,'Safe output for k: no record',P.greenLight,P.green,30);}
    foot(d,s===4?'All covered old versions are accounted for, and no active snapshot needs them.':s===3?'Dropping the tombstone now would let old @ 5 reappear.':'A current read selects the highest visible sequence, including deletion records.');
  });

  const graphNodes={ada:[180,385],ben:[390,260],cyd:[390,505],dee:[620,260],eli:[620,505],fay:[825,385]};
  const graphEdges=[['ada','ben'],['ada','cyd'],['ben','dee'],['ben','ada'],['cyd','dee'],['cyd','eli'],['dee','eli'],['eli','fay'],['fay','ada']];
  use(15,'paths-are-not-unique-vertices',(d,s)=>{
    graphEdges.forEach(([from,to],i)=>{
      const [x,y]=graphNodes[from],[xx,yy]=graphNodes[to],a=Math.atan2(yy-y,xx-x),hot=s===0?from==='ada':s===1||s===2?['ben','cyd'].includes(from):['dee','eli'].includes(from);
      if(from==='fay'){d.path('edge-'+i,'M 825 420 L 825 595 L 180 595 L 180 430','none',P.line,2);d.arrow('edge-tip-'+i,180,455,180,430,P.line,2);}
      else{const offset=from==='ben'&&to==='ada'?15:0;d.arrow('edge-'+i,x+45*Math.cos(a),y+45*Math.sin(a)+offset,xx-45*Math.cos(a),yy-45*Math.sin(a)+offset,hot?P.orange:P.line,hot?4:2);}
    });
    const frontier=s===0?['ben','cyd']:s<=2?['dee','eli']:s===3?['fay']:['ben','cyd','dee','eli','fay'];
    Object.entries(graphNodes).forEach(([name,[x,y]])=>{d.circle('person-'+name,x,y,44,frontier.includes(name)?P.greenLight:P.white,frontier.includes(name)?P.green:P.line,3);label(d,'person-label-'+name,x,y,name,P.ink,26);});
    const lines=[['Walk endpoints','ben, cyd','BFS frontier','ben, cyd'],['Walk endpoints','dee, ada, dee, eli','BFS frontier','dee, eli'],['Visited people','ada, ben, cyd,','dee, eli','6 edges examined'],['Depth 3 walks: 5','All walk rows: 11','BFS frontier: fay','8 edges examined'],['Within 3 hops','11 walk rows','5 unique people','Contracts differ']][s];
    d.rect('result-panel',922,237,305,353,P.white,P.line,10,2);
    lines.forEach((t,i)=>label(d,'result-line-'+i,1074,285+i*83,t,i===0?P.ink:P.green,i===1?23:24));
    foot(d,'Directed edges · walks may revisit nodes · BFS adds only previously unvisited endpoints');
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
    foot(d,s===3?'Streaming saves intermediate storage. A better plan is still needed to reduce pair count.':'Illustrative sizes; the pair count grows multiplicatively.');
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
    label(d,'standard-legend',640,668,'✓ prevented · ○ permitted by the standard minimum; implementations can be stronger',P.muted,22);
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
  repair(13,'one-job-many-machines',(d,s)=>{
    if(s===0)d.items=d.items.filter(a=>!(/^(worker|data)[1-7]$/.test(a.key)));
    if(s>0)label(d,'worker-count',640,251,'100 workers total · 8 shown',P.muted,27);
  });
  repair(14,'a-network-partition-forces-a-choice',(d,s)=>{if(s===4)item(d,'response').text='v2';});
  repair(15,'finish-with-measured-decisions',(d,s)=>{if(s===3){item(d,'dates').attrs.y=691;item(d,'dates').attrs['font-size']=27;}});

  // Teacher cues for drawings whose sequence now differs from the code/table view.
  function cues(id,sceneId,states,builds){const scene=decks[id]?.scenes.find(s=>s.id===sceneId);if(!scene)return;if(states)scene.states=states;scene.teaching.builds=builds;}
  cues(1,'lecture-01-scene-03',null,[
    'Point to the two stored blocks and empty buffer frames. The six rows are in scan order; ada, cyd, and eli satisfy GPA > 35.',
    'Follow the orange storage-read arrow into frame 0. Loading the block alone has not returned a row.',
    'Test all three rows in block 0. The green result cards contain ada and cyd; ben fails the predicate.',
    'Follow the second orange arrow into frame 1. The earlier frame remains resident for later reuse.',
    'Test block 1 and add eli. Read the three separate counters: two storage reads, six row tests, and three results.'
  ]);
  cues(2,'lecture-02-scene-03',['Empty frames','Load a page','Replace the page'],[
    'Distinguish the block numbers in the persistent file from the numbered empty frames in memory.',
    'Load block 7 into frame 0. Point to the frame number and its separate resident block label.',
    'This replacement illustration assumes frame 0 is eligible. Replace its resident with block 8; block 7 remains stored in the file.'
  ]);
  cues(13,'reduce-sees-the-complete-group',['Input documents','Map both documents','Shuffle by word','Reduce complete groups','Check the contract'],[
    'Read both source records and predict four word occurrences. Two copies of WAL occur in the first record.',
    'Follow the four emitted pairs. Each repeated occurrence retains its own stable card rather than disappearing into a set.',
    'Move the three wal cards to P0 and the page card to P1. A real partition can hold multiple different keys, each with its own value group.',
    'Add the values within each key group. The final totals sum to four, preserving all mapped occurrences.',
    'Separate the invariant word totals from partition numbering and output order. The toy owner labels are illustrative; Python hash bucket numbers can vary.'
  ]);
})();
