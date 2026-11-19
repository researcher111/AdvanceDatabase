/* Lecture 14: executable teaching models and explicitly labeled engine pseudocode.
 * Load after clarity-diagrams and before course-clarity adds headings and captions.
 * These examples explain the existing fixtures; they are not a Bigtable client API. */
(function () {
  'use strict';
  const deck=window.COURSE_DECKS[14];if(!deck)return;
  const P=window.DeckViz.palette;
  const sample=(title,language,lines)=>({title,language,lines});
  function code(d,example,active=[],fontSize=24){
    d.rect('code-panel',45,190,760,420,P.white,P.line,10,2);
    d.text('code-label',65,219,example.title,22,P.muted,'start',650);
    example.lines.forEach((line,i)=>{
      const y=258+i*30;
      if(active.includes(i))d.rect('code-highlight-'+i,57,y-14,736,28,P.orangeLight,'none',4);
      d.add('code-line-'+i,'text',{x:68,y,fill:P.ink,'font-size':fontSize,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'start','dominant-baseline':'middle'},line);
    });
  }
  function box(d,key,y,title,lines=[],color=P.green){
    d.rect(key,840,y,390,55+lines.length*30,P.white,color,10,2);
    d.text(key+'-title',1035,y+27,title,25,color,'middle',650);
    lines.forEach((line,i)=>d.text(key+'-line-'+i,1035,y+64+i*30,line,23,P.ink));
  }
  function foot(d,text){d.text('code-foot',640,643,text,23,P.muted);}
  function arrow(d,key,y1,y2,color=P.orange){d.arrow(key,1035,y1,1035,y2,color,3);}
  function install(id,examples,draw,cues){
    const scene=deck.scenes.find(s=>s.id===id);
    scene.draw=draw;scene.kind='visual';scene.clarityNative=true;scene.codeExamples=examples;
    if(cues)scene.teaching.builds=cues;
    scene.teaching.context=(scene.teaching.context||'')+' Teaching Python models the example. Engine pseudocode describes storage guarantees.';
    return scene;
  }

  const schoolLinkTexts = ['Moon facts', 'Moon phases', 'Explore the Moon'];
  const sparse=sample('Teaching Python · store only present cell versions','python',[
    'cells = {',
    '    ("r1", "anchor:example", 1): b"link",',
    '    ("r1", "contents:", 1): b"page",',
    '    ("r2", "anchor:news", 1): b"news",',
    '    ("r3", "anchor:example", 1): b"link",',
    '    ("r3", "contents:", 1): b"page",',
    '}','',
    ...schoolLinkTexts.map((text, i) => `cells[("r2", "anchor:school", ${i + 1})] = b"${text}"`)
  ]);
  install('sparse-cells-and-versions',[sparse],(d,s)=>{
    code(d,{...sparse,lines:sparse.lines.slice(0,s===0?7:s===1?9:11)},s===0?[1,2,3,4,5]:s===1?[8]:[9,10],21);
    d.text('page-key-heading',850,206,'Row key',21,P.muted,'start');
    d.text('web-page-heading',952,206,'Web page',21,P.muted,'start');
    const pages=[
      ['r1','CNN’s home page','www.cnn.com/'],
      ['r2','Moon article','science.example/moon'],
      ['r3','Mars article','science.example/mars']
    ];
    pages.forEach(([key,title,address],i)=>{
      const y=226+i*82, target=s>=1&&key==='r2';
      d.rect(key+'-row',840,y,390,72,target?P.orangeLight:P.white,target?P.orange:P.line,7);
      d.text(key+'-key',854,y+36,key,27,P.ink,'start',650);
      d.arrow(key+'-maps-to',890,y+36,934,y+36,P.blue,3);
      d.text(key+'-page',950,y+23,title,24,P.ink,'start',650);
      d.text(key+'-address',950,y+52,address,22,P.muted,'start');
    });
    if(s>=1){
      const versions = schoolLinkTexts.slice(0, s===1 ? 1 : 3);
      box(d,'school',479,'Link text on the school’s page',versions.map((text, i) => `t${i + 1}  “${text}”`),P.orange);
      d.line('school-link-start',840,530,821,530,P.orange,3);
      d.line('school-link-up',821,530,821,344,P.orange,3);
      d.arrow('school-link-target',821,344,838,344,P.orange,3);
    }
    if(s===2)foot(d,'A retention policy determines how many of these three versions remain available.');
  });

  const routing=sample('Teaching Python · route a row through ordered bounds','python',[
    'from bisect import bisect_right','',
    'bounds = ["h", "n", "t"]',
    'row = "kim"',
    'tablet = bisect_right(bounds, row)',
    'servers = ["S0", "S1", "S2", "S3"]','',
    'server = servers[tablet]'
  ]);
  const reassignment=sample('Teaching Python · change the serving assignment','python',[
    'from bisect import bisect_right',
    'bounds = ["h", "n", "t"]',
    'tablet = bisect_right(bounds, "kim")',
    'servers = ["S0", "S1", "S2", "S3"]','',
    'servers[1] = "S2"',
    'server = servers[tablet]'
  ]);
  install('tablets-separate-placement-from-storage',[routing,reassignment],(d,s)=>{
    const example = s===3 ? reassignment : {...routing,lines:routing.lines.slice(0,s===0?5:8)};
    code(d,example,s===0?[2,3,4]:s===3?[5,6]:[5,7]);
    box(d,'range',205,'Tablet 1: [h, n)',['h ≤ kim < n'],P.blue);
    if(s>=1){arrow(d,'assignment',315,345);box(d,'server',360,'Serving process',[s===3?'S1 failed → S2 takes over':'S1 handles tablet 1'],P.orange);}
    if(s>=2){arrow(d,'storage',470,500,P.blue);box(d,'durable',515,'Replicated durable files',['Data files and recovery log'],P.green);}
    foot(d,s===3?'S2 must recover the tablet before it serves this range.':'bisect_right counts the boundaries at or before the row key.');
  },[
    'The crawler sent the update for com.cnn.www to Server 1. Now shorten the keys to trace a reassignment. Tablet 1 begins at h and stops before n. bisect_right returns the number of boundaries no greater than the row key. For kim, it returns 1. This is a small routing model, not the actual metadata lookup protocol.',
    'The servers list maps the tablet number to its serving process. Index 1 names S1. A Bigtable client checks its cached tablet locations. If an entry is missing or stale, it looks up the current assignment in the location metadata. The row stays in the same tablet when the serving process changes.',
    'The original architecture stores its recovery log and data files in the Google File System. GFS replicates those files. Tablet servers keep working copies in memory. Partitioning divides row ranges. Replication protects stored copies. The Python list models only the assignment.',
    'After S1 fails, assign tablet 1 to S2 in the toy directory. S2 can serve more than one tablet. A real reassignment must coordinate ownership and recover the tablet before serving it. Updating this Python list alone does not implement recovery.'
  ]);

  const hotspotScene=deck.scenes.find(s=>s.id==='splitting-cannot-fix-a-moving-hotspot');
  const hotspotDraw=hotspotScene.draw;
  hotspotScene.draw=(d,s)=>{
    hotspotDraw(d,s);
    if(s===0||s===2)return;
    d.add('route-code','text',{x:640,y:181,fill:P.ink,'font-size':23,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace','text-anchor':'middle','dominant-baseline':'middle'},s<2?'bisect_right([25, 50, 75], 99)  # tablet 3':'bisect_right([25, 50, 75, 88], 99)  # tablet 4');
  };

  const hashes=sample('Teaching Python · the diagram’s three fixed hash functions','python',[
    'def hashes(key):','    a = b = c = 0',
    '    for i, ch in enumerate(key):','        n = ord(ch)',
    '        a = (31 * a + n) % 32',
    '        b = (17 * b + 7 * n) % 32',
    '        c = (13 * c + (i + 3) * n) % 32',
    '    return [a, b, c]','',
    'bits = [0] * 32'
  ]);
  const bloom=sample('Teaching Python · reuse hashes from the previous build','python',[
    'stored = {f"k{i}" for i in range(1, 7)}',
    'bits = [0] * 32','for key in stored:',
    '    for position in hashes(key):',
    '        bits[position] = 1','',
    'def might_contain(key):',
    '    return all(bits[p] for p in hashes(key))','',
    'possible = might_contain("k17")',
    'present = "k17" in stored'
  ]);
  function hash(key){let a=0,b=0,c=0;[...key].forEach((ch,i)=>{const n=ch.charCodeAt(0);a=(a*31+n)%32;b=(b*17+n*7)%32;c=(c*13+n*(i+3))%32;});return[a,b,c];}
  install('a-one-sided-membership-test',[hashes,bloom],(d,s)=>{
    const query=s<2?'k1':s===2?'k7':'k17';
    const positions=hash(query);
    const keys=['k1','k2','k3','k4','k5','k6'];
    const bits=new Set(s ? keys.flatMap(hash) : []);
    d.text('array-title',60,223,'Each square stores one bit',30,P.ink,'start',650);
    d.text('array-guide',60,261,'The number above each square is its position.',23,P.muted,'start');
    for(let i=0;i<32;i++){
      const x=60+(i%16)*46, y=325+Math.floor(i/16)*102;
      const selected=positions.includes(i);
      d.text('position-'+i,x+21,y-19,String(i),20,selected?P.ink:P.muted,'middle',selected?650:400);
      d.rect('bit-cell-'+i,x,y,42,46,selected?P.orangeLight:bits.has(i)?P.greenLight:P.white,selected?P.orange:P.line,4,selected?3:1);
      d.text('bit-'+i,x+21,y+24,bits.has(i)?'1':'0',27,P.ink,'middle',selected?700:400);
    }
    d.text('stored-keys',60,535,'Keys in the sorted file',23,P.muted,'start');
    d.text('stored-values',60,577,keys.join('     '),29,P.ink,'start',650);
    box(d,'hashes',213,'Three hashes of '+query,[
      'Positions   '+positions.join('  ·  '),
      'Bit values   '+positions.map(i=>bits.has(i)?1:0).join('  ·  ')
    ],P.orange);
    const decisions=[
      ['Build the filter','Start with 32 zero bits.','Locate the positions for k1.'],
      ['Insert k1 through k6','Set each selected bit to 1.','Keys can share a position.'],
      ['Definitely absent','k7 needs a 1 at position 12.','Skip this file.'],
      ['Possibly present','All three bits are 1.','Check the file for k17.'],
      ['False positive','The file has no k17.','Return absence for this file.']
    ];
    const [title,...details]=decisions[s];
    box(d,'decision',382,title,details,s===2?P.green:P.blue);
    foot(d,s===4?'k1 set bit 17, k2 set bit 21, and k5 set bit 16. Together they made k17 look possible.':
      s<2?'The filter records bit positions. The sorted file holds the keys.':'A lookup uses the same three hash functions as insertion.');
  },[
    'The LSM tree has written several sorted files. Could the reader skip one before opening it? Build a Bloom filter for one file containing k1 through k6. Start with 32 zero bits. For each key, three hash functions give three positions. Locate positions 6, 20, and 17 for k1.',
    'Insert k1 by setting those three bits to one. Insert k2 through k6 in the same way. Point to the highlighted bits for k1. Setting them again leaves them at one. This sharing lets a small array summarize many keys.',
    'Use the same three hashes for k7. Read the bits in the order 12, 30, 9. They hold zero, zero, one. If this file contained k7, inserting it would have set all three bits. A single zero therefore proves absence. Skip this file.',
    'Check k17 at positions 17, 21, and 16. All three bits are one. Before revealing the file result, ask whether a different key could have set each of those bits.',
    'Inspect the actual keys. The file ends at k6. It has no k17. Point to the three shared positions. The filter allowed a lookup for an absent key. This is a false positive. Checking the file gives the correct answer. Clearing a shared bit to remove one key could hide another key.'
  ]);

  const index=sample('Teaching Python · choose a block, then reuse cached entries','python',[
    'from bisect import bisect_right',
    'first_keys = [1, 8, 16]',
    'key = 9',
    'block_id = bisect_right(first_keys, key) - 1','',
    'disk = {1: {8: "v8", 9: "v9", 12: "v12"}}',
    'cache = {}',
    'def read_block(block_id):',
    '    if block_id not in cache:',
    '        cache[block_id] = disk[block_id]',
    '    return cache[block_id]'
  ]);
  const blockRead=sample('Teaching Python · continue with the index and cache above','python',[
    'block = read_block(block_id)',
    'value = block.get(key)',
    'again = read_block(block_id)'
  ]);
  install('skip-files-then-find-a-block',[index,blockRead],(d,s)=>{
    code(d,s<2?index:blockRead,s===0?[]:s===1?[1,2,3]:s===2?[0,1]:[2]);
    box(d,'filter',205,'Bloom filter for k9',['Possibly present → inspect file'],P.blue);
    if(s>=1){arrow(d,'to-index',315,345);box(d,'index',360,'Index chooses block 1',['k8 ≤ k9 < k16'],P.orange);}
    if(s>=2){arrow(d,'to-block',470,500);box(d,'block',515,s===2?'Block 1: k8 · k9 · k12':'Block 1 already cached',['k9 found → v9'],P.green);}
    foot(d,s===3?'How many times did the crawler visit each page across its whole crawl history?':'Use the numbers in these short labels to compare their keys.');
  },[
    'The previous filter admitted a key that the file did not contain. Try a different file, this time for k9. Its positive filter result means the engine still needs to look for the key. The disk dictionary stands in for stored blocks. It is not actual disk I/O. Only the block needed by this example is represented.',
    'bisect_right finds the position after indexed keys no greater than 9. Subtract one to select the preceding block start, 8. The result is block 1. Keys below the first boundary need an absent-range check in general. The displayed query is within this index’s covered range.',
    'read_block checks the cache before accessing the toy disk mapping. It saves the loaded block in cache. The dictionary get then checks the actual key. A candidate block does not imply that every possible key inside its interval is present.',
    'The repeated read_block call can reuse block 1 from memory. We have answered a question about one key. Now ask how many times the crawler visited each page. One cached block cannot tell us the counts. We need a record of each visit and a way to group those records by page.'
  ]);
})();
