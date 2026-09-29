/* Build a small B+ tree, preserving key/RID identity as leaves move and split. */
(function () {
  'use strict';
  const deck=window.COURSE_DECKS[6];
  if(!deck)return;
  const scene=deck.scenes.find(s=>s.id==='the-fifth-key');
  const P=window.DeckViz.palette;
  const frames=[
    ['An empty tree', [], null, 'One empty leaf is also the root.', 'Start with no keys. A B+ tree can begin as one leaf, which is also its root. The toy capacity is four distinct keys per node.'],
    ['Insert 1', [1], null, 'Insert 1 with its row address a.', 'Insert key 1 and keep its row-address list beside it. The letters a through g stand for RIDs; they are not additional search keys.'],
    ['Insert 2', [1,2], null, 'Two entries; two free key slots.', 'Insert key 2 with RID b. Both entries remain in the same sorted leaf.'],
    ['Insert 3', [1,2,3], null, 'Three entries; one free key slot.', 'Insert key 3 with RID c. There is still room, so neither a split nor a parent is needed.'],
    ['Insert 4: full but legal', [1,2,3,4], null, 'Four keys fit. A full leaf is still legal.', 'Insert 4 with RID d. Stop and ask whether full means invalid. With a capacity of four keys, this leaf is full but legal.'],
    ['Predict insertion of 5', [1,2,3,4], 5, 'Where can a fifth distinct key go?', 'Hold 5 above the full leaf. Predict the result before inserting. Adding another RID for an existing key would not create a fifth distinct key.'],
    ['Insert 5: overflow', [1,2,3,4,5], null, 'Five keys exceed the capacity of four.', 'Place 5 with RID e into a temporary overflow state. A wider drawing makes the fifth entry visible; it does not increase the permitted node capacity.'],
    ['Split the entries', [[1,2],[3,4,5]], null, 'Move the entries into two leaves: 2 keys and 3 keys.', 'Split near the middle. Move keys 1 and 2 with their RIDs left, and keys 3, 4, and 5 with their RIDs right. No entry or RID is lost. Parent repair is still in progress.'],
    ['Link the two leaves', [[1,2],[3,4,5]], null, 'Connect the left leaf to its next leaf.', 'Connect the sorted leaves with a sibling link. A range scan can use this link after its initial descent. The new root is the next part of the same insertion.'],
    ['Copy 3 into a new root', [[1,2],[3,4,5]], null, 'Copy separator 3 upward. Keep 3 and RID c in the leaf.', 'Create a new root with separator 3 and two child pointers. Copy the first key of the right leaf upward. The actual entry 3 with RID c remains in the leaf. Both leaves are now one edge below the root.'],
    ['Insert 6 without splitting', [[1,2],[3,4,5,6]], null, '6 goes right. Four keys still fit in that leaf.', 'Compare 6 with root separator 3, take the right child, and insert 6 with RID f. The right leaf now has four keys and remains legal.'],
    ['Predict insertion of 7', [[1,2],[3,4,5,6]], 7, 'The right leaf is full. Predict the next split.', 'Hold 7 above the tree. Ask whether splitting this leaf must make the tree taller. The current root has room for another separator.'],
    ['The right leaf overflows', [[1,2],[3,4,5,6,7]], null, 'Only the right leaf overflows.', 'Insert 7 with RID g into the right leaf temporarily. The left leaf is unaffected. Repair proceeds along the insertion path, not by rebuilding every leaf.'],
    ['Split the right leaf', [[1,2],[3,4],[5,6,7]], null, 'Keep 3 and 4; move 5, 6, and 7 to a new leaf.', 'Split the overfull right leaf into [3,4] and [5,6,7], carrying each RID with its key. Repair the sibling links. The parent still needs the new child pointer and separator.'],
    ['Copy 5 into the existing root', [[1,2],[3,4],[5,6,7]], null, 'The root becomes [3, 5]. Its height does not change.', 'Copy the first key of the new right leaf, 5, into the existing root and add its child pointer. The root has only two keys, so it does not overflow. Keep key 5 and RID e in the leaf.'],
    ['Read the completed tree', [[1,2],[3,4],[5,6,7]], null, 'All seven entries remain in leaves at the same depth.', 'Read the routes: below 3, at least 3 but below 5, and at least 5. Point to both copied separators still present in leaves. A leaf split grows the tree only when a new root is required.']
  ];

  function draw(d,step){
    const [label,contents,incoming,caption]=frames[step];
    const split=step>=7,root=step>=9,three=step>=13;
    const copying=step===9||step===14;
    const overflow=step===6||step===12;
    d.text('growth-title',640,72,'Build a B+ tree',42,P.ink,'middle',650);
    d.text('growth-caption',640,133,caption,28,P.ink);
    d.text('growth-rule',80,193,'Capacity: 4 distinct keys per node',24,P.muted,'start');
    d.text('growth-step',1200,193,label,24,P.green,'end');
    if(root){
      const rootKeys=step>=14?[3,5]:[3],rootWidth=rootKeys.length*80+28;
      d.rect('root-node',640-rootWidth/2,245,rootWidth,80,P.white,P.green,9,3);
      d.text('root-label',640,224,'root: routing keys',23,P.green);
      rootKeys.forEach((key,i)=>{
        const x=640-rootWidth/2+54+i*80;
        if(copying&&key===(step===9?3:5))d.rect('root-copy-'+key,x-30,258,60,54,P.orangeLight,P.orange,5,2);
        d.text('root-key-'+key,x,285,key,34,P.ink);
      });
    }
    const groups=split?contents:[contents];
    const centers=three?[250,640,1030]:split?[345,935]:[640];
    const leafY=split?425:360;
    const widths=groups.map(keys=>Math.max(320,keys.length*70+28));
    // Routing edges describe only child pointers already installed in this build.
    if(root){
      const connected=step===13?[0,1]:groups.map((_,i)=>i);
      connected.forEach(i=>{
        const hot=(step===10||step===12)&&i===1;
        d.line('child-'+i,640,326,centers[i],leafY-10,hot?P.orange:P.line,hot?5:3);
      });
      if(step>=14){
        ['< 3','3 ≤ key < 5','≥ 5'].forEach((text,i)=>d.text('route-'+i,centers[i],380,text,25,P.green));
      }else if(step!==13){
        d.text('route-left',365,378,'< 3',25,P.green);
        d.text('route-right',915,378,'≥ 3',25,P.green);
      }
    }
    groups.forEach((keys,i)=>{
      const x=centers[i]-widths[i]/2;
      const over=overflow&&i===groups.length-1;
      d.rect('leaf-'+i,x,leafY,widths[i],115,P.white,over?P.red:P.green,10,over?4:3);
      if(!split)d.text('single-label',640,leafY-35,'root = leaf',27,P.green);
      keys.forEach((key,j)=>{
        const keyX=centers[i]-(keys.length-1)*35+j*70;
        const newest=step>=1&&step<=4&&key===step||step===6&&key===5||step===10&&key===6||step===12&&key===7;
        const copied=copying&&key===(step===9?3:5);
        d.rect('entry-'+key,keyX-29,leafY+12,58,90,copied?P.orangeLight:newest?P.greenLight:P.white,copied?P.orange:P.line,6,copied?3:1);
        d.text('key-'+key,keyX,leafY+39,key,32,P.ink);
        d.text('rid-'+key,keyX,leafY+82,'['+String.fromCharCode(96+key)+']',23,P.muted);
      });
      const count=over?`${keys.length} keys > 4`:keys.length+' of 4 key slots';
      d.text('capacity-'+i,centers[i],leafY+147,count,23,over?P.red:P.muted);
    });
    if(step>=8){
      for(let i=0;i<groups.length-1;i++){
        const x1=centers[i]+widths[i]/2+5,x2=centers[i+1]-widths[i+1]/2-5,y=leafY+72;
        d.arrow('sibling-'+i,x1,y,x2,y,step===8||step===13?P.orange:P.green,4);
      }
      d.text('sibling-label',640,640,'Leaf links keep range scans moving in key order.',25,P.green);
    }else{
      d.text('rid-legend',640,640,'[a], [b], … are row-address lists. Each stays with its key.',26,P.muted);
    }
    if(incoming!==null){
      const x=step===5?1030:1140;
      d.rect('entry-'+incoming,x-29,250,58,90,P.orangeLight,P.orange,6,3);
      d.text('key-'+incoming,x,277,incoming,32,P.ink);
      d.text('rid-'+incoming,x,320,'['+String.fromCharCode(96+incoming)+']',23,P.muted);
      d.text('incoming-caption',x,227,'insert',24,P.orange);
      if(step===5)d.arrow('incoming-path',x,346,820,350,P.orange,4);
    }
    if(copying){
      const key=step===9?3:5,keys=groups[groups.length-1];
      const from=centers[centers.length-1]-(keys.length-1)*35;
      const to=step===9?640:680;
      d.path('copy-path',`M ${from} ${leafY-8} Q ${from+55} 352 ${to+62} 288`,'none',P.orange,4);
      d.arrow('copy-arrow',to+62,288,to+35,288,P.orange,4);
      d.text('copy-label',step===9?860:930,338,'copy '+key,26,P.orange);
    }
    if(step===7||step===13)d.text('repair-label',640,step===7?290:350,'Split in progress: parent repair comes next.',25,P.orange);
  }
  const questions=[
    ['Where are the entries in an empty tree?', 'There are no entries yet; the single leaf is also the root.'],
    ['What moves together when this entry later splits?', 'Key 1 and its RID list [a] stay together in a leaf.'],
    ['Do we need a parent yet?', 'No. The single leaf still has room.'],
    ['How many distinct keys can still fit?', 'One more key fits before reaching the capacity of four.'],
    ['Does full mean the leaf must split now?', 'No. Four keys are legal; a fifth distinct key creates overflow.'],
    ['What happens if another RID is added for an existing key?', 'Its RID list grows; it does not create another distinct key slot.'],
    ['Why is this state temporary?', 'Five distinct keys exceed the leaf capacity of four, so insertion must repair the overflow.'],
    ['Did key 3 lose its row address when it moved?', 'No. Its RID list [c] moves with it into the new right leaf.'],
    ['What will a range scan use after reaching the left leaf end?', 'The next-leaf link lets it continue in key order.'],
    ['Was key 3 removed from the leaf when it appeared in the root?', 'No. Leaf splitting copies the separator; key 3 and RID c remain in the leaf.'],
    ['Why does inserting 6 avoid a split?', 'The right leaf grows from three to four keys, which still fits.'],
    ['Must the next leaf split create another tree level?', 'No. The existing root has room for another separator and child pointer.'],
    ['Does the left leaf need to split too?', 'No. Only the right leaf has overflowed.'],
    ['What does the parent still need?', 'A new separator 5 and the child pointer to the new right leaf.'],
    ['Why does tree height stay the same?', 'The root can hold separators 3 and 5 without overflowing, so no new root is needed.'],
    ['What did both leaf splits preserve?', 'Every key and its RID list remains in a leaf, keys stay sorted, and every leaf has the same depth.']
  ].map(([question,answer])=>({question,answer}));
  scene.title='Build a B+ tree and split its leaves';
  scene.kind='activity';
  scene.steps=frames.length;
  scene.states=frames.map(frame=>frame[0]);
  scene.draw=draw;
  scene.teaching={
    idea:'A leaf split moves whole entries into two leaves and copies a separator to the parent.',
    builds:frames.map(frame=>frame[4]),checks:questions,
    question:'When does a split make the tree taller?',
    answer:'Only when a new root is needed. A leaf split can instead add a separator to an existing parent that still has room.',
    context:'Toy B+ tree with capacity four distinct keys per node. Letters a–g stand for RID lists. Split frames show temporary intermediate states; the repaired states preserve equal leaf depth and every key/RID entry. The later internal-node scene distinguishes moving a routing separator upward from copying a leaf separator.'
  };
  scene.notes=[scene.teaching.idea,...scene.teaching.builds,'Ask: '+scene.teaching.question,'Expected answer: '+scene.teaching.answer,scene.teaching.context].join('\n\n');
  // This scene uses the shared example's initial keys, but adds its own growth sequence.
  // Remove the old trace marker so consumers do not expect the code/table frame count.
  delete scene.traceId;
})();
