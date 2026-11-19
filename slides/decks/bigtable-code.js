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

  const wal=sample('Engine pseudocode · helpers name required guarantees','text',[
    'record = ("k2", "v3")','',
    'append_log(record)',
    'sync_log()  # Wait for required durability.','',
    'memtable.put("k2", "v3")',
    'reply_success()'
  ]);
  install('the-log-protects-memory',[wal],(d,s)=>{
    code(d,{...wal,lines:wal.lines.slice(0,[1,3,4,7][s])},s===0?[0]:s===1?[2]:s===2?[3]:[5,6]);
    box(d,'log',215,'Recovery log',s===0?['No update yet']:s===1?['Appended k2 = v3','Durability not confirmed']:['Durable k2 = v3'],s>=2?P.green:P.orange);
    arrow(d,'memory-path',365,405,s===3?P.orange:P.line);
    box(d,'memory',420,s===3?'Memory buffer (memtable)':'Memory buffer',s===3?['k2 = v3','Then reply success']:['Not updated yet'],P.blue);
    if(s>=2)foot(d,'The log must survive the failures covered by the server’s durability guarantee.');
  },[
    'Zoom in from a range of updates to one request. Think of k2 = v3 as a short example of the crawler sending fresh page data. If the server says saved and then loses memory, what evidence could a replacement use? The pseudocode names the storage operations.',
    'append_log records the update. An append by itself does not establish that the required storage copies are durable. Predict whether the engine can safely acknowledge this write yet.',
    'sync_log waits for the durability required by the storage contract. The original architecture uses replicated files. A local Python list append or an ordinary buffered file write is not this guarantee. Failure handling is omitted from the pseudocode.',
    'Put the update into the ordered memtable, then reply success. A crash can erase memory. Recovery can replay the durable log to rebuild this update. This redo-style example differs from microdb’s physical undo protocol. Several writes can share synchronization work.'
  ]);

  const memory=sample('Teaching Python · model sorted keys and current values','python',[
    'from bisect import insort','keys = []','values = {}','',
    'for key in [8, 2, 5, 1, 7]:',
    '    insort(keys, key)',
    '    values[key] = "v1"','',
    'values[2] = "v2"',
    'rows = [(key, values[key]) for key in keys]'
  ]);
  install('the-memtable-stays-ordered',[memory],(d,s)=>{
    code(d,{...memory,lines:memory.lines.slice(0,s<2?7:10)},s===0?[4]:s===1?[5,6]:[8,9]);
    box(d,'arrival',215,'Arrival order',['k8, k2, k5, k1, k7'],P.blue);
    if(s>=1){arrow(d,'sort',325,375);box(d,'sorted',390,'Ordered keys',['k1, k2, k5, k7, k8',s===2?'k2 now maps to v2':'Each value is v1'],P.green);}
    foot(d,'Integer suffixes model the short labels · This current-value model omits retained versions');
  },[
    'The log now protects the change. Show how one server organizes many recent changes in memory using a fresh five-key example. The keys list records their order. The values dictionary holds one current value for each key. Read the incoming integer suffixes 8, 2, 5, 1, 7 as the diagram labels k8, k2, k5, k1, k7.',
    'insort inserts each key at its sorted position. It keeps the list ordered after every insertion. The dictionary alone would not provide sorted key order. This small list model explains ordering, not a production memtable’s performance.',
    'Update values[2] to v2. Its key already has a sorted position. If these five entries filled the available memory, in what order could they be written? The rows expression visits keys in sorted order. This model keeps one current value and omits versions needed by retained snapshots.'
  ]);

  const flush=sample('Engine pseudocode · rotate, write, then install safely','text',[
    'frozen = active',
    'active = new_memtable()','',
    '# Background flush of the frozen batch:',
    'file = write_sstable(frozen.entries())',
    'make_durable(file)',
    'publish(file)',
    'retire_when_no_readers(frozen)'
  ]);
  install('freeze-a-sorted-file',[flush],(d,s)=>{
    code(d,{...flush,lines:flush.lines.slice(0,s===0?1:s===1?2:8)},s===0?[]:s===1?[0,1]:s===2?[4,5,6,7]:[1]);
    box(d,'batch',205,s===0?'Active batch':'Frozen batch',['k1, k2, k5, k7, k8',s===0?'Accepting writes':'Readable, no new writes'],P.blue);
    if(s>=2){arrow(d,'flush',345,385);box(d,'sst',400,'SSTable',['Same sorted entries','Durable before publication'],P.green);}
    if(s===1)box(d,'fresh',435,'New active memtable',['Accepts new writes'],P.orange);
    if(s===3)box(d,'fresh',545,'New active memtable',['New k9 enters here'],P.orange);
    if(s===2)foot(d,'Readers can use the frozen batch until the new file becomes available.');
    if(s===3)foot(d,'The log, ordered buffer, and sorted files are parts of a log-structured merge tree (LSM tree).');
  },[
    'Use the same five keys that the server just sorted. This memtable is full. Ask where a new arrival can go while the server writes the sorted batch to a file. The separate interactive widget flushes at six distinct keys.',
    'Freeze the old batch and create a different active memtable. Reads can still use the frozen data. New writes go to the new active structure and follow the durable-log protocol.',
    'The background worker writes the sorted file. make_durable waits for the required storage guarantee. publish installs the file in the reader-visible file set. Retire the old buffer only when no reader still needs it. These helpers omit the real synchronization and recovery machinery.',
    'The new active memtable can receive k9 while the frozen batch is being flushed. The separated builds explain overlapping roles. They do not require all writes to stop until the file is complete. The code does not discard the recovery log.'
  ]);

  const morningRead=sample('Teaching Python · one stored record','python',[
    'records = [(5, "old")]','',
    'sequence, value = records[0]'
  ]);
  const afternoonRead=sample('Teaching Python · choose the later record','python',[
    'records = [(5, "old"), (8, "new")]','',
    'sequence, value = max(records,',
    '    key=lambda record: record[0])'
  ]);
  const visible=sample('Teaching Python · read at a sequence boundary','python',[
    'DELETE = object()  # A distinct marker.',
    'records = [(5, "old"), (8, "new"), (9, DELETE)]','',
    'def read_at(records, snapshot):',
    '    visible = [(seq, value) for seq, value',
    '               in records if seq <= snapshot]',
    '    if not visible:',
    '        return None',
    '    seq, value = max(visible, key=lambda r: r[0])',
    '    return None if value is DELETE else value'
  ]);
  const safety=sample('Engine pseudocode · a proof is required before removal','text',[
    'if all_older_versions_are_covered(key) and (',
    '    no_required_read_needs_older_versions(key)',
    '):',
    '    remove_tombstone_and_covered_versions(key)',
    'else:',
    '    keep_tombstone(key)'
  ]);
  const readViews = [
    {snapshot:5, result:'old', records:['A · old @ 5']},
    {snapshot:8, result:'new', records:['A · old @ 5','B · new @ 8']},
    {snapshot:9, result:'None → absent', records:['A · old @ 5','B · new @ 8','Memory · DELETE @ 9']}
  ];
  const readExamples=[morningRead,afternoonRead,visible];
  const lookup = install('read-the-newest-visible-value',readExamples,(d,s)=>{
    const stored = readViews[Math.min(s,2)];
    const read = s===3 ? readViews[1] : stored;
    code(d,readExamples[Math.min(s,2)],[[2],[2,3],[8,9],[4,5],[4,5,8]][s]);
    box(d,'versions',205,'Records for the page',stored.records,P.blue);
    arrow(d,'read',365,395);
    if(s===4){
      box(d,'earlier',405,'Saved snapshot at 8',['new'],P.green);
      box(d,'current',515,'Current read at 9',['None → absent'],P.orange);
    }else{
      const label=s<2?'Current read at '+read.snapshot:'read_at(records, '+read.snapshot+')';
      box(d,'result',410,label,[s===3?'Which record wins?':read.result],s===2?P.orange:P.green);
    }
    foot(d,s<3?'Sequence numbers give the order of writes for this one key.':'A read includes only the records at or before its own boundary.');
  },[
    'Let k stand for com.cnn.www. This file holds the morning contents, old, at update sequence 5. Start with one stored record. Ask which value a reader sees.',
    'Add the afternoon contents in file B. At boundary 8 both writes qualify. Select the greatest qualifying sequence number. What happens if a third record deletes the stored copy?',
    'At 9 the deletion marker qualifies and has the greatest sequence. The helper returns None for absence. Ask whether a reader that started earlier must also see this deletion.',
    'Keep all three records on screen. Snapshot 8 still admits 5 and 8 and excludes 9. The is comparison recognizes the unique DELETE marker only if the winning record contains it.',
    'Compare the two results before changing any files. The earlier reader needs new and the current reader must see absence. Ask how the engine could combine files while preserving both answers.'
  ]);
  lookup.clarityTraceId=lookup.traceId;
  delete lookup.traceId;
  lookup.title='Choose the version a read can see';
  lookup.states=['Read at 5','Read at 8','Delete at 9','Revisit snapshot 8','Compare both reads'];
  lookup.teaching.idea='Each read chooses the newest record within its own boundary.';
  lookup.teaching.question='After DELETE at 9, what should the saved read at 8 return?';
  lookup.teaching.answer='It returns new from file B. It excludes the deletion at 9.';
  lookup.teaching.context='The sequence numbers order writes for one key in a simplified storage engine. Bigtable cell timestamps label application versions.';
  lookup.teaching.reference='Reading section 9 uses the same read_at function. None represents an absent key in this Python example.';
  lookup.sources=[deck.source+'#versions'];

  const mergeInputs=sample('Teaching Python · ordered inputs with numeric key suffixes','python',[
    '# Each entry is (key, version, value).',
    'a = [(1, 1, "v1"), (2, 1, "v1"),',
    '     (7, 1, "v1")]',
    'b = [(2, 2, "v2"), (4, 1, "v1"),',
    '     (8, 1, "v1")]'
  ]);
  const merge=sample('Teaching Python · no deletes or snapshots','python',[
    'from heapq import merge',
    'from itertools import groupby','',
    'def compact_current(a, b):',
    '    merged = merge(a, b, key=lambda r: r[0])',
    '    groups = groupby(merged, key=lambda r: r[0])',
    '    return [max(group, key=lambda r: r[1])',
    '            for key, group in groups]','',
    'output = compact_current(a, b)'
  ]);
  install('merge-sorted-runs',[mergeInputs,merge],(d,s)=>{
    code(d,s===0?mergeInputs:merge,s===0?[1,2,3,4]:s===1?[4,5]:s===2?[6,7]:[9]);
    box(d,'a',205,'Run A',['k1:v1 · k2:v1 · k7:v1'],P.blue);
    box(d,'b',350,'Run B',['k2:v2 · k4:v1 · k8:v1'],P.orange);
    if(s>=1){arrow(d,'merge',455,490);box(d,'merge-output',505,s===1?'Next key: k1':s===2?'Resolve duplicate k2':'Sorted output',s===1?['merge advances input cursors']:s===2?['v2 has the higher version']:['k1 · k2 · k4 · k7 · k8'],P.green);}
    if(s===0)foot(d,'Each input already lists its keys in ascending order.');
    if(s===1)foot(d,'merge reads the inputs in order. groupby gathers equal keys.');
    if(s>=2)foot(d,'This example merges ordinary values for current reads.');
  },[
    'The last read had to resolve records stored in separate places. To try a sorted merge, use two small runs of ordinary values. Each triple stores numeric key suffix, version, and value. Predict which key goes into the output first. These version numbers serve only this current-value example.',
    'heapq.merge compares the next key from each input and advances that input cursor. It produces entries in key order without sorting all inputs again. groupby gathers consecutive entries with the same key. Both helpers use tuple position zero for the key.',
    'max selects the highest version at tuple position one inside each key group. It chooses k2:v2 over k2:v1. This simplified function assumes no deletions and no retained snapshots. It must not be used as a general compaction algorithm.',
    'The output contains keys 1, 2, 4, 7, 8 in order. Reading inputs and writing this output still costs storage bandwidth. A real engine also applies the version, deletion, and retention rules before installing its output.'
  ]);

  const deletedPage=sample('Teaching Python · records for page k','python',[
    'a = [(5, "old")]',
    'b = [(8, "new")]',
    'c = [(9, DELETE)]','',
    'current = read_at(a + b + c, 9)'
  ]);
  const cleanupCases=[
    {inputs:'Flushed records for k',files:['File A · old @ 5','File B · new @ 8','File C · DELETE @ 9'],outcome:'Current read at 9',result:['None → absent']},
    {inputs:'Merge B and C',files:['A stays outside the merge','A still holds old @ 5'],outcome:'Keep the deletion',result:['Merged output keeps DELETE @ 9']},
    {inputs:'Merge A, B, and C',files:['All older records covered','Snapshot 8 still active'],outcome:'Preserve both reads',result:['Keep new @ 8 for snapshot 8','Keep DELETE @ 9 for current']},
    {inputs:'Merge A, B, and C',files:['All older records covered','No reader needs the old versions'],outcome:'Safe output for k',result:['No record']}
  ];
  const cleanup=install('deletion-must-hide-older-values',[deletedPage,safety],(d,s)=>{
    const frame=cleanupCases[s];
    code(d,s===0?deletedPage:safety,[[0,1,2,4],[0,4,5],[1,4,5],[0,1,3]][s]);
    box(d,'inputs',205,frame.inputs,frame.files,P.blue);
    arrow(d,'decision',365,405);
    box(d,'outcome',420,frame.outcome,frame.result,s===1?P.orange:P.green);
    if(s===1)foot(d,'Dropping the marker would make the morning page visible again.');
    if(s===2)foot(d,'Covering the files is only the first check. The snapshot still needs the afternoon copy.');
  });
  cleanup.title='Decide when a deletion marker can go';
  cleanup.states=['Flush the deletion to C','Merge only B and C','Keep snapshot 8','Release snapshot 8'];
  cleanup.teaching.reference='Reading section 11 follows the same CNN records through a partial merge and a complete merge. Both file coverage and the required read boundaries determine which records can go.';
  cleanup.sources=[deck.source+'#worked-example'];

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
    const query=s<2?'k1':s===2?'k7':'k17',positions=hash(query);
    const lines=bloom.lines.slice(0,s===1?8:s===2?10:11).map(line=>s===2?line.replace('"k17"','"k7"'):line);
    code(d,s===0?hashes:{...bloom,lines},s===0?[9]:s===1?[2,3,4]:s===4?[10]:[6,7,9]);
    const bits=new Set(s?['k1','k2','k3','k4','k5','k6'].flatMap(hash):[]);
    d.text('bits-label',1035,225,'32 bits · indices 0–31',25,P.ink);
    for(let i=0;i<32;i++){
      const x=850+(i%8)*47,y=270+Math.floor(i/8)*55;
      d.box('bit-'+i,x,y,38,38,bits.has(i)?'1':'0',bits.has(i)?P.greenLight:P.white,s>=2&&positions.includes(i)?P.orange:P.line,23);
    }
    if(s>=2){box(d,'query',505,query+' → ['+positions.join(', ')+']',[s===2?'Zero found → definitely absent':s===3?'All ones → possibly present':'File check: k17 is absent'],s===2?P.green:P.orange);}
    foot(d,s===0?'ord converts a character to a number · % 32 keeps each position between 0 and 31':s===4?'A false positive costs a file lookup · Never clear shared bits to delete a key':'Insertion and query use the same hashes · all(...) is true only when every required bit is 1');
  },[
    'The partial merge left one file untouched. What could let a reader skip it entirely? Build a small membership summary for a separate six-key file. The diagram uses three deterministic teaching hashes. ord converts a character to its numeric code. enumerate supplies its position. The remainder operator keeps each output between 0 and 31. These short inputs use ASCII characters. Start with all 32 bits zero. Production filters use suitable hash functions for their workloads.',
    'Reuse hashes from the previous build. range(1, 7) produces 1 through 6. Set the selected bits for each stored key. The filter remembers bits, not the keys themselves. Different keys can share a bit.',
    'Query k7. Its required positions are 12, 30, and 9. A zero makes all return false. Since every stored key set its required bits, this zero proves absence. Skip the file.',
    'Query k17 at positions 17, 21, and 16. All three bits are one, so might_contain returns true. Predict whether the key must be present. The filter alone cannot prove it.',
    'The stored set represents checking this toy file’s actual keys. k17 is absent even though the filter returned true. This is a false positive. A real engine reads and searches the file. Never remove a key by clearing its shared Bloom bits.'
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
    foot(d,'Numeric suffixes model the key order · disk is a toy mapping · Real blocks require storage I/O');
  },[
    'The previous filter admitted a key that the file did not contain. Try a different file, this time for k9. Its positive filter result means the engine still needs to look for the key. The disk dictionary stands in for stored blocks. It is not actual disk I/O. Only the block needed by this example is represented.',
    'bisect_right finds the position after indexed keys no greater than 9. Subtract one to select the preceding block start, 8. The result is block 1. Keys below the first boundary need an absent-range check in general. The displayed query is within this index’s covered range.',
    'read_block checks the cache before accessing the toy disk mapping. It saves the loaded block in cache. The dictionary get then checks the actual key. A candidate block does not imply that every possible key inside its interval is present.',
    'The repeated read_block call uses the cached block. In a real engine, that avoids another storage read. The filter skips files, the index chooses a block, and the cache reuses its bytes. This model omits eviction and version resolution inside a block.'
  ]);
})();
