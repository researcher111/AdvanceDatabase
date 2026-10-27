/* Authored audience explanations: one sentence per animation state. */
window.CourseClarityCaptions = {
  "1": {
    "lecture-01-scene-01": [
      "Both runs return ada, cyd, and eli. Must the second run read their data from disk again?",
      "The first run reads the two table blocks from disk, then checks the six students’ GPAs.",
      "The second run checks the students again, using the two blocks kept in memory.",
      "This model counts block accesses. Measure the whole query to find its actual runtime."
    ],
    "lecture-01-scene-02": [
      "SQL starts as a sequence of characters.",
      "The lexer groups characters into tokens.",
      "Scan reads rows. Select keeps matches, and Project returns each matching name.",
      "The front end builds a plan, then the operators run it."
    ],
    "lecture-01-scene-03": [
      "The buffer frames are empty before the first scan.",
      "Read all of block 0 into a memory frame.",
      "ada and cyd pass the filter in block 0.",
      "Read block 1 and continue testing its rows.",
      "The engine reads two blocks, checks six rows, and returns three names."
    ],
    "lecture-01-scene-04": [
      "Predict the reads, rows examined, and rows returned on a second run.",
      "Both blocks are still in memory from the first run.",
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
      "A unique ID identifies a row even if the row moves to another location."
    ],
    "lecture-01-scene-07": [
      "The transfer must subtract from one account and add to the other.",
      "Atomicity makes the two changes complete or roll back together.",
      "Consistency preserves declared rules, such as a nonnegative balance.",
      "Isolation controls how overlapping transactions affect each other.",
      "Durability preserves an acknowledged commit after a restart."
    ],
    "lecture-01-scene-08": [
      "Both access paths must produce the same answer.",
      "The scan model visits all 500 table blocks.",
      "The example index path needs seven total block accesses.",
      "Both plans return the same answer, but read different numbers of blocks."
    ],
    "lecture-01-scene-09": [
      "The SQL front end interprets the statement.",
      "Operators request rows through next().",
      "The record layer reads field values from the bytes in a row.",
      "The buffer pool keeps copies of stored blocks in memory.",
      "The file manager translates block k into byte offset k × 4096."
    ],
    "lecture-01-scene-10": [
      "This example compares the time needed to access each kind of memory or storage.",
      "RAM is far faster than a storage access in this model.",
      "Bar lengths use a logarithmic scale, not a linear time scale.",
      "If 1 ns became 1 second, the modeled disk trip would take 116 days."
    ],
    "lecture-01-scene-11": [
      "Count storage accesses and assign the same modeled cost to each.",
      "In this model, 500 reads cost 12.5 ms. Seven reads cost 0.175 ms.",
      "A larger table increases scan work. Index work depends on tree height and the number of matches.",
      "CPU work and caching also contribute to actual query time."
    ],
    "lecture-01-scene-12": [
      "The layout assigns a byte offset to each field.",
      "The catalog saves each field’s name and byte offset.",
      "The engine knows the catalog’s layout, so it can read the saved schemas after a restart."
    ],
    "lecture-01-scene-13": [
      "The file manager reads a block using its filename and block number.",
      "The buffer pool keeps pages in memory. The record layer reads their fields.",
      "Operators scan, filter, and project rows. SQL describes the requested result.",
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
      "fsync() waits for synchronization. Protection from power loss also depends on the OS and device.",
      "A power failure can lose writes that remain only in volatile caches."
    ],
    "lecture-01-scene-16": [
      "Return to the same request: which layers connect SQL to stored blocks?",
      "Follow the SQL request through its plan to the rows, pages, and stored blocks it needs.",
      "Reusing pages avoids reading them from storage again. The query still scans and filters rows."
    ]
  },
  "2": {
    "lecture-02-scene-01": [
      "Request B7 three times. Where can a useful copy stay between requests?",
      "Without a saved copy, each request may need another storage read.",
      "Once B7 is in memory, later requests can read that copy."
    ],
    "lecture-02-scene-02": [
      "Compare when write() and fsync() finish in your Lab 1 measurements.",
      "write() can finish when the OS cache accepts the data.",
      "fsync() waits for file synchronization. Its durability guarantee depends on the storage system.",
      "Explain the timing difference by describing what each call waits for."
    ],
    "lecture-02-scene-03": [
      "A buffer pool contains reusable memory frames.",
      "Load page B7 into frame 0.",
      "Frame 0 stays in place, but it can hold a different page later."
    ],
    "lecture-02-scene-04": [
      "Three frames hold the first three blocks of an eight-block scan.",
      "Continuing the scan evicts earlier blocks.",
      "On the next pass, block 0 has already been evicted.",
      "Two cyclic passes yield zero hits with only three frames."
    ],
    "lecture-02-scene-05": [
      "Blocks 0 and 1 recur much more often than the other blocks.",
      "Frequent requests keep blocks 0 and 1 near the top of the LRU list.",
      "The other blocks share the third frame while blocks 0 and 1 stay in memory.",
      "This request sequence has 11 hits out of 16 accesses."
    ],
    "lecture-02-scene-06": [
      "One caller holds a pin on B7, so its frame cannot be replaced.",
      "A second caller raises the pin count to two.",
      "One caller unpins B7, but the other caller still needs it.",
      "At zero pins, the frame becomes eligible for replacement."
    ],
    "lecture-02-scene-07": [
      "The first requests load A, then B, then C and record when each was last used.",
      "A hit on A refreshes its timestamp from 1 to 4.",
      "B is now the least-recently used unpinned page.",
      "D replaces B and receives the newest timestamp."
    ],
    "lecture-02-scene-08": [
      "A stays in memory because a caller has pinned it.",
      "E replaces the oldest eligible page, C.",
      "B next replaces D, leaving pinned A untouched.",
      "If every frame is pinned, the lab raises BufferAbortError."
    ],
    "lecture-02-scene-09": [
      "Find which frame holds (students.tbl, 7).",
      "A linear search checks frames until it finds B7.",
      "A dictionary maps each BlockId to the frame holding that block.",
      "A larger pool takes longer to scan. A dictionary lookup takes constant time on average."
    ],
    "lecture-02-scene-10": [
      "B7 is clean before its field changes.",
      "Changing 39 to 40 marks the resident page dirty.",
      "Unpin says the caller has finished. The changed page still needs to be written.",
      "Flush B7’s updated contents before reusing its frame.",
      "After writing B7, load B8 into the same frame."
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
      "A scan ring reuses a few frames so the scan evicts fewer frequently used pages.",
      "An approximate LRU policy tracks usage less precisely but costs less to maintain."
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
      "Each block has already been evicted when it is needed again, so every request misses.",
      "With 50 frames, later passes can hit every block after warm-up."
    ],
    "lecture-02-scene-15": [
      "First check whether the requested page is already in memory.",
      "On a miss, choose an eligible replacement frame.",
      "Use the cached page or load it into a frame, then increase its pin count.",
      "Unpin the page when the caller finishes using it."
    ],
    "lecture-02-scene-16": [
      "Keep the same three frames while changing the access order.",
      "The cyclic scan misses every time. The two hot blocks get reused while still in memory.",
      "Pins keep pages available to their callers, even when the cache has few hits."
    ]
  },
  "3": {
    "lecture-03-scene-01": [
      "To read a student row, the engine needs to know where each field sits in the cached bytes.",
      "A layout identifies a row and the fields inside it.",
      "RID (0, 1) identifies block 0, slot 1. A different student can later occupy that slot."
    ],
    "lecture-03-scene-02": [
      "Packed rows sit directly beside one another.",
      "Save the byte offset where cyd currently begins.",
      "Growing ben shifts later packed rows to new offsets.",
      "cyd now starts at a different byte offset, so the saved address is wrong."
    ],
    "lecture-03-scene-03": [
      "Every slot reserves the same space for its fields.",
      "Inserting ben marks its slot in use.",
      "The space reserved for the name is large enough for benjamin.",
      "Reject a name whose encoded bytes do not fit in its field."
    ],
    "lecture-03-scene-04": [
      "The in-use flag and integer ID each occupy four bytes.",
      "The string stores a length prefix and reserves eight payload bytes.",
      "GPA begins at offset 20. The complete slot occupies 24 bytes.",
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
      "Check the name’s byte length before writing, so it cannot overwrite GPA."
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
      "A stored zero means the value is 0.",
      "An empty string is a value too.",
      "A missing value needs a distinct NULL marker.",
      "The bitmap identifies NULL separately from the field’s payload bytes."
    ],
    "lecture-03-scene-10": [
      "Small values can stay inline with the row.",
      "Compression can reduce a larger value’s stored size.",
      "When a value is stored elsewhere, the row holds a pointer to it.",
      "Follow that pointer to gather the value’s separate chunks."
    ],
    "lecture-03-scene-11": [
      "The heap row points to the separately stored essay.",
      "Reading only name can use the heap row without fetching essay chunks.",
      "Reading essay follows the pointer and gathers its chunks.",
      "The query needs the extra chunks only if it asks for the essay."
    ],
    "lecture-03-scene-12": [
      "RecordPage pins the block that contains the row.",
      "Layout supplies each field’s offset within a slot.",
      "Updating GPA changes its value from 39 to 40 in the page held in memory.",
      "Mark the page dirty, then release the pin when RecordPage closes."
    ],
    "lecture-03-scene-13": [
      "TableScan uses RecordPage to find slots marked 1 in the current block.",
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
      "Save the schema in the catalog.",
      "After restart, read those rows to reconstruct the layout.",
      "The engine already knows how to read the catalog’s own rows."
    ],
    "lecture-03-scene-16": [
      "Use the slot size and field offset to find the field’s bytes in the page.",
      "Read the occupied slots in the pinned block, then move to the next block.",
      "Recover the schema from the catalog to interpret the bytes after restart."
    ]
  },
  "4": {
    "lecture-04-scene-01": [
      "The operator tree is ready. What call starts work for one result row?",
      "The request travels from Project down to its input.",
      "A matching row returns to the caller through the Scan interface."
    ],
    "lecture-04-scene-02": [
      "Materializing a scan stores its intermediate rows.",
      "A Cartesian product can create far more rows than either input.",
      "A million rows on each side creates a trillion candidate pairs.",
      "Streaming handles pairs one at a time. A poor plan can still test too many pairs."
    ],
    "lecture-04-scene-03": [
      "This iterator plan starts reading rows when the caller asks for next().",
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
      "fay is the last row and fails the filter: six rows checked, three results returned."
    ],
    "lecture-04-scene-05": [
      "Every operator exposes the same Scan interface.",
      "before_first() resets the scan position. next() advances to an available row.",
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
      "Both input scans hold pins on the pages they are reading.",
      "Closing the root begins cleanup.",
      "Product forwards close() to both branches.",
      "Both child pins reach zero after cleanup."
    ],
    "lecture-04-scene-13": [
      "The first plan pairs all 300 students with all three majors.",
      "It forms 900 candidates before filtering.",
      "Local filters keep 60 students and one major before the product.",
      "The revised product forms only 60 candidate pairs.",
      "Both plans return 20 rows. The second plan tests 15 times fewer pairs."
    ],
    "lecture-04-scene-14": [
      "A filter can return a qualifying row before its input ends.",
      "A general sort must inspect all input before choosing the first output.",
      "Hash aggregation accumulates state for its groups.",
      "Ordered aggregation can finish a group when the key changes."
    ],
    "lecture-04-scene-15": [
      "mid is the student’s major ID. mid2 is the ID in the major row.",
      "ProductScan exposes both fields in one candidate pair.",
      "Select keeps the pair when the two ID values match.",
      "Project returns the requested student name and department."
    ],
    "lecture-04-scene-16": [
      "Connect the operators using their shared Scan interface.",
      "Follow each next() call down the tree and each matching row back up.",
      "Count the rows and pairs tested, then close the plan and all its input scans."
    ]
  },
  "5": {
    "lecture-05-scene-01": [
      "The parser reads the SQL statement before the engine reads any table rows.",
      "Save the requested fields, tables, and filter in QueryData.",
      "Build the scan objects that will run the query."
    ],
    "lecture-05-scene-02": [
      "The SELECT list becomes fields = [name].",
      "The FROM list becomes tables = [students].",
      "The WHERE expression becomes a predicate over GPA.",
      "QueryData describes which rows and fields the query asks for."
    ],
    "lecture-05-scene-03": [
      "The unquoted FROM and quoted 'from' have different roles.",
      "Unquoted FROM is a keyword introducing the table list.",
      "Quoted 'from' is a string value used in a comparison."
    ],
    "lecture-05-scene-04": [
      "The lexer distinguishes reserved keywords from identifiers.",
      "A number token contains a number. A string token contains text.",
      "Punctuation tokens identify operators and delimiters."
    ],
    "lecture-05-scene-05": [
      "The root represents the SELECT statement.",
      "The field and table nodes show which columns to read and which table holds them.",
      "The WHERE branch shows the comparison that each row must pass.",
      "Field(gpa) reads a row value. Number(35) supplies a literal."
    ],
    "lecture-05-scene-06": [
      "The grammar requires a SELECT list and a FROM list.",
      "Square brackets mark an optional WHERE clause.",
      "The field list can be a star or named fields.",
      "Braces mean you can add more fields, each preceded by a comma."
    ],
    "lecture-05-scene-07": [
      "The cursor marks the next unread token.",
      "peek() reads the token without moving the cursor.",
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
      "Both return 20 rows. Time both queries to compare their actual runtimes."
    ],
    "lecture-05-scene-13": [
      "The grammar expects the FROM keyword at this position.",
      "FORM is an identifier token and does not satisfy that rule.",
      "expect reports the mismatch without consuming the invalid token."
    ],
    "lecture-05-scene-14": [
      "The question mark marks where a separately supplied value belongs.",
      "Binding 42 returns ada without changing the statement text.",
      "Binding 43 uses the same statement and returns ben.",
      "A parameter containing SQL syntax is treated as a value, so it cannot add a condition."
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
      "The filter keeps sixty names, but both queries check 300 rows. Measure their runtimes separately."
    ]
  },
  "7": {
    "money-disappears": [
      "Before the transfer, the two accounts hold 60 + 90 = 150.",
      "Only the debit reaches storage, reducing the stored total to 100.",
      "The crash interrupts the transfer. What information must we have saved to undo the debit?"
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
      "The log record must reach storage before the changed page does."
    ],
    "a-complete-transfer": [
      "Start a transfer of 40 from A to B.",
      "Record A’s old value 100 before changing A to 60 in memory.",
      "Record B’s old value 50 before changing B to 90 in memory.",
      "With FORCE, save the changed pages before saving the COMMIT record."
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
      "Writing 60 again leaves the correct value in place, so recovery can safely repeat this step."
    ],
    "two-policy-decisions": [
      "Eviction policy and commit policy are independent choices.",
      "STEAL allows uncommitted pages onto disk, so recovery may need to undo their changes.",
      "NO-FORCE can leave committed changes in memory, so recovery may need to redo them."
    ],
    "four-recovery-duties": [
      "FORCE plus NO-STEAL needs neither update undo nor redo in this simplified model.",
      "FORCE plus STEAL requires undo for uncommitted page writes.",
      "NO-FORCE plus NO-STEAL requires redo for committed updates not yet flushed.",
      "NO-FORCE plus STEAL needs both undo and redo."
    ],
    "commit-boundary": [
      "What must reach storage before the database tells the client that commit succeeded?",
      "FORCE waits for changed pages to reach storage. NO-FORCE needs a saved log that can redo them.",
      "NO-FORCE permits the data-page flush to occur after the commit reply."
    ],
    "recovery-at-scale": [
      "Analysis finds which transactions finished and where recovery should begin.",
      "Redo uses the log to restore changes that are missing from stored pages.",
      "Undo reverses changes from transactions that did not finish."
    ],
    "place-the-crash": [
      "Before durable logging, the changed page must not have reached storage.",
      "A durable log provides repair information even if the data page was not flushed.",
      "If uncommitted data reached storage, undo restores its old value.",
      "A durable FORCE commit means the transaction’s changes must be kept."
    ],
    "from-promise-to-code": [
      "Return to the write order: make recovery information durable first.",
      "The changed page can reach storage once its log record is safely stored.",
      "Keep committed changes. Undo unfinished ones and save the repaired pages before marking recovery complete."
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
      "A serializable schedule has the same effect as some order of running transactions one at a time."
    ],
    "anomaly-gallery": [
      "A dirty read observes a value that its writer later rolls back.",
      "A non-repeatable read sees a committed change to the same row.",
      "A phantom changes the rows satisfying a repeated predicate."
    ],
    "shared-and-exclusive": [
      "Compatible shared locks let multiple readers access the row.",
      "An exclusive lock cannot be granted while another transaction holds a shared or exclusive lock."
    ],
    "replay-with-locks": [
      "Both transactions obtain shared locks and read 100.",
      "T1 requests an exclusive lock while T2 still holds a shared lock.",
      "The lab refuses that conflicting upgrade with LockAbortError."
    ],
    "two-phases": [
      "The growing phase acquires locks without releasing them.",
      "After releasing a lock, basic two-phase locking acquires no new locks.",
      "Keeping the locks until the transaction finishes prevents others from using unfinished changes."
    ],
    "deadlock": [
      "T1 holds A while T2 holds B.",
      "Each waits for the resource held by the other, forming a cycle.",
      "Abort one transaction and release its locks so the other can continue."
    ],
    "protect-the-empty-space": [
      "Locking existing rows protects those rows only.",
      "A new value can enter the unlocked gap and change a range result.",
      "A range or predicate lock must also block inserts that would change the query’s result."
    ],
    "isolation-ladder": [
      "The standard minimum guarantees allow dirty reads at Read Uncommitted.",
      "Read Committed rules out reading uncommitted changes.",
      "Repeatable Read protects repeated row reads. Phantom behavior depends on the implementation.",
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
      "Read Committed gets a new snapshot. Repeatable Read keeps its earlier snapshot.",
      "A new transaction can see 120 after the old reader finishes."
    ],
    "the-version-bill": [
      "An active reader still needs an old version.",
      "Cleanup must retain versions required by valid snapshots.",
      "After the reader finishes, cleanup can remove versions that no remaining snapshot needs."
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
      "Both deposits read 100 and write 110, losing one deposit.",
      "Lock conflict handling prevents that invalid schedule from completing.",
      "A snapshot determines which versions a reader sees. Snapshot isolation can still allow write skew."
    ]
  },
  "9": {
    "same-answer-different-work": [
      "Both plans find students above the GPA cutoff in the selected department. Keep duplicates.",
      "Filter each input first so the join has fewer student-major pairs to test.",
      "Both return twenty rows, from 900 versus sixty candidates. Compare timing separately."
    ],
    "optimizer": [
      "Stored statistics summarize relation sizes and value distributions.",
      "The optimizer estimates costs for valid candidate plans.",
      "It chooses a plan using estimated costs, without running every alternative."
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
      "Some values can occur far more often than others.",
      "Multiplying selectivities can give a poor estimate when the fields are correlated."
    ],
    "price-the-work": [
      "Model 100,000 rows, 1,000 heap pages, and an index of height 3.",
      "At 0.1% selectivity, 100 rows match.",
      "The model predicts 103 block accesses for the index and 1,000 for the scan.",
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
      "Joining two tables without a condition first creates 9,000 pairs for the final join to test."
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
      "Explain how the file manager reads a block and saves changes to it.",
      "Explain how filtering before a join reduces the pairs tested while keeping the same result.",
      "Explain which failure a transaction rule prevents and how the rule prevents it."
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
      "Repeated values can take less space when stored as a value and a count.",
      "Encode twelve repetitions as a value and a count.",
      "Decoding reconstructs the original values exactly."
    ],
    "runs": [
      "These 24 values form three runs, each with eight copies of the same value.",
      "Store (1, 8), (2, 8), and (3, 8) as value-count pairs.",
      "This teaching byte model reduces the payload from 96 to 24 bytes."
    ],
    "dictionary-and-deltas": [
      "Repeated strings can share a small dictionary.",
      "Codes 0 and 1 stand for card and cash.",
      "Store the first number, then each change from the previous number."
    ],
    "batches-through-the-pipeline": [
      "Microdb already has a pipeline: find a row, test it, and expose the requested fields.",
      "The first call finds fare 36. It passes the filter, so the caller reads 36.",
      "The next call skips fare 24 and finds fare 30. The caller reads the second match.",
      "Now imagine passing three rows at once, using the same operators and condition.",
      "Test all three fares in the batch. Keep 36 and 30. Reject 24.",
      "Both plans give fares 36 and 30. The batch version shares call overhead across rows."
    ],
    "skip-a-row-group": [
      "For x = 10, inspect each row group’s minimum and maximum.",
      "Ranges [1, 3] and [4, 7] prove those groups cannot match.",
      "Open [8, 12]. Test its rows. The bounds alone do not prove a match."
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
      "Partition pruning skips files that cannot contain matching rows."
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
      "The result is still $30. Parquet stores the values. DuckDB calculates the average."
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
      "Maya’s model performs well on training data but poorly on new data. She searches her course notes for an explanation.",
      "Search for the whole question as an exact phrase. This passage does not contain that phrase, so this search misses it.",
      "Vector search compares numeric representations of text. It can find passages with different wording. Read each result to check the answer."
    ],
    "embedding": [
      "The embedding model converts the passage into a vector.",
      "These four coordinates illustrate a vector. They are not output from an embedding model.",
      "Use compatible models, versions, dimensions, and preprocessing for the question and the stored passages."
    ],
    "direction-and-normalization": [
      "A vector has a direction and a length. Which direction is closer to the query vector q?",
      "Turning v toward q increases cosine similarity. Changing only the length of v does not change cosine similarity.",
      "Normalize both vectors to length one. Their dot product then equals cosine similarity."
    ],
    "the-exact-baseline": [
      "First, score every stored vector. Save the top ten IDs so you can later identify neighbors that approximate search misses.",
      "The loop has scored 24 vectors. It keeps the ten highest scores among those vectors.",
      "The loop has scored 48 vectors. A remaining vector could still replace one of the current top ten.",
      "The loop has scored all 72 vectors. The saved top ten IDs are the exact result for this query and metric."
    ],
    "price-the-baseline": [
      "One query scores 4,000 vectors with 64 coordinates each. This requires 256,000 coordinate multiplications.",
      "With one million vectors and 1,536 coordinates each, one query requires 1.536 billion coordinate multiplications.",
      "Ten million vectors at 100 queries/s require 1.536 trillion coordinate multiplications/s. This count does not measure elapsed time."
    ],
    "skipping-with-a-contract": [
      "Approximate nearest neighbor (ANN) search scores selected candidates. A skipped region can contain a nearer vector.",
      "Searching another region adds candidates. Each added vector receives a score from the same similarity metric.",
      "Searching fewer candidates can miss exact neighbors. Compare the returned IDs with the saved exact result."
    ],
    "build-an-ivf-index": [
      "An inverted file (IVF) index groups vectors into lists. Choose an initial center, called a centroid, for each group.",
      "Assign each stored vector to its nearest centroid. The stored vectors stay in place.",
      "Move each centroid to the average of its assigned vectors. Assign each vector to its nearest updated centroid.",
      "Repeat until assignments stop changing or the iteration limit is reached. Save each group as a list for later searches."
    ],
    "probe-the-lists": [
      "The index already assigned four vectors to two lists. Predict which list a search of query q will choose.",
      "Centroid c0 scores higher than c1. One probe means searching one list. Which vectors can the search examine?",
      "The search scores only v0 from list c0. It has compared two centroids and one stored vector.",
      "Exact search also returns v1, with score 0.96. The selected list omitted v1. Recall@2 is 1/2.",
      "Searching both lists returns v1 and v0. It takes six comparisons, including the centroids. Exact search takes four."
    ],
    "count-the-saved-work": [
      "Now estimate work for 4,000 vectors. Exact search compares the query with all 4,000 vectors.",
      "IVF compares the query with C = 20 centroids to choose which lists to search.",
      "P = 4 means four searched lists. Assume 200 vectors per list. The search scores 4 × 200 = 800 candidates.",
      "The balanced-list estimate is 20 + 800 = 820 comparisons. Unequal list sizes change the candidate count."
    ],
    "navigate-a-graph": [
      "HNSW starts at a node in its highest layer.",
      "The search follows a link to a node closer to the query.",
      "A long link moves the search to another region.",
      "The search continues at the same vector in the next lower layer.",
      "The search examines linked vectors in the lower layer.",
      "Increase ef_search to examine more candidates. Measure recall and search work again."
    ],
    "measure-a-miss": [
      "These are two results for the same query. Which IDs appear in both the exact and approximate result?",
      "Seven IDs appear in both rows. Approximate search missed exact IDs 4, 7, and 10. It returned three other IDs instead.",
      "Recall@10 is 7/10 = 70%. This measures agreement with exact search. It does not measure whether the passages answer the question."
    ],
    "choose-an-operating-point": [
      "These Lab 9 measurements show mean recall and comparison counts. They are separate from the balanced-list estimate.",
      "Require mean recall of at least 0.90. Which measured settings meet this requirement?",
      "Also require at most 1,000 mean comparisons. P = 4 meets both limits: recall 0.9175 and mean count 924, rounded down."
    ],
    "memory-and-update-budgets": [
      "Fewer comparisons do not settle the choice. IVF also stores vectors, centroids, and lists. Measure their memory use.",
      "HNSW stores neighbor links as well as vectors. Measure link memory and graph construction time.",
      "Compression stores smaller vector representations. It can change rankings. Measure recall again after compression."
    ],
    "where-the-index-lives": [
      "Passage 42 contains text version 1. Index entry 42 stores the vector created from that text.",
      "Maya changes passage 42 to version 2. Search still uses a vector created from the old text.",
      "Send the changed text through the compatible embedding model. Replace the old vector in index entry 42."
    ],
    "diagnose-the-index": [
      "First compare result IDs. Did approximate search miss neighbors that exact search found?",
      "Search more candidates. Compare the IDs again to see whether the missed exact neighbors return.",
      "Now read the passages. If exact results also fail to answer, inspect the passages, embeddings, metadata, and ranking."
    ],
    "rebuild-the-retrieval-contract": [
      "Return to Maya’s question about poor predictions on new data. Save the exact result IDs as the reference for this query and metric.",
      "Choose the IVF probe count or HNSW search setting. Measure how much work the search performs.",
      "Compare approximate IDs with exact IDs. Measure recall across representative questions.",
      "Read the returned passages. Even recall 1.0 does not prove that the passages explain the poor predictions."
    ]
  },
  "12": {
    "evidence-reaches-the-answer": [
      "Maya found a passage about overfitting. What must she send to the language model so it can use this evidence?",
      "Send the question, the passage, and its source ID to the language model. The prompt keeps the text and reference together.",
      "The answer names overfitting as one possible explanation. Check the cited passage before accepting the claim."
    ],
    "retrieval-augmented-generation": [
      "Keep each chunk as a retrievable record with its source identity.",
      "Use compatible embedding settings to turn each chunk into a vector.",
      "Build the index when you load the documents, before anyone asks a question.",
      "For each question, select a ranked set of candidate passages.",
      "Assemble their text and source IDs, then check the generated answer against that evidence."
    ],
    "three-places-for-knowledge": [
      "Trained weights can contain knowledge, but do not expose the current source pages.",
      "Sending every page with every question uses more context space and processing time.",
      "Retrieval selects source passages. The generator must use those passages correctly, as in an open-book answer."
    ],
    "design-the-retrieval-record": [
      "Inspect the source’s topics before deciding where one record ends.",
      "Keep a claim with the context needed to interpret it.",
      "A tiny fragment can return “it does this” while omitting what “it” means.",
      "Overlapping chunks keep some surrounding text, but repeat it in the index and prompt."
    ],
    "keep-the-source-identity": [
      "The first search result contains position 2, not a source ID. Predict which stored chunk it selects.",
      "Resolve position 2 to its stored chunk. Its source ID is wal, which identifies the write-ahead logging document.",
      "Attach score 0.9 to a copy. Keep the stored record unchanged for the next question.",
      "Carry the ranked chunks’ source IDs into the prompt, including repeated IDs.",
      "Hit@3 = 1 if a relevant source appears in the first three results. Otherwise, Hit@3 = 0."
    ],
    "a-synonym-failure": [
      "The first wording retrieves the intended buffer-pool source.",
      "Maya asks the same question in different words and gets different passages.",
      "Exact search already scored every chunk. More probes would not change those scores."
    ],
    "build-an-evaluation-set": [
      "Write questions that a corpus user would ask. The project requires at least 25 questions.",
      "Label the sources needed to answer each question independently of the current ranking.",
      "Keep comparison questions fixed and hold partner questions out of tuning."
    ],
    "presence-in-the-top-results": [
      "Three toy questions use a top-three cutoff. Reveal their relevant sources before scoring.",
      "A hit means at least one relevant source appears in the first three results. Which questions meet that condition?",
      "Score each question once: 1, 1, 0. Repeated chunks from one source do not create extra hits.",
      "Two of three questions have a hit, so the hit rate@3 is 2 / 3. Moving rank 3 to rank 1 keeps that rate unchanged."
    ],
    "rank-changes-the-score": [
      "Use the same three questions and top-three cutoff to measure how early the evidence returns.",
      "The marked sources are at ranks 1 and 3. Predict their reciprocal-rank scores.",
      "Ranks 1 and 3 contribute 1 and 1/3. The miss contributes 0.",
      "MRR@3 = (1 + 1/3 + 0) / 3 ≈ 0.44. Compare ranks as well as presence."
    ],
    "measure-chunking-instead-of-guessing": [
      "On the course fixture, ten-word chunks give hit@3 = 0.75 and MRR@3 = 0.67.",
      "Sixty-word chunks give 0.92 and 0.78 on the same questions.",
      "Ninety-word chunks tie those scores here. The fixture does not establish a universal chunk size."
    ],
    "context-has-a-budget": [
      "Retrieve candidate passages before choosing which ones to put in the prompt.",
      "Keep useful passages within the context budget. Extra text can add irrelevant information and cost.",
      "Keep source IDs beside the chosen text so the final claims can be checked."
    ],
    "two-retrieval-paths": [
      "The question contains E104, an exact identifier worth preserving.",
      "Keyword and vector search can contribute different candidates for the same question.",
      "Merge and deduplicate candidates without assuming unrelated raw scores share a scale.",
      "Rerank the merged set, then measure whether the extra stage fixes the observed failure."
    ],
    "filters-change-the-candidate-set": [
      "Some sources are available only to certain users.",
      "Search only the sources this user is allowed to read.",
      "Find the top-k results within the allowed set. An unrestricted ranking does not check authorization."
    ],
    "a-changed-source-invalidates-copies": [
      "D7’s source text, chunks, and vectors all start at version 1.",
      "Changing D7’s source text alone leaves its old chunks and vectors in the index.",
      "Create new chunks and vectors from the updated text before using them in search.",
      "Switch the source and index to the new version together. A new embedding model also needs new vectors."
    ],
    "failure-diagnosis-workshop": [
      "Missing evidence: inspect the corpus and retrieved source IDs first.",
      "Evidence at rank 3: inspect ranking, then measure a proposed change.",
      "Unsupported claim: open the actual context and citation. An existing source ID is not proof."
    ],
    "a-measurable-rag-system": [
      "Return to Maya’s question about poor predictions on new data. Record the passage’s source ID and version.",
      "Select the evidence and keep its ranking visible.",
      "Check whether the expected sources appear and how high they rank.",
      "Select passages, keep their source IDs, and check each answer claim against the cited text."
    ]
  },
  "13": {
    "one-job-many-machines": [
      "The count is the same task at a larger scale: 10 TB / 2 GB/s = 5,000 seconds for one ideal scan.",
      "With 100 independent readers, each receives 100 GB under this capacity estimate.",
      "The ideal read time is 50 seconds, excluding overhead. A failed worker also needs recovery."
    ],
    "partitioning": [
      "Treat a key like a destination address: it determines the responsible worker.",
      "Use the same routing rule for every record.",
      "For a lookup, apply the routing rule to its key to find the worker that holds it."
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
      "One worker owns the d–f range here. Unequal key frequencies can give workers different amounts of work."
    ],
    "skew-creates-idle-time": [
      "With equal-cost rows and no hot key, each worker receives 1,000 of the 8,000 rows.",
      "At 40%, the busiest worker gets 3,800 rows. The other workers get 600 rows each.",
      "At 80%, one worker gets 6,600 rows. More workers do not divide that same-key group."
    ],
    "salt-and-combine": [
      "Every record with key A goes to the same worker.",
      "Split it into four salted keys only if the operation supports correct partial results.",
      "Count each salted group separately.",
      "Combine 25 + 25 + 25 + 25 to recover A = 100. Placement changes. The answer stays the same."
    ],
    "map-is-local-computation": [
      "Read the four occurrences in “the log the tree.”",
      "Normalize and tokenize without removing repeated words.",
      "Emit four (word, 1) pairs. Both occurrences of “the” must survive."
    ],
    "shuffle-manufactures-locality": [
      "The same word can appear in records processed by different mappers.",
      "Like sorting mail by destination, send pairs with the same word to the same worker.",
      "Group each key’s values at its assigned worker before reduction. Moving records requires work."
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
      "An action starts computation. collect returns the small result to the driver."
    ],
    "stages-follow-dependencies": [
      "Operations on one partition can run together without moving data between workers.",
      "Grouping can require a shuffle across workers.",
      "The shuffle divides this word-count plan into stages.",
      "Schedule tasks within each stage. The number of stages can differ from the number of API calls."
    ],
    "lineage-rebuilds-lost-partitions": [
      "Keep the transformations and available inputs needed to reconstruct a partition.",
      "A worker loss can remove its cached output.",
      "Trace the missing output back to the required available inputs.",
      "Replay the required transformations on another worker. Lineage describes recomputation, not transaction recovery."
    ],
    "launch-before-waiting": [
      "Waiting for each call before starting the next makes the calls run one at a time.",
      "Submit the independent calls before waiting for their results.",
      "The tasks can now run concurrently. Resources and overhead determine actual speedup.",
      "Actors keep explicit state across calls. Treat state reuse separately from the timing result."
    ],
    "choose-the-execution-shape": [
      "Use a relational plan when the job joins tables and calculates totals for groups.",
      "Use tasks for independent Python calls. Consider actors when state must persist across calls.",
      "If one machine meets the workload target, a cluster can add coordination and movement costs."
    ],
    "place-move-recover": [
      "Return to the count: choose owners using the key, not the sending worker.",
      "Move matching keys together or combine valid partial results.",
      "Run each step when its inputs are ready, and run independent steps at the same time.",
      "Plan retries with retained inputs and task information. Preserve the same word totals."
    ]
  },
  "14": {
    "organize-writes-differently": [
      "Maya opens SSTable A: k = old at sequence 5. The file is immutable.",
      "A newer record in B has k = new at sequence 8. The old bytes still exist.",
      "DELETE at sequence 9 makes a current read return absent. Keep its tombstone while old values could reappear."
    ],
    "a-multidimensional-map": [
      "Choose the row key before deciding where to store the row.",
      "The family and qualifier identify a column within that row.",
      "A timestamp identifies a cell version. The application interprets the cell’s bytes."
    ],
    "sparse-cells-and-versions": [
      "Store present cells without allocating every missing cell.",
      "Add a qualifier to one row without filling that column in every row.",
      "Keep the versions required by the retention policy. Each version uses storage."
    ],
    "tablets-separate-placement-from-storage": [
      "Cut the sorted key space into contiguous tablet ranges.",
      "Assign each range to a serving tablet server.",
      "In the original Bigtable design, replicated storage holds the durable files.",
      "Another server can take over a tablet while its files stay in shared storage."
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
      "The memtable holds the update. The durable log can restore it after RAM is lost."
    ],
    "the-memtable-stays-ordered": [
      "Entries arrive out of order: k8, k2, k5, k1, k7.",
      "Like an ordered notebook, the memtable keeps entries sorted for writing to a file.",
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
      "This current-value view keeps k2:v2. Real compaction also retains versions that active snapshots need.",
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
      "If every required bit is 1, the key might be present. Search the file to find out.",
      "A false positive sends us to a file that does not contain the key."
    ],
    "skip-files-then-find-a-block": [
      "Use a negative Bloom-filter result to rule out a file.",
      "For a possible match, use the sparse index to choose a candidate block.",
      "Search that block and resolve its visible record.",
      "Reuse a cached block when available. Each layer avoids a different kind of work."
    ],
    "the-read-write-space-budget": [
      "A B+ tree modifies searchable pages as updates arrive.",
      "An LSM buffers entries and writes immutable sorted runs.",
      "Compaction reads the sorted runs and writes their merged output.",
      "Choose from measured reads, writes, space, and durability needs, not the SQL or NoSQL label."
    ],
    "a-network-partition-forces-a-choice": [
      "Both replicas begin with v1.",
      "Replica 1 receives a completed v2 write. Communication with replica 2 is interrupted.",
      "An isolated replica can wait rather than serve a value missing that completed write.",
      "Returning v1 stays responsive but is not linearizable in this example.",
      "After communication resumes, use the system’s conflict rules to reconcile."
    ],
    "trace-an-acknowledged-write": [
      "Return to k: sync its recovery log record before acknowledging a durable write.",
      "Buffer its ordered record, including a deletion when needed.",
      "Flush immutable sorted files and merge them without exposing obsolete records.",
      "A read checks the memtable and stored files to find the newest visible record."
    ]
  },
  "15": {
    "the-path-is-the-answer": [
      "Maya’s drawing starts with people. Ask which result the question needs.",
      "Directed relationships connect them. Two routes can end at the same person.",
      "A route to fay goes through cyd and eli. A path and a distinct endpoint are different results."
    ],
    "property-graph": [
      "Map intersections to nodes: each represents an entity.",
      "Map directed routes to typed edges such as Follows.",
      "Attach properties to the entity or relationship they describe. The diagram’s since value is a teaching example."
    ],
    "store-adjacency-at-write-time": [
      "A relational edge table names each source and destination.",
      "Resolve ada’s outgoing relationships to ben and cyd.",
      "Store references to neighbors so queries can follow them. Update those references when edges change."
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
      "Discover fay at distance 3. Previously visited people do not enter the frontier again."
    ],
    "paths-are-not-unique-vertices": [
      "At one hop, both methods reach ben and cyd. Predict the next endpoints.",
      "Four two-hop walks end at dee, ada, dee, and eli. dee is still one person.",
      "For reachability, keep only the new frontier and track visited people.",
      "Through depth 3: eleven walk rows versus eight BFS edge visits and five other people.",
      "Specify the required result: walks, distinct reachable people, or a shortest path. Their work can differ."
    ],
    "the-query-draws-a-shape": [
      "Draw the requested directed relationship before writing query syntax.",
      "The depth range limits path length. Exclusions and DISTINCT determine the final endpoints.",
      "SQL recursion can express traversal too. Match cycle and duplicate rules before timing either query."
    ],
    "find-the-shortest-path": [
      "Start a shortest-route search at ada.",
      "As the search visits each person, remember who led to them so we can rebuild the route.",
      "Reach fay under the search’s stopping rule.",
      "Reconstruct ada → cyd → eli → fay, a shortest route of three directed edges here."
    ],
    "a-supernode-is-skew-again": [
      "A small neighbor list is easy to locate and inspect.",
      "Expanding all thirty neighbors still takes work, even with stored links.",
      "Inspecting only eight reduces work but changes coverage. This query budget is hypothetical."
    ],
    "choose-a-graph-workload": [
      "A fixed shallow relationship can fit a relational join plan.",
      "Path operators can follow a variable number of edges when the query needs those routes.",
      "Whole-graph analytics is another workload. Compare equivalent results and maintenance costs."
    ],
    "connections-augment-similarity": [
      "Return to RAG: retrieve nearby passages as starting evidence.",
      "Identify entities in those passages, such as WAL and buffers.",
      "Follow a justified relationship to find potentially connected evidence.",
      "Keep the source ID with each added passage. Some linked passages may be irrelevant."
    ],
    "does-graph-expansion-help": [
      "Keep vector-only retrieval as the baseline for the same questions.",
      "Add relationship neighbors. Predict one question that benefits and one question that becomes harder to answer.",
      "Measure support, noise, and latency. These drawn checkmarks are hypothetical, not project results."
    ],
    "five-mechanisms-recur": [
      "Ask where bytes are stored and which reads a cache can reuse.",
      "Ask which maintained structure lets a query skip work.",
      "Ask how the system restores lost data. Lineage replays transformations. WAL supports transaction recovery.",
      "Ask which plan turns the requested result into operations.",
      "Ask which worker holds each partition and whether one worker has most of the work."
    ],
    "read-a-new-system": [
      "Find the blocks and caches in the unfamiliar system.",
      "Identify the access paths and the updates needed to maintain them.",
      "Trace an acknowledged write through its failure and recovery rules.",
      "Follow the query’s steps and identify which inputs each step needs.",
      "Check how data is divided among workers before choosing a benchmark for your workload."
    ],
    "finish-with-measured-decisions": [
      "State the opening question and its required result.",
      "Show evidence from the same workload under the compared configurations.",
      "Explain the decision that follows from those results. The plotted points illustrate the comparison.",
      "Compare configurations on the same required result, explain the measurements, and show one diagnosed failure."
    ]
  }
};
