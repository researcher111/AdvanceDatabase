/* Lecture 14: executable teaching models and explicitly labeled engine pseudocode.
 * Load after clarity-diagrams and before course-clarity adds headings and captions.
 * These examples explain the existing fixtures; they are not a Bigtable client API. */
(function () {
  'use strict';
  const deck=window.COURSE_DECKS[14];if(!deck)return;
  const P=window.DeckViz.palette;
  const sample=(title,language,lines)=>({title,language,lines});
  function code(d,example,active=[]){
    d.rect('code-panel',45,190,760,420,P.white,P.line,10,2);
    d.text('code-label',65,219,example.title,22,P.muted,'start',650);
    example.lines.forEach((line,i)=>{
      const y=258+i*30;
      if(active.includes(i))d.rect('code-highlight-'+i,57,y-14,736,28,P.orangeLight,'none',4);
      d.add('code-line-'+i,'text',{x:68,y,fill:P.ink,'font-size':24,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'start','dominant-baseline':'middle'},line);
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
    scene.teaching.context=(scene.teaching.context||'')+' Code panels labeled Teaching Python are limited models. Engine pseudocode names storage guarantees, not library calls.';
  }

  const address=sample('Teaching Python · model a cell address','python',[
    'cells = {}','row = "com.cnn.www"',
    'column = "anchor:example"',
    'timestamp = 1  # One illustrative version','',
    'address = (row, column, timestamp)',
    'cells[address] = b"example link text"',
    'value = cells[address]'
  ]);
  install('a-multidimensional-map',[address],(d,s)=>{
    code(d,address,s===0?[1]:s===1?[2]:[3,5,6,7]);
    box(d,'row',210,'Row key',['com.cnn.www'],P.blue);
    if(s>=1)box(d,'column',355,'Column',['anchor = declared family','example = qualifier'],P.green);
    if(s===2)box(d,'value',525,'Version 1 → bytes',['b"example link text"'],P.orange);
    foot(d,'Address model only · b"…" is a byte string · Bigtable sorts rows and stores versions durably');
  },[
    'Read the row assignment. A row key names one row. The tuple will combine three coordinates into one dictionary key. This Python dictionary models an address only. It does not implement Bigtable storage or row ordering.',
    'Read the column string. The colon separates the family anchor from the qualifier example. A real Bigtable family must already be declared. The dictionary does not enforce that requirement.',
    'Use illustrative timestamp 1 to identify a version. The prefix b makes a Python byte string. Assign those bytes at the complete address, then retrieve them with the same address. A real Bigtable timestamp is an integer. This coordinate does not establish a transaction snapshot across rows.'
  ]);

  const sparse=sample('Teaching Python · store only present cell versions','python',[
    'cells = {',
    '    ("r1", "anchor:example", 1): b"link",',
    '    ("r1", "contents:", 1): b"page",',
    '    ("r2", "anchor:news", 1): b"news",',
    '    ("r3", "anchor:example", 1): b"link",',
    '    ("r3", "contents:", 1): b"page",',
    '}','',
    'cells[("r2", "anchor:school", 1)] = b"old"',
    'cells[("r2", "anchor:school", 2)] = b"prior"',
    'cells[("r2", "anchor:school", 3)] = b"new"'
  ]);
  install('sparse-cells-and-versions',[sparse],(d,s)=>{
    code(d,{...sparse,lines:sparse.lines.slice(0,s===0?7:s===1?9:11)},s===0?[1,2,3,4,5]:s===1?[8]:[9,10]);
    box(d,'sparse',210,'Stored cell coordinates',['r1: example, contents','r2: news','r3: example, contents'],P.blue);
    if(s>=1)box(d,'school',430,'r2 · anchor:school',s===1?['t1: old']:['t3: new','t2: prior','t1: old'],P.orange);
    foot(d,s===2?'The dictionary retains all three versions · A real retention policy decides which versions remain':'Missing cells have no entry · Adding a qualifier to r2 does not create it in other rows');
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
    code(d,s===3?reassignment:routing,s===0?[2,3,4]:s===3?[5,6]:[5,7]);
    box(d,'range',205,'Tablet 1: [h, n)',['h ≤ kim < n'],P.blue);
    if(s>=1){arrow(d,'assignment',315,345);box(d,'server',360,'Serving process',[s===3?'S1 failed → S2 takes over':'S1 handles tablet 1'],P.orange);}
    if(s>=2){arrow(d,'storage',470,500,P.blue);box(d,'durable',515,'Replicated durable files',['Logs and SSTables remain'],P.green);}
    foot(d,'bisect_right counts boundaries ≤ row · Reassignment also requires recovery and coordination');
  },[
    'Translate the short a–g and h–m labels into half-open ranges. Tablet 1 begins at h and stops before n. bisect_right returns the number of boundaries no greater than the row key. For kim, it returns 1. This is a small routing model, not the actual metadata lookup protocol.',
    'The servers list maps each tablet number to its serving process. Index 1 names S1. The row remains in the same tablet when the serving assignment changes.',
    'The original architecture stores durable logs and SSTables in replicated GFS. Tablet servers keep memory buffers and caches. Partitioning divides row ranges. Replication protects stored copies. The Python list models only the assignment.',
    'After S1 fails, assign tablet 1 to S2 in the toy directory. S2 can serve more than one tablet. A real reassignment must coordinate ownership and recover the tablet before serving it. Updating this Python list alone does not implement recovery.'
  ]);

  const hotspotScene=deck.scenes.find(s=>s.id==='splitting-cannot-fix-a-moving-hotspot');
  const hotspotDraw=hotspotScene.draw;
  hotspotScene.draw=(d,s)=>{
    hotspotDraw(d,s);
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
    code(d,wal,s===0?[0]:s===1?[2]:s===2?[3]:[5,6]);
    box(d,'log',215,'Recovery log',s===0?['No update yet']:s===1?['Appended k2 = v3','Durability not confirmed']:['Durable k2 = v3'],s>=2?P.green:P.orange);
    arrow(d,'memory-path',365,405,s===3?P.orange:P.line);
    box(d,'memory',420,'Memtable',s===3?['k2 = v3','Then reply success']:['Not updated yet'],P.blue);
    foot(d,'WAL = write-ahead log · A Python list append would not make an update durable');
  },[
    'Read the request record. Each pseudocode helper names a required operation, not a Python library function. The write-ahead log records enough information to repeat the update after a crash.',
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
    'The keys list records order. The values dictionary holds one current value for each key. Read the incoming integer suffixes 8, 2, 5, 1, 7 as the diagram labels k8, k2, k5, k1, k7.',
    'insort inserts each key at its sorted position. It keeps the list ordered after every insertion. The dictionary alone would not provide sorted key order. This small list model explains ordering, not a production memtable’s performance.',
    'Update values[2] to v2. The key is already in the keys list, so do not insert it again. The rows expression visits keys in sorted order. This model keeps one current value and omits versions needed by retained snapshots.'
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
    code(d,flush,s===0?[]:s===1?[0,1]:s===2?[4,5,6,7]:[1]);
    box(d,'batch',205,s===0?'Active batch':'Frozen batch',['k1, k2, k5, k7',s===0?'Accepting writes':'Readable, no new writes'],P.blue);
    if(s>=2){arrow(d,'flush',345,385);box(d,'sst',400,'SSTable',['Same sorted entries','Durable before publication'],P.green);}
    if(s===1)box(d,'fresh',435,'New active memtable',['Accepts new writes'],P.orange);
    if(s===3)box(d,'fresh',545,'New active memtable',['New k9 enters here'],P.orange);
    foot(d,'New writes follow the WAL protocol · Readers retain the frozen batch until safe retirement');
  },[
    'Identify the active batch and its sorted entries. A flush writes these entries into an immutable file. The diagram has four short labels. The separate interactive widget flushes at six distinct keys.',
    'Freeze the old batch and create a different active memtable. Reads can still use the frozen data. New writes go to the new active structure and follow the durable-log protocol.',
    'The background worker writes the sorted file. make_durable waits for the required storage guarantee. publish installs the file in the reader-visible file set. Retire the old buffer only when no reader still needs it. These helpers omit the real synchronization and recovery machinery.',
    'The new active memtable can receive k9 while the frozen batch is being flushed. The separated builds explain overlapping roles. They do not require all writes to stop until the file is complete. The code does not discard the recovery log.'
  ]);

  const visible=sample('Teaching Python · records for one key, then a read rule','python',[
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
  install('read-the-newest-visible-value',[visible,safety],(d,s)=>{
    code(d,s<3?visible:safety,s<2?[4,5,8]:s===2?[9]:s===3?[4,5]:[0,1,3]);
    if(s<3){
      box(d,'versions',205,'Available records for k',['A: old @ 5','B: new @ 8','Memory: DELETE @ 9'],P.blue);
      arrow(d,'read',365,415);
      box(d,'result',430,'read_at(records, '+[5,8,9][s]+')',[['old','new','None → absent'][s]],s===2?P.orange:P.green);
    }else{
      box(d,'files',205,s===3?'Partial merge: B + C':'Merge includes A + B + C',s===3?['SSTable C (flushed)','A still holds old @ 5']:['All older versions covered','No required older read view'],P.blue);
      arrow(d,'decision',345,395);
      box(d,'output',410,s===3?'Keep the marker':'Safe output for k',s===3?['Merged output keeps','DELETE @ 9']:['No record'],s===3?P.orange:P.green);
    }
    foot(d,s===4?'All older versions are included, and no active snapshot needs them.':s===3?'Merged output keeps DELETE @ 9 · A still holds old @ 5.':'Toy update sequences differ from Bigtable cell timestamps · None means absent in this model');
  },[
    'Each tuple contains an update sequence and a value for one key. DELETE is a distinct sentinel object, meaning a special marker. None represents absence in this model. At snapshot 5, exclude sequences 8 and 9. The highest eligible sequence is 5, so return old.',
    'At snapshot 8, the filtering expression includes records 5 and 8. The lambda selects tuple position zero, its sequence number. max chooses record 8. Return new even though the older file remains.',
    'At snapshot 9, the marker is the highest visible record. The is comparison recognizes that exact marker object. Return None for absence. Do not continue to an older value after the marker wins.',
    'Flush the deletion to C, then merge B and C. A remains outside the merge with old@5. The first safety condition is false. Keep DELETE@9 so future reads cannot resurrect the older value. The predicates name proofs that a real engine must establish.',
    'Include all older versions and assume no retained view needs them. Now both safety conditions hold in this toy case. Removing the covered records leaves the current key absent. A retained snapshot at 8 would prevent this removal.'
  ]);

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
    foot(d,'merge reads sorted inputs in order · groupby gathers equal keys · This is not a general compactor');
  },[
    'Read the two sorted lists. Each triple stores numeric key suffix, version, and value. They match the existing k1, k2, k4, k7, k8 example. These version numbers serve only this current-value example.',
    'heapq.merge compares the next key from each input and advances that input cursor. It produces entries in key order without sorting all inputs again. groupby gathers consecutive entries with the same key. Both helpers use tuple position zero for the key.',
    'max selects the highest version at tuple position one inside each key group. It chooses k2:v2 over k2:v1. This simplified function assumes no deletions and no retained snapshots. It must not be used as a general compaction algorithm.',
    'The output contains keys 1, 2, 4, 7, 8 in order. Reading inputs and writing this output still costs storage bandwidth. A real engine also applies the version, deletion, and retention rules before installing its output.'
  ]);

  const deleteRead=sample('Teaching Python · reuse read_at and DELETE from slide 9','python',[
    'old_file = [(1, "v1")]  # Records for k2.',
    'newer = [(2, DELETE)]',
    'result = read_at(old_file + newer, 2)'
  ]);
  install('deletion-must-hide-older-values',[deleteRead,safety],(d,s)=>{
    code(d,s===3?safety:{...deleteRead,lines:deleteRead.lines.slice(0,s===0?1:s===1?2:3)},s===0?[0]:s===1?[1]:s===2?[2]:[0,1,3,5]);
    box(d,'old',210,'Older immutable file',['k2 = v1'],P.blue);
    if(s>=1)box(d,'delete',360,'Newer record',['DELETE k2'],P.orange);
    if(s>=2)box(d,'absent',510,s===3?'Removal requires proof':'Newest marker wins',[s===3?'No older value can reappear':'None → absent'],P.green);
    foot(d,s===3?'Also preserve required read views · Replica repair and retention can add further conditions':'The marker hides the old value · It does not edit the old file');
  });

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
    'The diagram uses three deterministic teaching hashes. ord converts a character to its numeric code. enumerate supplies its position. The remainder operator keeps each output between 0 and 31. These short inputs use ASCII characters. Start with all 32 bits zero. Production filters use suitable hash functions for their workloads.',
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
    'The Bloom filter has already allowed this file to be checked. A possible match is not proof of presence. The disk dictionary stands in for stored blocks. It is not actual disk I/O. Only the block needed by this example is represented.',
    'bisect_right finds the position after indexed keys no greater than 9. Subtract one to select the preceding block start, 8. The result is block 1. Keys below the first boundary need an absent-range check in general. The displayed query is within this index’s covered range.',
    'read_block checks the cache before accessing the toy disk mapping. It saves the loaded block in cache. The dictionary get then checks the actual key. A candidate block does not imply that every possible key inside its interval is present.',
    'The repeated read_block call uses the cached block. In a real engine, that avoids another storage read. The filter skips files, the index chooses a block, and the cache reuses its bytes. This model omits eviction and version resolution inside a block.'
  ]);
})();
