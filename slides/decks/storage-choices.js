/* Lecture 6, scene four: compare the same keys one operation at a time.
 * Keep the scene ID and five-minute allocation stable for navigation and ink. */
(function () {
  'use strict';
  const deck = window.COURSE_DECKS[6];
  if (!deck) return;
  const scene = deck.scenes.find(s => s.id === 'four-storage-choices');
  const P = window.DeckViz.palette;
  const original = [1, 3, 5, 7, 9, 11];
  const heapOrder = [9, 1, 11, 3, 7, 5];
  const names = ['Heap', 'Sorted array', 'Hash index', 'B+ tree'];
  const starts = [70, 360, 650, 940];
  // Each frame is a deliberate pause, advanced by the existing player controls.
  const frames = [
    ['Same keys, four organizations', -1, 'Each picture stores the same six keys.', 'Name the four structures before asking about speed. Read the same six keys in each. The pictures show organization, not four different datasets.'],
    ['Heap: check the first three rows', 0, 'No key order: check rows one by one.', 'Request key 7. Read the heap in physical order: 9, then 1, then 11. None matches. The blue outlines mark checked rows.'],
    ['Heap: reach the matching row', 0, 'The fifth checked row contains 7.', 'Continue through 3 and then 7. This lookup has examined five rows. We assume unique keys for this toy comparison; a general scan returning all matches may need to continue.'],
    ['Sorted array: compare with 5', 1, '7 is greater than 5: keep the right half.', 'Reset the lookup to the sorted array. Binary search first compares against 5 at the lower middle position. Discard 1, 3, and 5 from the candidate interval.'],
    ['Sorted array: compare with 9', 1, '7 is less than 9: keep the left candidate.', 'The remaining interval is 7, 9, 11. Compare with its middle value, 9. Only 7 remains in the candidate interval.'],
    ['Sorted array: find 7', 1, 'Three comparisons locate 7.', 'Compare with 7 and finish. The array is drawn in rows only to fit the slide; read its positions left to right, then top to bottom.'],
    ['Hash index: choose bucket 1', 2, '7 mod 3 = 1: inspect bucket 1.', 'Introduce the deliberately simple hash rule key mod 3. It routes 7 to bucket 1, which also contains 1. Routing chooses a bucket, not a guaranteed match.'],
    ['Hash index: check the bucket', 2, 'Check 1, then find 7 in the same bucket.', 'Compare the entries in bucket 1. The first key is 1; the next is 7. Keep collisions visible so students do not mistake a hash result for the row itself.'],
    ['B+ tree: compare at the root', 3, '7 is at least 7: take the right child.', 'The root separator is 7. Keys below 7 go left; keys at least 7 go right. Equality goes right because the matching entry lives in that leaf.'],
    ['B+ tree: find the leaf entry', 3, 'The leaf contains 7 and its row address.', 'Follow the highlighted branch and find 7 in the right leaf. A secondary index returns its RID list; heap-row fetching is omitted from this organization comparison.'],
    ['Insert 6: predict the changes', -1, 'Where can the new key go?', 'Change the request from finding 7 to inserting 6. Begin with the original six keys in all four structures. Ask which structure must move existing entries.'],
    ['Heap: use a free slot', 0, 'Place 6 in free space; keep physical order.', 'Put 6 into the illustrated free heap slot. Finding free space has its own policy; the point here is that inserting does not require sorting the existing rows.'],
    ['Sorted array: make a gap', 1, 'Shift 7, 9, and 11 one position right.', 'Pause before placing 6. Watch the existing keys move to make position four free. The unchanged keys 1, 3, and 5 remain where they were.'],
    ['Sorted array: fill the gap', 1, 'Place 6 between 5 and 7.', 'Insert 6 in the gap. Read the complete sequence across rows: 1, 3, 5, 6, 7, 9, 11. The comparison assumes a packed sorted array with spare capacity.'],
    ['Hash index: add to bucket 0', 2, '6 mod 3 = 0: add 6 beside 3 and 9.', 'Route 6 to bucket 0. Its entries are 3, 9, and now 6, making clear that bucket contents are not globally sorted. This toy bucket has room; resizing and overflow policies are separate costs.'],
    ['B+ tree: route the insertion', 3, '6 is below 7: take the left child.', 'Use the root separator to find the target leaf. The left leaf has 1, 3, and 5, and room for one more distinct key.'],
    ['B+ tree: insert in the leaf', 3, 'Four keys fit: no split is needed yet.', 'Insert 6 after 5 in the left leaf. This example allows four keys per leaf, so it stays legal. A later overfull leaf would split; the following lecture scenes trace that case.'],
    ['Range 3 through 9: predict the work', -1, 'All four now contain the inserted key 6.', 'Keep the insertion in every structure. Request the inclusive range from 3 through 9. Predict the same five matches: 3, 5, 6, 7, and 9.'],
    ['Heap: test every row', 0, 'Check all seven rows; keep five matches.', 'Read the entire unordered heap. Keep 9, 3, 7, 5, and 6 in physical order; reject 1 and 11. There is no key-order boundary that lets the scan stop early.'],
    ['Sorted array: find the range start', 1, 'Locate the first key at least 3.', 'Locate the lower bound, 3, using the sorted positions. This frame summarizes that binary search; the earlier lookup frames showed its comparisons.'],
    ['Sorted array: walk forward', 1, 'Read through 9; stop when 11 exceeds it.', 'Move forward through 3, 5, 6, 7, and 9. At 11, the sorted order proves that no later key belongs in the range.'],
    ['Hash index: inspect every bucket', 2, 'Hash buckets do not preserve range order.', 'Inspect all three buckets and keep qualifying entries. Hashing is useful for equality, but key mod 3 gives no contiguous bucket interval for 3 through 9.'],
    ['B+ tree: find the first leaf', 3, 'Route 3 to the left leaf.', 'Descend using the lower bound 3. Locate the first qualifying entry in the left leaf; do not restart from the root for every result.'],
    ['B+ tree: collect the left entries', 3, 'Read 3, 5, and 6 in this leaf.', 'Read qualifying keys through the end of the left leaf. The range has not ended, so use its next-leaf link.'],
    ['B+ tree: follow the leaf link', 3, 'Collect 7 and 9; stop before 11.', 'Follow the orange leaf link into the right leaf, collect 7 and 9, and stop at 11. One descent plus ordered leaf access completes the range.'],
    ['Compare the work', -1, 'Same five matches: 3, 5, 6, 7, 9.', 'Compare how each structure found the same answer. The heap and hash example inspect all entries; the ordered array and tree locate the start and walk forward. These are conceptual operations, not measured disk reads or universal timing claims.']
  ];

  function draw(d, step) {
    const frame = frames[step], active = frame[1];
    const lookup = step > 0 && step < 10, insert = step >= 10 && step < 17;
    const range = step >= 17;
    const heading = step === 0 ? 'Four ways to organize the same keys' : lookup ? 'Find key 7' : insert ? 'Insert key 6' : 'Find keys 3 through 9';
    const subheading = step === 0 ? 'Keys: 1, 3, 5, 7, 9, 11' : frame[2];
    d.text('heading',640,76,heading,40,P.ink,'middle',650);
    d.text('operation',640,137,subheading,28,P.ink);
    names.forEach((name,i) => {
      const x = starts[i], isActive = active === i;
      d.text('name-'+i,x+135,211,name,29,isActive?P.orange:P.ink,'middle',650);
      if(isActive) d.line('active-underline',x+30,241,x+240,241,P.orange,4);
      if(i<3) d.line('separator-'+i,x+280,205,x+280,585,P.line,1);
    });
    const inRange = key => key >= 3 && key <= 9;
    const descriptions = [
      ['Unordered rows','Use a free slot'],
      ['Keys in order','Shift to make space'],
      ['Bucket = key mod 3','Equality routing'],
      ['Root routes to leaves','Leaves stay in key order']
    ];
    descriptions.forEach((lines,i) => lines.forEach((text,j) =>
      d.text('description-'+i+'-'+j,starts[i]+135,610+j*33,text,23,P.muted)));

    function cell(key,x,y,flags={}) {
      const fill=flags.match?P.greenLight:flags.current?P.orangeLight:flags.checked?P.blueLight:P.white;
      const stroke=flags.stop?P.red:flags.match?P.green:flags.current?P.orange:flags.checked?P.blue:P.line;
      d.rect(key,x,y,64,58,fill,stroke,6,flags.current||flags.match||flags.stop?3:2);
    }
    function gridKey(prefix,key,position,flags={}) {
      const x=starts[prefix==='heap'?0:1]+21+(position%3)*76;
      const y=292+Math.floor(position/3)*80;
      cell(prefix+'-'+key,x,y,flags);
      d.text(prefix+'-value-'+key,x+32,y+29,key,30,P.ink);
      return {x:x+32,y};
    }
    function cursor(key,x,y) {
      d.arrow(key,x,y-19,x,y-4,P.orange,3);
    }

    // Heap: stable key IDs make the new row's arrival visible without moving old rows.
    const heapKeys=step>=11?[...heapOrder,6]:heapOrder;
    const heapMatches=step===18||step===25;
    heapKeys.forEach((key,i) => {
      const checked=active===0&&lookup&&i<(step===1?3:5);
      gridKey('heap',key,i,{checked,current:step===1&&i===2,match:step===2&&key===7||heapMatches&&inRange(key)||step===11&&key===6});
    });
    if(step<11){cell('heap-free-slot',91,452);d.text('heap-free-label',123,481,'free',20,P.muted);}
    if(step===1||step===2){const i=step===1?2:4;cursor('heap-cursor',123+(i%3)*76,292+Math.floor(i/3)*80,step===2?'found':'scan');}
    if(step===18)d.text('heap-results',205,561,'7 rows checked',23,P.orange);

    // Packed array: move keys at and beyond the insertion point before filling it.
    const arrayKeys=step>=13?[...original.slice(0,3),6,...original.slice(3)]:original;
    arrayKeys.forEach((key,i) => {
      const position=step===12&&i>=3?i+1:i;
      const current=step===3&&key===5||step===4&&key===9||step===19&&key===3;
      const match=step===5&&key===7||step===13&&key===6||(step===20||step===25)&&inRange(key);
      const pos=gridKey('array',key,position,{current,match,stop:step===20&&key===11});
      if(current||step===5&&key===7)cursor('array-cursor',pos.x,pos.y,step===5?'found':step===19?'start':'compare');
    });
    if(step===12){d.rect('array-gap',381,372,64,58,P.orangeLight,P.orange,6,3);d.text('array-gap-label',413,401,'gap',22,P.orange);}
    if(step===20)d.text('array-stop',495,561,'11 > 9: stop',23,P.red);

    // Buckets show collisions explicitly; only one bucket is read for equality.
    const hashKeys=step>=14?[...original,6]:original;
    for(let bucket=0;bucket<3;bucket++){
      const y=286+bucket*92,chosen=(step===6||step===7)&&bucket===1||step===14&&bucket===0;
      d.rect('bucket-'+bucket,664,y,242,70,chosen?P.orangeLight:P.white,chosen?P.orange:P.line,8,chosen?3:2);
      d.text('bucket-label-'+bucket,687,y+35,'b'+bucket,22,chosen?P.orange:P.muted);
      d.line('bucket-divider-'+bucket,710,y+12,710,y+58,P.line,1);
      const entries=hashKeys.filter(key=>key%3===bucket);
      entries.forEach((key,i)=>{
        const x=728+i*60,match=step===7&&key===7||step===14&&key===6||(step===21||step===25)&&inRange(key);
        if(match)d.rect('hash-match-'+key,x-10,y+11,49,48,P.greenLight,P.green,5,2);
        d.text('hash-value-'+key,x+14,y+35,key,27,P.ink);
      });
    }
    if(step===6||step===7)d.text('hash-routing',785,565,'h(7) = 1',25,P.orange);
    else if(step===14)d.text('hash-routing',785,565,'h(6) = 0',25,P.orange);
    else if(step===21)d.text('hash-routing',785,565,'Check b0, b1, b2',23,P.orange);

    // Tree: equality goes right at separator 7; range traversal follows leaf links.
    const left=step>=16?[1,3,5,6]:[1,3,5],right=[7,9,11];
    const rootActive=step===8||step===15||step===22;
    const leftActive=step===15||step===16||step===22||step===23;
    const rightActive=step===8||step===9;
    d.line('tree-left-edge',1075,341,1004,424,leftActive?P.orange:P.line,leftActive?4:2);
    d.line('tree-right-edge',1075,341,1154,424,rightActive?P.orange:P.line,rightActive?4:2);
    d.box('tree-root',1040,286,70,55,'7',rootActive?P.orangeLight:P.white,rootActive?P.orange:P.green,30);
    d.text('tree-less',991,375,'< 7',23,leftActive?P.orange:P.muted);
    d.text('tree-at-least',1171,375,'≥ 7',23,rightActive?P.orange:P.muted);
    function leaf(keys,center,label){
      const width=keys.length*28+12,x=center-width/2,y=430;
      d.rect('tree-'+label,x,y,width,62,P.white,P.green,7,2);
      keys.forEach((key,i)=>{
        const xx=x+6+i*28;
        const match=step===9&&key===7||step===16&&key===6||step===22&&key===3||step===23&&label==='left'&&inRange(key)||(step===24||step===25)&&inRange(key);
        if(match)d.rect('tree-match-'+key,xx-1,y+8,28,46,step===22?P.orangeLight:P.greenLight,step===22?P.orange:P.green,4,2);
        if(step===24&&key===11)d.rect('tree-stop',xx-1,y+8,28,46,P.white,P.red,4,2);
        d.text('tree-key-'+key,xx+13,y+31,key,24,P.ink);
      });
    }
    leaf(left,1004,'left');leaf(right,1154,'right');
    d.line('leaf-link-down',1004,493,1004,526,step===24?P.orange:P.green,3);
    d.arrow('leaf-link',1004,526,1154,526,step===24?P.orange:P.green,step===24?4:3);
    d.line('leaf-link-up',1154,526,1154,493,step===24?P.orange:P.green,3);
    d.text('leaf-link-label',1075,562,step===24?'Next leaf; stop at 11':'next leaf',step===24?21:23,step===24?P.orange:P.green);
    if(step===16)d.text('tree-capacity',1075,268,'4-key leaf capacity',22,P.orange);
  }

  const question='Why can a B+ tree follow a range while this hash index must inspect every bucket?';
  const answer='The tree keeps leaf entries in key order and links neighboring leaves. Hash routing groups keys by their hash, so a numeric range is scattered across buckets.';
  const checks=[
    ['Do these pictures store different data?', 'No. Each starts with the same six unique keys; only their organization differs.'],
    ['Can we rule out the remaining heap rows?', 'No. Their physical positions tell us nothing about their key values.'],
    ['How many rows did this unique-key lookup check?', 'Five: 9, 1, 11, 3, and finally 7.'],
    ['Which keys can binary search discard after comparing with 5?', '1, 3, and 5. The target 7 is greater than all of them.'],
    ['What remains after comparing with 9?', 'Only 7. It is the remaining candidate below 9.'],
    ['What property made discarding half safe?', 'The array keeps the keys in sorted order.'],
    ['Does reaching bucket 1 prove that we found 7?', 'No. The bucket also holds 1; compare actual keys to resolve collisions.'],
    ['Which buckets did this equality lookup need?', 'Only bucket 1, chosen by 7 mod 3.'],
    ['At separator 7, does equality go left or right?', 'Right. The right leaf contains keys at least 7, including the actual entry for 7.'],
    ['Is the root separator itself the matching data entry?', 'No. It routes the search; the leaf entry holds the key and its row addresses.'],
    ['Which structure must make a gap for 6?', 'The packed sorted array must shift 7, 9, and 11.'],
    ['Must the heap reorder its existing rows?', 'No. This example uses an available slot without imposing key order.'],
    ['Which keys moved, and why?', '7, 9, and 11 each moved one position to leave a sorted insertion gap after 5.'],
    ['What order should we read across these drawn rows?', 'Left to right, then top to bottom: 1, 3, 5, 6, 7, 9, 11.'],
    ['Does bucket 0 now contain sorted values?', 'No. It contains 3, 9, 6. Hash routing does not establish global key order.'],
    ['Will inserting 6 overflow the left leaf?', 'No. It has three keys and room for a fourth.'],
    ['Why is no split needed?', 'Four keys fit in the illustrated leaf; only exceeding that capacity would require a split.'],
    ['Which keys should the inclusive range return?', '3, 5, 6, 7, and 9, including the newly inserted 6.'],
    ['Can the heap stop when it encounters 11?', 'No. Later physical rows still include matching keys.'],
    ['Why locate the first key at least 3?', 'Every earlier sorted key is outside the range, so the forward scan can start at this lower bound.'],
    ['Why can the array stop at 11?', 'Every later key is also greater than 9 because the array is sorted.'],
    ['Why does this range need every hash bucket?', 'Matching keys occur in all three buckets, and the hash gives no contiguous key-order interval.'],
    ['Must the tree restart at its root for every matching key?', 'No. Descend once for the lower bound, then use the sorted leaf entries and sibling links.'],
    ['Where should the range scan go after 6?', 'Follow the next-leaf link to the right leaf, where 7 and 9 are still in range.'],
    ['What tells the tree to stop before returning 11?', '11 exceeds the upper bound 9, and subsequent leaf entries cannot be smaller.'],
    [question,answer]
  ].map(([question,answer])=>({question,answer}));
  scene.title='Heap, sorted array, hash index, and B+ tree';
  scene.kind='activity';
  scene.states=frames.map(frame=>frame[0]);
  scene.steps=frames.length;
  scene.draw=draw;
  scene.teaching={
    idea:'Ordering changes how a structure finds one key, makes room for a new key, and reads a range.',
    builds:frames.map(frame=>frame[3]),question,answer,checks,
    context:'A toy comparison with unique keys and spare space. The initial keys are 1, 3, 5, 7, 9, and 11; insertion adds 6 to all four structures before the range query. Pictures summarize logical work, not disk I/O or measured latency. Index RIDs and heap fetches are omitted. Hash overflow and tree splits are handled separately.'
  };
  scene.notes=[scene.teaching.idea,...scene.teaching.builds,'Ask: '+question,'Expected answer: '+answer,scene.teaching.context].join('\n\n');
})();
