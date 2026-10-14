/* Authored audience explanations: one sentence per animation state. */
window.CourseClarityCaptions = {
  "1": {
    "lecture-01-scene-01": [
      "The SQL and three returned names stay the same. Predict which work can change between runs.",
      "The cold run fetches the needed blocks before examining their rows.",
      "The warm run reuses resident blocks while the query still executes.",
      "Compare modeled block-access costs separately from whole-query timings."
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
      "Operators scan, filter, and project rows; SQL describes the requested result.",
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
      "fsync() requests durable storage of the file’s writes.",
      "Successful fsync() completes the sync request; power-loss guarantees depend on the storage stack.",
      "A power failure can lose writes that remain only in volatile caches."
    ],
    "lecture-01-scene-16": [
      "Return to the same request: which layers connect SQL to stored blocks?",
      "Trace SQL to a plan, then rows to pages and blocks.",
      "Reusing pages can remove storage reads while scanning and filtering still run."
    ]
  },
  "2": {
    "lecture-02-scene-01": [
      "Request B7 three times. Where can a useful copy stay between requests?",
      "Without reuse, repeated requests can repeat storage work.",
      "With B7 resident, later requests reuse the first read."
    ],
    "lecture-02-scene-02": [
      "Compare when write() and fsync() finish in your Lab 1 measurements.",
      "write() can finish when the OS cache accepts the data.",
      "fsync() waits for file synchronization; the storage stack determines its durability guarantee.",
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
      "Keep the same three frames while changing the access order.",
      "The cyclic scan misses; the hot pair gets repeated reuse before eviction.",
      "Pins protect active users even when reuse is poor."
    ]
  },
  "3": {
    "lecture-03-scene-01": [
      "Cached bytes need interpretation rules before they become a student row.",
      "A layout identifies a row and the fields inside it.",
      "RID (0, 1) names block 0, slot 1; it does not permanently identify a student."
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
      "Return to the saved address: locate a field from slot size and offset.",
      "Interpret one pinned block, then scan occupied slots across blocks.",
      "Recover the schema from the catalog to interpret the bytes after restart."
    ]
  },
  "4": {
    "lecture-04-scene-01": [
      "The operator tree is ready. What call starts work for one result row?",
      "The request travels from Project down to its input.",
      "A qualifying row returns through the common scan interface."
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
      "Use the common interface to compose the plan.",
      "Trace demand downward and qualifying rows upward.",
      "Explain candidate work as well as results, then close every descendant scan."
    ]
  },
  "5": {
    "lecture-05-scene-01": [
      "Read the SQL request before execution reads any table rows.",
      "Record fields, tables, and predicates in QueryData.",
      "Create scan objects that can execute the described request."
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
      "Predict source visits and result counts for the same table with and without WHERE.",
      "Both scan-based queries visit all 300 table rows.",
      "Selection returns sixty names after those rows are examined; fewer results do not prove a timing ratio."
    ]
  },
  "7": {
    "money-disappears": [
      "Establish the account total before a transfer: 60 + 90 = 150.",
      "Only the debit reaches storage, reducing the stored total to 100.",
      "A crash leaves an incomplete transfer. What durable evidence could repair it?"
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
      "Return to the write order: make recovery information durable first.",
      "Only then allow the protected changed page to become durable.",
      "Preserve completed work, undo unfinished work, and make the repair durable before completion."
    ]
  },
  "8": {
    "concurrency-mvcc": [
      "Two clients each add ten to one hundred. Predict the serial result.",
      "Overlapping writes can lose a deposit even when no crash occurs."
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
      "Return to the deposits: two stale read-modify-write sequences can leave 110.",
      "Lock conflict handling prevents that invalid schedule from completing.",
      "Snapshot boundaries control visible versions; a consistent snapshot can still permit write skew."
    ]
  },
  "9": {
    "same-answer-different-work": [
      "Both plans must answer the same student-major query, including duplicates.",
      "Input-only filters reduce the pairs formed before the final join check.",
      "Both return twenty rows, from 900 versus sixty candidates. Compare timing separately."
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
      "A useful sort order can justify keeping a subplan alongside a cheaper alternative."
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
      "Explain how a storage mechanism obtains and preserves the needed bytes.",
      "Explain how an execution choice changes candidate work while preserving the result.",
      "Explain the failure a transaction mechanism prevents and the guarantee it supplies."
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
      "Microdb already has a pipeline: find a row, test it, and expose the requested fields.",
      "The first call finds fare 36. It passes the filter, so the caller reads 36.",
      "The next call skips fare 24 and finds fare 30. The caller reads the second match.",
      "Now imagine passing three rows at once, using the same operators and condition.",
      "Test all three fares in the batch. Keep 36 and 30; reject 24.",
      "Both plans give fares 36 and 30. The batch version shares call overhead across rows."
    ],
    "skip-a-row-group": [
      "For x = 10, inspect each row group’s minimum and maximum.",
      "Ranges [1, 3] and [4, 7] prove those groups cannot match.",
      "Open [8, 12] and test its rows; the bounds alone do not prove a match."
    ],
    "skip-eleven-partitions": [
      "A monthly partition contains one month’s rides. Here, a folder holds its Parquet files.",
      "For December, open month=12. Skip the files in the other eleven folders.",
      "Inside December’s Parquet files, read the fare column chunks."
    ],
    "predict-the-byte-ratio": [
      "Imagine 60,000 rides: 5,000 in each month, with 12 fields of 8 bytes each.",
      "First count all the values: 60,000 rides × 12 fields × 8 bytes = 5.76 MB.",
      "Keep fare and skip the other 11 columns. The value data shrinks from 5.76 MB to 480 KB.",
      "Keep December and skip the other 11 months. The value data shrinks from 480 KB to 40 KB.",
      "The green square is December’s fares. Compare it with the whole grid.",
      "One of 12 columns × one of 12 equal months leaves 1/144 of the original value data."
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
      "Distance is the input and fare is the outcome. The split column marks train and test rides.",
      "WHERE split = 'train' lets only the four training rides influence the model.",
      "The regression aggregates learn a line from the training pairs: outcome first, input second.",
      "CREATE TABLE saves intercept 3, slope 2, and the count of 4 training rides.",
      "The saved numbers give a prediction rule: fare = 3 + 2 × distance."
    ],
    "evaluate-and-apply-the-model": [
      "WHERE split = 'test' selects the two rides kept out of training.",
      "CROSS JOIN pairs each test ride with the model row. Use it to predict each fare.",
      "The predictions are $8 and $12. The view gives these results a name for the next query.",
      "Both predictions miss by $1. AVG(ABS(actual − predicted)) gives a mean absolute error of $1.",
      "VALUES (7, 3.5) supplies ride ID 7 and a new distance. Predict its fare with the same model.",
      "The new ride receives a $10 prediction. The query reuses the model without fitting it again."
    ],
    "performance-becomes-cost": [
      "Reading more data can increase both data movement and compute work.",
      "Projection reduces the columns the query needs.",
      "Partition pruning can reduce the relevant files as well."
    ],
    "choose-the-shape": [
      "Return to a complete ride: its fields sit together in row storage.",
      "An average across rides needs the fare column.",
      "A month predicate can also skip other partitions when the layout and query permit it."
    ],
    "parquet-is-a-file-format": [
      "A file format defines how data is stored. Save the same rides in a file named rides.parquet.",
      "Inside a Parquet row group, each field has its own column chunk.",
      "DuckDB runs the query. It can read the fare chunk and skip pickup and payment.",
      "The result is still $30. Parquet stores the values; DuckDB calculates the average."
    ],
    "more-models-with-duckdb": [
      "DuckDB prepares the rows. A PyTorch model can learn from them and return predictions to SQL."
    ],
    "duckdb-pytorch-fare-model": [
      "DuckDB mixes January–October training rides, then sends distances and fares to Python in batches.",
      "One distance feeds 16 hidden units. Their outputs combine into one predicted fare.",
      "First, express each distance relative to the training average and spread.",
      "The model predicts a scaled fare. Compare it with the recorded fare on the same scale.",
      "Loss measures how far the predictions are from the targets across the batch.",
      "Convert the network’s output back to dollars before returning it to SQL.",
      "Register a SQL function that passes Arrow batches to our Python prediction function.",
      "DuckDB sends a batch of distances to Python using Apache Arrow.",
      "Python returns the predicted fares as an Arrow array. Each result matches its input position.",
      "SQL calls the model on November–December rides. Their recorded fares let us check its predictions.",
      "In this run, the neural network has a smaller average prediction error than the straight line."
    ],
    "managed-model-sql": [
      "CREATE MODEL fits a line using only training rides and saves it as a managed model.",
      "ML.EVALUATE applies the saved model to separate test rides and measures prediction error.",
      "ML.PREDICT applies the saved model to a new distance and returns predicted_fare."
    ]
  },
  "11": {
    "meaning-becomes-geometry": [
      "Maya asks about crash recovery. The passage uses different words, so an exact string search fails.",
      "Embed the question and the passage with compatible conventions so their vectors can be compared.",
      "Nearby vectors suggest candidates. Open the passage to check whether it answers the question."
    ],
    "embedding": [
      "Noor turns the stored passage into coordinates using the embedding model.",
      "These four coordinates illustrate an embedding; they are not a real model output.",
      "The question must use a compatible model, version, dimension, and preprocessing."
    ],
    "direction-and-normalization": [
      "Before scoring, Maya separates a vector’s direction from its length.",
      "Rotating toward q increases cosine similarity; increasing length alone does not.",
      "Normalize both vectors to unit length so their dot product equals cosine similarity."
    ],
    "the-exact-baseline": [
      "Maya keeps every stored vector in the exact-search candidate set.",
      "Score the first 24 of 72 vectors and retain the best candidates so far.",
      "Score the next 24; a better neighbor could still be among the unscored vectors.",
      "After all 72 scores, save the top neighbors as the reference for testing a shortcut."
    ],
    "price-the-baseline": [
      "For Lab 9’s 4,000 vectors, one query needs 4,000 × 64 = 256,000 coordinate products.",
      "At one million vectors with 1,536 coordinates, the same loop needs 1.536 billion products.",
      "At ten million vectors and 100 queries/s, it needs 1.536 trillion products/s. Measure latency too."
    ],
    "skipping-with-a-contract": [
      "Noor searches one region. A true neighbor in another region can be skipped.",
      "Search another region to evaluate more candidates under the same similarity metric.",
      "Searching fewer candidates can miss true neighbors; measure that loss against exact search."
    ],
    "build-an-ivf-index": [
      "A centroid acts like a shelf label. Choose initial centers for the groups.",
      "Assign each vector to its nearest centroid, like filing a book on a shelf.",
      "Update the centers and repeat assignment. The real groups follow vector geometry.",
      "These lists are the shelves. Search a few lists, then score the vectors inside them."
    ],
    "probe-the-lists": [
      "Maya’s whiteboard has four toy vectors in two lists. Build-time assignment is fixed.",
      "The query’s highest centroid score is for c0. Predict which vector a one-list search can score.",
      "Probe 1 returns only v0: two centroid comparisons plus one candidate comparison.",
      "The skipped v1 scores 0.96, above v0’s 0.80. Recall@2 is only 1 / 2.",
      "Probe both lists to recover v1, paying six comparisons versus four for exact search."
    ],
    "count-the-saved-work": [
      "Maya’s exact baseline evaluates all 4,000 stored vectors.",
      "IVF still has to compare the query with 20 centroids.",
      "With balanced lists, four probes evaluate about 4 × 200 = 800 candidate vectors.",
      "Estimate 20 + 800 = 820 evaluations. The measured lists need not be balanced."
    ],
    "navigate-a-graph": [
      "Noor tries a graph instead of centroid lists, starting at its upper-layer entry point.",
      "Follow an upper-layer connection toward the query.",
      "A long connection crosses the space before local refinement.",
      "Descend to the denser lower layer.",
      "Follow local links to refine the candidates.",
      "Increase ef_search to explore more candidates, then measure the change in recall."
    ],
    "measure-a-miss": [
      "Maya puts the approximate result beside the saved exact top ten.",
      "Count seven shared IDs. The shortcut missed three exact neighbors.",
      "Recall@10 = 7 / 10 = 0.70. This measures neighbor agreement, not passage usefulness."
    ],
    "choose-an-operating-point": [
      "These Lab 9 measurements put recall beside comparison counts for each probe setting.",
      "Noor asks for at least 0.90 mean recall. Which settings remain?",
      "With at most 1,000 average comparisons too, choose P = 4: recall 0.9175, count 924."
    ],
    "memory-and-update-budgets": [
      "Count memory for IVF’s centroids, lists, and stored vectors before choosing an index.",
      "HNSW also needs neighbor links and work to construct them.",
      "Compression can save memory but can also change neighbor rankings; measure recall again."
    ],
    "where-the-index-lives": [
      "Maya asks who updates the index when a source changes. A database can keep it beside rows.",
      "The application must save an embedded index and update it when source data changes.",
      "A separate service requires network requests and keeping its index in sync with source records."
    ],
    "diagnose-the-index": [
      "If ANN misses useful exact neighbors, investigate the search budget.",
      "Increase probes or graph-search breadth and compare again with exact search.",
      "If even exact neighbors are unhelpful, inspect chunks, embeddings, metadata, or ranking."
    ],
    "rebuild-the-retrieval-contract": [
      "Return to Maya’s question. Establish exact neighbors before taking a shortcut.",
      "Set the IVF probe count or HNSW search breadth, then measure candidate work.",
      "Measure missed neighbor IDs across representative questions.",
      "Compare returned IDs with exact neighbors, then read the passages to check whether they answer the question."
    ]
  },
  "12": {
    "evidence-reaches-the-answer": [
      "Maya has found a recovery passage. First identify its stored record and source.",
      "Carry the selected passage and its source ID into the context supplied for this question.",
      "A source ID makes a claim checkable. Read the passage to decide whether it supports the claim."
    ],
    "retrieval-augmented-generation": [
      "Keep each chunk as a retrievable record with its source identity.",
      "Represent those records with compatible embeddings.",
      "Build the index during ingestion, before the question arrives.",
      "For each question, select a ranked set of candidate passages.",
      "Assemble their text and source IDs, then check the generated answer against that evidence."
    ],
    "three-places-for-knowledge": [
      "Trained weights can contain knowledge, but do not expose the current source pages.",
      "Sending every page again uses context and processing work for every question.",
      "Like an open-book answer, retrieval selects pages; the generator must still use them correctly."
    ],
    "design-the-retrieval-record": [
      "Inspect the source’s topics before deciding where one record ends.",
      "Keep a claim with the context needed to interpret it.",
      "A tiny fragment can return “it does this” while omitting what “it” means.",
      "Overlap can keep boundary context, but adds duplicated text to the index and prompt."
    ],
    "keep-the-source-identity": [
      "The toy hit contains position 2, not the source ID wal. Predict which record it selects.",
      "Resolve position 2 to its original WAL chunk before building a citation.",
      "Attach score 0.9 to a copy; leave the stored record unchanged for the next question.",
      "Carry the ranked chunks’ source IDs into the prompt, including repeated IDs.",
      "Count one hit per question and use the first relevant rank for its reciprocal score."
    ],
    "a-synonym-failure": [
      "The first wording retrieves the intended buffer-pool source.",
      "Maya changes the wording; the same information need now gets different evidence.",
      "Exact search already scored every chunk; more probes would not change those scores."
    ],
    "build-an-evaluation-set": [
      "Write questions that a corpus user would actually ask; the project requires at least 25.",
      "Label the sources needed to answer each question independently of the current ranking.",
      "Keep comparison questions fixed and hold partner questions out of tuning."
    ],
    "presence-in-the-top-results": [
      "Three toy questions use a top-three cutoff. Reveal their relevant sources before scoring.",
      "Marked boxes show the relevant sources. Which questions have a hit in their first three?",
      "Score each question once: 1, 1, 0. Repeated chunks from one source do not create extra hits.",
      "Two of three questions hit: hit@3 = 2 / 3. Moving rank 3 to rank 1 does not change it."
    ],
    "rank-changes-the-score": [
      "Use the same three questions and top-three cutoff to measure how early the evidence returns.",
      "The marked sources are at ranks 1 and 3. Predict their reciprocal-rank scores.",
      "Ranks 1 and 3 contribute 1 and 1/3; the miss contributes 0.",
      "MRR@3 = (1 + 1/3 + 0) / 3 ≈ 0.44. Compare ranks as well as presence."
    ],
    "measure-chunking-instead-of-guessing": [
      "On the course fixture, ten-word chunks give hit@3 = 0.75 and MRR@3 = 0.67.",
      "Sixty-word chunks give 0.92 and 0.78 on the same questions.",
      "Ninety-word chunks tie those scores here. The fixture does not establish a universal chunk size."
    ],
    "context-has-a-budget": [
      "Collect candidates before choosing the final evidence packet.",
      "Keep a useful subset that fits the context budget; extra text can add noise and cost.",
      "Keep source IDs beside the chosen text so the final claims can be checked."
    ],
    "two-retrieval-paths": [
      "The question contains E104, an exact identifier worth preserving.",
      "Keyword and vector search can contribute different candidates for the same question.",
      "Merge and deduplicate candidates without assuming unrelated raw scores share a scale.",
      "Rerank the merged set, then measure whether the extra stage fixes the observed failure."
    ],
    "filters-change-the-candidate-set": [
      "The collection includes sources with different access scopes.",
      "Constrain the evidence to sources the current user may access.",
      "Find top-k within that allowed set; an unrestricted ranking is not an authorization check."
    ],
    "a-changed-source-invalidates-copies": [
      "D7’s text and searchable representation begin at version 1.",
      "Changing D7’s source text alone leaves its old chunks and vectors in the index.",
      "Build the new source representation before making it searchable.",
      "Switch compatible source and index versions together; a model change also needs re-embedding."
    ],
    "failure-diagnosis-workshop": [
      "Missing evidence: inspect the corpus and retrieved source IDs first.",
      "Evidence at rank 3: inspect ranking, then measure a proposed change.",
      "Unsupported claim: open the actual context and citation. An existing source ID is not proof."
    ],
    "a-measurable-rag-system": [
      "Return to Maya’s question: record the source identity and version.",
      "Select the evidence and keep its ranking visible.",
      "Check presence and rank against independently labeled sources.",
      "Select passages, keep their source IDs, and check each answer claim against the cited text."
    ]
  },
  "13": {
    "one-job-many-machines": [
      "The count is the same task at a larger scale: 10 TB / 2 GB/s = 5,000 seconds for one ideal scan.",
      "With 100 independent readers, each receives 100 GB under this capacity estimate.",
      "An ideal read takes 50 seconds before overhead; a failed worker also needs recovery."
    ],
    "partitioning": [
      "Treat a key like a destination address: it determines the responsible worker.",
      "Apply one compatible routing rule to every record.",
      "Use that rule to find the owner of a point query; partitions divide responsibility."
    ],
    "hash-routing": [
      "Keep the same twelve names while changing only the routing rule.",
      "The shown hash rule assigns each key to one of four workers.",
      "For an equality lookup on kim, compute its hash to choose one partition.",
      "A key range has no single hash interval, so this example consults every partition."
    ],
    "range-routing": [
      "Now keep neighboring keys together in sorted intervals.",
      "Assign each interval to a worker, like consecutive ranges in an ordered index.",
      "Route kim to the owner of k–z.",
      "The d–f range stays with one owner here; key frequencies can still create uneven work."
    ],
    "skew-creates-idle-time": [
      "With equal-cost rows and no hot key, each worker receives 1,000 of the 8,000 rows.",
      "At 40%, the hot worker gets 3,800 rows; the others get 600 each.",
      "At 80%, one worker gets 6,600 rows. More workers do not divide that same-key group."
    ],
    "salt-and-combine": [
      "The repeated key A concentrates its work on one owner.",
      "Split it into four salted keys only if the operation supports correct partial results.",
      "Count each salted group separately.",
      "Combine 25 + 25 + 25 + 25 to recover A = 100; placement changes, the answer does not."
    ],
    "map-is-local-computation": [
      "Read the four occurrences in “the log the tree.”",
      "Normalize and tokenize without removing repeated words.",
      "Emit four (word, 1) pairs. Both occurrences of “the” must survive."
    ],
    "shuffle-manufactures-locality": [
      "Local mappers have pairs for words whose other occurrences may be elsewhere.",
      "Like sorting mail by destination, send equal keys to the same owner.",
      "Group each key’s values at that owner before reduction; moving records costs work."
    ],
    "reduce-sees-the-complete-group": [
      "Return to Maya’s two records. Predict how many occurrences mapping must preserve.",
      "Keep three (wal, 1) pairs and one (page, 1) pair.",
      "Route equal words to their common owner using a compatible partition rule.",
      "Reduce complete groups: wal = 3 and page = 1.",
      "Change the partition count, keep the totals. Bucket numbering and output order may change."
    ],
    "reduce-network-bytes-early": [
      "Each mapper holds four local occurrences of log.",
      "For this sum, replace those four pairs with one local partial count, (log, 4).",
      "Send three partial counts instead of twelve pairs, then add them to get the same total of 12."
    ],
    "a-lazy-spark-plan": [
      "Describe the input collection before triggering execution.",
      "flatMap creates the word occurrences.",
      "map attaches a count to each word.",
      "reduceByKey creates the dependency that groups equal keys.",
      "An action triggers work; collect returns the small result to the driver."
    ],
    "stages-follow-dependencies": [
      "Partition-local operations can stay in a narrow chain.",
      "Grouping can require a shuffle across workers.",
      "That dependency separates stages in this simple word-count plan.",
      "Schedule tasks within each stage; stage count is not simply the number of API calls."
    ],
    "lineage-rebuilds-lost-partitions": [
      "Keep the transformations and available inputs needed to reconstruct a partition.",
      "A worker loss can remove its cached output.",
      "Trace the missing output back to the required available inputs.",
      "Replay the required transformations on another worker. Lineage describes recomputation, not transaction recovery."
    ],
    "launch-before-waiting": [
      "Waiting immediately after each launch serializes these independent calls.",
      "Submit the independent calls before waiting for their results.",
      "Concurrency is now possible; resources and overhead determine actual speedup.",
      "Actors keep explicit state across calls. Treat state reuse separately from the timing result."
    ],
    "choose-the-execution-shape": [
      "A joined aggregation suggests a relational dataflow and its grouping dependencies.",
      "Independent Python calls suggest tasks; state that persists across calls may suggest actors.",
      "If one machine meets the workload target, a cluster can add coordination and movement costs."
    ],
    "place-move-recover": [
      "Return to the count: choose owners using the key, not the sending worker.",
      "Move matching keys together or combine valid partial results.",
      "Execute the dependencies, allowing independent work to overlap.",
      "Plan retries using retained inputs and task information; preserve the same word totals."
    ]
  },
  "14": {
    "organize-writes-differently": [
      "Maya opens SSTable A: k = old at sequence 5. The file is immutable.",
      "A newer record in B has k = new at sequence 8; the old bytes still exist.",
      "DELETE at sequence 9 makes a current read return absent. Keep its tombstone while old values could reappear."
    ],
    "a-multidimensional-map": [
      "Name the logical row before deciding where its bytes live.",
      "The family and qualifier identify a column within that row.",
      "A timestamp names a cell version; the application interprets its byte value."
    ],
    "sparse-cells-and-versions": [
      "Store present cells without allocating every missing cell.",
      "Add a qualifier to one row without filling that column in every row.",
      "Retain eligible timestamped versions; version storage is not free."
    ],
    "tablets-separate-placement-from-storage": [
      "Cut the sorted key space into contiguous tablet ranges.",
      "Assign each range to a serving tablet server.",
      "In the original Bigtable design, replicated storage holds the durable files.",
      "Move serving responsibility without assuming all durable bytes must move with it."
    ],
    "splitting-cannot-fix-a-moving-hotspot": [
      "Writes with distributed prefixes can reach several ranges.",
      "Increasing timestamps put new writes at the tail of the key space.",
      "Split the hot range and predict where the next increasing key lands.",
      "It still goes to the rightmost range. A smaller tablet does not change that write pattern."
    ],
    "the-log-protects-memory": [
      "Follow the write for k2 before it enters memory.",
      "Record the recovery information in the log.",
      "For a durable write, sync the required log record before acknowledging success.",
      "The memtable holds the update; the durable log can restore it after RAM is lost."
    ],
    "the-memtable-stays-ordered": [
      "Entries arrive out of order: k8, k2, k5, k1, k7.",
      "Keep an ordered notebook: the memtable prepares a sorted flush.",
      "A later k2 record changes its newest visible value without editing an old file."
    ],
    "freeze-a-sorted-file": [
      "The active memtable reaches its size threshold.",
      "Freeze this notebook of entries so its contents stop changing.",
      "Seal the sorted batch into an immutable SSTable.",
      "Use a new active memtable for incoming writes while the old batch is flushed."
    ],
    "read-the-newest-visible-value": [
      "Read k from A: old at sequence 5.",
      "A visible record at sequence 8 in B overrides it.",
      "The visible deletion at sequence 9 makes the current result absent.",
      "Merge B and C, but keep DELETE@9 while A still contains old@5.",
      "Here all older versions are included and no active snapshot needs them, so these records can be removed."
    ],
    "merge-sorted-runs": [
      "Two sealed sorted batches can overlap in keys and versions.",
      "Advance their merge cursors in key order.",
      "This current-value view keeps k2:v2; real compaction also retains versions needed by active snapshots.",
      "Write one sorted output. Sequential merging still consumes read and write bandwidth."
    ],
    "deletion-must-hide-older-values": [
      "Return to the opening problem: the old file still holds k2 = v1.",
      "Write a newer tombstone instead of altering the immutable file.",
      "A current read honors the visible tombstone and returns absent.",
      "Drop the tombstone only when older values cannot reappear and required snapshots remain valid."
    ],
    "a-one-sided-membership-test": [
      "Begin with zero bits and predict an absent query.",
      "Insertion sets the selected bits for each key.",
      "Any required zero bit proves absence, so the file can be skipped.",
      "All required bits set means only possible presence, not a found record.",
      "Check the data to reject a false positive. The filter has ruled in work, not proved a match."
    ],
    "skip-files-then-find-a-block": [
      "Use a negative Bloom-filter result to rule out a file.",
      "For a possible match, use the sparse index to choose a candidate block.",
      "Search that block and resolve its visible record.",
      "Reuse a cached block when available; each layer avoids a different kind of work."
    ],
    "the-read-write-space-budget": [
      "A B+ tree modifies searchable pages as updates arrive.",
      "An LSM buffers entries and writes immutable sorted runs.",
      "Compaction pays read and write work to merge those runs.",
      "Choose from measured reads, writes, space, and durability needs, not the SQL or NoSQL label."
    ],
    "a-network-partition-forces-a-choice": [
      "Both replicas begin with v1.",
      "Replica 1 receives a completed v2 write; communication with replica 2 is cut.",
      "An isolated replica can wait rather than serve a value missing that completed write.",
      "Returning v1 stays responsive but is not linearizable in this example.",
      "After communication resumes, use the system’s conflict rules to reconcile."
    ],
    "trace-an-acknowledged-write": [
      "Return to k: sync its recovery log record before acknowledging a durable write.",
      "Buffer its ordered record, including a deletion when needed.",
      "Flush immutable sorted files and merge them without exposing obsolete records.",
      "Log, buffer, flush, resolve. The newest visible record determines the read result."
    ]
  },
  "15": {
    "the-path-is-the-answer": [
      "Maya’s drawing starts with people; ask which result the question needs.",
      "Directed relationships connect them. Two routes can end at the same person.",
      "A route to fay goes through cyd and eli. A path and a distinct endpoint are different results."
    ],
    "property-graph": [
      "Map intersections to nodes: each represents an entity.",
      "Map directed routes to typed edges such as Follows.",
      "Attach properties to the entity or relationship they describe; the diagram’s since is illustrative."
    ],
    "store-adjacency-at-write-time": [
      "A relational edge table names each source and destination.",
      "Resolve ada’s outgoing relationships to ben and cyd.",
      "Store neighbor references for later expansion, paying maintenance work when edges change."
    ],
    "one-hop": [
      "Start at ada and keep edge direction explicit.",
      "Follow its outgoing edges to ben and cyd.",
      "Return {ben, cyd}. Incoming neighbors would answer a different question."
    ],
    "two-hops-with-exclusions": [
      "Two-edge routes can return to ada or reach dee twice.",
      "Exclude the start if the question asks for other people.",
      "Exclude existing neighbors and deduplicate endpoints to obtain {dee, eli}."
    ],
    "breadth-first-reachability": [
      "For reachability, initialize ada as visited and in the frontier.",
      "Discover previously unvisited ben and cyd at distance 1.",
      "Discover dee and eli at distance 2.",
      "Discover fay at distance 3; already visited people do not re-enter the frontier."
    ],
    "paths-are-not-unique-vertices": [
      "At one hop, both methods reach ben and cyd. Predict the next endpoints.",
      "Four two-hop walks end at dee, ada, dee, and eli; dee is still one person.",
      "For reachability, keep only the new frontier and track visited people.",
      "Through depth 3: eleven walk rows versus eight BFS edge visits and five other people.",
      "Specify the required result: walks, distinct reachable people, or a shortest path. Their work can differ."
    ],
    "the-query-draws-a-shape": [
      "Draw the requested directed relationship before writing query syntax.",
      "The depth range bounds the path; exclusions and DISTINCT shape the final endpoints.",
      "SQL recursion can express traversal too. Match cycle and duplicate rules before timing either query."
    ],
    "find-the-shortest-path": [
      "Start a shortest-route search at ada.",
      "Explore candidates while retaining the predecessor information needed for a route.",
      "Reach fay under the search’s stopping rule.",
      "Reconstruct ada → cyd → eli → fay, a shortest route of three directed edges here."
    ],
    "a-supernode-is-skew-again": [
      "A small neighbor list is easy to locate and inspect.",
      "A hub has thirty illustrated neighbors. Direct adjacency does not remove their expansion work.",
      "Inspecting only eight reduces work but changes coverage; this is a hypothetical query budget."
    ],
    "choose-a-graph-workload": [
      "A fixed shallow relationship can fit a relational join plan.",
      "Variable-depth routes benefit from explicit path operators when their semantics fit.",
      "Whole-graph analytics is another workload; measure equivalent results and maintenance costs."
    ],
    "connections-augment-similarity": [
      "Return to RAG: retrieve nearby passages as starting evidence.",
      "Identify entities in those passages, such as WAL and buffers.",
      "Follow a justified relationship to find potentially connected evidence.",
      "Combine the evidence while keeping source identity; graph links can introduce noise too."
    ],
    "does-graph-expansion-help": [
      "Keep vector-only retrieval as the baseline for the same questions.",
      "Add relationship neighbors; predict a question helped and one harmed.",
      "Measure support, noise, and latency. These drawn checkmarks are hypothetical, not project results."
    ],
    "five-mechanisms-recur": [
      "Ask where bytes are stored and which reads a cache can reuse.",
      "Ask which maintained structure lets a query skip work.",
      "Ask how lost data is restored: lineage replays transformations; WAL supports transaction recovery.",
      "Ask which plan turns the requested result into operations.",
      "Ask who owns data and work, and where an uneven distribution can dominate."
    ],
    "read-a-new-system": [
      "Find the blocks and caches in the unfamiliar system.",
      "Identify the access paths and the updates needed to maintain them.",
      "Trace an acknowledged write through its failure and recovery rules.",
      "Read the execution dependencies for the question you care about.",
      "Inspect partition ownership and skew before choosing a workload-specific benchmark."
    ],
    "finish-with-measured-decisions": [
      "State the opening question and its required result.",
      "Show evidence from the same workload under the compared configurations.",
      "Explain the decision that follows from those results; the plotted points are schematic.",
      "Compare configurations on the same required result, explain the measurements, and show one diagnosed failure."
    ]
  }
};
