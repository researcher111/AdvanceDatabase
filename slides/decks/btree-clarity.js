/* Lecture 6: authored visual explanations. Keep the stable scene IDs and timings. */
(function () {
  'use strict';
  const deck = window.COURSE_DECKS[6];
  if (!deck) return;
  const P = window.DeckViz.palette;
  const rows = [[28,'(0, 3)'],[31,'(0, 1)','(1, 0)'],[34,'(0, 5)'],[36,'(0, 4)'],[37,'(0, 2)'],[39,'(0, 0)']];
  const frame = (label, caption, cue) => ({label, caption, cue});
  function heading(d, title, caption) {
    d.text('title',640,70,title,40,P.ink,'middle',650);
    d.text('caption',640,130,caption,27,P.ink);
  }
  function foot(d, text, color=P.muted, y=652) { d.text('foot',640,y,text,24,color); }
  function register(id, title, idea, frames, draw, question, answer, context) {
    const scene = deck.scenes.find(s => s.id === id);
    if (!scene) throw new Error('Missing B+ tree scene: '+id);
    Object.assign(scene, {title, kind:'visual', steps:frames.length, states:frames.map(f=>f.label),
      draw(d, step) { heading(d,title,frames[step].caption); draw(d,step); },
      teaching:{idea, builds:frames.map(f=>f.cue), question, answer, context}
    });
    scene.notes=[idea,...frames.map(f=>f.cue),'Ask: '+question,'Expected answer: '+answer,context].filter(Boolean).join('\n\n');
    // The visual sequence has its own builds rather than the shared code/table layout.
    delete scene.traceId;
  }
  function entry(d,key,x,y,rids=[],{hot=false,found=false,prefix='entry',width=94}={}) {
    d.rect(prefix+'-'+key,x-width/2,y,width,rids.length?112:62,found?P.greenLight:hot?P.orangeLight:P.white,hot?P.orange:found?P.green:P.line,7,hot||found?3:2);
    d.text(prefix+'-key-'+key,x,y+31,key,31,P.ink);
    rids.forEach((rid,i)=>d.text(prefix+'-rid-'+key+'-'+i,x,y+69+i*25,rid,19,P.muted));
  }
  // The same toy fixture as CourseTraces: six distinct keys, seven heap rows.
  function fixture(d,{path=null,active=null,matches=[],link=false,missing36=false}={}) {
    d.text('root-heading',640,192,'Root: routing key',23,P.muted);
    d.box('root',590,215,100,62,36,path!==null?P.orangeLight:P.white,path!==null?P.orange:P.green,32);
    [350,930].forEach((x,i)=>{
      d.line('child-'+i,640,277,x,369,path===i?P.orange:P.line,path===i?5:3);
      d.text('branch-label-'+i,i?820:460,310,i?'key ≥ 36':'key < 36',24,path===i?P.orange:P.muted);
      d.text('leaf-label-'+i,x,537,(i?'Right':'Left')+' leaf: keys + RID lists',22,P.muted);
      d.rect('leaf-'+i,x-186,370,372,136,P.white,P.green,10,2);
      rows.slice(i*3,i*3+3).forEach(([key,...rids],j)=>{
        const cx=x+(j-1)*117;
        if(key===36&&missing36){
          d.rect('missing-entry',cx-47,382,94,112,P.redLight,P.red,7,2);
          d.text('missing-label',cx,423,'missing',20,P.red);
        } else entry(d,key,cx,382,rids,{hot:active===key,found:matches.includes(key)});
      });
    });
    d.path('next-line','M 537 480 L 581 480 L 581 538 L 696 538 L 696 480 L 735 480','none',link?P.orange:P.green,link?5:3);
    d.arrow('next-arrow',706,480,735,480,link?P.orange:P.green,link?5:3);
    d.text('next-label',640,566,'next leaf',22,link?P.orange:P.green);
  }

  register('b-trees','B+ trees find row addresses',
    'An index narrows a search to matching row addresses, then the table supplies the rows.',[
      frame('Start with a heap','Heap rows are stored in available slots, not in GPA order.','Point to the six heap rows and their physical slots. GPA values are deliberately out of order. Without an index, finding GPA 36 requires checking rows.'),
      frame('Find a key in the index','The B+ tree keeps searchable keys in sorted leaves.','Reveal the small index and its two levels. Follow 36 from the routing key into the right leaf. The root contains a routing copy, not the row.'),
      frame('Follow its address','Key 36 gives RID (0, 4), which locates eli’s heap row.','Follow the highlighted address to block 0, slot 4. Separate finding an address from fetching the row. The heap does not need to be sorted to match the index.')
    ],(d,s)=>{
      d.text('heap-title',335,210,'Heap block 0',29,P.ink,'middle',650);
      const values=[['ada',39],['ben',31],['cyd',37],['dee',28],['eli',36],['fay',34]];
      d.table('heap',130,252,[90,170,150],[['slot','name','GPA'],...values.map(([name,gpa],i)=>[i,name,gpa])],{rowHeight:43,fontSize:24,highlightRows:s===2?[5]:[]});
      if(s>=1){
        d.text('index-title',930,210,'B+ tree index on GPA',29,P.ink,'middle',650);
        d.box('root',885,250,90,62,'36',P.orangeLight,P.orange,30);
        d.line('left-path',930,312,787,408,P.line,3);d.line('right-path',930,312,1070,408,P.orange,4);
        d.text('left-rule',798,353,'< 36',23,P.muted);d.text('right-rule',1060,353,'≥ 36',23,P.orange);
        d.box('left-leaf',675,408,224,68,'28   31   34',P.white,P.green,27);
        d.box('right-leaf',955,408,224,68,'36   37   39',P.greenLight,P.green,27);
        d.text('rid',1068,515,'36 → (0, 4)',27,P.green);
      }
      if(s===2){d.arrow('fetch',944,548,565,465,P.orange,4);d.text('fetch-label',744,575,'Fetch block 0, slot 4',24,P.orange);}
      foot(d,s===0?'A search key is a value; a RID is a row’s address.':'Index order and physical row order are separate.');
    },'Does the root’s copy of 36 contain eli’s full row?',
    'No. Descend to the leaf, obtain its RID list, and use each address to fetch a heap row.',
    'Toy heap block with six rows. The later shared fixture adds a second row with key 31 in block 1. Lab 6 tree nodes live in memory.');

  register('one-row-every-block','A scan checks the table',
    'Without an index, a scan tests each row until it can establish the complete answer.',[
      frame('Ask for matching rows','Find all rows where uid = 77777.','Set up the 100,000-row example across 294 heap blocks. The grid shows blocks schematically, not individual rows. No declared uniqueness or early-stop rule is assumed.'),
      frame('Reach the halfway point','50,000 rows checked; 147 blocks visited.','Move the cursor across the first half of the grid. These are logical block visits in the example, not a measurement of new disk reads.'),
      frame('Find a match','Finding one match does not prove there are no more.','Highlight a matching row in the next portion of the scan. Ask whether the scan can stop. For an all-matches query without a uniqueness guarantee, it must continue.'),
      frame('Finish the scan','100,000 rows checked; 294 blocks visited.','Complete the scan and emphasize the difference between one returned row and all rows examined. An index can reduce the rows examined for a selective predicate.')
    ],(d,s)=>{
      d.text('query',640,205,'SELECT * FROM students WHERE uid = 77777',27,P.green);
      const counts=[0,147,210,294],n=counts[s];
      for(let i=0;i<42;i++)d.rect('block-'+i,135+(i%14)*73,295+Math.floor(i/14)*64,57,47,i<Math.ceil(n/7)?P.blueLight:P.white,P.line,5,2);
      d.text('grid-label',640,260,'Each tile represents 7 heap blocks',24,P.muted);
      if(s>=2){d.rect('match-block',135+10*73,295+64,57,47,P.greenLight,P.green,5,3);d.text('match-label',640,537,s===3?'Scan complete: every row has been checked.':'A matching row is here; later blocks still need checking.',24,P.green);}
      d.text('checked',640,595,['0 rows checked','50,000 rows checked','Continue past the match','100,000 rows checked'][s],32,P.ink,'middle',650);
      foot(d,n+' of 294 heap blocks visited · visits are not necessarily physical reads');
    },'When could stopping after the first match be valid?',
    'When the query only needs one result or an enforced uniqueness guarantee proves there cannot be another match.',
    'Illustrative scan progress for a 100,000-row, 294-block table. The exact match position is invented for teaching.');

  register('index','A key gives an address, then a row',
    'A leaf entry maps a search-key value to one or more RIDs.',[
      frame('Choose the value','Search the GPA index for 36.','Point to the value 36. It is a search key, not a page number or a complete student row.'),
      frame('Read the address list','The leaf entry for 36 contains RID (0, 4).','Reveal the address list. A RID is a pair: block number and slot number. Several rows can share one indexed value, so the entry owns a list.'),
      frame('Decode the RID','Block 0, slot 4 tells the table where to look.','Separate the two fields of the address and point to their labels. Follow the RID rather than searching the table by GPA again.'),
      frame('Fetch the fields','The heap row supplies name = eli and GPA = 36.','Reveal the fetched row. The index lookup and the heap fetch are separate operations. A covering index can sometimes avoid a heap fetch, but this lab index stores only keys and RIDs.')
    ],(d,s)=>{
      const titles=['1. Search key','2. Leaf’s RID list','3. Heap row'];
      [225,640,1055].forEach((x,i)=>d.text('stage-'+i,x,265,titles[i],27,P.ink,'middle',650));
      d.box('key',125,328,200,95,'36',P.greenLight,P.green,44);
      if(s>=1){d.arrow('lookup',345,375,505,375,P.orange,4);d.box('rid',525,328,230,95,'[(0, 4)]',P.orangeLight,P.orange,34);}
      if(s>=2){d.text('block-label',583,483,'block 0',25,P.green);d.text('slot-label',708,483,'slot 4',25,P.green);d.line('block-pointer',612,424,583,451,P.line,2);d.line('slot-pointer',665,424,708,451,P.line,2);}
      if(s>=3){d.arrow('fetch',775,375,925,375,P.orange,4);d.box('row',945,310,225,135,'eli · GPA 36',P.greenLight,P.green,27);d.text('address-label',1055,492,'at block 0, slot 4',24,P.muted);}
      foot(d,'RID = (block number, slot number) · one key may have several RIDs');
    },'If two students share GPA 31, how many distinct key entries are needed?',
    'One entry for key 31, with both students’ RIDs in its list.',
    'Uses the same GPA values and RIDs as the shared B+ tree search and range examples.');

  register('first-four-keys','Four keys fit in one leaf',
    'Insert entries in key order; a full leaf remains legal until another distinct key arrives.',[
      frame('Insert 3','The only node is both the root and a leaf.','Start with key 3 and RID c. Empty dashed slots represent capacity; they are not entries.'),
      frame('Insert 1 before 3','Move the existing entry to keep keys sorted.','Insert 1 with RID a before 3. The stable entry for 3 moves right with its RID. Sorting by key does not reorder the heap.'),
      frame('Insert 4 after 3','Three entries use three of the four slots.','Insert 4 with RID d after 3. No parent node or separator is needed while the single leaf has room.'),
      frame('Insert 2 between 1 and 3','Four keys fill the leaf; no split is needed yet.','Insert 2 with RID b between 1 and 3. Existing entries move to make space. Stop before inserting a fifth key and ask whether full is already invalid.')
    ],(d,s)=>{
      const keys=[[3],[1,3],[1,3,4],[1,2,3,4]][s],newKey=[3,1,4,2][s];
      d.text('capacity',640,224,'Capacity: 4 distinct keys',28,P.muted);
      d.text('node-label',640,288,'root = leaf',28,P.green);
      d.rect('leaf',323,325,634,145,P.white,P.green,12,3);
      for(let i=0;i<4;i++){const x=421+i*146;d.rect('slot-'+i,x-56,341,112,112,P.bg,P.line,7,1);if(i>=keys.length)d.text('free-'+i,x,396,'free',23,P.muted);}
      keys.forEach((key,i)=>entry(d,key,421+i*146,341,['['+String.fromCharCode(96+key)+']'],{hot:key===newKey,width:112}));
      d.text('count',640,530,keys.length+' of 4 key slots used',31,P.ink,'middle',650);
      foot(d,'Each letter stands for a RID list that stays with its key.');
    },'Does inserting a second RID for key 2 create a fifth distinct key?',
    'No. It extends key 2’s RID list. A new distinct key is what overflows this toy leaf.',
    'Toy capacity is four distinct keys. The following growth animation replays keys 1–4 and then adds 5–7.');

  register('b-tree','Roots route; leaves hold entries',
    'Internal separators choose children; leaves retain each key and its RID list.',[
      frame('Name the parts','The root’s 36 divides the two key ranges.','Identify the routing key and two child pointers. The left subtree contains keys below 36; equality takes the right subtree.'),
      frame('Inspect the leaf entry','36 also appears in a leaf, with its row address.','Highlight the actual leaf entry for 36. The root copy does not replace it. Point to its RID (0, 4).'),
      frame('Follow the leaf order','The next-leaf link continues through keys in order.','Highlight the sibling link. It is for moving between leaves during a range scan, not for fetching a row from the heap.'),
      frame('Check duplicate keys and depth','Key 31 has two RIDs; both leaves have the same depth.','Point to the two addresses under 31, then to the two root-to-leaf paths. Distinct key count, row count, and leaf depth describe different properties.')
    ],(d,s)=>{
      fixture(d,{path:s===1?1:null,active:s===1?36:s===3?31:null,link:s===2});
      foot(d,['Routing key: choose a child; do not stop at the root.','Actual entry: key 36 → [(0, 4)]','Leaf links follow key order, not heap-page order.','6 distinct keys · 7 matching row addresses · 2 levels'][s]);
    },'Why does 36 appear in both the root and a leaf?',
    'The root copy routes the lookup. The leaf entry stores key 36’s RID list, just like every other actual key.',
    'Shared fixture: leaves [28,31,34] and [36,37,39]. Key 31 has RIDs (0,1) and (1,0). All other keys have one RID.');

  register('find-37','Follow an equality lookup',
    'Reach the correct leaf, check that the key exists, then fetch every RID in its list.',[
      frame('Search for 36','Find key 36, exactly equal to the separator.','Ask whether finding 36 in the root finishes the search. It does not: internal nodes contain routing keys, while leaves contain RID lists.'),
      frame('Equality goes right','36 ≥ 36, so follow the right child.','Highlight the right edge. Equality belongs in the right subtree under this separator convention.'),
      frame('Locate the leaf entry','The right leaf contains 36 at its first position.','Highlight 36 in the leaf. Distinguish the child index at the root from the position of a key within the leaf.'),
      frame('Return its RID list','search(36) returns [(0, 4)], not a student row.','Read the RID list. Two in-memory tree nodes have been visited; no heap row has been fetched yet.'),
      frame('Fetch the row','Move to block 0, slot 4; read eli, GPA 36.','The provided index scan follows the RID to the heap. Only now does it read the requested row fields.'),
      frame('Try an absent key','35 goes left, but the leaf has no 35: return [].','Follow the left route for 35. Arriving at the correct leaf does not guarantee a match; check membership before returning a RID.'),
      frame('Try a repeated value','31 goes left and returns two row addresses.','Highlight 31 and both RIDs. An equality scan must fetch both matching rows. A single distinct key can produce several results.')
    ],(d,s)=>{
      fixture(d,{path:s>=5?0:s>=1?1:null,active:s===2?36:s===6?31:null,matches:s>=3&&s<=4?[36]:[]});
      if(s>=3){
        const result=s===5?'search(35) → []':s===6?'search(31) → [(0, 1), (1, 0)]':'search(36) → [(0, 4)]';
        d.text('result',640,606,result,29,s===5?P.red:P.green,'middle',650);
      }
      foot(d,s===4?'Heap row fetched: eli, GPA 36':s===6?'Fetch both addresses to return both matching rows.':'Node visits are separate from heap fetches.',P.muted,660);
    },'Can a root separator alone answer search(36)?',
    'No. The leaf provides the RID list. If 36 is missing from that leaf, the tree cannot correctly return its row.',
    'Visual expansion of the shared btree-search example. Lab 6 nodes are in memory; tree visits are not disk reads.');

  register('walk-a-range','Walk an inclusive range',
    'Descend once to the lower bound, follow leaf links, and stop at the first key above the upper bound.',[
      frame('Choose the starting leaf','Find every row with 31 ≤ key ≤ 37.','Descend left because 31 is below separator 36. Both endpoints are included; a range result contains RIDs, not merely distinct keys.'),
      frame('Skip the low key','28 is below 31, so skip it.','Show the cursor at 28 without adding it to the result. The lower bound need not itself exist in the tree.'),
      frame('Collect key 31','31 contributes both of its row addresses.','Highlight 31 and collect both RIDs. One accepted key adds two matching rows.'),
      frame('Collect key 34','Two accepted keys have produced three RIDs.','Add the RID for 34. Keep the accepted keys and the cumulative RID count distinct.'),
      frame('Cross the leaf boundary','Follow next leaf; do not restart at the root.','Move the cursor across the sibling link. The root descent happens once, then the scan continues along sorted leaves.'),
      frame('Collect key 36','36 is still within the requested range.','Accept 36 and its RID (0,4). Four RIDs have now been collected.'),
      frame('Include key 37','37 equals the upper bound, so include it.','Accept the upper endpoint and its RID (0,2). Stopping at key greater than or equal to the bound would lose this row.'),
      frame('Stop at key 39','39 > 37, so stop: 4 distinct keys, 5 RIDs.','Stop at 39 without collecting it. Sorted leaves guarantee all later keys are too high. The returned addresses can now be used to fetch five heap rows.')
    ],(d,s)=>{
      const accepted=[[],[],[31],[31,34],[31,34],[31,34,36],[31,34,36,37],[31,34,36,37]][s];
      fixture(d,{path:s===0?0:null,active:[null,28,31,34,null,36,37,39][s],matches:accepted,link:s===4});
      const count=accepted.length+(accepted.includes(31)?1:0);
      d.text('result',640,609,'Accepted keys: '+(accepted.length?accepted.join(', '):'none')+' · RIDs collected: '+count,28,P.green,'middle',650);
      foot(d,s===7?'Returned RIDs: (0, 1), (1, 0), (0, 5), (0, 4), (0, 2)':'Inclusive means both 31 and 37 are accepted.',P.muted,660);
    },'Why do four matching keys produce five matching rows?',
    'Key 31 owns two RIDs, so its two rows are both included. Keys 34, 36, and 37 each add one row.',
    'Uses the exact keys, duplicate RID lists, and inclusive bounds of the shared btree-range example.');

  function smallNode(d,id,x,y,keys,{width=240,hot=false,leaf=true}={}) {
    d.rect(id,x-width/2,y,width,74,P.white,hot?P.orange:P.green,9,hot?3:2);
    keys.forEach((key,i)=>d.text((leaf?'leaf-key-':'routing-key-')+key,x+(i-(keys.length-1)/2)*Math.min(60,(width-25)/keys.length),y+37,key,keys.length>3?25:29,P.ink));
  }
  register('predict-the-next-split','Predict the next leaf split',
    'A leaf split adds a separator to its parent; it need not increase tree height.',[
      frame('A leaf has room','Capacity is 4 keys; the right leaf currently holds 3.','Show the tree with root 3, left leaf [1,2], and right leaf [3,4,5]. Ask where 6 must go.'),
      frame('Insert 6','6 goes right and fills the fourth slot.','Insert 6 in the right leaf. It is full but legal, so nothing splits.'),
      frame('Predict insertion of 7','A fifth distinct key will overflow the right leaf.','Hold 7 above the full right leaf. Ask students to predict the two leaf contents, the copied separator, and whether the tree gets taller.'),
      frame('Split the right leaf','Split into [3, 4] and [5, 6, 7]; keep their RID lists.','Reveal the split leaves and repaired sibling links. The existing root still needs a new separator and child pointer; this intermediate state is not yet a completed insertion.'),
      frame('Repair the existing root','Copy 5 into the root; every leaf stays at the same depth.','Add separator 5 and the new child pointer. With two routing keys the root still fits, so no new level is needed.')
    ],(d,s)=>{
      const groups=s>=3?[[1,2],[3,4],[5,6,7]]:[[1,2],s>=1?[3,4,5,6]:[3,4,5]],xs=s>=3?[260,640,1020]:[350,930];
      d.text('root-label',640,215,'root: '+(s===4?'2 of 4 key slots':'1 of 4 key slots'),24,P.muted);
      smallNode(d,'root-node',640,243,s===4?[3,5]:[3],{width:180,leaf:false,hot:s===4});
      xs.forEach((x,i)=>{
        if(s!==3||i<2)d.line('child-'+i,640,317,x,422,s===1&&i===1?P.orange:P.line,3);
        smallNode(d,'leaf-node-'+i,x,422,groups[i],{width:300,hot:s===1&&i===1||s===3&&i>0});
        d.text('leaf-count-'+i,x,535,groups[i].length+' of 4 keys',24,P.muted);
        if(i<xs.length-1)d.arrow('next-'+i,x+155,474,xs[i+1]-155,474,P.green,3);
      });
      if(s===2){d.box('incoming',1075,263,80,70,'7',P.orangeLight,P.orange,34);d.text('insert-label',1115,240,'insert',23,P.orange);}
      if(s===4)['< 3','3 ≤ key < 5','≥ 5'].forEach((t,i)=>d.text('route-'+i,xs[i],385,t,23,P.green));
      foot(d,s===3?'Split in progress: install the new parent separator next.':s===4?'A leaf split happened. Tree height is still 2 levels.':'Each displayed key keeps its RID list; lists are omitted here.',s===3?P.orange:P.muted);
    },'What separator is copied up, and does the tree get taller?',
    'Copy 5, the first key of the new right leaf. The existing root has room, so the tree remains two levels tall.',
    'Prediction exercise using the final inserts from the earlier growth animation. Capacity four distinct keys per node; RID lists omitted for space.');

  register('a-root-splits','An internal split moves a separator',
    'Split an internal node around its middle separator, move that separator up, and preserve every child.',[
      frame('A full internal root','After inserting 1–12: 4 root keys and 5 child pointers.','Count the four routing keys [3,5,7,9] and five leaf children. The last leaf holds [9,10,11,12]; full is still legal.'),
      frame('Insert 13','13 goes into the last leaf, which is already full.','Predict the local leaf split before discussing the root. A root split is caused by the extra child and separator from below.'),
      frame('Split the last leaf','The new leaf starts at 11; the parent still needs its pointer.','Split [9,10,11,12,13] into [9,10] and [11,12,13]. Keep all actual entries in leaves and link the new leaf. The parent repair is pending.'),
      frame('The root now overflows','Copy 11 up: 5 root keys now need 6 child pointers.','Add the copied separator 11 and its child. The root exceeds its four-key capacity. Highlight the middle routing key 7.'),
      frame('Divide the internal node','Move 7 upward; split the other keys and the six children.','Left keeps routing keys [3,5] and its first three children. Right keeps [9,11] and its last three children. The routing copy of 7 leaves this internal level.'),
      frame('Install the new root','A new root [7] makes every leaf one level deeper.','Attach the two internal nodes under the new root. Each has two separators and three children. Tree height grows from two levels to three for every leaf together.'),
      frame('Check the actual entry','The routing 7 moved; the actual key 7 remains in a leaf.','Follow the new root into the right internal subtree and point to the leaf [7,8]. Its key 7 and RID list were never removed by the internal split.')
    ],(d,s)=>{
      const split=s>=4,six=s>=2;
      const groups=six?[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12,13]]:[[1,2],[3,4],[5,6],[7,8],[9,10,11,12]];
      const xs=six?[140,340,540,740,940,1140]:[160,400,640,880,1120];
      const leafY=505;
      if(!split){
        const keys=s>=3?[3,5,7,9,11]:[3,5,7,9];
        d.rect('old-root',400,250,480,74,s===3?P.redLight:P.white,s===3?P.red:P.green,9,3);
        keys.forEach((key,i)=>d.text('internal-key-'+key,640+(i-(keys.length-1)/2)*85,287,key,30,key===7&&s===3?P.orange:P.ink));
        d.text('root-count',640,220,keys.length+' separators → '+(s===2?5:groups.length)+' installed children',24,P.muted);
        xs.forEach((x,i)=>{if(s!==2||i<5)d.line('child-'+i,640,324,x,leafY,P.line,3);});
      }else{
        d.rect('new-root',594,213,92,62,s===4?P.orangeLight:P.white,s===4?P.orange:P.green,9,3);
        d.text('internal-key-7',640,244,7,32,s===4?P.orange:P.ink);
        d.text('new-root-label',640,187,s===4?'move 7 up':'new root',23,s===4?P.orange:P.green);
        [340,940].forEach((x,i)=>{
          if(s>=5)d.line('upper-child-'+i,640,275,x,342,s===6&&i===1?P.orange:P.line,3);
          d.rect('internal-node-'+i,x-108,342,216,90,P.white,P.green,8,2);
          (i?[9,11]:[3,5]).forEach((key,j)=>d.text('internal-key-'+key,x-47+j*94,371,key,29,P.ink));
          d.text('children-count-'+i,x,410,'2 keys · 3 children',20,P.muted);
        });
        xs.forEach((x,i)=>d.line('child-'+i,i<3?340:940,432,x,leafY,s===6&&i===3?P.orange:P.line,3));
      }
      groups.forEach((keys,i)=>{
        smallNode(d,'leaf-node-'+i,xs[i],leafY,keys,{width:176,hot:s===6&&i===3||s===2&&i>=4});
        if(i<xs.length-1)d.arrow('next-'+i,xs[i]+89,555,xs[i+1]-89,555,P.green,2);
      });
      if(s===1){d.box('incoming',1083,371,74,63,13,P.orangeLight,P.orange,30);d.text('incoming-heading',1120,347,'insert',22,P.orange);}
      if(s===2)d.text('pending',980,377,'copy 11 next',24,P.orange);
      d.text('depth',640,610,split?(s===4?'Reattach both internal nodes to finish the split.':'3 levels · all leaves have equal depth'):'2 levels · all entries stay in leaves',25,split&&s===4?P.orange:P.green);
      foot(d,'Leaf split: COPY a key up. Internal split: MOVE a routing key up.',P.muted,667);
    },'What happens to the actual key 7 when the internal separator moves?',
    'Its leaf entry and RID list remain in leaf [7,8]. Only a routing key moves between internal levels.',
    'Toy capacity four keys per node. RID lists are omitted; every leaf entry carries its list unchanged. Intermediate split frames are temporary until parent pointers are repaired.');

  register('occupancy','Split near the middle',
    'Sharing entries near the middle leaves useful space in both resulting nodes.',[
      frame('Compare two proposals','Divide the same five keys; each leaf can hold four.','Compare [1,2] plus [3,4,5] with the skewed proposal [1] plus [2,3,4,5]. Empty slots are real free capacity in this toy example.'),
      frame('Count the free slots','The middle split leaves 2 + 1 free slots; the skewed split leaves 3 + 0.','Count free slots by node. Both layouts use five entries across eight slots, but the skewed one puts all spare capacity on the wrong side for a larger incoming key.'),
      frame('Insert the next larger key','6 fits after the middle split; the skewed right leaf overflows.','Insert 6 in the right leaf of each proposal. The upper right leaf reaches four keys legally. The lower right leaf reaches five and needs another split.')
    ],(d,s)=>{
      const ys=[285,472],groups=s===2?[[[1,2],[3,4,5,6]],[[1],[2,3,4,5,6]]]:[[[1,2],[3,4,5]],[[1],[2,3,4,5]]];
      d.text('capacity',640,204,'Toy leaf capacity: 4 keys',25,P.muted);
      groups.forEach((pair,r)=>{
        d.text('choice-'+r,150,ys[r]+36,r?'Skewed':'Middle',26,r?P.orange:P.green,'middle',650);
        pair.forEach((keys,c)=>{
          const cx=c?945:455,w=keys.length>4?430:350,x=cx-w/2;
          d.rect('leaf-'+r+'-'+c,x,ys[r],w,83,P.white,keys.length>4?P.red:r?P.orange:P.green,8,2);
          for(let i=0;i<Math.max(4,keys.length);i++){
            const ex=cx+(i-(Math.max(4,keys.length)-1)/2)*80;
            d.rect('slot-'+r+'-'+c+'-'+i,ex-32,ys[r]+12,64,59,i<keys.length?keys[i]===6?P.orangeLight:P.greenLight:P.bg,P.line,5,1);
            d.text('value-'+r+'-'+c+'-'+i,ex,ys[r]+42,i<keys.length?keys[i]:'—',27,i<keys.length?P.ink:P.muted);
          }
          if(s>=1)d.text('free-'+r+'-'+c,cx,ys[r]+119,keys.length>4?'5 keys > 4: overflow':(4-keys.length)+' free slots',25,keys.length>4?P.red:P.muted);
        });
      });
      foot(d,'Equal leaf depth and good occupancy are different properties.',P.muted,660);
    },'Does equal leaf depth alone guarantee efficient use of space?',
    'No. Nodes can be at equal depth but badly underfilled. Splitting near the middle also supports the usual minimum-occupancy rule for non-root nodes.',
    'The skewed split is a counterexample, not a valid recommended policy. Typical B+ trees require roughly half-full non-root nodes; the root is an exception. The toy exercise focuses on insertions.');

  register('fan-out','More children mean fewer levels',
    'Fan-out is the number of children an internal node can have.',[
      frame('Compare two children','With only 2 children per node, the tree needs many levels.','Set a fully packed capacity model for 100 million distinct keys. Assume fan-out F and F entries per leaf. With F=2 the minimum required height is 27 levels including root and leaf; the path drawing abbreviates those levels.'),
      frame('Increase to twenty','With 20 children per node, the model needs 7 levels.','Reveal the second case. One additional level multiplies possible leaf capacity by the fan-out. Follow one lookup path rather than counting all nodes in the tree.'),
      frame('Increase to two hundred','With 200 children per node, the model needs 4 levels.','Reveal the final case. Explain that actual occupancy and page sizes affect real height. These are capacity estimates for fully packed nodes, not observed lab timings.')
    ],(d,s)=>{
      d.text('model',640,201,'Model: 100 million distinct keys · F entries per leaf',25,P.muted);
      [2,20,200].slice(0,s+1).forEach((f,i)=>{
        const x=[230,640,1050][i],height=[27,7,4][i];
        d.text('fanout-'+i,x,261,'F = '+f+' children',28,i===s?P.orange:P.ink,'middle',650);
        const n=i===0?5:height,dy=36;
        for(let j=0;j<n;j++){
          const y=308+j*dy,cx=j?x-70:x;
          if(j)d.line('path-'+i+'-'+j,j===1?x:cx,y-12,cx,y,P.orange,3);
          d.rect('node-'+i+'-'+j,cx-40,y,80,24,j===n-1?P.greenLight:P.white,j===n-1?P.green:P.line,4,2);
        }
        d.line('other-child-'+i,x,332,x+70,344,P.line,2);
        d.rect('other-node-'+i,x+30,344,80,24,P.white,P.line,4,2);
        if(i>0){d.text('more-children-'+i,x+136,356,'…',26,P.muted);d.text('omitted-'+i,x+40,401,(f-2)+' more children',19,P.muted);}
        if(i===0)d.text('ellipsis',x-7,420,'…',35,P.muted);
        d.text('levels-'+i,x,594,height+' levels',34,P.green,'middle',650);
        if(i===0)d.text('abbreviated',x,544,'27 levels abbreviated',21,P.muted);
      });
      foot(d,'Follow one orange path. Other subtrees are abbreviated.',P.muted,666);
    },'Why can a larger fan-out make a lookup shorter?',
    'Each routing decision chooses among more subtrees. Fewer levels are needed to cover the same number of leaf entries.',
    'Illustrative full-tree model N=100,000,000, leaf capacity L=F, total capacity L × F^(h−1)=F^h. Minimum h values are 27,7,4 for F=2,20,200. Actual trees may be taller when partly occupied.');

  register('index-pages-and-heap-pages','Count visits and disk reads separately',
    'A visited page may already be cached; fetching the heap row is separate work.',[
      frame('State the cache assumptions','Example: 3 upper index pages cached; leaf and heap page uncached.','State a disk-based index scenario before counting. The chosen lookup path has four index levels. Assume its upper three index pages are already cached and its leaf and target heap page are not.'),
      frame('Visit the root','1 index-node visit; 0 new disk reads.','Visit the root in the buffer pool. Reading its separator is a node visit, but it requires no new physical page read.'),
      frame('Visit the two internal pages','3 index-node visits; still 0 new disk reads.','Follow the selected child through both cached internal pages. Keep the cumulative node visits separate from disk reads.'),
      frame('Read the leaf','4 index-node visits; 1 new disk read.','Read the uncached leaf page and obtain the matching RID. The first physical read happens here under the stated cache assumptions.'),
      frame('Read the heap page','Fetch the row: 1 more page visit and 1 more disk read.','Use the RID to fetch the uncached heap page. Totals are four index-node visits, one heap-page visit, and two physical reads. In Lab 6 the entire B+ tree is in memory instead.')
    ],(d,s)=>{
      const labels=['root','internal','internal','leaf','heap row'],visited=[0,1,3,4,5][s];
      [0,1,2,3,4].forEach(i=>{
        const x=160+i*240,cached=i<3,seen=i<visited;
        if(i)d.arrow('path-'+i,x-167,336,x-88,336,seen?P.orange:P.line,3);
        d.box('page-'+i,x-84,290,168,92,labels[i],seen?cached?P.blueLight:P.greenLight:P.white,seen?cached?P.blue:P.green:P.line,25);
        d.text('cache-'+i,x,425,cached?'cached':'uncached',24,cached?P.blue:P.muted);
        if(seen)d.text('read-'+i,x,477,cached?'+0 reads':'+1 read',24,cached?P.blue:P.green);
      });
      d.text('index-bracket',520,235,'INDEX: four nodes on one lookup path',24,P.muted);
      d.text('heap-label',1120,235,'HEAP',24,P.muted);
      d.text('counter',640,568,Math.min(visited,4)+' index visits + '+(s===4?1:0)+' heap visit · '+(s>=3?s-2:0)+' disk reads',31,P.ink,'middle',650);
      foot(d,'Disk-index example above. Lab 6 keeps all B+ tree nodes in memory.',P.muted,654);
    },'Would caching the target heap page change the number of index visits?',
    'No. It would avoid the heap page’s new disk read. The lookup would still visit the same four index nodes and fetch the heap row.',
    'Conditional disk-index illustration, not a Lab 6 measurement. Counts assume no prefetch, no eviction during the lookup, and a single matching RID.');

  register('the-write-bill','Each index adds maintenance work',
    'Inserting a row updates the heap and every index on that table.',[
      frame('Store the row','Insert uid 42, name mia, GPA 36 into the heap.','Start with a table that has no indexes and store the new row. The heap provides RID r; the letter stands for its actual block-and-slot address.'),
      frame('One index','With a uid index, also add 42 → [r].','Compare the same insert into a table with one index. The operation maintains the heap plus one index. Do not describe two structures as exactly two physical writes.'),
      frame('Two indexes','With uid and name indexes, also add mia → [r].','Add the name index to the comparison. Both index entries point to the same inserted heap row, using the same RID.'),
      frame('Three indexes','With three indexes, maintain the heap and all three indexes.','Add the GPA entry 36 → [r]. If GPA 36 already exists, append the RID to its list. Splits, buffering, and logging determine the physical writes.')
    ],(d,s)=>{
      d.text('row',640,212,'New row: (42, mia, 36) · assigned RID r',28,P.ink);
      d.box('heap',130,290,260,150,'heap row at r',P.greenLight,P.green,29);
      d.text('heap-caption',260,475,'1 heap structure',24,P.muted);
      const labels=['uid index','name index','GPA index'],entries=['42 → [r]','mia → [r]','36 → [r]'];
      for(let i=0;i<s;i++){
        const x=550+i*245;
        d.text('index-label-'+i,x,275,labels[i],26,P.ink,'middle',650);
        d.box('index-'+i,x-100,335,200,85,entries[i],i===s-1?P.orangeLight:P.white,i===s-1?P.orange:P.green,28);
        d.line('rid-link-'+i,260,442,260,532,P.line,2);
        d.path('rid-path-'+i,`M 260 532 L ${x} 532 L ${x} 424`,'none',P.line,2);
      }
      d.text('total',640,594,(s+1)+' maintained structure'+(s?'s':'')+' = 1 heap + '+s+' index'+(s===1?'':'es'),30,P.ink,'middle',650);
      foot(d,'Count maintained structures, not physical writes.',P.muted,656);
    },'When only GPA changes, must the name index entry change too?',
    'If the RID stays the same and indexed name is unchanged, the name entry need not change. The GPA index must remove or replace the old key association and add the new one.',
    'The builds compare tables with zero, one, two, and three indexes. They do not depict creating an entire new index after each inserted row. RID r abbreviates the same physical row address in every index.');

  register('when-scanning-wins','Many matches can favor a scan',
    'Compare the heap work required by an index with visiting the table in page order.',[
      frame('Few matches','One matching RID reaches just one of the six heap pages.','Use twelve toy rows stored two per page. The index returns one RID, so fetching its result touches only one distinct heap page in this illustration.'),
      frame('Many scattered matches','Eight matching RIDs are spread across all six heap pages.','Broaden the predicate. Highlight eight matching rows across all six pages and read the scattered RID order. The index now requires heap access throughout the table.'),
      frame('Try the sequential scan','Read the heap in page order; test every row as it arrives.','Show the scan halfway through, after three pages and six rows. Four of those six rows match the same broad predicate. It needs no index descent or scattered RID lookup.'),
      frame('Compare the complete work','The scan visits six pages and finds the same eight matching rows.','Finish the scan and compare outputs, not just the pictures. A scan may be cheaper when the index also needs most pages. Cache state, locality, coverage, and CPU costs decide the actual tradeoff.')
    ],(d,s)=>{
      const hits=s===0?[1]:[1,2,3,5,7,9,10,11],pageCount=s===0?1:s===2?3:6;
      d.text('layout',640,212,'Toy heap: 6 pages × 2 rows = 12 rows',27,P.muted);
      for(let i=0;i<6;i++){
        const x=155+i*194,seen=s<2?hits.some(k=>Math.floor((k-1)/2)===i):i<pageCount;
        d.text('page-label-'+i,x,277,'page '+i,24,P.muted);
        d.rect('page-'+i,x-76,307,152,152,seen?P.blueLight:P.white,seen?P.blue:P.line,9,2);
        for(let j=0;j<2;j++){
          const k=i*2+j+1,match=hits.includes(k)&&(s<2||seen);
          d.box('row-'+k,x-59,322+j*65,118,51,'row '+k,match?P.greenLight:P.white,match?P.green:P.line,23);
        }
        if(s>=2&&i<pageCount-1)d.arrow('scan-'+i,x+77,488,x+194-77,488,P.orange,3);
      }
      if(s===1)d.text('rid-order',640,512,'RID page order: 0 → 4 → 1 → 5 → 2 → 3 → 0 → 4',27,P.orange);
      if(s===0)d.text('one-rid',640,512,'One RID → page 0 → one matching row',28,P.green);
      if(s>=2)d.text('scan-order',640,537,'Scan order: '+(s===2?'0 → 1 → 2 (continue)':'0 → 1 → 2 → 3 → 4 → 5'),28,P.orange);
      d.text('counts',640,594,s===0?'1 result · 1 distinct heap page':s===1?'8 results · 6 distinct heap pages':s===2?'6 rows checked · 4 matches so far':'12 rows checked · 8 results · 6 heap pages',29,P.ink,'middle',650);
      foot(d,'Page visits are not a prediction of disk reads or elapsed time.',P.muted,661);
    },'Does the same number of distinct heap pages guarantee the same runtime?',
    'No. The index adds traversal and RID processing; locality, repeated visits, caching, coverage, and row-test costs also matter. Compare measured or modeled total work.',
    'Toy comparison, not a universal selectivity threshold. Broad-predicate matches are rows 1,2,3,5,7,9,10,11. The illustrated index RID order is rows 1,9,3,11,5,7,2,10, which visits pages 0,4,1,5,2,3,0,4.');

  register('build-and-test','A routing key cannot replace a leaf entry',
    'Tests must verify returned entries, not just the shape of the tree.',[
      frame('Predict the range result','Request all keys from 34 through 37, including both endpoints.','Show the broken tree: root separator 36 exists, but the corresponding leaf entry is missing. Ask for the expected keys and let students inspect the actual leaf chain.'),
      frame('Expose the missing entry','Expected: 34, 36, 37. Broken result: 34, 37.','Highlight 34 and 37 as the entries the broken range walk can return. The root cannot supply the missing RID for 36; it holds only a routing key.'),
      frame('Restore the entry and RID','Put 36 → [(0, 4)] back in the right leaf.','Restore both the actual key and its RID list. Merely keeping a separator in the parent does not fix the data loss.'),
      frame('Check equality and range','search(36) and range(34, 37) now return the correct addresses.','Verify the repaired result against expected keys and RIDs. Test a separator-equality lookup as well as an inclusive range crossing that separator.')
    ],(d,s)=>{
      fixture(d,{missing36:s<2,active:s===2?36:null,matches:s===1?[34,37]:s===3?[34,36,37]:[],link:s===1||s===3});
      d.text('test-result',640,612,s===0?'Expected keys: 34, 36, 37':s===1?'Broken result: 34, 37':s===2?'Restored entry: 36 → [(0, 4)]':'Returned RIDs: (0, 5), (0, 4), (0, 2)',28,s===1?P.red:P.green,'middle',650);
      foot(d,'Actual entries and their RID lists must remain in leaves.',P.muted,665);
    },'Which small tests expose a lost separator entry after a leaf split?',
    'Search for that exact separator value, and run a range that includes it. Check the returned RID lists, not just whether the tree looks balanced.',
    'Deliberately broken version of the shared GPA tree. The correct range(34,37) returns [(0,5),(0,4),(0,2)].');

  register('exit-trace','Explain one split and one lookup',
    'A leaf split preserves every entry; a lookup uses the repaired routes to find its RID list.',[
      frame('Predict insertion of 5','Capacity is 4 keys. Explain what happens when 5 arrives.','Pause at the full leaf [1,2,3,4]. Ask for the split contents, the routing separator, and what happens to its leaf entry.'),
      frame('Explain the split','Leaves become [1, 2] and [3, 4, 5]; copy 3 into a new root.','Reveal the repaired two-level tree. Every key keeps its lettered RID list. The actual entry for 3 remains in the right leaf.'),
      frame('Route a lookup for 4','4 ≥ 3, so the lookup takes the right child.','Trace the right edge from the root. Ask students to distinguish routing to a leaf from fetching a heap row.'),
      frame('Return the address, then fetch','Find 4 → [d]; use RID d to fetch the matching heap row.','Highlight the key and its RID list. Recap the implementation work: search, insertion, splitting, and inclusive range lookup. The provided index scan uses returned RIDs to fetch rows.')
    ],(d,s)=>{
      const groups=s?[[1,2],[3,4,5]]:[[1,2,3,4]],xs=s?[350,930]:[640],y=s?389:335;
      if(s){
        d.text('root-heading',640,200,'root: routing copy',24,P.green);
        d.box('root',590,227,100,66,3,P.white,P.green,34);
        xs.forEach((x,i)=>d.line('path-'+i,640,293,x,y,s>=2&&i===1?P.orange:P.line,s>=2&&i===1?5:3));
        d.text('less',450,328,'< 3',25,P.muted);d.text('greater',832,328,'≥ 3',25,s>=2?P.orange:P.muted);
      }else{d.text('single-label',640,272,'root = leaf · full but legal',28,P.green);d.box('incoming',1040,232,85,68,5,P.orangeLight,P.orange,34);d.text('insert',1082,207,'insert',23,P.orange);}
      groups.forEach((keys,i)=>{
        const w=s?keys.length*116+26:510;
        d.rect('leaf-'+i,xs[i]-w/2,y,w,137,P.white,P.green,9,2);
        keys.forEach((key,j)=>entry(d,key,xs[i]+(j-(keys.length-1)/2)*116,y+12,['['+String.fromCharCode(96+key)+']'],{hot:s===3&&key===4,found:s===1&&key===3}));
      });
      if(s)d.arrow('next',481,480,743,480,P.green,3);
      if(s===3)d.text('result',640,590,'search(4) → [d] → fetch the row at d',29,P.green,'middle',650);
      foot(d,s===0?'Keep keys sorted and keep each RID list with its key.':'Lab 6: search · insert · split · inclusive range lookup',P.muted,663);
    },'What must survive every split?',
    'Every actual key and its RID list, sorted leaf order, correct routing, the leaf chain, and equal depth for all leaves.',
    'Toy capacity four distinct keys. Letters a–e stand for RID lists. Lab 6 nodes are in memory; the provided scan handles heap-row fetches.');
})();
