/* Authored audience explanations: one sentence per animation state. */
window.CourseClarityCaptions = {
  "1": {
    "lecture-01-scene-01": [
      "The SQL and its three result rows stay the same.",
      "A cold run fetches the needed pages from storage.",
      "A warm run reuses pages already in RAM.",
      "These are modeled access costs, not whole-query timings."
    ],
    "lecture-01-scene-02": [
      "SQL starts as a sequence of characters.",
      "The lexer groups characters into tokens.",
      "Scan supplies rows, Select filters them, and Project exposes name.",
      "The front end builds the plan before operators execute it."
    ],
    "lecture-01-scene-03": [
      "The buffer frames are empty before the first scan.",
      "Read all of block 0 into a memory frame.",
      "ada and cyd pass the filter in block 0.",
      "Read block 1 and continue testing its rows.",
      "Two block reads examine six rows and return three names."
    ],
    "lecture-01-scene-04": [
      "Predict the reads, rows examined, and rows returned on a second run.",
      "Both needed blocks are still resident in memory.",
      "The engine evaluates the filter again and returns the same names.",
      "Warm run: zero storage reads, six rows examined, three results."
    ],
    "lecture-01-scene-05": [
      "A relation stores rows with the same named fields.",
      "The schema assigns a type to each field.",
      "Every future row must satisfy the schema too."
    ],
    "lecture-01-scene-06": [
      "Two different students can share the same name.",
      "A repeated name rules out name alone as a unique identifier.",
      "Name and GPA can repeat together as well.",
      "An enforced identifier distinguishes rows independently of their locations."
    ],
    "lecture-01-scene-07": [
      "A transfer needs guarantees across both balance changes.",
      "Atomicity makes the two changes complete or roll back together.",
      "Consistency preserves declared rules, such as a nonnegative balance.",
      "Isolation controls how overlapping transactions affect each other.",
      "Durability preserves an acknowledged commit after a restart."
    ],
    "lecture-01-scene-08": [
      "Both access paths must produce the same answer.",
      "The scan model visits all 500 table blocks.",
      "The example index path needs seven total block accesses.",
      "The answer is equal even though the access work differs."
    ],
    "lecture-01-scene-09": [
      "The SQL front end interprets the statement.",
      "Operators request rows through next().",
      "Records interpret field values inside a row.",
      "The buffer pool manages resident pages.",
      "The file manager translates block k into byte offset k × 4096."
    ],
    "lecture-01-scene-10": [
      "Access latencies differ by orders of magnitude in this illustrative model.",
      "RAM is far faster than a storage access in this model.",
      "Bar lengths use a logarithmic scale, not a linear time scale.",
      "If 1 ns became 1 second, the modeled disk trip would take 116 days."
    ],
    "lecture-01-scene-11": [
      "Count storage accesses and assign the same modeled cost to each.",
      "500 reads cost 12.5 ms; seven cost 0.175 ms in this model.",
      "A larger table increases scan work; index work depends on height and matches.",
      "CPU work and caching also contribute to actual query time."
    ],
    "lecture-01-scene-12": [
      "The layout assigns a byte offset to each field.",
      "Catalog rows persist the field names and offsets.",
      "Known catalog layouts let the engine read its own metadata after restart."
    ],
    "lecture-01-scene-13": [
      "The file layer supplies addressed blocks.",
      "Buffers manage pages; records interpret their bytes.",
      "Operators execute rows; SQL describes the requested result.",
      "Indexes and recovery build on the lower layers’ interfaces."
    ],
    "lecture-01-scene-14": [
      "Block 7 begins at byte 7 × 4096 = 28,672 in the file.",
      "Four bytes encode one integer in this example.",
      "Little-endian storage puts the least-significant byte first.",
      "Reading the same bytes in the opposite order changes the value."
    ],
    "lecture-01-scene-15": [
      "write() can return after the OS accepts buffered data.",
      "fsync() requests the durability boundary.",
      "Successful sync establishes the requested durable completion.",
      "A failure can erase changes that had not reached that boundary."
    ],
    "lecture-01-scene-16": [
      "Which layers connect SQL to stored blocks?",
      "Follow the interfaces from SQL through rows to pages and blocks.",
      "Caching can remove storage reads while scanning and filtering still run."
    ]
  },
  "2": {
    "lecture-02-scene-01": [
      "Request block B7 three times.",
      "Without reuse, repeated requests can repeat storage work.",
      "With B7 cached, the later requests reuse the first read."
    ],
    "lecture-02-scene-02": [
      "Compare the completion boundaries in your Lab 1 measurements.",
      "write() can finish when the OS cache accepts the data.",
      "fsync() waits for the requested durability boundary.",
      "Explain the measured gap using those different boundaries."
    ],
    "lecture-02-scene-03": [
      "A buffer pool contains reusable memory frames.",
      "Load page B7 into frame 0.",
      "Frame identity stays fixed while its resident page can change."
    ],
    "lecture-02-scene-04": [
      "Three frames hold the first three blocks of an eight-block scan.",
      "Continuing the scan evicts earlier blocks.",
      "On the next pass, block 0 has already been evicted.",
      "Two cyclic passes yield zero hits with only three frames."
    ],
    "lecture-02-scene-05": [
      "Blocks 0 and 1 recur much more often than the other blocks.",
      "Repeated touches keep the hot blocks recent.",
      "A cold block uses the third frame while the hot pair stays resident.",
      "This request sequence has 11 hits out of 16 accesses."
    ],
    "lecture-02-scene-06": [
      "One caller holds a pin on B7, so its frame cannot be replaced.",
      "A second caller raises the pin count to two.",
      "Releasing one hold leaves another active pin.",
      "At zero pins, the frame becomes eligible for replacement."
    ],
    "lecture-02-scene-07": [
      "The first touches give A, B, and C increasing recency timestamps.",
      "A hit on A refreshes its timestamp from 1 to 4.",
      "B is now the least-recently used unpinned page.",
      "D replaces B and receives the newest timestamp."
    ],
    "lecture-02-scene-08": [
      "Pinned A is ineligible for replacement, regardless of age.",
      "E replaces the oldest eligible page, C.",
      "B next replaces D, leaving pinned A untouched.",
      "If every frame is pinned, the lab raises BufferAbortError."
    ],
    "lecture-02-scene-09": [
      "Find which frame holds (students.tbl, 7).",
      "A linear search checks frames until it finds B7.",
      "A mapping sends the BlockId directly to its resident frame.",
      "Linear lookup grows with the pool; hashing is expected constant time."
    ],
    "lecture-02-scene-10": [
      "B7 is clean before its field changes.",
      "Changing 39 to 40 marks the resident page dirty.",
      "Unpin releases the hold but does not write the dirty page.",
      "Flush B7’s updated contents before reusing its frame.",
      "Load B8 into the reusable frame after preserving B7."
    ],
    "lecture-02-scene-11": [
      "The database pool and the OS cache serve different roles.",
      "A database pin protects a frame while an operator uses it.",
      "The engine must also control recovery-related write ordering.",
      "The database chooses a memory budget for its own pool."
    ],
    "lecture-02-scene-12": [
      "A, B, and C form a useful hot set.",
      "A long scan can displace that useful working set.",
      "A small scan ring limits how much of the pool the scan pollutes.",
      "Approximate recency policies trade bookkeeping cost against reuse quality."
    ],
    "lecture-02-scene-13": [
      "At 90% hits, expensive misses dominate the modeled average.",
      "At 99% hits, the average is still 349 ns rather than 100 ns.",
      "Even 0.4% misses nearly doubles the modeled 100 ns hit cost.",
      "Only a 100% hit rate reaches the model’s 100 ns baseline."
    ],
    "lecture-02-scene-14": [
      "A cycle of 50 blocks exceeds a 49-frame pool by one block.",
      "Predict what remains when the next pass returns to block 0.",
      "Each reuse comes too late, so the repeated cycle has zero hits.",
      "With 50 frames, later passes can hit every block after warm-up."
    ],
    "lecture-02-scene-15": [
      "First look for an already-resident page.",
      "On a miss, choose an eligible replacement frame.",
      "Load or reuse the page and register the caller’s pin.",
      "Release the hold when the caller finishes using the page."
    ],
    "lecture-02-scene-16": [
      "Both workloads use the same three-frame pool.",
      "The cyclic scan misses; the hot pair creates repeated reuse.",
      "Pins protect active users independently of the hit-rate calculation."
    ]
  },
  "3": {
    "lecture-03-scene-01": [
      "A page begins as bytes without field meanings.",
      "A layout interprets some bytes as one student row.",
      "RID (0, 1) means block 0, slot 1."
    ],
    "lecture-03-scene-02": [
      "Packed rows sit directly beside one another.",
      "Save the byte offset where cyd currently begins.",
      "Growing ben shifts later packed rows to new offsets.",
      "The old byte offset no longer identifies the same row boundary."
    ],
    "lecture-03-scene-03": [
      "Every slot reserves the same space for its fields.",
      "Inserting ben marks its slot in use.",
      "benjamin fits inside the existing name reservation.",
      "Reject a name that exceeds the reserved byte capacity."
    ],
    "lecture-03-scene-04": [
      "The in-use flag and integer ID each occupy four bytes.",
      "The string stores a length prefix and reserves eight payload bytes.",
      "GPA begins at offset 20; the whole slot occupies 24 bytes.",
      "A 4096-byte block fits 170 such slots with 16 bytes left over."
    ],
    "lecture-03-scene-05": [
      "Slot 3 begins at byte 3 × 24 within this page.",
      "GPA sits 20 bytes after the start of each slot.",
      "Its page offset is 3 × 24 + 20 = 92 bytes.",
      "A different schema changes the layout and the resulting slot size."
    ],
    "lecture-03-scene-06": [
      "The name field reserves eight encoded bytes.",
      "The ASCII name ada uses three bytes.",
      "é and 😀 use six UTF-8 bytes despite being only two characters.",
      "Validate encoded length before writing, so GPA bytes stay intact."
    ],
    "lecture-03-scene-07": [
      "The in-use flag marks a live row.",
      "Deletion clears that flag to zero.",
      "Old field bytes may remain, but scans skip the unused slot.",
      "Reusing the slot gives its physical RID to a different row."
    ],
    "lecture-03-scene-08": [
      "An eight-byte name reservation leaves room for 170 rows per block.",
      "A three-byte name leaves five reserved bytes unused.",
      "A 200-byte name reservation reduces capacity to 18 rows per block.",
      "Ten thousand rows now need 556 blocks in this layout model."
    ],
    "lecture-03-scene-09": [
      "Zero is a present numeric value.",
      "Empty text is also a present value.",
      "A missing value needs a distinct NULL marker.",
      "The bitmap identifies NULL separately from the field’s payload bytes."
    ],
    "lecture-03-scene-10": [
      "Small values can stay inline with the row.",
      "Compression can reduce a larger value’s stored size.",
      "An out-of-line value leaves a compact pointer in the main row.",
      "Follow that pointer to gather the value’s separate chunks."
    ],
    "lecture-03-scene-11": [
      "The heap row points to the separately stored essay.",
      "Reading only name can use the heap row without fetching essay chunks.",
      "Reading essay follows the pointer and gathers its chunks.",
      "Requested fields determine which storage path this example needs."
    ],
    "lecture-03-scene-12": [
      "RecordPage pins the block that contains the row.",
      "Layout supplies each field’s offset within a slot.",
      "Updating GPA changes the resident page from 39 to 40.",
      "Mark the page dirty, then release the pin when RecordPage closes."
    ],
    "lecture-03-scene-13": [
      "TableScan visits slots whose in-use flag is one.",
      "It skips a slot marked zero.",
      "At the block boundary, release the old block and pin the next one.",
      "An insert can reuse a free slot before appending another block."
    ],
    "lecture-03-scene-14": [
      "A RID names the current row’s block and slot.",
      "An in-place update can preserve that physical address.",
      "Deletion makes the slot available for reuse.",
      "The same RID can later hold a row with a different logical ID."
    ],
    "lecture-03-scene-15": [
      "The current layout maps fields to byte offsets.",
      "Persist the schema as catalog rows.",
      "After restart, read those rows to reconstruct the layout.",
      "Known catalog layouts make this first metadata read possible."
    ],
    "lecture-03-scene-16": [
      "Locate a field using its slot size and offset.",
      "RecordPage interprets one block; TableScan walks across blocks.",
      "The catalog preserves the layout rules for later use."
    ]
  },
  "4": {
    "lecture-04-scene-01": [
      "A query can ask its plan for one result row at a time.",
      "The request travels from Project down to its input.",
      "Each operator uses the same scan interface to return the next row."
    ],
    "lecture-04-scene-02": [
      "Materializing a scan stores its intermediate rows.",
      "A Cartesian product can create far more rows than either input.",
      "A million rows on each side creates a trillion candidate pairs.",
      "Streaming avoids storing the whole intermediate, but still needs an efficient plan."
    ],
    "lecture-04-scene-03": [
      "Without a next() request, this iterator plan does no row work.",
      "The caller requests the next row from Project.",
      "Project forwards that request to Select.",
      "Select asks Scan for candidate rows until one passes.",
      "ada passes the filter and moves back toward the caller."
    ],
    "lecture-04-scene-04": [
      "Predict how many source rows produce the first output.",
      "ada passes immediately: one examined row produces one result.",
      "ben fails and cyd passes: three examined rows produce two results.",
      "dee fails and eli passes: five examined rows produce three results.",
      "Checking fay discovers exhaustion: six examined rows, three results."
    ],
    "lecture-04-scene-05": [
      "Every operator exposes the same Scan interface.",
      "before_first() rewinds; next() advances to an available row.",
      "get_val() reads a value and has_field() checks the exposed schema.",
      "close() releases the scan’s resources."
    ],
    "lecture-04-scene-06": [
      "Select applies gpa > 35 to each candidate row.",
      "GPA 39 passes and can be returned.",
      "GPA 31 fails, so Select asks its child for another row.",
      "GPA 37 passes on the next candidate."
    ],
    "lecture-04-scene-07": [
      "The child scan has id, name, and gpa available.",
      "Project exposes only the selected field, name.",
      "get_val(name) reads name from the current child row.",
      "A caller cannot request gpa through this projection."
    ],
    "lecture-04-scene-08": [
      "The candidate row combines ben’s fields with one major’s fields.",
      "GPA 31 fails gpa > 35.",
      "AND is already false, so the second term can be skipped.",
      "mid and mid2 are field names whose current values are 2 and 1."
    ],
    "lecture-04-scene-09": [
      "Keep the current left row while walking the right input.",
      "Pair ada with the first right row, ds.",
      "Advance only the right scan to pair ada with stat.",
      "Advance it again to pair ada with econ.",
      "When the right scan ends, advance left and rewind right."
    ],
    "lecture-04-scene-10": [
      "Predict source visits, candidate pairs, and returned rows separately.",
      "Six students and three majors produce 18 candidate pairs.",
      "The join condition retains six matching pairs.",
      "A predicate matching nothing still leaves the same 18 candidates to test."
    ],
    "lecture-04-scene-11": [
      "An empty left input produces no pairs.",
      "An empty right input also produces no pairs.",
      "Two rows on each side produce four candidate pairs.",
      "Once exhausted, next() remains false until an explicit rewind."
    ],
    "lecture-04-scene-12": [
      "The product holds resources through both child scans.",
      "Closing the root begins cleanup.",
      "Product forwards close() to both branches.",
      "Both child pins reach zero after cleanup."
    ],
    "lecture-04-scene-13": [
      "The first plan pairs all 300 students with all three majors.",
      "It forms 900 candidates before filtering.",
      "Local filters keep 60 students and one major before the product.",
      "The revised product forms only 60 candidate pairs.",
      "Both plans return 20 rows; candidate work falls by a factor of 15."
    ],
    "lecture-04-scene-14": [
      "A filter can return a qualifying row before its input ends.",
      "A general sort must inspect all input before choosing the first output.",
      "Hash aggregation accumulates state for its groups.",
      "Ordered aggregation can finish a group when the key changes."
    ],
    "lecture-04-scene-15": [
      "mid is the student’s major ID; mid2 is the major row’s ID.",
      "ProductScan exposes both fields in one candidate pair.",
      "Select keeps the pair when the two ID values match.",
      "Project returns the requested student name and department."
    ],
    "lecture-04-scene-16": [
      "The common interface lets the plan compose different operators.",
      "Demand travels downward and qualifying rows return upward.",
      "The plan determines candidate work as well as returned rows."
    ]
  },
  "5": {
    "lecture-05-scene-01": [
      "SQL describes the requested result before any row is read.",
      "Parsing records fields, tables, and predicates in QueryData.",
      "Planning creates scan objects that execution can pull from."
    ],
    "lecture-05-scene-02": [
      "The SELECT list becomes fields = [name].",
      "The FROM list becomes tables = [students].",
      "The WHERE expression becomes a predicate over GPA.",
      "QueryData is a description of the request, not its result rows."
    ],
    "lecture-05-scene-03": [
      "The unquoted FROM and quoted 'from' have different roles.",
      "Unquoted FROM is a keyword introducing the table list.",
      "Quoted 'from' is a string value used in a comparison."
    ],
    "lecture-05-scene-04": [
      "The lexer distinguishes reserved keywords from identifiers.",
      "A number token carries a number; a string token carries text.",
      "Punctuation tokens identify operators and delimiters."
    ],
    "lecture-05-scene-05": [
      "The root represents the SELECT statement.",
      "Field and table children record what to read and where.",
      "The WHERE clause contributes a comparison subtree.",
      "Field(gpa) reads a row value; Number(35) supplies a literal."
    ],
    "lecture-05-scene-06": [
      "The grammar requires a SELECT list and a FROM list.",
      "Square brackets mark an optional WHERE clause.",
      "The field list can be a star or named fields.",
      "Braces allow repeated comma-and-field pairs."
    ],
    "lecture-05-scene-07": [
      "The cursor marks the next unread token.",
      "peek() observes the token without moving the cursor.",
      "match() checks its kind and value without consuming it.",
      "next() consumes select and advances the cursor to name.",
      "expect(ID) consumes name after verifying its token kind."
    ],
    "lecture-05-scene-08": [
      "parse_query is positioned at WHERE.",
      "It consumes WHERE and calls the predicate parser.",
      "The predicate parser calls the term parser for gpa > 35.",
      "The completed term returns its tuple to the predicate parser.",
      "The predicate parser returns the constructed Predicate.",
      "parse_query returns QueryData after its nested calls finish."
    ],
    "lecture-05-scene-09": [
      "Both tables have a major-ID field, under different names.",
      "ProductScan combines ben with a candidate major row.",
      "Reading mid2 yields 2, so the pair matches ben’s chosen major.",
      "With the ds row, mid2 is 1 and the candidate pair fails."
    ],
    "lecture-05-scene-10": [
      "A SELECT statement becomes QueryData.",
      "An INSERT statement becomes InsertData with its table and values.",
      "CREATE TABLE becomes CreateData with the requested schema."
    ],
    "lecture-05-scene-11": [
      "Open a TableScan for each FROM table.",
      "ProductScan combines the two input rows.",
      "SelectScan tests mid = mid2 on each pair.",
      "ProjectScan exposes only name and dept to the caller."
    ],
    "lecture-05-scene-12": [
      "Both plans answer the same query over the same data.",
      "Pairing first creates 300 × 3 = 900 candidates.",
      "Filtering first creates 60 × 1 = 60 candidates.",
      "Both return 20 rows; fewer candidates alone do not prove the runtime ratio."
    ],
    "lecture-05-scene-13": [
      "The grammar expects the FROM keyword at this position.",
      "FORM is an identifier token and does not satisfy that rule.",
      "expect reports the mismatch without consuming the invalid token."
    ],
    "lecture-05-scene-14": [
      "The question mark reserves one value supplied separately from SQL.",
      "Binding 42 returns ada without changing the statement text.",
      "Binding 43 uses the same statement and returns ben.",
      "SQL-looking parameter text stays one value and adds no new condition."
    ],
    "lecture-05-scene-15": [
      "The scan tree is ready, but has not produced a row yet.",
      "A next() request travels from ProjectScan toward TableScan.",
      "ada’s GPA 39 passes the filter and the row moves upward.",
      "The runner reads name through ProjectScan."
    ],
    "lecture-05-scene-16": [
      "Predict source visits and result counts for the two queries.",
      "Both queries visit all 300 table rows.",
      "Filtering returns 60 names instead of 300 after those rows are examined."
    ]
  },
  "7": {
    "money-disappears": [
      "The two balances initially total 150.",
      "Only the debit reaches storage, reducing the stored total to 100.",
      "A crash interrupts the transfer before its credit can restore the total."
    ],
    "transaction": [
      "A transaction groups the debit and credit into one unit.",
      "Moving 40 changes balances 100 and 50 into 60 and 90.",
      "Commit marks the successful completion of that whole unit."
    ],
    "two-kinds-of-unfinished": [
      "Process memory, the OS cache, and durable storage are different layers.",
      "Killing the process discards its memory but can leave OS-cached data intact.",
      "A power failure also threatens data that remained only in volatile caches."
    ],
    "durable-first": [
      "The page’s original value is 100.",
      "Make the recovery record containing 100 durable first.",
      "The changed page containing 60 may reach storage after its log record."
    ],
    "write-ahead-logging": [
      "The lab’s undo record saves the value needed to reverse a change.",
      "Synchronize the recovery record before allowing the protected data write.",
      "The ordering rule is durable log before durable changed page."
    ],
    "a-complete-transfer": [
      "Start a transfer of 40 from A to B.",
      "Record A’s old value 100 before changing A to 60 in memory.",
      "Record B’s old value 50 before changing B to 90 in memory.",
      "FORCE commit flushes the changed pages before durable COMMIT."
    ],
    "crash-after-eviction": [
      "tx2 changes A from 60 to 10 in memory without committing.",
      "STEAL eviction allows the uncommitted value 10 to reach storage.",
      "After a crash, the durable old value 60 can undo unfinished tx2."
    ],
    "read-the-log-backward": [
      "Read backward and identify tx2’s change without a completion record.",
      "Restore A to 60, bringing the total back to 150.",
      "Keep tx1’s committed transfer and make the recovery repairs durable."
    ],
    "two-writes-reverse-undo": [
      "tx2 wrote 60 to 40 to 10, then crashed without committing.",
      "Undo the latest change first, restoring 10 to 40.",
      "Undo the earlier change next, restoring 40 to 60.",
      "tx1 has a durable COMMIT, so mark it finished.",
      "Skip tx1’s old value 100 and preserve its committed value 60.",
      "Flush the repairs before recording durable ROLLBACK for tx2."
    ],
    "repair-can-crash-too": [
      "Assign the logged old value 60 to repair the page.",
      "Another crash can interrupt that repair.",
      "Repeating the assignment leaves 60 unchanged and permits safe completion."
    ],
    "two-policy-decisions": [
      "Eviction policy and commit policy are independent choices.",
      "STEAL allows uncommitted data onto disk, creating an undo duty.",
      "NO-FORCE can leave committed data off disk, creating a redo duty."
    ],
    "four-recovery-duties": [
      "FORCE plus NO-STEAL needs neither update undo nor redo in this simplified model.",
      "FORCE plus STEAL requires undo for uncommitted page writes.",
      "NO-FORCE plus NO-STEAL requires redo for committed updates not yet flushed.",
      "NO-FORCE plus STEAL needs both undo and redo."
    ],
    "commit-boundary": [
      "Each policy has a required durability boundary before a safe reply.",
      "FORCE waits for changed pages; NO-FORCE relies on durable recovery information.",
      "NO-FORCE permits the data-page flush to occur after the commit reply."
    ],
    "recovery-at-scale": [
      "Analysis determines transaction fate and the recovery starting state.",
      "Redo uses logged progress to repeat necessary history.",
      "Undo removes unfinished work under the production recovery protocol."
    ],
    "place-the-crash": [
      "Before durable logging, the changed page must not have reached storage.",
      "A durable log provides repair information even if the data page was not flushed.",
      "If uncommitted data reached storage, undo restores its old value.",
      "A durable FORCE commit means the transaction’s changes must be kept."
    ],
    "from-promise-to-code": [
      "Write the required recovery information first.",
      "Only then allow the changed page to become durable.",
      "Preserve completed transactions and repair unfinished ones after a crash."
    ]
  },
  "8": {
    "concurrency-mvcc": [
      "Two clients both want to add 10 to the same balance.",
      "Independent writes can lose one deposit unless access is coordinated."
    ],
    "two-deposits": [
      "The shared balance starts at 100.",
      "One deposit should raise it to 110.",
      "Two completed deposits should leave 120."
    ],
    "schedule-the-failure": [
      "Both transactions are allowed to start from the same row.",
      "Both read the original balance 100.",
      "Each computes its own replacement value 110.",
      "Both write 110, so one deposit is lost."
    ],
    "serializability": [
      "Running T1 and then T2 produces 120.",
      "Running T2 and then T1 also produces 120.",
      "A serializable interleaving must have the effect of a valid serial order."
    ],
    "anomaly-gallery": [
      "A dirty read observes a value that its writer later rolls back.",
      "A non-repeatable read sees a committed change to the same row.",
      "A phantom changes the rows satisfying a repeated predicate."
    ],
    "shared-and-exclusive": [
      "Compatible shared locks let multiple readers access the row.",
      "An exclusive lock conflicts with another transaction’s shared or exclusive hold."
    ],
    "replay-with-locks": [
      "Both transactions obtain shared locks and read 100.",
      "T1 requests an exclusive lock while T2 still holds a shared lock.",
      "The lab refuses that conflicting upgrade with LockAbortError."
    ],
    "two-phases": [
      "The growing phase acquires locks without releasing them.",
      "After releasing a lock, basic two-phase locking acquires no new locks.",
      "Holding the required locks until completion prevents premature access."
    ],
    "deadlock": [
      "T1 holds A while T2 holds B.",
      "Each waits for the resource held by the other, forming a cycle.",
      "Aborting a victim releases resources so another transaction can proceed."
    ],
    "protect-the-empty-space": [
      "Locking existing rows protects those rows only.",
      "A new value can enter the unlocked gap and change a range result.",
      "Predicate or range protection must also cover relevant insertions."
    ],
    "isolation-ladder": [
      "The standard minimum guarantees allow dirty reads at Read Uncommitted.",
      "Read Committed rules out reading uncommitted changes.",
      "Repeatable Read protects repeated row reads; phantom behavior depends on the implementation.",
      "Serializable execution must match a valid serial outcome."
    ],
    "versions-instead-of-waiting": [
      "The original committed row version contains 120.",
      "Updating creates a new version containing 70.",
      "A reader can keep its visible version while a writer creates another."
    ],
    "walk-the-version-chain": [
      "In this ordered example, the first snapshot sees the version made by tx100.",
      "A later snapshot sees the committed version made by tx103.",
      "The latest snapshot sees tx107’s version, subject to visibility rules."
    ],
    "statement-or-transaction-snapshot": [
      "The committed balance starts at 100 before either read.",
      "Both isolation modes first read 100.",
      "Another transaction commits a new version with balance 120.",
      "Read Committed gets a fresh snapshot; Repeatable Read keeps its earlier snapshot.",
      "A new transaction can see 120 after the old reader finishes."
    ],
    "the-version-bill": [
      "An active reader still needs an old version.",
      "Cleanup must retain versions required by valid snapshots.",
      "Once the reader ends, eligible obsolete versions can be reclaimed."
    ],
    "write-skew": [
      "At least one of the two doctors must remain on call.",
      "Each snapshot sees the other doctor on call.",
      "They update different rows and both leave, violating the shared rule."
    ],
    "three-mechanisms-three-jobs": [
      "A pin prevents replacement of a memory frame in active use.",
      "A latch protects a short operation on an internal data structure.",
      "A transaction lock controls conflicting access across transaction operations."
    ],
    "exit-schedule": [
      "Two stale read-modify-write sequences can lose a deposit.",
      "Lock conflict handling prevents that invalid schedule from completing.",
      "Snapshot rules determine which row versions a reader can observe."
    ]
  },
  "9": {
    "same-answer-different-work": [
      "Both plans answer the same student-major query.",
      "Filtering before pairing reduces the intermediate candidate set.",
      "Both return 20 rows, from 900 versus 60 candidate pairs."
    ],
    "optimizer": [
      "Stored statistics summarize relation sizes and value distributions.",
      "The optimizer estimates costs for valid candidate plans.",
      "It chooses an estimated good plan without executing every alternative."
    ],
    "read-a-plan": [
      "Start at the student input and compare estimated with actual rows.",
      "Do the same for the filtered major input.",
      "Then compare estimated and actual output at the join."
    ],
    "selectivity": [
      "There are 300 input rows before this predicate.",
      "Sixty survive, so selectivity is 60 / 300 = 0.2."
    ],
    "estimate-from-a-sketch": [
      "A distribution sketch summarizes where values occur.",
      "A range predicate keeps the estimated share within its bounds.",
      "Multiplying selectivities assumes the filters behave independently."
    ],
    "when-estimates-fail": [
      "A uniform estimate assumes values occur at similar frequencies.",
      "Skew can concentrate far more rows on one value.",
      "Correlated fields make independent selectivity multiplication misleading."
    ],
    "price-the-work": [
      "Model 100,000 rows, 1,000 heap pages, and an index of height 3.",
      "At 0.1% selectivity, 100 rows match.",
      "The model prices an index path at 103 accesses versus a scan’s 1,000.",
      "At 2%, 2,003 modeled index accesses exceed a scan’s 1,000.",
      "The crossover is 997 matches under these assumptions only."
    ],
    "watch-the-access-path-flip": [
      "Ten matches give a modeled index cost of 3 + 10 = 13 accesses.",
      "At 1%, the modeled index cost is 1,003 versus a scan’s 1,000.",
      "Reading almost every row makes the scan attractive in this model."
    ],
    "choose-the-join-machine": [
      "A small outer input can probe an index on the inner join key.",
      "A hash join builds key buckets, then probes matching buckets.",
      "A merge join advances through sorted inputs and combines equal-key groups."
    ],
    "join-order": [
      "Joining students to majors first produces 300 intermediate rows.",
      "Joining students to enrollments first produces 3,000 intermediate rows.",
      "An unconnected first pair forms 9,000 rows before the final join condition."
    ],
    "search-without-enumerating-everything": [
      "Begin with access paths for individual relations.",
      "Reuse good plans for relation pairs when building larger joins.",
      "A useful order can justify retaining an additional physical alternative."
    ],
    "diagnose-then-review": [
      "Read the estimated plan before interpreting its total cost.",
      "Find the earliest large gap: an input estimated at 10 actually returns 10,000.",
      "Investigate statistics and memory assumptions affected by that error."
    ],
    "review-storage-and-memory": [
      "Block size and durability boundaries explain storage behavior.",
      "A 50-block cycle exceeds a 49-frame pool and repeatedly misses.",
      "A fiftieth frame allows the working set to remain resident after warm-up."
    ],
    "review-rows-and-pipelines": [
      "A record address selects a block and a slot within it.",
      "A parent operator pulls candidate rows from its child.",
      "Earlier filters can reduce 900 candidate pairs to 60."
    ],
    "review-sql-and-indexes": [
      "The lexer identifies keywords, field names, operators, and the integer 35.",
      "Parsing records the requested field name and source table.",
      "The WHERE clause records a comparison between gpa and literal 35.",
      "QueryData describes the request without reading student rows.",
      "Planning wraps TableScan with SelectScan and ProjectScan.",
      "Execution examines six toy rows and returns ada, cyd, and eli."
    ],
    "review-recovery-and-isolation": [
      "WAL and commit rules constrain what may survive a crash.",
      "Two stale reads followed by replacement writes can lose an update.",
      "Conflict protection must handle that concurrency problem separately."
    ],
    "exit-mechanism": [
      "Storage mechanisms define how bytes become durable, reusable pages.",
      "Execution mechanisms determine what candidate work a query performs.",
      "Transaction mechanisms constrain failures and conflicting operations."
    ]
  },
  "10": {
    "the-analytics-stack": [
      "Each ride has a pickup location, payment type, and fare. Both layouts store the same values.",
      "Row storage keeps Ride 1’s pickup, payment, and fare together.",
      "Column storage groups pickup locations, payment types, and fares separately.",
      "The average needs only the three fares: $36, $24, and $30.",
      "Both layouts give $30. Column storage lets this query skip pickup and payment values."
    ],
    "the-workload-rotates": [
      "A row slot holds a record. Column chunks keep each field separately, in matching row order.",
      "In the row page, slot 1 contains all of Ride 2: LGA, card, and $24.",
      "In the pickup chunk, position 1 gives Ride 2’s pickup: LGA.",
      "The same position in the payment chunk gives card.",
      "Position 1 in the fare chunk gives $24. The three values rebuild Ride 2."
    ],
    "analytical-workload": [
      "Start with four trip rows and compute fare plus tip for each.",
      "GROUP BY produces two monthly rows: revenues 20 and 30.",
      "The first running window contains only month 1, so its total is 20.",
      "The next window includes both months, producing 20 + 30 = 50.",
      "The final output keeps two monthly rows in explicit month order."
    ],
    "read-a-row-layout": [
      "We want the average fare. Pickup location and payment type do not affect the answer.",
      "The three fares sit beside pickup and payment values in the stored rows.",
      "The average is $30. Reading row data can bring along fields this query does not need."
    ],
    "read-a-column-layout": [
      "Ask the same question about the same rides. This time, fares are stored together.",
      "Read $36, $24, and $30 from the fare chunk. Skip pickup and payment chunks.",
      "The average is still $30. The benefit is reading less unrelated data."
    ],
    "the-point-lookup-reverses-it": [
      "To show Ride 2, we need its pickup, payment, and fare. A row layout keeps them together.",
      "To average fares, we need one field from every ride. A column layout keeps them together.",
      "The query changes which values we need. That is why different layouts suit different jobs."
    ],
    "compression": [
      "Repeated values contain redundant information.",
      "Encode twelve repetitions as a value and a count.",
      "Decoding reconstructs the original values exactly."
    ],
    "runs": [
      "Twenty-four values form three consecutive equal-value runs.",
      "Store (1, 8), (2, 8), and (3, 8) as value-count pairs.",
      "This teaching byte model reduces the payload from 96 to 24 bytes."
    ],
    "dictionary-and-deltas": [
      "Repeated strings can share a small dictionary.",
      "Codes 0 and 1 stand for card and cash.",
      "A smooth numeric sequence can use one starting value and repeated deltas."
    ],
    "batches-through-the-pipeline": [
      "Row-at-a-time calls repeat dispatch work for each value.",
      "This example processes a batch of 2,048 values together.",
      "Operators pass the batch onward, amortizing per-call overhead."
    ],
    "skip-a-row-group": [
      "For x = 10, inspect each row group’s minimum and maximum.",
      "Ranges [1, 3] and [4, 7] prove those groups cannot match.",
      "Open [8, 12] and test its rows; the bounds alone do not prove a match."
    ],
    "skip-eleven-partitions": [
      "The file layout records one partition value for each month.",
      "month = 12 rules out the other eleven partitions.",
      "Within December, projection selects only the needed columns."
    ],
    "predict-the-byte-ratio": [
      "Full payload: 60,000 rows × 12 columns × 8 bytes = 5.76 MB.",
      "Reading one column reduces that modeled payload to 0.48 MB.",
      "One equal-sized partition reduces it to 40 KB, a 144-fold payload ratio."
    ],
    "an-engine-inside-the-process": [
      "The query engine executes within the application’s process.",
      "It can query data from supported files or in-process dataframes.",
      "The application receives the requested result as a dataframe."
    ],
    "storage-and-compute-separate": [
      "A compute group reads data held in shared storage.",
      "Additional compute can read the same stored dataset.",
      "Scaling compute does not require duplicating the logical dataset for each group."
    ],
    "a-table-over-files": [
      "Snapshot A identifies files a and b as the table.",
      "Write new files and metadata for snapshot B before publishing it.",
      "New readers can use B while existing readers continue with A."
    ],
    "train-inside-the-query-engine": [
      "Only the four training rows participate in fitting the line.",
      "SQL aggregates estimate intercept and slope from target and feature values.",
      "Store the learned coefficients b = 3 and w = 2.",
      "The saved model predicts fare as 3 + 2 × distance."
    ],
    "evaluate-and-apply-the-model": [
      "Held-out rows stay separate from model fitting.",
      "Apply the saved coefficients to predict fares 8 and 12.",
      "Both absolute errors are 1; a new 3.5-mile input predicts 10.",
      "Managed ML statements also distinguish fitting, evaluation, and inference."
    ],
    "performance-becomes-cost": [
      "Reading more data can increase both data movement and compute work.",
      "Projection reduces the columns the query needs.",
      "Partition pruning can reduce the relevant files as well."
    ],
    "choose-the-shape": [
      "A point lookup reconstructs one complete ride.",
      "A whole-table aggregate benefits from reading its selected column.",
      "A partitioned aggregate first rules out irrelevant partitions."
    ]
  },
  "11": {
    "meaning-becomes-geometry": [
      "Documents begin as text with meaning we want to compare.",
      "The embedding model maps each document to coordinates.",
      "Search compares those coordinates to find nearby candidates."
    ],
    "embedding": [
      "The same embedding model converts content into a vector.",
      "This toy embedding has four coordinates.",
      "Compare vectors only under compatible model, dimension, and preprocessing conventions."
    ],
    "direction-and-normalization": [
      "A vector has both a length and a direction.",
      "Cosine similarity compares directions rather than vector lengths.",
      "For unit-length vectors, the dot product equals cosine similarity."
    ],
    "the-exact-baseline": [
      "Exact search starts with every stored vector as a candidate.",
      "Score the first 24 of 72 vectors.",
      "Score the next 24; no region has been skipped.",
      "After all 72 scores, choose the highest-ranked neighbors."
    ],
    "price-the-baseline": [
      "4,000 vectors with 64 coordinates require 256,000 coordinate products per query.",
      "One million 1,536-dimensional vectors require 1.536 billion products per query.",
      "At 100 queries per second, the larger example requires 1.536 trillion products per second."
    ],
    "skipping-with-a-contract": [
      "Probe one region and accept that a true neighbor may be elsewhere.",
      "Probing another region examines more candidates.",
      "A larger search budget can improve recall, at the cost of more work."
    ],
    "build-an-ivf-index": [
      "Begin with a small set of candidate cluster centers.",
      "Assign each vector to its nearest center under the chosen metric.",
      "Update the centers and repeat assignment during training.",
      "Store vector IDs in lists attached to their final centers."
    ],
    "probe-the-lists": [
      "Four unit vectors are divided between two centroid lists.",
      "q is closer to c0, so probing one list scores only v0.",
      "Only v0 is scored: two centroid comparisons plus one candidate comparison.",
      "Exact search ranks v1 first, but its list was skipped: Recall@2 = 1 / 2.",
      "Probing both lists finds the exact top two, with six comparisons versus four for exact search."
    ],
    "count-the-saved-work": [
      "Exact search scores all 4,000 stored vectors.",
      "IVF first scores 20 centroids.",
      "Four balanced lists contribute about 800 candidate vectors.",
      "Estimated work is 20 + 800 = 820 comparisons; real list sizes can differ."
    ],
    "navigate-a-graph": [
      "Start from the graph’s entry point in the upper layer.",
      "Follow a useful upper-layer connection toward the query.",
      "A longer connection crosses the space with fewer local steps.",
      "Descend to the denser lower layer.",
      "Follow local connections to refine the candidate set.",
      "A broader candidate search spends more work to reduce missed neighbors."
    ],
    "measure-a-miss": [
      "The exact top ten define the reference set.",
      "Seven returned IDs overlap with the exact set; three do not.",
      "Recall@10 is 7 / 10 = 0.70, regardless of the returned order."
    ],
    "choose-an-operating-point": [
      "Each plotted setting has a comparison count and recall value.",
      "Require recall of at least 0.90; P = 4 is the first qualifying setting.",
      "P = 4 also stays below the 1,000-comparison budget in these example results."
    ],
    "memory-and-update-budgets": [
      "IVF stores centroids, list membership, and vector data.",
      "A graph index also stores neighbor links and must build them.",
      "Compressed coordinates save memory but introduce another accuracy tradeoff."
    ],
    "where-the-index-lives": [
      "A database can manage vectors alongside rows and transactions.",
      "A library inside the process leaves persistence and synchronization to the application.",
      "A separate service adds a network boundary and a data-synchronization responsibility."
    ],
    "diagnose-the-index": [
      "First measure whether ANN missed neighbors found by exact search.",
      "If exact search fixes recall, tune the index or search budget.",
      "If exact neighbors are still irrelevant, investigate the representation and task."
    ],
    "rebuild-the-retrieval-contract": [
      "Build an exact baseline before adding a shortcut.",
      "Use the index to skip candidates under an explicit search budget.",
      "Compare the returned IDs with the exact reference set.",
      "Defend a setting using quality, work, memory, and update requirements."
    ]
  },
  "12": {
    "evidence-reaches-the-answer": [
      "Begin with a corpus that contains potential supporting evidence.",
      "Retrieve a small set of passages for the current question.",
      "Generate an answer supported by those passages and their source IDs."
    ],
    "retrieval-augmented-generation": [
      "Split source documents into retrievable chunks.",
      "Embed chunks with a compatible representation.",
      "Build the searchable index during ingestion.",
      "At query time, retrieve relevant chunks.",
      "Supply retrieved evidence to the generator, preserving source attribution."
    ],
    "three-places-for-knowledge": [
      "Model weights can contain knowledge, but do not expose a current source collection.",
      "Supplying the whole corpus repeatedly consumes a large context budget.",
      "Retrieval selects a smaller, question-dependent evidence set."
    ],
    "design-the-retrieval-record": [
      "Begin with the document’s structure and topic boundaries.",
      "Chunks should preserve enough context to interpret their content.",
      "Very small fragments can separate a statement from its meaning.",
      "Overlap can preserve boundary context while duplicating some material."
    ],
    "keep-the-source-identity": [
      "Search results contain vector positions, not source IDs.",
      "Position 2 resolves to the WAL chunk about undo.",
      "Copy the chunk before attaching the query-specific score.",
      "Ranked chunks keep their original source IDs, even when IDs repeat.",
      "The first relevant hit determines reciprocal rank; source IDs support citations."
    ],
    "a-synonym-failure": [
      "The query “OS page cache” retrieves the intended buffer-pool source.",
      "Rephrasing the same idea changes the ranking in this example.",
      "Exact search cannot repair a representation that ranks irrelevant content highly."
    ],
    "build-an-evaluation-set": [
      "Build a varied set of at least 25 evaluation questions.",
      "Label relevant source IDs, including multiple acceptable sources where appropriate.",
      "Keep evaluation questions fixed while comparing retrieval settings."
    ],
    "presence-in-the-top-results": [
      "Question 1 has a relevant source at rank 1.",
      "Question 2 has a relevant source at rank 3.",
      "Question 3 has no relevant source in the returned set.",
      "Hit rate is 2 / 3: two questions have at least one relevant hit."
    ],
    "rank-changes-the-score": [
      "A first relevant result at rank 1 earns reciprocal rank 1.",
      "A first relevant result at rank 3 earns 1 / 3.",
      "A missing relevant result earns 0.",
      "MRR is (1 + 1/3 + 0) / 3, approximately 0.44."
    ],
    "measure-chunking-instead-of-guessing": [
      "Ten-word chunks give hit rate 0.75 and MRR 0.67 in this fixture.",
      "Sixty-word chunks improve these scores to 0.92 and 0.78.",
      "Ninety-word chunks tie those scores here; this is a measured fixture, not a universal optimum."
    ],
    "context-has-a-budget": [
      "Retrieve a candidate set before choosing the final context.",
      "Rerank or filter the candidates to fit the evidence budget.",
      "Preserve the chosen passage’s source ID when constructing the prompt."
    ],
    "two-retrieval-paths": [
      "The query contains the exact identifier E104.",
      "Vector search and keyword search can find different candidates.",
      "Merge candidates while removing duplicates; raw scores need not be comparable.",
      "Rerank the merged set before selecting the final evidence."
    ],
    "filters-change-the-candidate-set": [
      "The collection contains chunks from more than one access scope.",
      "Restrict candidates to sources the current user may access.",
      "Choose top-k within the authorized set, not from an unrestricted result list."
    ],
    "a-changed-source-invalidates-copies": [
      "Source D7 and its stored embedding begin at version 1.",
      "Updating the text alone leaves a stale searchable representation.",
      "Embed the new source version before publishing it for retrieval.",
      "Switch the source and index version together; a model change requires compatible re-embedding."
    ],
    "failure-diagnosis-workshop": [
      "A missing relevant hit points to a retrieval or corpus problem.",
      "A relevant result at rank 3 points to ranking quality.",
      "A citation identifies a source; it does not by itself prove the answer is supported."
    ],
    "a-measurable-rag-system": [
      "Record source identity and version during ingestion.",
      "Retrieve a ranked evidence set for each evaluation question.",
      "Measure hit rate and reciprocal rank against labeled sources.",
      "Check that the generated claims are supported by the cited passages."
    ]
  },
  "13": {
    "one-job-many-machines": [
      "At 2 GB/s, reading 10 TB on one worker takes about 5,000 seconds.",
      "Dividing the bytes across 100 workers gives 100 GB per worker.",
      "An ideal run takes about 50 seconds; a failed worker adds recovery work."
    ],
    "partitioning": [
      "Start with records whose keys determine ownership.",
      "A partition rule assigns each key to a worker.",
      "A point query uses the same rule to find the responsible worker."
    ],
    "hash-routing": [
      "The names begin as one logical collection.",
      "The toy hash maps each name to one of four owners.",
      "Equality lookup computes a single owner directly.",
      "A key range can span many hash partitions."
    ],
    "range-routing": [
      "Sorted keys can be divided into contiguous ranges.",
      "Each worker owns one range of the key space.",
      "A point lookup for kim routes to the k–z owner.",
      "The d–f range query stays within one owner; uneven frequencies can still create hotspots."
    ],
    "skew-creates-idle-time": [
      "With no hot key, 8,000 equal-cost rows divide into 1,000 per worker.",
      "A 40% hot key puts 3,800 rows on one worker and 600 on each other worker.",
      "At 80%, the hot worker gets 6,600 rows and limits completion time."
    ],
    "salt-and-combine": [
      "Repeated key A directs all of its work to one owner.",
      "Add a salt to spread A across four temporary keys.",
      "Compute a partial result for each salted key.",
      "Combine the four partial counts to recover A’s total of 100."
    ],
    "map-is-local-computation": [
      "Read the text “The log the tree.”",
      "Tokenize and normalize each word.",
      "Emit one (word, 1) pair per occurrence, including both copies of “the.”"
    ],
    "shuffle-manufactures-locality": [
      "Mappers emit local key-value pairs.",
      "Route equal keys to the same reducer.",
      "Equal words now share an owner and form separate groups, ready for reduction."
    ],
    "reduce-sees-the-complete-group": [
      "Two documents produce four word occurrences.",
      "Emit (wal, 1) three times and (page, 1) once.",
      "Shuffle all copies of a word to its chosen owner.",
      "Reduce the groups to wal = 3 and page = 1.",
      "Key ownership must be consistent; output ordering is a separate contract."
    ],
    "reduce-network-bytes-early": [
      "Each of three mappers emits four occurrences of “log.”",
      "Locally combine each mapper’s four pairs into (log, 4).",
      "Shuffle three partial counts and sum them to 12."
    ],
    "a-lazy-spark-plan": [
      "Begin with the input text collection.",
      "flatMap creates one row per token.",
      "map converts each token into a keyed count.",
      "reduceByKey groups equal words through a shuffle.",
      "An action requests execution and returns the result."
    ],
    "stages-follow-dependencies": [
      "Narrow transformations can stay within a partition.",
      "A shuffle redistributes records between partitions.",
      "The shuffle separates stages of the execution graph.",
      "Tasks within a stage can run on different workers."
    ],
    "lineage-rebuilds-lost-partitions": [
      "Lineage records how partitions can be reconstructed.",
      "Losing a worker can also lose its cached partitions.",
      "Trace the lost partition back to the required inputs and transformations.",
      "Recompute the missing work on another worker."
    ],
    "launch-before-waiting": [
      "Waiting after every launch makes independent tasks run serially.",
      "Launch independent tasks before waiting for their results.",
      "Workers can execute those tasks concurrently.",
      "Reused actors keep state across calls; their scheduling and state need separate reasoning."
    ],
    "choose-the-execution-shape": [
      "A relational pipeline fits a dataflow execution graph.",
      "Independent tasks can use a task scheduler without a relational plan.",
      "If the data and work fit comfortably on one machine, distribution may add overhead."
    ],
    "place-move-recover": [
      "Choose a partition rule that matches the access pattern.",
      "Identify which operation requires records to cross workers.",
      "Execute independent work concurrently within the dependency graph.",
      "Preserve enough lineage or durable state to recover failed work."
    ]
  },
  "14": {
    "organize-writes-differently": [
      "Updating scattered pages can turn small writes into random storage work.",
      "Append recovery information sequentially before acknowledging protected writes.",
      "Accumulate sorted runs and merge them later, shifting work to reads and compaction."
    ],
    "a-multidimensional-map": [
      "The row key selects a logical row.",
      "A family and qualifier identify a column within that row.",
      "A timestamp distinguishes versions of the cell’s byte value."
    ],
    "sparse-cells-and-versions": [
      "Absent cells do not require a full rectangular allocation.",
      "A row can acquire another qualifier without filling every row.",
      "A present cell can retain several timestamped versions."
    ],
    "tablets-separate-placement-from-storage": [
      "Split the sorted row-key space into tablet ranges.",
      "Assign responsibility for each tablet to a server.",
      "Durable files live in a shared replicated storage layer in this architecture.",
      "Reassigning a tablet changes its serving owner without relocating all durable bytes."
    ],
    "splitting-cannot-fix-a-moving-hotspot": [
      "Writes spread across the ranges can use several servers.",
      "Increasing timestamp keys concentrate new writes at the rightmost range.",
      "Splitting divides the current range into two tablets.",
      "The next increasing keys still target the new rightmost tablet."
    ],
    "the-log-protects-memory": [
      "A new write arrives for key k2.",
      "Append the write’s recovery information to the log.",
      "Establish the log’s required durability before acknowledging success.",
      "Update the memtable; the durable log can rebuild it after a crash."
    ],
    "the-memtable-stays-ordered": [
      "Writes arrive in key order k8, k2, k5, k1, k7.",
      "The memtable maintains key order despite the arrival order.",
      "A later value for k2 becomes its newest visible version."
    ],
    "freeze-a-sorted-file": [
      "An active memtable reaches its size threshold.",
      "Freeze it so its contents no longer change.",
      "Write the sorted contents sequentially into an immutable SSTable.",
      "New writes enter a new active memtable while the old one is flushed."
    ],
    "read-the-newest-visible-value": [
      "SSTable A contains k = old at sequence 5.",
      "SSTable B’s value at sequence 8 overrides the older visible value.",
      "A tombstone at sequence 9 makes a current read return absent.",
      "After flushing the tombstone, merge B and C; retain the deletion because A still exists.",
      "Drop obsolete records only after covering older versions and checking snapshot needs."
    ],
    "merge-sorted-runs": [
      "Two immutable sorted files contain overlapping key ranges.",
      "Compare the leading keys and advance a merge cursor.",
      "For duplicate k2, retain the newest eligible value v2.",
      "Produce one sorted run, subject to snapshot and version-retention requirements."
    ],
    "deletion-must-hide-older-values": [
      "An older immutable file still holds k2 = v1.",
      "A deletion writes a newer tombstone; it does not edit the old file.",
      "A current read sees the tombstone and returns absent.",
      "Reclaim it only when no older value or required snapshot needs its protection."
    ],
    "a-one-sided-membership-test": [
      "All Bloom-filter bits begin at zero.",
      "Hashing inserted keys sets their selected bit positions.",
      "Any required zero bit proves that the queried key is absent.",
      "All required bits being one means only “possibly present.”",
      "A data lookup rejects this false positive; the filter did not promise a match."
    ],
    "skip-files-then-find-a-block": [
      "A negative filter result can skip an entire file.",
      "A sparse index narrows a possible match to a block.",
      "Read and search the selected block to verify the key.",
      "A cached block can avoid a new storage read."
    ],
    "the-read-write-space-budget": [
      "A B+ tree maintains searchable pages as updates arrive.",
      "An LSM buffers updates and creates immutable sorted runs.",
      "Background compaction spends read and write bandwidth to merge those runs.",
      "Compare read, write, space, and durability costs for the actual workload."
    ],
    "a-network-partition-forces-a-choice": [
      "Both replicas initially expose value v1.",
      "A completed write reaches replica 1, but a partition isolates replica 2.",
      "Waiting avoids serving an answer that may miss the completed write.",
      "Serving v1 stays responsive but sacrifices linearizable freshness in this example.",
      "After communication resumes, reconcile state using the system’s conflict rules."
    ],
    "trace-an-acknowledged-write": [
      "Make the recovery log durable at the required acknowledgment boundary.",
      "Keep the current write in an ordered memtable.",
      "Flush it into a sorted file and merge files in the background.",
      "A later read resolves versions across memory and files before returning a value."
    ]
  },
  "15": {
    "the-path-is-the-answer": [
      "Begin with people as separate records.",
      "Add directed relationships between them.",
      "A query can ask for a connecting path, not just matching individual records."
    ],
    "property-graph": [
      "Nodes represent the entities in the graph.",
      "Directed, typed edges describe relationships such as Follows.",
      "Nodes and edges can both carry named properties."
    ],
    "store-adjacency-at-write-time": [
      "An edge table records each source and destination.",
      "Resolve ada’s outgoing edges to ben and cyd.",
      "Maintaining adjacency at write time makes later neighbor expansion direct."
    ],
    "one-hop": [
      "Start the query at ada.",
      "Follow ada’s outgoing edges to ben and cyd.",
      "Return the neighbor set {ben, cyd}; edge direction matters."
    ],
    "two-hops-with-exclusions": [
      "Expanding two edges can revisit ada and reach dee by two routes.",
      "Remove the starting person when the query excludes self.",
      "Remove existing neighbors and deduplicate endpoints to return {dee, eli}."
    ],
    "breadth-first-reachability": [
      "Initialize the frontier with ada and mark ada visited.",
      "The next frontier contains ben and cyd at distance 1.",
      "Add previously unvisited dee and eli at distance 2.",
      "Add fay at distance 3; visited nodes do not re-enter the frontier."
    ],
    "paths-are-not-unique-vertices": [
      "At one hop, both walk enumeration and BFS discover ben and cyd.",
      "At two hops, four walks end at dee, ada, dee, and eli.",
      "BFS keeps only the new frontier {dee, eli}, avoiding the repeat and the cycle.",
      "At depth 3, BFS has examined eight edges; walk enumeration has produced eleven rows in total.",
      "Choose between eleven walk rows and five unique reachable people according to the question."
    ],
    "the-query-draws-a-shape": [
      "A one-edge pattern specifies a source, relationship, and destination.",
      "A bounded path pattern permits one to three relationships.",
      "Recursive SQL can express traversal too; define duplicates, cycles, and stopping rules explicitly."
    ],
    "find-the-shortest-path": [
      "BFS first discovers nodes one edge from ada.",
      "The next frontier discovers nodes two edges away.",
      "Discovering fay at distance 3 proves the shortest hop count for equal-cost edges.",
      "Follow predecessor links backward to return ada → cyd → eli → fay."
    ],
    "a-supernode-is-skew-again": [
      "A small-degree node has a modest expansion cost.",
      "A supernode’s many edges can dominate the traversal.",
      "Limiting expansion bounds work but can change completeness or query semantics."
    ],
    "choose-a-graph-workload": [
      "A shallow relationship lookup may fit a relational join well.",
      "A variable-depth path makes graph traversal central to the workload.",
      "Whole-graph analytics is a different computation from a local neighborhood query."
    ],
    "connections-augment-similarity": [
      "Vector search retrieves nearby passages such as WAL and buffer content.",
      "Resolve named entities mentioned by the retrieved passages.",
      "Expand selected graph relationships to gather connected evidence.",
      "Merge and deduplicate the evidence while retaining source provenance."
    ],
    "does-graph-expansion-help": [
      "Measure a vector-only retrieval baseline on fixed questions.",
      "Graph expansion can add useful evidence and irrelevant material.",
      "Compare answer support, noise, and latency under the same evaluation setup."
    ],
    "five-mechanisms-recur": [
      "A cache reuses data already fetched or computed.",
      "An index narrows the candidate set before fetching records.",
      "A log preserves information needed for recovery.",
      "A plan determines the order and machinery of execution.",
      "Partitioning assigns data or work across independent owners."
    ],
    "read-a-new-system": [
      "Ask how bytes, records, and versions are stored.",
      "Ask which access paths avoid scanning all candidates.",
      "Ask what makes an acknowledged operation survive failure.",
      "Ask how operators coordinate and where work is materialized.",
      "Ask how ownership, skew, and failure change as the system scales."
    ],
    "finish-with-measured-decisions": [
      "Start with a concrete question or workload requirement.",
      "Measure the mechanisms that determine the result.",
      "Connect the evidence to a design choice and its tradeoffs.",
      "Demonstrate the result and explain what the measurement does and does not establish."
    ]
  }
};
