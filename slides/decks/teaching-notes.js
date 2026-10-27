/* Instructor cues for the visual decks. Keys are stable scene IDs.
 * Full original explanations remain available as expandable teaching context.
 * Lecture 5 and worked traces supply their own structured teaching data. */
(function () {
  'use strict';
  const notes = {
  "1": {
    "lecture-01-scene-01": {
      "idea": "The same query can do less storage work when its pages are already in memory.",
      "question": "What could make the second run faster if the SQL and answer stay the same?",
      "answer": "The buffer pool can reuse pages from the first run, avoiding storage reads.",
      "builds": [
        "Show the identical query and answer. Give students thirty seconds to predict what might change.",
        "Follow the first path to disk: read the two table blocks into memory, then check each student's GPA.",
        "Follow the second path to memory: both blocks are still available, and the engine checks the students' GPAs again.",
        "Compare the two block-access costs. These are model calculations, not whole-query benchmarks."
      ]
    },
    "lecture-01-scene-02": {
      "idea": "SQL becomes a plan that operators can execute.",
      "question": "Which part still needs to understand the spelling of the SQL statement?",
      "answer": "The front end reads SQL. The operators execute the resulting plan.",
      "builds": [
        "Read the SQL as a sequence of characters.",
        "Group characters into tokens. Distinguish token recognition from parsing the grammar.",
        "Follow Project, Select, and Scan in the executable tree.",
        "Identify when tokens, QueryData, and scan operators are created, then when next() begins reading rows."
      ]
    },
    "lecture-01-scene-03": {
      "idea": "A query returns rows but fetches storage in whole blocks.",
      "question": "How much work produced these three result rows?",
      "answer": "The engine examined six rows and read two blocks to return three rows.",
      "builds": [
        "Point to the empty frames. Predict which block the scan needs first.",
        "Follow block 0 into memory. A whole block moves, not one row.",
        "Ask which rows in block 0 pass the filter.",
        "Load block 1 and continue the same filter.",
        "Count six examined rows, three results, and two storage reads."
      ]
    },
    "lecture-01-scene-04": {
      "idea": "A warm page cache saves reads while the query still scans and filters.",
      "question": "What are the second run's disk reads, rows examined, and rows returned?",
      "answer": "Zero disk reads, six rows examined, and three rows returned.",
      "builds": [
        "Have pairs predict all three counters before advancing.",
        "Show that both blocks remain in the buffer pool.",
        "Run the filter again. Ask why the engine still examines the rows.",
        "Reveal 0, 6, and 3, then compare with the predictions."
      ]
    },
    "lecture-01-scene-05": {
      "idea": "A schema describes the fields and rules for every valid row.",
      "question": "Does a column type describe only today's rows?",
      "answer": "No. It also constrains future writes to the table.",
      "builds": [
        "Use the student rows to introduce a relation.",
        "Name each field and type. Explain that microdb stores GPA 3.9 as 39.",
        "Try a proposed future row against the schema's rules."
      ]
    },
    "lecture-01-scene-06": {
      "idea": "A key must uniquely identify every valid row, including future rows.",
      "question": "Does uniqueness in this small sample prove that a field is a key?",
      "answer": "No. A key must satisfy the rule for all valid data, with uniqueness enforced.",
      "builds": [
        "Invite students to nominate a key from the visible data.",
        "Reveal a repeated name and reconsider name as a key.",
        "Reveal a repeated name and GPA pair. Reconsider the combined key.",
        "Discuss a stable identifier and the constraint that enforces its uniqueness."
      ]
    },
    "lecture-01-scene-07": {
      "idea": "A transaction can make both sides of a transfer succeed or fail together.",
      "question": "What happens if a naive transfer crashes between debit and credit?",
      "answer": "One balance may change without the other. Atomicity requires the transfer to complete or roll back together.",
      "builds": [
        "Introduce the transfer and identify the total balance to preserve.",
        "Pause between debit and credit. Explain the all-or-nothing requirement.",
        "Connect consistency to the declared balance rules.",
        "Explain why overlapping transfers need a chosen isolation guarantee.",
        "Ask what must remain true after an acknowledged transfer and a restart."
      ]
    },
    "lecture-01-scene-08": {
      "idea": "SQL specifies the result while the planner chooses how to find it.",
      "question": "Why might the planner choose an index rather than a full scan?",
      "answer": "For a selective lookup, the example index path needs fewer storage reads. A scan can be faster for broad queries.",
      "builds": [
        "Establish that both paths must produce the same result.",
        "Count the scan's 500 modeled block reads.",
        "Count the seven index-path reads assumed in this example.",
        "Compare the result and the roughly 71-fold difference in modeled storage trips."
      ]
    },
    "lecture-01-scene-09": {
      "idea": "The engine turns SQL into requests for rows, pages, and file blocks.",
      "question": "Which layers understand field names, and which work with pages or offsets?",
      "answer": "The operator and record layers interpret rows and fields. The buffer and file layers handle pages and blocks.",
      "builds": [
        "Follow SQL into an executable plan at the front end.",
        "Show operators requesting and processing rows.",
        "Explain how the record layer maps fields to bytes.",
        "Follow a page request into the buffer pool.",
        "Show the file manager reading the requested file block into memory."
      ]
    },
    "lecture-01-scene-10": {
      "idea": "A logarithmic scale makes large differences in access latency visible.",
      "question": "Do equally spaced positions on this axis mean equal extra nanoseconds?",
      "answer": "No. Each equal interval represents a multiplicative change, here a factor of ten.",
      "builds": [
        "Read the scale before comparing any bars.",
        "Locate the representative memory access cost.",
        "Locate storage and count the orders of magnitude separating it from memory.",
        "Use the human-scale comparison to explain why avoiding a storage trip matters."
      ]
    },
    "lecture-01-scene-11": {
      "idea": "Counting block accesses gives a useful first cost model with clear limits.",
      "question": "Can we always ignore CPU work when predicting query time?",
      "answer": "No. Cached data, expensive expressions, and large scans can make CPU work significant.",
      "builds": [
        "Count block accesses, then multiply by the assumed time per access.",
        "Give students a minute to compute 12.5 ms and 0.175 ms.",
        "Increase the table size and discuss how the paths scale.",
        "Compare 50 µs for two storage reads with 0.2 µs for two memory accesses. These totals omit other query work."
      ]
    },
    "lecture-01-scene-12": {
      "idea": "The catalog stores schema metadata so the engine can interpret tables after restart.",
      "question": "How can the engine read its catalog before it knows any schemas?",
      "answer": "It starts with a small set of known catalog layouts, then reads the remaining metadata.",
      "builds": [
        "Show the layout needed to interpret a record.",
        "Store the layout description as catalog rows.",
        "Explain the bootstrap layouts that let the engine read those rows."
      ]
    },
    "lecture-01-scene-13": {
      "idea": "The labs build the engine upward through stable interfaces.",
      "question": "Which lab supplies files, and which first lets a typed SQL query run?",
      "answer": "Lab 1 supplies the file manager. Lab 5 adds the SQL front end.",
      "builds": [
        "Connect block transfers to the file-manager lab.",
        "Add the buffer pool, records, and catalog above files.",
        "Connect scans and the SQL front end to query execution.",
        "Place the B+ tree and recovery work in the completed engine."
      ]
    },
    "lecture-01-scene-14": {
      "idea": "An address locates bytes, and an encoding determines how to interpret them.",
      "question": "Can the same four bytes represent different integers?",
      "answer": "Yes. Changing the byte order changes their interpretation. microdb uses signed little-endian 32-bit integers.",
      "builds": [
        "Distinguish a block number from a byte offset within the block.",
        "Locate the four bytes that encode the integer.",
        "Identify the least-significant byte in little-endian order.",
        "Reverse the interpretation and compare the resulting value."
      ]
    },
    "lecture-01-scene-15": {
      "idea": "A buffered write can return before its bytes reach durable storage.",
      "question": "What does the sync/no-sync comparison measure?",
      "answer": "It compares writes that return after buffering with writes that also wait for fsync.",
      "builds": [
        "Show the bytes in the OS cache when write() returns.",
        "Call fsync() to wait for the file-sync request to complete.",
        "Explain that fsync can report failure and depends on the storage stack.",
        "Distinguish a process crash from power loss before previewing recovery."
      ]
    },
    "lecture-01-scene-16": {
      "idea": "A warm run still executes the query even when it avoids storage reads.",
      "question": "What work remains when the second run has no disk reads?",
      "answer": "Parsing and planning still happen, and the engine still scans and filters rows.",
      "builds": [
        "Have students reconstruct the engine layers from the diagram.",
        "Ask one student how SQL becomes a plan. Ask another how the engine locates fields in a page. Ask a third how a file block reaches memory.",
        "Return to the warm query and identify the work that remains."
      ]
    }
  },
  "2": {
    "lecture-02-scene-01": {
      "idea": "Keeping a page in memory can eliminate repeated storage requests.",
      "question": "Where could a useful copy of this block stay between requests?",
      "answer": "In a frame in the buffer pool, ready for another request.",
      "builds": [
        "Show three requests for the same block.",
        "Follow each request to storage without a buffer pool.",
        "Keep the page in a frame and reuse it for later requests."
      ]
    },
    "lecture-02-scene-02": {
      "idea": "The Lab 1 timing comparison depends on where each write is considered complete.",
      "question": "Does a fast buffered write directly measure SSD throughput?",
      "answer": "No. Buffering and OS caching can let it return before durable completion.",
      "builds": [
        "Ask two students for their measured sync/no-sync ratios and methods.",
        "Identify when write() returns after the operating system accepts the bytes.",
        "Identify when fsync() returns after completing the file-sync request.",
        "Interpret the measured gap, then ask how a cache could avoid a new request entirely."
      ]
    },
    "lecture-02-scene-03": {
      "idea": "A frame is a reusable memory slot that holds a page from an addressed block.",
      "question": "Does replacing a page create more memory?",
      "answer": "No. The fixed frame is reused for different page contents.",
      "builds": [
        "Identify the frame as a fixed slot in memory.",
        "Load a block's contents into that frame as a page.",
        "Replace the page while keeping the same frame and memory capacity."
      ]
    },
    "lecture-02-scene-04": {
      "idea": "A repeated scan can miss every time if each page is evicted before its next use.",
      "question": "Will the second request for block 0 hit in this pool?",
      "answer": "No. It has already been evicted. This preset has 16 accesses and zero hits.",
      "builds": [
        "Load the first three blocks and name the pages now in memory.",
        "Load the next blocks and identify which page each one replaces.",
        "Pause before the second block 0 and predict whether it remains resident.",
        "Finish the trace and explain why every request still misses."
      ]
    },
    "lecture-02-scene-05": {
      "idea": "Frequently requested blocks can stay in memory while occasional requests replace other pages.",
      "question": "How many hits and misses does this preset produce?",
      "answer": "Eleven hits and five misses, or about a 69% hit rate.",
      "builds": [
        "Predict the hit rate and count the compulsory first misses.",
        "Follow the repeated requests for blocks 0 and 1 before either is evicted.",
        "Request a new block and check whether blocks 0 and 1 remain in memory.",
        "Count 11 hits and five misses. Compare this access order with the previous scan."
      ]
    },
    "lecture-02-scene-06": {
      "idea": "Pin counts keep a frame from being replaced while callers still use it.",
      "question": "Why does pinning need a count instead of a boolean?",
      "answer": "Several callers can hold the same frame, and each must release its own hold.",
      "builds": [
        "Show one caller holding the frame and a pin count of one.",
        "Add a second caller and increase the count.",
        "Release one hold. The remaining caller still protects the page.",
        "Release the last hold so the frame becomes eligible for replacement."
      ]
    },
    "lecture-02-scene-07": {
      "idea": "LRU recency must update on hits as well as misses.",
      "question": "Which page should D replace after A is touched again?",
      "answer": "B. A's successful pin refreshed its recency. Stamping only on misses would choose incorrectly.",
      "builds": [
        "Fill the frames with A, B, and C.",
        "Touch A again and update its last-used tick.",
        "Take a vote on the least recently pinned eligible frame.",
        "Load D in B's frame and explain the choice."
      ]
    },
    "lecture-02-scene-08": {
      "idea": "Replacement can choose only frames that have no active pins.",
      "question": "What should microdb do when every frame is pinned?",
      "answer": "Raise BufferAbortError. Replacing an active page would corrupt a caller's view.",
      "builds": [
        "Mark A as pinned and remove it from the eligible victims.",
        "Load E by replacing C.",
        "Load B by replacing D. Explain how pinning A changed the choice.",
        "Pin every frame and connect the failure to forgotten unpin calls."
      ]
    },
    "lecture-02-scene-09": {
      "idea": "A page lookup map can replace a linear frame search without changing the pin interface.",
      "question": "Why does a frame scan become expensive as the pool grows?",
      "answer": "Each lookup examines more frames. A hash mapping provides expected constant-time lookup.",
      "builds": [
        "Ask how to locate an already resident block.",
        "Count the work of scanning the frame list.",
        "Map an immutable BlockId to its frame.",
        "Increase the pool size and compare lookup work while preserving the interface."
      ]
    },
    "lecture-02-scene-10": {
      "idea": "Unpin releases a hold. Dirty data needs a separate write before frame reuse.",
      "question": "Does unpin mean save the page?",
      "answer": "No. A dirty page must be flushed before replacement or by an explicit flush policy.",
      "builds": [
        "Start with a clean page whose memory and stored contents agree.",
        "Modify the page and mark it dirty.",
        "Unpin it. The change still exists in memory.",
        "Flush the dirty contents before overwriting the frame.",
        "Load the replacement and ask what would be lost if the flush were skipped."
      ]
    },
    "lecture-02-scene-11": {
      "idea": "The database needs control over page use, write ordering, and its memory budget.",
      "question": "What problem can arise when the database and OS both cache the same bytes?",
      "answer": "Duplicate copies consume memory and can contribute to swapping if the combined budget is too large.",
      "builds": [
        "Identify the database buffer pool and OS cache as separate layers.",
        "Point to the pin that prevents an active page from being replaced.",
        "Explain why the database must save recovery information before the changed page reaches storage.",
        "Discuss the combined memory budget and the risk of double caching."
      ]
    },
    "lecture-02-scene-12": {
      "idea": "Replacement policy should account for how a workload reuses pages.",
      "question": "Should a one-pass scan get the same protection as frequently reused pages?",
      "answer": "Often it should not. Policies that resist scans can retain frequently used pages.",
      "builds": [
        "Identify the pages repeatedly used by short transactions.",
        "Run a large scan and show how it displaces hot pages.",
        "Let the scan reuse a small ring of frames so it displaces fewer frequently used pages.",
        "Compare exact LRU with a clock approximation and discuss policy tradeoffs."
      ]
    },
    "lecture-02-scene-13": {
      "idea": "A small fraction of expensive misses can dominate average access time.",
      "question": "At 90% hits, roughly what share of the modeled time comes from misses?",
      "answer": "About 96.5%, despite misses being only one in ten accesses.",
      "builds": [
        "Compute 0.9 × 100 ns + 0.1 × 25,000 ns = 2,590 ns.",
        "Raise hits to 99% and compare the 349 ns average.",
        "Raise hits to 99.6% and compare the 199.6 ns average.",
        "Show the 100 ns all-hit limit. These figures model access costs, not whole queries."
      ]
    },
    "lecture-02-scene-14": {
      "idea": "One more frame can let every page in a repeated scan stay in memory until its next use.",
      "question": "What changes when the pool grows from 49 to 50 frames for 50 blocks?",
      "answer": "Exact LRU misses on the cyclic scan at 49 frames. At 50, later passes hit after the initial fill.",
      "builds": [
        "Set the pool to 49 frames for a 50-block working set.",
        "Give pairs a minute to predict the second pass.",
        "Reveal the misses and explain the eviction cycle.",
        "Add the fiftieth frame. Distinguish later-pass hits from the two-pass total."
      ]
    },
    "lecture-02-scene-15": {
      "idea": "The buffer manager tracks page users and recent access, and saves dirty pages before replacing them.",
      "question": "What must happen before a dirty frame is reused?",
      "answer": "The supplied flush method must write the changed page before its frame receives a replacement.",
      "builds": [
        "Look for the requested block among resident pages.",
        "Choose an eligible frame if the request misses.",
        "Reuse or load the page and update recency on every successful pin.",
        "Release the caller's hold without losing track of other users."
      ]
    },
    "lecture-02-scene-16": {
      "idea": "Cache performance depends on reuse, while pins protect work that is still active.",
      "question": "Why can the same pool give zero hits on one workload and about 69% on another?",
      "answer": "In one request order, pages are evicted before reuse. In the other, frequently requested pages remain in memory.",
      "builds": [
        "Keep the number of frames fixed as the comparison begins.",
        "Contrast the cyclic scan with the repeatedly accessed hot blocks.",
        "Explain why active pins can protect even the oldest frame, then connect to Lab 2."
      ]
    }
  },
  "3": {
    "lecture-03-scene-01": {
      "idea": "The record layer uses a layout to find rows and fields in a page’s bytes.",
      "question": "What is missing from Page and Buffer when we want to find a student?",
      "answer": "They know bytes and blocks, but need a record layout to identify rows and fields.",
      "builds": [
        "Show the anonymous bytes and ask how to locate one student.",
        "Reveal the row boundary and connect it to a schema.",
        "Locate the row by its physical address."
      ]
    },
    "lecture-03-scene-02": {
      "idea": "Growing a packed record can invalidate saved byte offsets for later rows.",
      "question": "What happens to the pointer to cyd when ben's name grows?",
      "answer": "Later bytes shift, so the saved offset can stop pointing to cyd's row.",
      "builds": [
        "Identify the four tightly packed rows.",
        "Save byte 30 as cyd's address.",
        "Grow ben's name by five bytes and follow the shifted fields.",
        "Read byte 30 again and identify the addressing problem."
      ]
    },
    "lecture-03-scene-03": {
      "idea": "Fixed-size slots let microdb calculate a row’s address without reading earlier rows.",
      "question": "Why can a name change stay in place here?",
      "answer": "The slot already reserves capacity for the name, as long as its encoded bytes fit.",
      "builds": [
        "Show the same fixed reservation for every row.",
        "Insert ben within the reserved capacity.",
        "Rename ben without moving the following rows.",
        "Reject a value that exceeds the reservation."
      ]
    },
    "lecture-03-scene-04": {
      "idea": "The flag, field widths, and string reservation determine the slot size.",
      "question": "How many 24-byte slots fit in a 4096-byte block?",
      "answer": "170 slots, with 16 bytes left over.",
      "builds": [
        "Include the four-byte flag before the first integer.",
        "Place name at offset 8 with its length prefix and eight-byte capacity.",
        "Place GPA at offset 20 and total the slot at 24 bytes.",
        "Compute floor(4096 / 24), including the unused remainder."
      ]
    },
    "lecture-03-scene-05": {
      "idea": "Layout centralizes the offset calculation used by record readers and writers.",
      "question": "Where is GPA in slot 3 of the 24-byte layout?",
      "answer": "At byte 3 × 24 + 20 = 92 within the block.",
      "builds": [
        "Select slot 3 and compute its starting byte.",
        "Identify GPA's field offset of 20.",
        "Add the slot start and field offset to obtain 92.",
        "Give pairs a minute to compute the new schema's 28-byte layout."
      ]
    },
    "lecture-03-scene-06": {
      "idea": "String capacity is measured in encoded bytes, which may differ from character count.",
      "question": "Do eight visible characters always fit in eight bytes?",
      "answer": "No. UTF-8 characters can use multiple bytes. Oversized writes must fail before changing the page.",
      "builds": [
        "Mark the eight-byte storage reservation.",
        "Fit an ASCII example and count its encoded bytes.",
        "Count the two characters é and 😀: UTF-8 uses six bytes to store them.",
        "Reject overflow before changing either the old value or the adjacent field."
      ]
    },
    "lecture-03-scene-07": {
      "idea": "Microdb deletion frees a slot by clearing its in-use flag.",
      "question": "Does deletion erase all the old field bytes?",
      "answer": "No. It clears the four-byte flag. A later insertion must populate every field.",
      "builds": [
        "Locate the live slot and its in-use flag.",
        "Set the flag to zero.",
        "Point out that the old field contents remain.",
        "Reuse the slot and explain why every field needs a new value."
      ]
    },
    "lecture-03-scene-08": {
      "idea": "Unused string reservations reduce rows per block and increase scan work.",
      "question": "What does raising name capacity from 8 to 200 bytes cost in this schema?",
      "answer": "Slots grow from 24 to 216 bytes, reducing capacity from 170 to 18 rows per block.",
      "builds": [
        "Identify the eight-byte name reservation.",
        "Separate three used name bytes from reserved but unused space.",
        "Increase capacity to 200 and compute the 216-byte slot.",
        "Compute 556 blocks for 10,000 rows at 18 rows per block."
      ]
    },
    "lecture-03-scene-09": {
      "idea": "Missing data needs a representation distinct from ordinary values.",
      "question": "Why is treating a missing GPA as zero a problem?",
      "answer": "It turns absence into a real numeric value and can bias an average.",
      "builds": [
        "Treat zero as a valid stored number.",
        "Treat an empty string as a valid string value.",
        "Show that a missing value differs from zero and empty text. microdb currently has no NULL.",
        "Use the conceptual bitmap to distinguish absence from stored values."
      ]
    },
    "lecture-03-scene-10": {
      "idea": "Large values can be compressed or stored separately from the main row.",
      "question": "Why not reserve two megabytes in every student row for an essay?",
      "answer": "Most essays need less space. Storing large values separately keeps the main rows smaller.",
      "builds": [
        "Show a small value stored inline.",
        "Compress a value and label the illustrated ratio as hypothetical.",
        "Move a large value to separate storage.",
        "Follow the compact reference left in the main row."
      ]
    },
    "lecture-03-scene-11": {
      "idea": "An out-of-line value need only be fetched when the query requires it.",
      "question": "Does selecting name necessarily fetch the student's essay?",
      "answer": "In this example it does not. Selecting the essay follows the reference to its chunks.",
      "builds": [
        "Locate the essay's separate storage and its reference in the row.",
        "Read name and identify the pages used.",
        "Read essay and follow the additional storage path.",
        "Compare the two paths and the benefit for frequently accessed small fields."
      ]
    },
    "lecture-03-scene-12": {
      "idea": "RecordPage combines one pinned block with a layout and records every modification.",
      "question": "What if a field changes but the page is never marked dirty?",
      "answer": "The change can disappear when the buffer frame is reused.",
      "builds": [
        "Pin the block that contains the record.",
        "Use the layout to find slots and fields.",
        "Change a field at its computed offset.",
        "Mark the page modified and release its hold when closing."
      ]
    },
    "lecture-03-scene-13": {
      "idea": "TableScan advances through used slots and crosses blocks until the file ends.",
      "question": "When should next return false?",
      "answer": "Only after every remaining block has been searched and no live row remains.",
      "builds": [
        "Connect the previous RecordPage example to TableScan: search occupied slots in one block, then continue across the file. Begin with the current block.",
        "Skip an empty slot without ending the scan.",
        "Release the exhausted page and move to the next block.",
        "For insertion, search reusable slots before appending a new block."
      ]
    },
    "lecture-03-scene-14": {
      "idea": "A RID identifies a physical heap location, which can later be reused.",
      "question": "Is a RID a permanent business identifier for a student?",
      "answer": "No. After deletion, another row can occupy the same slot.",
      "builds": [
        "Locate a live row by block and slot.",
        "Update it in place while preserving its RID in microdb.",
        "Delete it and mark the location free.",
        "Reuse the location for another row and discuss stale index entries."
      ]
    },
    "lecture-03-scene-15": {
      "idea": "Persisted catalog rows reconstruct table layouts after a restart.",
      "question": "How does the engine read the catalog without already knowing every schema?",
      "answer": "The engine knows the catalog’s layout in advance, so it can read the stored schemas for other tables.",
      "builds": [
        "Identify the layout currently held in Python objects.",
        "Persist that metadata in catalog rows.",
        "Restart and reconstruct the layout from stored metadata.",
        "Explain the known layouts that make the first catalog reads possible."
      ]
    },
    "lecture-03-scene-16": {
      "idea": "Layouts, record pages, scans, and the catalog each solve a different storage problem.",
      "question": "Which objects compute offsets, own a page pin, skip empty slots, and remember schemas?",
      "answer": "Layout, RecordPage, TableScan, and the catalog, respectively.",
      "builds": [
        "Explain how Layout and RecordPage locate a field.",
        "Trace TableScan through used and empty slots.",
        "Explain how the catalog preserves the schema across restart."
      ]
    }
  },
  "4": {
    "lecture-04-scene-01": {
      "idea": "A shared scan interface lets query operators request rows from one another.",
      "question": "What starts work in the operator tower?",
      "answer": "A caller requests the next row, causing requests to travel down the tree.",
      "builds": [
        "Show the operator tree before any next() call and ask which call starts reading rows.",
        "Follow one caller request down to Scan.",
        "Return a matching row through the composed operators."
      ]
    },
    "lecture-04-scene-02": {
      "idea": "Streaming reduces intermediate storage, but reducing candidate work requires better plans too.",
      "question": "Does streaming a Cartesian product remove its huge number of candidate pairs?",
      "answer": "No. It avoids materializing all pairs at once but still enumerates them.",
      "builds": [
        "Show every row from the scan stored in memory before the next operator starts.",
        "Add a Cartesian product and ask where its result would fit.",
        "Multiply one million by one million to obtain a trillion candidate pairs.",
        "Pass one pair at a time instead of storing all pairs. The memory requirement falls, but every pair still needs processing."
      ]
    },
    "lecture-04-scene-03": {
      "idea": "Each operator produces its next row when its parent requests one.",
      "question": "Can one caller request cause several child requests?",
      "answer": "Yes. A filter may reject several child rows before returning one match.",
      "builds": [
        "Leave the operators idle until a caller makes a request.",
        "Send next to Project.",
        "Follow Project's request into Select.",
        "Follow Select's request into Scan.",
        "Return ada upward and explain the current-row cursor."
      ]
    },
    "lecture-04-scene-04": {
      "idea": "Rows returned and rows examined count different parts of query execution.",
      "question": "How many base rows are examined to return three matches and then report exhaustion?",
      "answer": "Six rows: one for ada, two for cyd, two for eli, and the final row for exhaustion.",
      "builds": [
        "Predict the work needed for the first result.",
        "Return ada after examining one row.",
        "Examine ben and cyd before returning cyd.",
        "Examine dee and eli before returning eli.",
        "Examine fay. Return false. The scan examines six rows and returns three."
      ]
    },
    "lecture-04-scene-05": {
      "idea": "Operators can work together because each supports the same five scan methods.",
      "question": "Does Select require its child to be a TableScan?",
      "answer": "No. Any child implementing the scan interface can work, including a ListScan test double.",
      "builds": [
        "Introduce the common interface used by every operator.",
        "Use before_first to rewind the scan and next to advance to a row.",
        "Use get_val to read a field and has_field to check whether the scan exposes it.",
        "Follow close through each wrapper so the underlying scans release their resources."
      ]
    },
    "lecture-04-scene-06": {
      "idea": "Select keeps advancing its child until a row passes or the input ends.",
      "question": "Should Select return false after the first rejected row?",
      "answer": "No. It must continue searching until it finds a match or exhausts the child.",
      "builds": [
        "Introduce the gpa > 35 filter.",
        "Pass GPA 39 and expose the child's current row.",
        "Reject GPA 31 and request another row.",
        "Pass GPA 37 and explain why accepted rows need not be copied."
      ]
    },
    "lecture-04-scene-07": {
      "idea": "Project restricts which fields callers can access through the scan.",
      "question": "What should the projected scan report for the hidden GPA field?",
      "answer": "has_field returns false, and get_val raises ValueError.",
      "builds": [
        "Show the complete row in the child scan.",
        "Allow only name through the projection.",
        "Read name and obtain ada from the child's current row.",
        "Attempt GPA access and explain the required rejection."
      ]
    },
    "lecture-04-scene-08": {
      "idea": "A predicate reads fields from the current combined row and can short-circuit AND terms.",
      "question": "Which major row matches ben's mid value of 2?",
      "answer": "The stat row with mid2 equal to 2. The suffix distinguishes field names, not numeric values.",
      "builds": [
        "Identify student mid and major mid2 in ben's combined product row.",
        "Evaluate GPA 31 > 35 and obtain false.",
        "Skip the remaining AND term after the failure.",
        "Compare ben's mid 2 with ds's mid2 1 and reject this pair."
      ]
    },
    "lecture-04-scene-09": {
      "idea": "ProductScan enumerates right rows for each current left row.",
      "question": "Which cursors move after ada has been paired with every major?",
      "answer": "The right scan rewinds, the left advances to ben, and the right advances to its first row.",
      "builds": [
        "Position the left on ada and the right before its first row.",
        "Form ada paired with ds.",
        "Advance only the right to form ada with stat.",
        "Advance right again to form ada with econ.",
        "Rewind right and advance left before forming ben's first pair."
      ]
    },
    "lecture-04-scene-10": {
      "idea": "A filter can return fewer rows while ProductScan still creates every candidate pair.",
      "question": "What changes if the predicate rejects every pair?",
      "answer": "Only surviving results drop to zero. The product still enumerates all 18 candidate pairs.",
      "builds": [
        "Predict left deliveries, right deliveries, candidates, and surviving pairs.",
        "Enumerate six students times three majors.",
        "Keep six matches and compare the counts 6, 18, 18, and 6.",
        "Reject every pair and show that candidate work remains 18."
      ]
    },
    "lecture-04-scene-11": {
      "idea": "ProductScan returns no pairs if either input is empty, and stays exhausted until rewound.",
      "question": "What should repeated next calls return after exhaustion?",
      "answer": "False every time, until the scan is explicitly rewound.",
      "builds": [
        "Empty the left input and predict zero pairs.",
        "Empty the right input and predict zero pairs again.",
        "Restore two rows on each side and enumerate four pairs.",
        "Call next repeatedly after exhaustion and require false each time."
      ]
    },
    "lecture-04-scene-12": {
      "idea": "Closing the root must release resources throughout both branches of a product.",
      "question": "How many pins remain if only one of the two active scan branches closes?",
      "answer": "One pin remains. Product must close both children.",
      "builds": [
        "Identify the page pin held by each TableScan.",
        "Send close to the root.",
        "Follow cleanup calls into both children.",
        "Verify that no pinned frames remain."
      ]
    },
    "lecture-04-scene-13": {
      "idea": "Pushing local filters below a product can reduce candidates without changing the answer.",
      "question": "Which condition must stay above the product?",
      "answer": "mid = mid2 needs fields from both inputs, so it cannot move to either input alone.",
      "builds": [
        "Begin with local filtering after the product.",
        "Count 300 students times three majors: 900 candidates.",
        "Move each local condition to the input whose fields it uses.",
        "Count the reduced 60-by-1 product.",
        "Compare the same 20 answers and the fifteenfold reduction in candidate pairs."
      ]
    },
    "lecture-04-scene-14": {
      "idea": "An operator can offer next() and still need substantial memory before it returns a row.",
      "question": "Can a sort emit the smallest row of arbitrary input before seeing the last row?",
      "answer": "Generally no. It must inspect all input and may need temporary storage.",
      "builds": [
        "Show a filter passing rows as matches arrive.",
        "Explain why sort needs to inspect the full unsorted input.",
        "Keep a running aggregate for each group in the hash table.",
        "Use already grouped input to finish one group before the whole input ends."
      ]
    },
    "lecture-04-scene-15": {
      "idea": "A join compares related fields in a combined row before projecting the requested output.",
      "question": "Does the name mid2 mean the value must be 2?",
      "answer": "No. It distinguishes the majors field from students.mid. Ada's matching pair has value 1 in both.",
      "builds": [
        "Identify students.mid and majors.mid2 as major IDs.",
        "Combine ada and ds so both fields are accessible.",
        "Compare 1 with 1 and keep the pair. Contrast stat's value of 2.",
        "Project the result (ada, ds) after the required comparisons."
      ]
    },
    "lecture-04-scene-16": {
      "idea": "Trace next() calls, count candidate rows, and follow close() to explain a plan’s work.",
      "question": "What can filter pushdown improve while preserving the query's answer?",
      "answer": "It can reduce input sizes and candidate work. close must still release every descendant's resources.",
      "builds": [
        "Recall the scan interface shared by every operator.",
        "Trace next() calls down to TableScan, then show the caller reading the accepted row’s fields.",
        "Compare returned rows with candidate work, then explain cleanup at the root."
      ]
    }
  },
  "6": {
    "b-trees": {
      "idea": "A separate index can find a heap row without scanning the whole table.",
      "question": "How can we keep cheap heap inserts and add a shortcut for lookup?",
      "answer": "Maintain a separate structure organized by the search key and pointing to heap records.",
      "builds": [
        "Compare the existing heap with the new index beside it.",
        "Follow the index to the same heap row the scan would find."
      ]
    },
    "one-row-every-block": {
      "idea": "Without an index, a heap scan must examine rows to find a requested key.",
      "question": "Does caching turn a heap scan into an indexed lookup?",
      "answer": "No. It can reduce physical reads, but the scan still examines rows.",
      "builds": [
        "Request one UID from the 100,000-row heap example.",
        "Follow the scan through the first half of the heap.",
        "Finish the scan and propose a shortcut that leaves the heap in place."
      ]
    },
    "index": {
      "idea": "An index maps search keys to record locations independently of heap order.",
      "question": "Must indexes on name and GPA use the same ordering?",
      "answer": "No. Each provides a separate access path into the same heap.",
      "builds": [
        "Identify the sorted search keys.",
        "Follow one key through its RID to the heap row.",
        "Add another key ordering and discuss maintaining entries when rows change."
      ]
    },
    "four-storage-choices": {
      "idea": "Compare lookup, range, and update work when choosing a heap, sorted file, hash table, or B+ tree.",
      "question": "Which structure directly supports sorted ranges while accommodating updates?",
      "answer": "A B+ tree balances ordered access with updates. Hashing does not preserve range order.",
      "builds": [
        "Compare equality lookup across the four structures.",
        "Discuss the movement needed to insert into a sorted file.",
        "Walk an ordered range and compare the available access paths."
      ]
    },
    "first-four-keys": {
      "idea": "ORDER = 4 permits four keys in a node. Only the fifth creates overflow.",
      "question": "Is a full four-key leaf already invalid?",
      "answer": "No. Four keys are legal. A fifth key requires a split.",
      "builds": [
        "Place 39 in the root, which is also the only leaf.",
        "Insert 31 in sorted order.",
        "Insert 37 between 31 and 39.",
        "Insert 28 and distinguish full from overflowing."
      ]
    },
    "b-tree": {
      "idea": "Internal nodes route searches, while linked equal-depth leaves hold the actual index entries.",
      "question": "Where are the actual entries in this secondary-index tree?",
      "answer": "Leaves contain the keys and their RIDs. Internal keys select child nodes.",
      "builds": [
        "Separate internal routing keys from leaf entries.",
        "Follow the leaf links and check that every leaf has the same depth.",
        "Follow a leaf entry's RID to its heap record."
      ]
    },
    "predict-the-next-split": {
      "idea": "A leaf split copies a separator upward while preserving its entry in the leaf.",
      "question": "What happens when 7 is inserted after 6?",
      "answer": "The right leaf overflows, 5 is copied up, and the root becomes [3, 5] without increasing height.",
      "builds": [
        "Give pairs a minute to predict insertion of 6.",
        "Fill the right leaf and explain why it remains legal.",
        "Insert 7, split, and explain why separator 5 remains in a leaf."
      ]
    },
    "a-root-splits": {
      "idea": "Splitting the root adds one level to every leaf path.",
      "question": "How does an internal split differ from copying a leaf separator?",
      "answer": "The internal routing separator moves upward. Its actual data entry still remains in a leaf.",
      "builds": [
        "Show the full but legal internal root.",
        "Add the fifth separator and identify the overflow.",
        "Move 7 into a new root and compare every leaf's new depth."
      ]
    },
    "fan-out": {
      "idea": "Large fan-out keeps a page-based search tree shallow.",
      "question": "Why does larger fan-out reduce tree height?",
      "answer": "Each internal node routes to more subtrees, so fewer levels can cover the same entries.",
      "builds": [
        "Begin with binary branching and count the modeled levels.",
        "Increase branching to twenty children.",
        "Predict the shallow shape at roughly two hundred children per node."
      ]
    },
    "index-pages-and-heap-pages": {
      "idea": "Index-node visits and physical reads differ when upper levels are cached.",
      "question": "Does a four-level secondary index always mean exactly four storage reads?",
      "answer": "No. Cached nodes may need no storage read, while fetching the heap record can add one.",
      "builds": [
        "Show the cached upper levels and recall the buffer pool.",
        "Read the leaf that holds the matching entry.",
        "Follow the RID to the heap and separate index visits from physical I/O."
      ]
    },
    "the-write-bill": {
      "idea": "Inserting, updating, or deleting a row can also require changes to its indexes.",
      "question": "What changes when a table has indexes on UID, name, and GPA?",
      "answer": "Inserts maintain all three. Updates affect relevant entries, and deletes must remove stale entries.",
      "builds": [
        "Trace an insertion into the heap and one index.",
        "Add a second index and identify its maintenance work.",
        "Add the third and discuss whether the workload justifies it."
      ]
    },
    "when-scanning-wins": {
      "idea": "An index can lose its advantage when the query needs most of the heap.",
      "question": "Should a query matching 99% of rows automatically use the index?",
      "answer": "No. A sequential scan may avoid many scattered heap visits. Caching and covering can change the choice.",
      "builds": [
        "Follow a selective lookup to a few heap rows.",
        "Increase matches and count the growing heap visits.",
        "Compare the broad lookup with reading the table once in order."
      ]
    },
    "build-and-test": {
      "idea": "Range and structural checks catch different B+ tree mistakes.",
      "question": "Which test catches a separator accidentally removed from the leaf?",
      "answer": "A range query that includes that key. Occupancy and height checks catch separate structural problems.",
      "builds": [
        "Inspect the tree with a missing leaf entry.",
        "Walk a range through the gap and identify the missing key.",
        "Restore the entry and rerun the range explanation."
      ]
    },
    "exit-trace": {
      "idea": "After an insertion or split, searches and range walks must still reach every key and its complete RID list.",
      "question": "What changes for every leaf when the root splits?",
      "answer": "Every leaf gains one level of depth. All leaves remain at the same depth.",
      "builds": [
        "Start at the full leaf and locate the insertion position.",
        "Explain the split and any growth toward the root.",
        "Trace a search followed by a range walk through linked leaves."
      ]
    }
  },
  "7": {
    "money-disappears": {
      "idea": "Individually valid writes can leave a transfer only partly applied after a crash.",
      "question": "Where did the missing fifty go in this picture?",
      "answer": "Only the debit reached durable storage. A lost $50 while B received nothing.",
      "builds": [
        "Establish the original total of 150.",
        "Apply only the debit and distinguish memory from durable storage.",
        "Interrupt the transfer and identify the missing atomicity guarantee."
      ]
    },
    "transaction": {
      "idea": "A transaction groups related changes so they can be committed together.",
      "question": "Does atomicity alone guarantee that an application transfers to the correct account?",
      "answer": "No. It groups the changes, but the application and constraints must still specify the right changes.",
      "builds": [
        "Identify the changes belonging to one unit of work.",
        "Apply both balance changes together.",
        "Ask what a successful commit acknowledgement promises."
      ]
    },
    "two-kinds-of-unfinished": {
      "idea": "Process termination and power failure leave different storage layers intact.",
      "question": "Does killing a process prove its data would survive power loss?",
      "answer": "No. The OS cache survives process termination but does not survive loss of power.",
      "builds": [
        "Identify application memory, OS cache, and durable storage.",
        "Predict which layers survive process termination.",
        "Predict what survives power failure and explain the lab's narrower crash tests."
      ]
    },
    "durable-first": {
      "idea": "Recovery information must become durable before the changed page can become durable.",
      "question": "What must already be durable before a changed data page is flushed?",
      "answer": "The associated recovery log information must already be durable.",
      "builds": [
        "Identify the old value before changing the page.",
        "Make its recovery information durable first.",
        "Allow the changed page to flush after its recovery log information is durable."
      ]
    },
    "write-ahead-logging": {
      "idea": "WAL preserves the information needed to recover changes that reach storage.",
      "question": "What if an uncommitted page reaches disk before its undo information?",
      "answer": "The change may survive with no durable old value available to restore it.",
      "builds": [
        "Identify the lab's old-value recovery record.",
        "Identify when the old-value log record reaches durable storage.",
        "Require log durability before page durability, separating the general rule from this undo format."
      ]
    },
    "a-complete-transfer": {
      "idea": "The lab's FORCE commit makes changed data durable before syncing the COMMIT log record.",
      "question": "Where do new balances live after each SET and before the commit flush?",
      "answer": "In buffers, until the FORCE commit flushes the changed pages.",
      "builds": [
        "Start the transfer of 40 from balances 100 and 50.",
        "Log A's old value of 100 before changing it.",
        "Log B's old value of 50 before changing it.",
        "Flush the changed data, then record durable COMMIT."
      ]
    },
    "crash-after-eviction": {
      "idea": "Evicting an uncommitted dirty page does not commit its transaction.",
      "question": "What lets recovery repair the debit from unfinished tx2?",
      "answer": "The durable SET record contains A's old value of 60.",
      "builds": [
        "Begin tx2 and change its balance in memory.",
        "Evict the dirty page so its uncommitted value reaches disk.",
        "Crash without COMMIT and identify tx2 as unfinished before starting recovery."
      ]
    },
    "read-the-log-backward": {
      "idea": "Backward recovery restores unfinished transactions while preserving committed ones.",
      "question": "Why should tx1 stay committed instead of returning to 100 and 50?",
      "answer": "Its commit record is durable, and FORCE made its changed pages durable before that record.",
      "builds": [
        "Scan backward and identify unfinished tx2.",
        "Restore its durable old value.",
        "Keep tx1's committed transfer and flush repairs before recording recovery completion."
      ]
    },
    "repair-can-crash-too": {
      "idea": "Recovery must be safe to repeat if another crash interrupts the repair.",
      "question": "Why is syncing a ROLLBACK log record unsafe before repaired pages are durable?",
      "answer": "A later restart could skip a repair whose completion was recorded but whose data never survived.",
      "builds": [
        "Restore the old value by assignment.",
        "Interrupt recovery before completion.",
        "Repeat the repair, flush its pages, and only then record completion."
      ]
    },
    "two-policy-decisions": {
      "idea": "Eviction policy controls whether uncommitted pages may reach disk. Commit policy controls whether changed pages must already be there.",
      "question": "Which policy creates a need for undo, and which creates a need for redo?",
      "answer": "STEAL permits uncommitted data on disk. NO-FORCE permits committed changes whose data pages are not durable.",
      "builds": [
        "Ask two separate questions: may an uncommitted page be written, and must changed pages be saved before commit?",
        "With STEAL, an uncommitted page can reach disk. Explain why recovery may need to undo it.",
        "With NO-FORCE, a commit can finish before changed pages reach disk. Explain why recovery may need to redo them."
      ]
    },
    "four-recovery-duties": {
      "idea": "The recovery duties follow from the combination of STEAL and FORCE policies.",
      "question": "Which combination needs both undo and redo in this model?",
      "answer": "STEAL with NO-FORCE: uncommitted changes may be present and committed changes may be absent.",
      "builds": [
        "Derive neither duty for FORCE with NO-STEAL under the simplified update model.",
        "Derive undo for FORCE with STEAL.",
        "Derive redo for NO-FORCE with NO-STEAL.",
        "Combine both duties for NO-FORCE with STEAL."
      ]
    },
    "commit-boundary": {
      "idea": "A durable commit reply is safe only after required log records and, under FORCE, changed pages are durable.",
      "question": "What if the connection fails after durability but before the reply arrives?",
      "answer": "The transaction may have committed even though the client never received the reply.",
      "builds": [
        "Identify the required durable log writes in each policy.",
        "Place the earliest safe acknowledgement on each lane.",
        "Show how NO-FORCE defers data-page flushes and can share log costs through group commit."
      ]
    },
    "recovery-at-scale": {
      "idea": "Production recovery tracks which transactions finished and which logged changes still need to be applied or undone.",
      "question": "Is an arbitrary timestamp enough to make a safe checkpoint cutoff?",
      "answer": "No. Recovery needs state and durability guarantees that account for unfinished transactions and required data.",
      "builds": [
        "Determine which transactions completed and which remain unfinished.",
        "Explain redo progress and the role of log sequence numbers.",
        "Explain how unfinished transactions are handled, noting differences between this general model, the lab, and PostgreSQL."
      ]
    },
    "place-the-crash": {
      "idea": "The crash location determines what recovery must preserve or restore.",
      "question": "Does a missing commit reply prove the transaction failed?",
      "answer": "No. The durable commit may already exist. The application needs a safe way to resolve or retry the outcome.",
      "builds": [
        "Predict the outcome of a crash before durable logging.",
        "Crash after the log is durable and identify the available repair information.",
        "Crash after uncommitted data reaches disk and restore it.",
        "Crash after durable commit and preserve the transaction under FORCE."
      ]
    },
    "from-promise-to-code": {
      "idea": "The code must preserve WAL ordering during writes, commit, and recovery.",
      "question": "Which must become durable first: recovery information or the associated changed page?",
      "answer": "Recovery information. Under the lab's FORCE policy, changed pages also precede the durable COMMIT log record.",
      "builds": [
        "Explain what the recovery record contains and when its fsync completes.",
        "In this lab, change the buffered page only after syncing its old-value log record.",
        "Explain which writes complete a commit, then which old values recovery restores after an interrupted transaction."
      ]
    }
  },
  "8": {
    "concurrency-mvcc": {
      "idea": "Correct individual transactions can interfere when they share mutable state.",
      "question": "What balance should two deposits of ten produce from 100?",
      "answer": "120 under a serial execution. An unsafe interleaving can instead leave 110.",
      "builds": [
        "Introduce the two clients and their shared account.",
        "Predict the intended result, then reveal the possibility of a lost update."
      ]
    },
    "two-deposits": {
      "idea": "Both deposits should count even when the clients run concurrently.",
      "question": "Why is 110 wrong after both ten-unit deposits complete?",
      "answer": "It reflects only one net deposit, although each transaction intended to add ten.",
      "builds": [
        "Start at 100 with both transactions ready.",
        "Apply one ten-unit deposit.",
        "Establish 120 as the expected result when both deposits count."
      ]
    },
    "schedule-the-failure": {
      "idea": "A lost update occurs when two transactions overwrite from the same stale starting value.",
      "question": "Can WAL infer and restore the missing intended deposit?",
      "answer": "No. Recovery preserves committed actions. It cannot infer application intent from an incorrect schedule.",
      "builds": [
        "Have both clients read 100.",
        "Let each compute its own value of 110.",
        "Write both values to the same row.",
        "Commit both and compare 110 with the intended 120."
      ]
    },
    "serializability": {
      "idea": "Serializable execution has the effect of some serial order, even when operations interleave.",
      "question": "Does serializability require literally running one transaction at a time?",
      "answer": "No. Interleavings are allowed when they preserve a valid serial execution's dependencies and effects.",
      "builds": [
        "Trace the first possible serial order.",
        "Reverse the order and compare dependencies.",
        "Show a valid interleaving and explain its equivalent serial order."
      ]
    },
    "anomaly-gallery": {
      "idea": "Compare reading an uncommitted value, seeing a row change, and seeing a query return a different set of rows.",
      "question": "How does a phantom differ from a non-repeatable read?",
      "answer": "A phantom changes which rows satisfy a predicate. A non-repeatable read changes an existing row's observed value.",
      "builds": [
        "Follow the read of an uncommitted value, then introduce the term dirty read.",
        "Compare the two reads of the same row and point to the changed value.",
        "Repeat the same query and point to the new matching row."
      ]
    },
    "shared-and-exclusive": {
      "idea": "Shared locks permit compatible readers. Exclusive locks conflict with other holders.",
      "question": "Can two shared-lock holders both upgrade immediately to exclusive access?",
      "answer": "No. Each upgrade conflicts with the other shared holder.",
      "builds": [
        "Allow the two shared readers to coexist.",
        "Request exclusive access and check compatibility with every existing holder."
      ]
    },
    "replay-with-locks": {
      "idea": "The lost-update schedule is stopped at the first conflicting exclusive-lock upgrade.",
      "question": "Where does the lab refuse the read/read/compute/compute/write schedule?",
      "answer": "At the first X-lock upgrade, because the other transaction still holds an S lock.",
      "builds": [
        "Grant both shared reads.",
        "Request the first exclusive upgrade.",
        "Raise LockAbortError and explain rollback and retry rather than waiting."
      ]
    },
    "two-phases": {
      "idea": "Two-phase locking separates acquiring locks from releasing them.",
      "question": "Can classic 2PL acquire another lock after releasing one?",
      "answer": "No. Once shrinking begins, no new lock can be acquired.",
      "builds": [
        "Acquire locks during the growing phase.",
        "Release locks during the shrinking phase.",
        "Explain the lab's stronger rule of holding all locks until completion."
      ]
    },
    "deadlock": {
      "idea": "A deadlock cycle cannot resolve merely by waiting longer.",
      "question": "What can break the cycle safely?",
      "answer": "Abort a participant and retry its transaction. A consistent acquisition order can prevent this two-resource cycle.",
      "builds": [
        "Give each transaction one resource.",
        "Have each request the other's resource and trace the cycle.",
        "Abort and retry a participant, distinguishing deadlock from ordinary blocking."
      ]
    },
    "protect-the-empty-space": {
      "idea": "Protecting existing rows alone cannot stop new rows from entering a queried range.",
      "question": "What must a locking design protect against phantoms?",
      "answer": "The relevant range or predicate, including space where a matching row could appear.",
      "builds": [
        "Lock the rows already selected by the predicate.",
        "Insert a matching row in the gap.",
        "Protect the predicate range and discuss dependency detection as an MVCC alternative."
      ]
    },
    "isolation-ladder": {
      "idea": "An isolation level limits what concurrent transactions can observe, but its exact guarantees depend on the database.",
      "question": "Does PostgreSQL REPEATABLE READ prevent every serializability anomaly?",
      "answer": "No. Its transaction snapshot prevents these changing-result phantoms but can still allow write skew.",
      "builds": [
        "Explain READ UNCOMMITTED, then note that PostgreSQL treats it as READ COMMITTED.",
        "Explain the committed-data guarantee of READ COMMITTED.",
        "Discuss transaction snapshots and the limits of REPEATABLE READ.",
        "Connect SERIALIZABLE to equivalence with a serial execution."
      ]
    },
    "versions-instead-of-waiting": {
      "idea": "MVCC lets readers and writers use different versions of a row.",
      "question": "What extra storage and bookkeeping does MVCC need to let readers use older versions?",
      "answer": "The system must store versions, track visibility, and remove obsolete versions. Writers can still conflict.",
      "builds": [
        "Identify the original version.",
        "Create another version for the update.",
        "Let the snapshot reader use its visible version while the writer proceeds."
      ]
    },
    "walk-the-version-chain": {
      "idea": "A snapshot selects the version visible to its reader.",
      "question": "Are transaction-number comparisons alone enough for real MVCC visibility?",
      "answer": "No. Transaction status, snapshot membership, and the reader's own writes also matter.",
      "builds": [
        "Use the toy committed ordering to read 120 after tx100.",
        "Move past tx103 and read 70.",
        "Move past tx107 and read 50, then qualify the simplified visibility model."
      ]
    },
    "the-version-bill": {
      "idea": "An open transaction’s snapshot can keep older row versions in use and delay their cleanup.",
      "question": "Why can an idle transaction hold back cleanup?",
      "answer": "Its snapshot may still need the old versions, even while it issues no new queries.",
      "builds": [
        "Show the reader retaining an old version.",
        "Stop cleanup at the version the reader may still need.",
        "End the reader and allow eligible cleanup to proceed."
      ]
    },
    "write-skew": {
      "idea": "Snapshot isolation can allow a shared invariant to fail through writes to different rows.",
      "question": "Why does the two-doctor example have no direct write/write conflict?",
      "answer": "Each doctor changes a different row, although together their changes leave nobody on call.",
      "builds": [
        "Establish that at least one of the two doctors must remain on call.",
        "Let each snapshot show the other doctor available.",
        "Let both leave and compare the outcome with any serial execution."
      ]
    },
    "three-mechanisms-three-jobs": {
      "idea": "Pins, latches, and transaction locks protect different things.",
      "question": "Does pinning a page stop another transaction from changing its rows?",
      "answer": "No. A pin prevents eviction. Transaction access requires a separate concurrency protocol.",
      "builds": [
        "Use a pin to protect a frame from eviction.",
        "Use a latch to protect a short shared-memory operation.",
        "Use transaction locks to stop incompatible reads or writes while a transaction is active."
      ]
    },
    "exit-schedule": {
      "idea": "Crash recovery, lock conflicts, and snapshot visibility solve distinct correctness problems.",
      "question": "What anomaly can snapshot isolation still permit?",
      "answer": "Write skew, even though each transaction reads a consistent snapshot.",
      "builds": [
        "Retell the invalid lost-update schedule.",
        "Identify the first conflicting X-lock upgrade.",
        "Explain snapshot visibility and use write skew to show its limits."
      ]
    }
  },
  "9": {
    "same-answer-different-work": {
      "idea": "Equivalent plans can produce the same rows with very different intermediate work.",
      "question": "Do the pushed plan's 60 candidate pairs mean 60 final rows?",
      "answer": "No. The join still filters them. Both plans return the same twenty rows.",
      "builds": [
        "Identify the predicates in both plans.",
        "Compare the candidate work before the final join checks.",
        "Confirm the same twenty results and separate candidates from output."
      ]
    },
    "optimizer": {
      "idea": "An optimizer estimates the costs of valid alternatives before choosing a plan.",
      "question": "Does an optimizer execute every candidate to discover the cheapest one?",
      "answer": "No. It uses estimates, physical properties, and a bounded search.",
      "builds": [
        "Identify the stored statistics available for estimates.",
        "Price candidate plans under the cost model.",
        "Choose a plan and distinguish optimization from the fixed Lab 5 planner."
      ]
    },
    "read-a-plan": {
      "idea": "A plan explains the chosen operators, while execution measurements reveal their actual behavior.",
      "question": "Does EXPLAIN ANALYZE merely display a plan?",
      "answer": "No. It executes the statement and reports measured behavior.",
      "builds": [
        "Read the left input and its row estimate.",
        "Read the right input and compare estimated with actual rows.",
        "Follow the join's inputs and output. Treat cost units separately from milliseconds."
      ]
    },
    "selectivity": {
      "idea": "Selectivity is the fraction of input rows that survives a predicate.",
      "question": "What does a smaller selectivity fraction imply?",
      "answer": "Fewer surviving rows, which can reduce work in later operators.",
      "builds": [
        "Identify the input row count N.",
        "Count survivors and divide by N before discussing later costs."
      ]
    },
    "estimate-from-a-sketch": {
      "idea": "Cardinality estimates depend on distribution and independence assumptions.",
      "question": "What assumptions produce the approximate 142-then-47 survivor estimate?",
      "answer": "A uniform continuous range model followed by an independent one-third department filter.",
      "builds": [
        "Inspect the distribution sketch and name its assumptions.",
        "Estimate about 142 rows from the range filter.",
        "Apply the independent one-third filter to estimate about 47."
      ]
    },
    "when-estimates-fail": {
      "idea": "Skew and correlated predicates can invalidate simple estimates.",
      "question": "Will refreshing statistics automatically fix a wrong independence assumption?",
      "answer": "No. Correlation can require richer statistics or a different estimation model.",
      "builds": [
        "Make the uniform estimate explicit.",
        "Contrast it with skewed actual data.",
        "Use Charlottesville and Virginia to explain why correlated filters do not multiply independently."
      ]
    },
    "watch-the-access-path-flip": {
      "idea": "As more rows match, fetching them through an index can cost more than scanning the table.",
      "question": "Where is the crossover in this toy model?",
      "answer": "Around 0.997%: (1,000 − 3) / 100,000. It is not a universal index threshold.",
      "builds": [
        "Estimate the index path as three page accesses to reach the leaf plus one per matching RID.",
        "Compare the index cost with 1,000 scan blocks near the crossover.",
        "Increase matches until the scan wins, then qualify the model's assumptions."
      ]
    },
    "choose-the-join-machine": {
      "idea": "Join algorithms suit different input sizes, access paths, and physical properties.",
      "question": "Why is no join algorithm always best?",
      "answer": "Probe cost, build memory, ordering, duplicates, and output size change the work required.",
      "builds": [
        "Use an index nested-loop join when a small outer input can look up matches cheaply.",
        "For an equality join, build a hash table on one input and look up matches from the other.",
        "Merge ordered inputs, producing all pairs from duplicate-key groups."
      ]
    },
    "join-order": {
      "idea": "Join order controls the size of intermediate results.",
      "question": "Which first pair lacks a connecting predicate in this example?",
      "answer": "Majors and enrollments, which form a 9,000-row cross product.",
      "builds": [
        "Join students and majors first and count the intermediate.",
        "Join students and enrollments first and compare the work.",
        "Pair majors with enrollments and count the larger intermediate result. Its size alone does not give a total runtime ratio."
      ]
    },
    "search-without-enumerating-everything": {
      "idea": "The optimizer reuses plans for smaller joins and may keep an ordered plan that makes a later step cheaper.",
      "question": "Why retain a subplan that is not cheapest in raw local cost?",
      "answer": "Its ordering or another physical property may reduce the cost of the full plan.",
      "builds": [
        "Start with candidate plans for individual relations.",
        "Reuse the best useful plans for pairs and larger subsets.",
        "Keep alternatives whose physical properties can help later operators."
      ]
    },
    "diagnose-then-review": {
      "idea": "The earliest large estimation error often explains expensive choices higher in the plan.",
      "question": "Where should we investigate first when estimated and actual rows diverge?",
      "answer": "At the earliest substantial mismatch, checking distributions, statistics, correlations, and memory assumptions.",
      "builds": [
        "Read the estimated plan alongside measured rows.",
        "Find the earliest large divergence.",
        "Investigate its assumptions, then transition at minute 40 to the review."
      ]
    },
    "review-storage-and-memory": {
      "idea": "Explain when writes reach durable storage and whether requested pages remain in memory.",
      "question": "Why can a repeated 50-page loop miss in a 49-frame LRU pool?",
      "answer": "Each page is evicted before its next use. One additional frame lets later passes hit.",
      "builds": [
        "Recall why a buffered write can return before a write followed by fsync.",
        "Trace the repeated loop through 49 frames.",
        "Add the missing frame and distinguish initial misses from later hits."
      ]
    },
    "review-rows-and-pipelines": {
      "idea": "Record layout and iterator plans connect stored bytes to query work.",
      "question": "How does the example reduce 900 candidate pairs to 60?",
      "answer": "Local filters reduce the inputs before their product, while preserving the same final answer.",
      "builds": [
        "Recall slot arithmetic, UTF-8 byte capacity, and the limits of stable RIDs.",
        "Follow a caller request through the operator tree.",
        "Reconstruct the candidate reduction and identify operators that still need substantial state."
      ]
    },
    "review-recovery-and-isolation": {
      "idea": "Recovery restores the required state after a crash. Isolation controls how concurrent transactions interact.",
      "question": "Can recovery infer the intended deposit lost by a bad concurrent schedule?",
      "answer": "No. Logging and recovery preserve recorded actions. Isolation must prevent the invalid schedule.",
      "builds": [
        "Place durable log information before changed data and the FORCE COMMIT log record.",
        "Retell the lost-update schedule.",
        "Locate the lock conflict and explain why snapshots still allow write skew."
      ]
    },
    "exit-mechanism": {
      "idea": "Explaining a mechanism includes naming the failure it prevents.",
      "question": "What must a useful explanation add beyond the mechanism's name?",
      "answer": "How it works and a concrete failure or cost that appears when it is absent.",
      "builds": [
        "Ask for a twenty-second storage mechanism explanation.",
        "Ask for a query-execution mechanism and its effect on work.",
        "Ask for a transaction mechanism and the failure it prevents."
      ]
    }
  },
  "10": {
    "the-analytics-stack": {
      "idea": "The same taxi rides can be stored by row or by column. An average-fare query needs only the fares.",
      "question": "What is the average fare, and which fields can this query skip?",
      "answer": "The average is (36 + 24 + 30) / 3 = $30. Pickup and payment do not contribute. Column storage keeps the fares together so the query can skip those other fields.",
      "builds": [
        "Introduce three made-up rides. Read Ride 1 aloud: JFK, card, $36. Point out that its values also appear in the column layout, under the Ride 1 labels.",
        "Follow the orange strip across Ride 1. Its pickup, payment, and fare sit together. The next strip contains Ride 2.",
        "Follow the blue outlines on the right. Each strip now holds one field across all three rides. The Ride 1, Ride 2, and Ride 3 labels preserve which values belong together.",
        "Find the six green cells: the same three fares shown once in each layout. Ask students to add 36, 24, and 30 and divide by three before advancing.",
        "Reveal $30 and compare the grouping. The result stays the same. The fare column lets the engine skip pickup and payment. Explain that these strips show groups of values, while real reads operate on pages or chunks."
      ]
    },
    "the-workload-rotates": {
      "idea": "In microdb, a slot holds a whole record. In a columnar row group, matching logical positions connect the fields of a row.",
      "question": "How do we rebuild Ride 2 from the column chunks? Does position 1 mean byte offset 1?",
      "answer": "Take logical position 1 from each chunk in the same row group: LGA, card, and $24. Position is a row ordinal, not a byte offset. Encoding, compression, and variable-length values affect how the engine locates it.",
      "builds": [
        "Use the same three rides as the opening slide. On the left, slots 0, 1, and 2 are in a toy row page. On the right, a row group holds the same rows as three separate column chunks. Define a row group as a batch of rows represented across the columns.",
        "Highlight slot 1 in block 7. RID (7, 1) identifies Ride 2, whose fields are stored together. This is the fixed-slot model from Lab 3, with status flags and headers omitted.",
        "Find position 1 in the pickup chunk. LGA enters the reconstructed row. Payment and fare are still unknown. The dashed guide marks the shared logical position.",
        "Stay at position 1 and read the payment chunk. Add card. Each chunk follows the same row order. Sorting the columns independently would break that correspondence.",
        "Read $24 from position 1 in the fare chunk. The rebuilt ride matches the left-hand slot. A chunk can contain several encoded pages, and page boundaries need not align across columns. Position 1 may require decoding. It is not necessarily a fixed-width physical slot."
      ]
    },
    "read-a-row-layout": {
      "idea": "An average-fare query needs three fares. Row storage keeps each fare beside the other fields of that ride.",
      "question": "Which values contribute to the average? What else is stored beside them?",
      "answer": "Only $36, $24, and $30 contribute. Pickup and payment values are stored beside the fares. The average is $30.",
      "builds": [
        "Use the same rides as the opening. Ask students to select the fields before advancing.",
        "Follow the three green fare cells. Orange marks unrelated neighboring fields. It does not count measured disk reads.",
        "Reveal $30. Row pages can bring along unrelated fields when a scan reaches the fares. Keep the query and data fixed for the next slide."
      ]
    },
    "read-a-column-layout": {
      "idea": "Column storage puts the needed fares together, allowing this query to skip unrelated column chunks.",
      "question": "Did we change the answer, the required fares, or the unrelated data accessed?",
      "answer": "The answer is still $30 and the same three fares contribute. The layout lets the query avoid the pickup and payment chunks.",
      "builds": [
        "Point out that only grouping has changed. All nine values are unchanged.",
        "Read the three green fares. Pickup and payment chunks stay gray because neither is needed by this query.",
        "Reveal the same $30 result. Emphasize less unrelated data, not an exact disk-read count or speed multiplier."
      ]
    },
    "the-point-lookup-reverses-it": {
      "idea": "Choose storage for the queries you run: row layouts group a record. Column layouts group a field across records.",
      "question": "Why does neither layout win for every query?",
      "answer": "A complete-ride lookup benefits from fields stored together. A fare-only aggregate benefits from skipping other fields. Both layouts can answer both queries, and actual performance depends on execution.",
      "builds": [
        "Define workload as the mix of queries the database runs. Highlight only Ride 2: LGA, card, and $24. These are the fields the first request needs.",
        "Highlight fares for every ride. The second request needs many rows but only one field. The tables depict needed values, not physical page layouts.",
        "Show both highlighted patterns together. Nothing needs to rotate when a query runs. Storage design should fit the query mix. Some systems keep both row and column copies."
      ]
    },
    "parquet-is-a-file-format": {
      "idea": "Parquet stores table data by column in a file. DuckDB reads the file and runs the query.",
      "question": "In this example, which part stores the rides, and which part calculates the average fare?",
      "answer": "rides.parquet stores the data. DuckDB is the query engine: it reads the fare values and calculates (36 + 24 + 30) / 3 = $30. The file format describes how the values are stored.",
      "builds": [
        "Start from the same three rides. Explain that a file format defines how a file stores values. Compare this with CSV rules for rows and separators. Parquet uses a binary column-oriented layout.",
        "Open the file conceptually. One row group holds these three rides as three column chunks. Read the pickup chunk, then payment, then fare. Values retain the same ride order. Metadata describes the types and where the chunks are.",
        "Introduce DuckDB as the program running AVG(fare). Highlight the fare chunk. DuckDB uses the metadata to locate the needed values. Pickup and payment chunks can be skipped.",
        "Reveal $30. The file holds data and the engine computes the result. Connect the column chunks to the next slides: their values can be encoded and compressed without changing the answer."
      ]
    },
    "compression": {
      "idea": "Lossless compression saves bytes while preserving the original values exactly.",
      "question": "How can decoding still make a scan faster overall?",
      "answer": "The reduction in bytes fetched can outweigh the decoding work.",
      "builds": [
        "Connect to column storage: values of the same field often have patterns. Identify the repeated values in this example.",
        "Encode those repeated values using fewer bytes.",
        "Reconstruct the original values and compare bytes saved with decode cost."
      ]
    },
    "runs": {
      "idea": "Run-length encoding stores consecutive repetitions as value-count pairs.",
      "question": "How should eight 1s, eight 2s, and eight 3s be represented?",
      "answer": "As three runs. In this teaching byte model, 96 bytes become 24.",
      "builds": [
        "Count the twenty-four original values.",
        "Group them into three consecutive runs.",
        "Compare payload bytes and ask what alternating values would do to the runs."
      ]
    },
    "dictionary-and-deltas": {
      "idea": "Dictionary encoding replaces repeated values with codes. Delta encoding stores differences between numbers.",
      "question": "Which pattern favors a dictionary, and which favors deltas?",
      "answer": "A small set of repeated strings suits a dictionary. A number sequence with small differences suits delta encoding.",
      "builds": [
        "Identify the two repeated string values.",
        "Replace them with codes and recover one value through the dictionary.",
        "Store a starting number plus differences and reconstruct a later value."
      ]
    },
    "batches-through-the-pipeline": {
      "idea": "Batching passes several values between operators at once while keeping the scan, filter, and projection tasks familiar from microdb.",
      "question": "If we pass the three fares as one batch, do we still test all three against fare > 25? What work can batching reduce?",
      "answer": "Yes: 36 passes, 24 fails, and 30 passes. The same two fare values are returned. Batching reduces repeated calls between operators. It does not remove the predicate checks or imply one disk read per row.",
      "builds": [
        "Recall Labs 4 and 5: plan = ProjectScan(SelectScan(TableScan(...), predicate), fields). The caller invokes plan.next(), then plan.get_val(\"fare\"). next() returns a Boolean, not a row object. Green arrows show conceptual value flow. The request chain runs inward from ProjectScan.",
        "Walk the first successful next() through ProjectScan, SelectScan, and TableScan. Fare 36 satisfies fare > 25. get_val(\"fare\") delegates down to the current row and returns 36.",
        "The second SelectScan.next() first examines 24 and rejects it, then advances the child again to find 30. One successful call exposes one match even when several input rows are inspected. A later next() returns False at exhaustion. That final call is omitted.",
        "Introduce a hypothetical batch interface using only three rows so every value is visible. These are execution batches in memory, not disk pages or Parquet row groups. Microdb already buffers pages. Its scan API is still row-at-a-time.",
        "Apply the same condition to all three fare values. A real vectorized engine can track matching positions with a selection vector. The drawing shows a keep/drop mask, not three parallel workers.",
        "Pass the matching fares together. The answer stays 36 and 30, and the predicate still runs for each input value. The repeated per-row operator-call overhead is shared. DuckDB uses column vectors grouped in DataChunks, with a default standard vector size of 2048. This toy batch is deliberately small."
      ]
    },
    "skip-a-row-group": {
      "idea": "Min/max metadata can rule out a row group without reading its values.",
      "question": "Does a surviving row group's range prove that all its rows match?",
      "answer": "No. It proves only that the group cannot yet be ruled out.",
      "builds": [
        "Inspect the min/max bounds before opening any group.",
        "Eliminate the two impossible groups.",
        "Open the possible match and evaluate its actual rows."
      ]
    },
    "skip-eleven-partitions": {
      "idea": "A partition groups rows by a value. This example stores each month in a folder of Parquet files.",
      "question": "Are a partition, a folder, and a Parquet file the same thing?",
      "answer": "A partition is a group of rows, such as all December rides. Here, the month=12 folder holds that group in Parquet files. A partition can have several files. Other database systems can manage partitions without exposing folders.",
      "builds": [
        "Define the group first: rides with the same month. Then point to its folder and the Parquet file inside. This is one year of toy data. A folder may contain several files. We draw just one.",
        "Read the folder label month=12. It tells the engine which files contain December rides, so files in the other eleven folders can be skipped. Call this partition pruning after explaining the action.",
        "Within December, read only fare chunks from the Parquet files. The month filter comes from the folder name. We have now removed unneeded months and unneeded columns. The next slide counts those two savings."
      ]
    },
    "predict-the-byte-ratio": {
      "idea": "Selecting the fare column skips other fields, and selecting December skips rides from other months.",
      "question": "The full table fills 144 equal-size squares. December fares occupy one square. What fraction of the value data do we need?",
      "answer": "One of 144 squares: 1/144 of the full value data. Each square is 5,000 values × 8 bytes = 40 KB. All 144 squares are 5.76 MB. Keeping fare divides the data by 12. Keeping December divides it by 12 again. This compares value bytes before metadata, encoding, and compression, not query speed.",
      "builds": [
        "Define every axis before calculating. The grid has twelve columns and twelve months. The toy year has 60,000 rides, exactly 5,000 per month. Every field value is eight bytes. A square represents one month of one column, not a disk page.",
        "Highlight all 144 squares as the full-table baseline. Multiply 60,000 rows × 12 columns × 8 bytes = 5,760,000 bytes, or 5.76 MB. This counts value data, not measured I/O.",
        "Keep the fare column and dim the other eleven. Twelve squares remain: 60,000 fare values × 8 bytes = 480,000 bytes, or 480 KB. This is the first division by twelve.",
        "Keep December at the bottom of the fare column. One square remains: 5,000 fare values × 8 bytes = 40,000 bytes, or 40 KB. The folder label supplies month, so no separate month column is needed.",
        "Pause for students to compare the one green square with the original 144. Ask for the fraction of data remaining before advancing. The two reductions removed columns and months, respectively.",
        "Reveal 5,760 KB / 40 KB = 144: the remaining data is 1/144 of the baseline. Two factors of twelve multiply because the choices shrink different dimensions. Real months are unequal, and actual time also includes I/O overhead, metadata, decoding, and computation. Optional extension: December with half the rides leaves 1/24, not 1/144."
      ]
    },
    "an-engine-inside-the-process": {
      "idea": "An embedded query engine executes within the application's process.",
      "question": "Does the local analytical SQL lab need a separate database server?",
      "answer": "No. The embedded engine queries files and in-process data directly.",
      "builds": [
        "Place the engine inside the application boundary.",
        "Connect its inputs to files or dataframes.",
        "Return the query result and explain how one program can use both SQL queries and dataframes."
      ]
    },
    "storage-and-compute-separate": {
      "idea": "Separating storage from compute lets their resources scale independently.",
      "question": "What remains when a compute group stops or changes size?",
      "answer": "The stored data remains available when a new compute group starts.",
      "builds": [
        "Connect one compute group to durable storage.",
        "Resize compute without treating it as another full data copy.",
        "Keep the stored data and discuss independent capacity choices."
      ]
    },
    "a-table-over-files": {
      "idea": "Transactional metadata identifies the files belonging to a consistent table snapshot.",
      "question": "Why should a reader not discover a commit by simply listing a folder?",
      "answer": "It could see partially written changes. A commit protocol must publish a consistent snapshot.",
      "builds": [
        "Read the files belonging to snapshot A.",
        "Write new files for B while A remains readable.",
        "Publish B atomically while existing readers retain their snapshot."
      ]
    },
    "train-inside-the-query-engine": {
      "idea": "A SQL aggregate query learns the intercept and slope, then saves them in a model table.",
      "question": "Why does regr_intercept need both fare and distance? Which rides may influence its result?",
      "answer": "The function fits a line relating distance to fare, so it needs the paired values from the training rides. fare is the outcome (y), and distance is the input (x). regr_intercept returns one number: the fitted fare at distance zero. The learned slope is 2. Average distance is 2.5, and average fare is 8. Thus, intercept = 8 - 2 × 2.5 = 3. WHERE split = train keeps the two rides reserved for checking the model out of the fit.",
      "builds": [
        "Name the input table before reading the SQL. fare_features is a prepared view of six made-up rides, with positive distances and nonnegative fares. distance is the feature. fare is the label. Define a test ride as a taxi-trip record reserved before training for checking the model afterward. Four rides teach the model. Two rides check predictions on data it did not learn from. The setup is in the reading and runnable script.",
        "Follow the highlighted FROM and WHERE lines. Orange rows have split = train and enter the aggregates. The two test rows stay outside fitting. Explain this logical data flow without claiming the engine must execute clauses in their written order.",
        "regr_intercept(fare, distance) uses paired fares and distances from training rides. It calculates the intercept of the fitted line. The arguments supply outcome y first and input x second. The aggregate uses all four pairs selected by WHERE.\n\nBoth regr_intercept and regr_slope describe the same least-squares line. Each returns one number from that fit. The intercept depends on how fare changes with distance, so fares alone cannot determine it. count(*) records how many training rows contributed.",
        "Highlight CREATE TABLE and read the saved row: intercept 3, slope 2, training_rows 4. SELECT * FROM fare_model lets students inspect what training produced.",
        "Turn the saved coefficients into predicted fare = 3 + 2 × distance. The intercept is the fitted value at zero miles and the slope adds two dollars per mile in this toy model. To explain why the intercept needs both columns, use intercept = average fare - slope × average distance. The four training rides have average fare 8 and average distance 2.5, giving 8 - 2 × 2.5 = 3.\n\nNo training ride has distance zero. The model estimates that crossing. The fitted intercept does not establish an actual taxi base fare."
      ]
    },
    "evaluate-and-apply-the-model": {
      "idea": "SQL can apply the saved model, compare predictions with actual fares, and score a new ride.",
      "question": "Why do the test query and the new-ride query both use fare_model, but only the test needs actual fares?",
      "answer": "A test ride is a recorded trip reserved for checking the model after training. Both queries reuse the learned intercept and slope. For the 2.5-mile test ride, the model predicts $8. The recorded fare is $9, so the prediction misses by $1.\n\nThe other test ride predicts $12 against $11, giving a $1 mean absolute error across both. Their actual fares did not influence training. A new 3.5-mile ride needs only distance and the saved model to predict $10. Its actual fare is needed later to measure error.",
      "builds": [
        "Say 'rides reserved for checking the model' before using the shorthand 'test rides.' These are recorded trips with known distances and fares, set aside before training. Read WHERE r.split = test and find those two rows. Their fares did not help learn the coefficients. We now use each distance to predict a fare, then compare with its recorded fare. Keep the saved model fixed and leave the predictions as question marks until the class has tried the calculation.",
        "Read CROSS JOIN as pairing each test ride with the single model row. Substitute 3 and 2 into the prediction expression, and ask for the two predictions before advancing.",
        "Reveal 8 and 12. CREATE VIEW names this query held_out_predictions so the next query can use its results. A normal view stores the query definition rather than materializing a new table.",
        "Read the new SQL query: subtract prediction from actual fare, take abs so both misses count positively, then average. Both absolute errors are $1, giving a $1 MAE. The query also reports test_rows = 2 and RMSE = $1. RMSE takes the square root of the mean squared errors. Two made-up test rides cannot establish real-world accuracy.",
        "Read VALUES (7, 3.5) as one new ride with ID 7 and distance 3.5. The ID labels the result. Only distance contributes to prediction. CROSS JOIN retrieves the same saved model coefficients. Ask for the new prediction before advancing.",
        "Reveal 3 + 2 × 3.5 = $10. This SELECT applies the model without calling a regression aggregate or changing fare_model. The complete runnable demo also keeps ride IDs and reports RMSE."
      ]
    },
    "performance-becomes-cost": {
      "idea": "Reducing data movement can affect query cost as well as execution time.",
      "question": "Does every warehouse charge according to the same bytes-scanned rule?",
      "answer": "No. Billing models differ, and improvements must be evaluated against the system's actual cost model.",
      "builds": [
        "Identify the bytes read by the broad query.",
        "Project one column and discuss the reduction in scanned data.",
        "Prune to one partition and distinguish byte savings from measured elapsed time."
      ]
    },
    "choose-the-shape": {
      "idea": "Choose a storage layout and execution plan that suit the queries you expect to run.",
      "question": "Which stage learns model coefficients, and which reuses them?",
      "answer": "Training aggregates learn the coefficients. Inference applies the saved model without fitting it again.",
      "builds": [
        "Choose a layout for a complete-record point lookup.",
        "Explain projection, encoding, and batching for a whole-table aggregate.",
        "Add partition pruning, then connect the same operators to training and inference."
      ]
    },
    "more-models-with-duckdb": {
      "idea": "DuckDB can prepare data for a neural network and query its predictions.",
      "question": "In the core PyTorch lab, which component updates the neural-network weights?",
      "answer": "PyTorch updates the weights. DuckDB selects January–October training rows and sends batches through Arrow. During prediction, a DuckDB SQL function calls the already-trained PyTorch model. November–December rides are reserved for checking errors.",
      "builds": [
        "Start with the DuckDB + PyTorch link and then open the core Lab 8 investigation. Distinguish the official article’s pretrained linear model from the lab’s small neural network. Both use the same integration idea. Point out that the community ML extension and the SQL-only research paper are alternative approaches. Ask students to compare the neural network with the straight-line baseline on the same reserved rides. More model complexity does not guarantee lower error."
      ]
    },
    "duckdb-pytorch-fare-model": {
      "idea": "DuckDB supplies the data and calls a prediction function. PyTorch trains and runs the neural network.",
      "question": "Does SELECT predict_fare_nn(distance) train a new model for each ride? When do we use the recorded test fares?",
      "answer": "No. The SQL function calls the trained PyTorch model with fixed weights. It receives only distances. We compare its predictions with the recorded test fares afterward to measure error. Those fares never helped fit the network or its scaling.",
      "checks": [
        {
          "question": "Why sort the training rides by hash(ride_id)?",
          "answer": "It mixes rides before forming batches so they do not follow date order. It is optional, and this example repeats the same mixed order on every pass. The month filter still excludes test rides."
        },
        {
          "question": "What do 1, 16, and 1 count in the network?",
          "answer": "One input feature per ride, 16 hidden units, and one output value per ride. These numbers describe the network, not the number of rides in a batch."
        },
        {
          "question": "Why does the 5-mile ride become 1 after scaling?",
          "answer": "The training mean is 3 miles and the std is 2 miles: (5 - 3) / 2 = 1. This means one standard deviation above the training average, not a one-mile ride."
        },
        {
          "question": "The model returns 0.8. Is that an 80-cent fare?",
          "answer": "No. It is a scaled fare prediction. We first compare it with the scaled recorded fare for training, and later use the saved fare mean and std to convert it to dollars."
        },
        {
          "question": "Do the positive 0.2 error and negative 0.2 error cancel?",
          "answer": "No. MSE squares each error first. Both become 0.04, and the mean is 0.04. Squaring prevents opposite signs from canceling."
        },
        {
          "question": "What dollar prediction does 0.8 represent with fare mean $20 and std $10?",
          "answer": "0.8 times $10 plus $20 is $28. This conversion uses saved training statistics and does not require the new ride’s actual fare."
        },
        {
          "question": "Does registering predict_fare_nn train another network?",
          "answer": "No. It connects a SQL function name to a Python callback that reuses the trained model and its saved scaling statistics."
        },
        {
          "question": "Does type=\"arrow\" mean the SQL argument is a list of rides?",
          "answer": "No. SQL still supplies one DOUBLE distance per row. DuckDB groups those values into an Arrow column batch before calling Python. [\"DOUBLE\"] declares one numeric SQL argument, not an array argument or a batch size."
        },
        {
          "question": "If the input distances are [3, 5], may the callback return fares [28, 22]?",
          "answer": "Not for these illustrative predictions. Position 0 belongs to the 3-mile ride and must return 22. Position 1 belongs to the 5-mile ride and must return 28. Return the same number of values in matching positions, or the fares would be attached to the wrong rides."
        },
        {
          "question": "Do these recorded test fares enter the prediction function?",
          "answer": "No. The function receives distances. The recorded fares remain available to check the predictions afterward."
        },
        {
          "question": "Can we compare the toy loss of 0.04 directly with this dollar MAE?",
          "answer": "No. The 0.04 was mean squared error on scaled fares for an invented two-ride batch. This MAE is the average absolute dollar error on 10,000 real reserved rides."
        }
      ],
      "builds": [
        "Introduce the real taxi sample, replacing the earlier six made-up rides. The month filter keeps 50,000 January–October rides for training. DuckDB selects distance and fare before sending Arrow batches of up to 1,024 rows to Python. Define Apache Arrow as a format for column data in memory that these tools can exchange.\n\nDefine a tensor as a numeric array. Distances become x and fares become y. November–December rides remain reserved for testing. ORDER BY hash(ride_id) mixes the training rides so batches do not follow the file’s date order.\n\nThe hash maps each ride ID to a scrambled numeric value, and sorting those values gives a repeatable mixed order within this run. Mixing is helpful for batch training but is not required by DuckDB or PyTorch. This example repeats the same mixed order on every pass. Many training pipelines reshuffle on each pass.\n\nThe WHERE filter still keeps test rides out.",
        "Trace the nodes from left to right. One distance input connects to all 16 hidden nodes. All 16 hidden nodes connect to one fare output. Match the blue connections to nn.Linear(1, 16) and the green connections to nn.Linear(16, 1).\n\nEach line represents a learned weight. Each hidden node combines its weighted input with a learned bias, then applies ReLU. The output combines the 16 hidden values with another learned bias. The diagram omits biases and scaling for readability.\n\nThe code standardizes distance and fare using training statistics, and the prediction callback converts the output back to dollars. ReLU keeps positive values and sets negative ones to zero, letting the fitted relationship bend. The network is created once. For each batch, make predictions.\n\nMeasure the error. Clear old gradients. Calculate new gradients with backward. Update weights with optimizer.step.\n\nPyTorch performs this learning. The excerpt omits setup and loops, which are in the lab script. x_mean, x_std, y_mean, and y_std come only from training rows.",
        "Pause at the first line. x is a batch of recorded distances, one per ride. x_mean and x_std are the average and population standard deviation of all training distances, calculated once before training. Standard deviation measures spread. Subtracting the mean centers the values. Dividing by std expresses them in units of that spread.\n\nIn this invented example, assume the full training set gave mean 3 miles and std 2 miles. A 3-mile ride becomes 0, and a 5-mile ride becomes 1. The displayed batch does not determine those statistics. Scaling often helps optimization by keeping typical values near zero.\n\nIt does not add information or guarantee better predictions. The same training statistics are reused for later rides.",
        "Now follow both lines. model receives only the scaled distances and returns one scaled fare prediction per ride using its current weights. y contains the recorded training fares. The second line scales y using the fare mean and fare std so prediction and target have matching units. Distance and fare have separate means and standard deviations. Assume fare mean 20 dollars and std 10 dollars: recorded fares 20 and 30 become targets 0 and 1.\n\nFor illustration, suppose the network outputs 0.2 and 0.8. These outputs are made up, not results from fitting the two shown rides. They are not dollar amounts. Negative scaled values are also valid: they mean below the training average.\n\nActual fares serve as training targets. They are not inputs to model.",
        "In the script, loss_fn is nn.MSELoss with its default mean reduction. For each ride, subtract the scaled target from the prediction and square that difference. The errors are 0.2 and minus 0.2. Squaring gives 0.04 for each, and their average is 0.04.\n\nThis one number scores the whole batch in squared standardized-fare units. A lower value means closer predictions on this batch. It is different from the MAE in dollars shown later. The prediction and loss lines do not change weights. optimizer.zero_grad clears previous gradients. loss.backward calculates how each weight and bias affects loss. optimizer.step uses those gradients to update the parameters.",
        "Undo the fare scaling when returning predictions to SQL. Multiply the network output by the saved training fare std, then add the saved training fare mean. Here 0.2 times 10 plus 20 gives 22 dollars, and 0.8 times 10 plus 20 gives 28 dollars. The recorded fares were 20 and 30, so each toy prediction has a 2-dollar absolute error and their MAE is 2 dollars.\n\nThe scaled training loss was 0.04, not 0.04 dollars. This conversion only needs the prediction and saved training statistics. It does not need the actual fare of a new ride. The real predict_fare callback applies this conversion to every returned batch.",
        "Define Apache Arrow as a format for column data in memory. An Arrow Python UDF is a function we provide to DuckDB that receives and returns batches in that format. UDF means user-defined function. Read the registration arguments. predict_fare_nn is the SQL name. predict_fare is the Python function. [DOUBLE] declares one numeric SQL input.\n\nDOUBLE declares one numeric result per row. type=arrow selects the batch interface. The callback converts distances to tensors, applies the trained model, and returns Arrow values. The function exists on this local DuckDB connection.",
        "Follow the input table into predict_fare(distances). DuckDB gathers a batch of distance values and supplies it as a PyArrow ChunkedArray, an Arrow column that can contain multiple chunks. The drawing shows just two values from the earlier invented example. Python receives the batch in one call, rather than a separate call for every scalar distance.\n\nThis reduces Python call overhead and lets the model process tensors in batches. DuckDB chooses the UDF batch sizes. The earlier to_arrow_reader(batch_size=1024) controls the training-data reader, not these SQL prediction calls. Arrow carries the values.\n\nPyTorch computes the predictions.",
        "Follow the callback. Convert Arrow values to a tensor. Scale the distances. Run the fixed model.\n\nRestore dollar units. Package the results with pa.array. pa is the pyarrow module imported by the lab script. Reveal the illustrative outputs 22 and 28 from the previous example. Each output must occupy the same batch position as its corresponding input, and the array lengths must match.\n\nSorting the outputs inside the callback would misassign the fares. These positional requirements do not promise any overall SQL result order. Our callback uses torch.tensor, which copies data. Arrow alone does not make the whole path free of copying.\n\nNo weights change during this prediction call.",
        "Read the filter month >= 11 and the SQL function call. These are 10,000 rides the model did not train on. Read the first two example predictions from the completed lab run: 15.17 versus 20.50 dollars, then 9.50 versus 10.00 dollars. SQL sends distances to PyTorch. The recorded fares are available for comparison but do not enter the prediction function. The network weights remain fixed.",
        "The lab script saves both models’ outputs in predictions. Read avg(abs(fare - prediction)) as the average size of the dollar error. Compare 3.53 dollars for the straight line with 3.26 dollars for the network on the same reserved rides. This is one measured run, with 30 epochs and seed 6042. More complexity need not improve every distance group. Point to Lab 8 for the plots, then introduce the optional BigQuery ML example as Google’s managed SQL alternative."
      ]
    },
    "managed-model-sql": {
      "idea": "BigQuery ML is Google’s cloud service for training and using machine-learning models through SQL.",
      "question": "Why does CREATE MODEL use NO_SPLIT while ML.EVALUATE still receives separate test rides?",
      "answer": "WHERE split = train already supplies only training rows. NO_SPLIT uses all those supplied rows for fitting. ML.EVALUATE receives the held-out test rows separately, while ML.PREDICT needs only a new distance.",
      "builds": [
        "Define the name before reading the code: BigQuery is Google’s cloud database for analytics, and ML means machine learning. BigQuery ML lets us train and use supported models through SQL while Google manages the computing infrastructure. This optional GoogleSQL example has demo.ml_rides already loaded in the project identified by YOUR_PROJECT. Read CREATE MODEL, input_label_cols = fare, and the training-only WHERE filter.\n\nNO_SPLIT uses the supplied training rows. The other options specify unregularized least squares. BigQuery saves a managed model object.",
        "Read ML.EVALUATE with the saved model and a SELECT for split = test. Both distance and actual fare are present because evaluation compares predictions with known outcomes. mean_absolute_error has the same meaning as the DuckDB calculation. BigQuery also returns mean_squared_error. Its square root corresponds to RMSE.",
        "Read ML.PREDICT with the same saved model and SELECT 7 AS ride_id, 3.5 AS distance. The result includes predicted_fare. Point to the reading for setup, permissions, billing, and fully qualified project names. The local DuckDB demo requires no cloud account."
      ]
    }
  },
  "11": {
    "meaning-becomes-geometry": {
      "idea": "A useful passage can use different words from the question. Vector search can help find it, but the result still needs checking.",
      "question": "Why does this exact phrase search miss a passage that could help answer the question?",
      "answer": "The passage does not contain the whole question as an exact phrase. It describes one possible cause of poor predictions with different words.",
      "builds": [
        "Maya’s model performs well on training data but poorly on new data. She searches her machine learning notes for an explanation. This is a fictional classroom example. Read the question and passage aloud. Ask whether overfitting could explain the pattern. Pause before advancing.",
        "Use the whole question as the exact search phrase. Show that this phrase does not occur in the passage. This example explains one exact phrase search. It does not claim that every keyword search or B+ tree lookup fails.",
        "Follow the arrows from the question through vector search to a possible passage. Define an embedding as a numeric representation of text. The next slide shows how the model creates that representation. No model was run for this fictional example. The arrows illustrate a possible result, not a measured or guaranteed match. Read any returned passage to check whether it answers the question."
      ],
      "checks": [
        {
          "question": "Can this passage help explain Maya’s poor predictions on new data?",
          "answer": "Yes. Overfitting is one possible cause of this pattern. The passage does not establish why her particular model fails."
        },
        {
          "question": "Does this passage contain the whole question as an exact phrase?",
          "answer": "No. The wording differs, so this exact phrase search misses the passage."
        },
        {
          "question": "Does vector search guarantee that a returned passage answers the question?",
          "answer": "No. It ranks numeric representations of text. Read the returned passage to check its relevance."
        }
      ]
    },
    "embedding": {
      "idea": "Use compatible models and settings to create comparable question and passage vectors.",
      "question": "Do equal dimensions make two embedding models compatible?",
      "answer": "No. The model versions, coordinate systems, preprocessing, and similarity metric must also be compatible.",
      "builds": [
        "Follow the passage about overfitting into the embedding model.",
        "Point to the four example coordinates. These values illustrate a vector. They are not output from an embedding model.",
        "Ask whether the question can use an unrelated model. Explain which settings must remain compatible."
      ]
    },
    "direction-and-normalization": {
      "idea": "Cosine similarity compares directions. For vectors of length one, the dot product gives the same score.",
      "question": "What does (3, 4) become after unit normalization?",
      "answer": "It becomes (0.6, 0.8). The dot product of unit vectors equals their cosine similarity.",
      "builds": [
        "Identify the query arrow q and stored-vector arrow v. Ask which direction is closer to q. Check that students can compute (0.8, 0.6) dot (0.6, 0.8). The result is 0.48 + 0.48 = 0.96.",
        "Before advancing, ask what happens to cosine similarity when v turns toward q. Reveal the rotation. Changing length alone leaves cosine similarity unchanged.",
        "Normalize (3, 4) to (0.6, 0.8). The operation divides each coordinate by the vector length. For unit vectors, squared Euclidean distance is 2 − 2q·v. Increasing the dot product therefore gives the same ranking as decreasing squared distance. Use the metric required by the embedding model."
      ]
    },
    "the-exact-baseline": {
      "idea": "Save the exact top-k result IDs before trying a method that skips vectors. These IDs let you identify missed neighbors.",
      "question": "Why do we save the exact result before trying approximate search?",
      "answer": "It supplies the reference top-k IDs for the chosen query, metric, and tie rule. Comparing IDs reveals which exact neighbors approximate search missed.",
      "builds": [
        "Introduce k as the number of requested results. This example uses k = 10. Ask whether a loop can skip a vector without another index or a bound on its score. It cannot know the final top ten until every vector is scored.",
        "Score the first 24 vectors. Keep the ten highest scores among those vectors. Explain that the result is still provisional.",
        "Score the next 24 vectors. Ask whether an unscored vector could replace one of the current top ten. Keep the query and metric fixed.",
        "Score the last 24 vectors. Save the ten result IDs as the exact baseline. An ID identifies the stored vector and lets us retrieve its passage. The baseline establishes geometric neighbors, not passage relevance."
      ]
    },
    "price-the-baseline": {
      "idea": "Exact-search arithmetic grows with the number of vectors, their dimensions, and the query rate.",
      "question": "Do operation counts determine elapsed time?",
      "answer": "No. Memory traffic, batching, result selection, concurrency, and hardware also affect elapsed time.",
      "builds": [
        "Calculate 4,000 × 64 = 256,000 coordinate multiplications for one query. Connect each factor to stored vectors and coordinates per vector.",
        "Before revealing the result, calculate 1,000,000 × 1,536. The result counts coordinate multiplications, not seconds. Independent dot products can run in parallel.",
        "Calculate the work for ten million vectors at 100 queries per second. Ask which factor changes when more users send questions. Memory traffic, batching, result selection, concurrency, and hardware also affect runtime. Measure latency, memory, construction time, update work, and recall before choosing an index."
      ]
    },
    "skipping-with-a-contract": {
      "idea": "Searching fewer candidates can miss exact neighbors. Measure that loss against saved exact results.",
      "question": "Does approximate search identify all its missed exact neighbors during a query?",
      "answer": "No. A separate exact baseline identifies those missed neighbors.",
      "builds": [
        "Define a candidate as a stored vector that the search will score. Point to the selected region and a nearby vector outside it. Ask whether the search can return a vector it never examines.",
        "Expand the candidate set. Keep the query, stored vectors, and metric unchanged. Ask what extra work the next region adds.",
        "Compare approximate result IDs with the saved exact IDs. Count the exact neighbors that did not return. Introduce recall as the fraction of exact neighbors returned. Reserve representative questions for evaluation."
      ]
    },
    "build-an-ivf-index": {
      "idea": "IVF groups vectors before queries arrive. Each query selects lists by centroid score and then searches their vectors.",
      "question": "What moves when the construction algorithm updates a centroid?",
      "answer": "The group center moves to the average of its assigned vectors. The stored vectors stay fixed. Assignment can then move vectors between lists.",
      "builds": [
        "Expand IVF as inverted file. Define a centroid as a numeric center used to represent a group. Compare a list to a shelf of books. The centroid is the shelf label, and stored vectors are the books. Labels help choose shelves, but a useful book can be on a shelf we skip.",
        "Assign each vector to its nearest centroid. Connect the lines to list membership. Actual membership follows vector geometry, not topic labels. This construction step happens before queries use the lists.",
        "Follow each arrow from an old centroid to its new average. Average each coordinate separately. For example, (2, 4) and (6, 8) have average (4, 6). This arithmetic example is separate from the plotted groups. Reassign each vector to its nearest updated centroid.\n\nRepeat averaging and assignment until assignments stop changing or the iteration limit is reached. The stored vectors stay fixed. Lab 9 supplies this k-means construction.",
        "Inspect the completed lists. Each list retains vector IDs and access to the corresponding vectors. These IDs connect returned neighbors to source passages. Ask what happens if a query skips a list containing a nearby vector. The next example makes that miss visible."
      ]
    },
    "count-the-saved-work": {
      "idea": "Count both IVF stages: centroid comparisons first, then candidate-vector comparisons inside selected lists.",
      "question": "What is the estimate for n = 4,000, C = 20, and P = 4 with equal list sizes?",
      "answer": "The estimate is 20 + 4 × (4,000 / 20) = 820 comparisons. Exact search uses 4,000 comparisons.",
      "builds": [
        "Return to the four-vector example. Separate centroid comparisons from candidate-vector comparisons. Apply the same two-part count to 4,000 stored vectors.",
        "Count C = 20 centroid comparisons. Each comparison helps select a list, but does not yet score its stored vectors.",
        "Assume balanced lists, with 4,000 / 20 = 200 vectors per list. P = 4 means four lists are searched. Ask pairs to calculate 4 × 200 before revealing the total.",
        "Add 20 centroid comparisons to 800 candidate comparisons. The estimate is 820. Unequal list sizes explain why the later Lab 9 measurement is 924 rather than 820. Both counts describe comparisons, not elapsed time. Ask why d cancels from this simplified work ratio."
      ]
    },
    "navigate-a-graph": {
      "idea": "HNSW searches linked stored vectors across several graph layers.",
      "question": "Why can links across a large distance help the search?",
      "answer": "These links can reach another region before the search examines nearby candidates in more detail.",
      "builds": [
        "Introduce the graph as another approximate index. Its nodes represent stored vectors.",
        "Follow one upper-layer link toward the query.",
        "Compare the long link with several short links.",
        "Continue at the same vector in the next lower layer.",
        "Examine local neighbors. Full HNSW maintains candidate sets. The drawing shows only one path.",
        "Introduce ef_search as a setting for the candidate set. Increase the setting. Measure recall and work again. This example does not establish an exactness or worst-case time guarantee."
      ]
    },
    "measure-a-miss": {
      "idea": "Recall@k is the fraction of exact top-k IDs that also appear in the approximate result.",
      "question": "Which exact neighbors are missing, and what is recall@10?",
      "answer": "IDs 4, 7, and 10 are missing. Seven exact neighbors returned. Recall@10 = 7/10 = 0.70 = 70%.",
      "builds": [
        "Use these two example result lists for one query. The top row contains exact IDs 1 through 10. Each number identifies a stored vector, not a result rank. Ask students to identify shared IDs before revealing colors.\n\nThese lists illustrate overlap. They are separate from the preceding HNSW graph and the earlier IVF fixture.",
        "Identify the seven green IDs: 1, 2, 3, 5, 6, 8, and 9. Both rows contain these IDs. The orange IDs 4, 7, and 10 are missing from the approximate result. The blue IDs 11, 14, and 20 appear instead.\n\nAn unprobed list is an IVF list that the query did not search. IVFFlat scores every candidate exactly within searched lists. Use the same metric and tie rule as exact search. Under these conditions, a missed exact neighbor must be in an unprobed list. These result rows do not identify the searched lists.",
        "Count each shared ID once. Seven shared IDs out of ten exact neighbors give recall@10 = 70%. The extra IDs do not increase recall. Ask whether recall 1.0 would prove that the passages answer the question. It would prove only agreement with exact vector search under the same metric and tie rule."
      ]
    },
    "choose-an-operating-point": {
      "idea": "Choose a measured search setting that meets both the recall requirement and the comparison limit.",
      "question": "Which listed setting meets mean recall ≥ 0.90 and a limit of 1,000 mean comparisons?",
      "answer": "P = 4 meets both requirements. Its mean recall is 0.9175. Its mean comparison count, rounded down, is 924.",
      "builds": [
        "Identify these values as Lab 9 measurements, not the balanced-list estimate. The dataset contains 4,000 arXiv vectors and 40 questions. The plotted count is the mean comparisons per query, rounded down. Recall is averaged across the questions.",
        "Require mean recall ≥ 0.90 for this classroom choice. Ask which plotted settings meet the requirement. Let students identify the settings before adding the work limit.",
        "Add the limit of 1,000 mean comparisons. P = 1 and P = 2 miss the recall requirement. P = 8 exceeds the comparison limit. P = 4 meets both with mean recall 0.9175 and floored mean count 924.\n\nA project needs a justified recall requirement based on missed evidence. Compare elapsed time separately. Fewer comparisons do not by themselves establish faster responses."
      ]
    },
    "memory-and-update-budgets": {
      "idea": "Compare storage, construction time, and update work as well as query work.",
      "question": "What uses memory besides lists and graph links?",
      "answer": "The system also stores vectors, metadata, and data structures needed during execution.",
      "builds": [
        "List everything IVF retains: vectors, centroids, and list entries. Include metadata and working data structures. Ask whether counting comparisons measures any of this memory.",
        "Add the stored HNSW neighbor links. Measure graph construction time as well as link memory. The illustration shows an in-memory graph. Implementations can differ.",
        "Explain that compression stores smaller vector representations. Methods such as product quantization can change similarity scores and rankings. Measure recall again after compression. Include update behavior and construction time when comparing configurations."
      ]
    },
    "where-the-index-lives": {
      "idea": "Editing a passage does not update its vector. The application must replace the vector with an embedding of the new text.",
      "question": "Does storing an index in a database automatically create an embedding for changed text?",
      "answer": "No. The application or a configured update process must call the embedding model and update the index. A separate vector service is optional.",
      "builds": [
        "Identify passage 42 and index entry 42. Both refer to text version 1. These version labels illustrate matching text and vectors, not measured model outputs.",
        "Change passage 42 to text version 2. Keep the old vector visible. Ask which text the vector still represents. The answer is version 1, so search scores no longer describe the current passage.",
        "Send the changed text through the compatible embedding model. Replace the vector in index entry 42. Confirm that passage and vector now refer to text version 2.\n\nA database, embedded library, or separate service can store the index. Every design needs an update process. Database storage alone does not call the embedding model. A separate vector service is optional."
      ]
    },
    "diagnose-the-index": {
      "idea": "Missing exact neighbors indicate a search problem. Unhelpful exact neighbors require a separate check of the passage representation and ranking.",
      "question": "What should we inspect if exact and approximate results agree but neither helps explain the poor predictions?",
      "answer": "Inspect how passages were split, their embeddings, metadata, and ranking. More probes do not change existing vector scores or make an unhelpful passage useful.",
      "builds": [
        "Return to Maya’s question about poor predictions on new data. Compare approximate IDs with exact IDs. Ask whether exact neighbors are missing before deciding how to adjust the search.",
        "Increase the probe count or graph search breadth. Compare the IDs again. If missed exact neighbors return, the wider search explains that improvement.",
        "Read the returned passages. If exact neighbors are also unhelpful, inspect passage boundaries, embeddings, metadata, and ranking. Separate geometric recall from relevance before evaluating generated answers. The diagram illustrates a diagnosis. Its example IDs do not establish passage relevance."
      ]
    },
    "rebuild-the-retrieval-contract": {
      "idea": "Save exact IDs, search fewer candidates, compare IDs, and read passages. Each step answers a different question about retrieval.",
      "question": "Why can recall 1.0 coexist with an answer that lacks useful evidence?",
      "answer": "Recall 1.0 means the approximate result contains every saved exact neighbor. It does not show that those passages answer the question or support a generated claim.",
      "builds": [
        "Return to Maya’s question about poor predictions on new data. Ask why Maya saved the exact result IDs. They establish which geometric neighbors the approximate search should recover.",
        "Ask which vectors IVF or HNSW can skip. Connect a larger search setting to more candidate work. Keep the query, metric, and baseline fixed during the comparison.",
        "Measure recall across representative questions. Ask why one successful question is insufficient evidence for choosing a setting. Record comparison counts, latency, and memory as well.",
        "Ask a student to explain the four steps in order. Save exact IDs. Search fewer candidates. Compare IDs. Read passages.\n\nAsk why the nearest centroid can belong to a list that omits the nearest vector. Then ask what recall 1.0 leaves unproved. The next lecture follows a retrieved passage into the model prompt and checks which answer claims it supports."
      ]
    }
  },
  "12": {
    "evidence-reaches-the-answer": {
      "idea": "Keep each retrieved passage with its source ID, then check whether it supports the answer’s claims.",
      "question": "Does a retrieved passage’s score identify its source or prove an answer is supported?",
      "answer": "No. Use the result’s stored position to look up its source record, then read the passage to check the claim.",
      "builds": [
        "Calibrate: ask what an index position identifies and what geometric recall does not prove. Then enter Maya and Noor’s fictional recovery-question rehearsal. Show the source record before discussing the answer. Start with the changed source in the corpus.",
        "Retrieve the relevant subset with its source identifier.",
        "Generate an answer and check whether the evidence supports its claims."
      ]
    },
    "retrieval-augmented-generation": {
      "idea": "RAG separates document ingestion from retrieval and generation for each question.",
      "question": "Which work reruns when one document changes?",
      "answer": "Update its affected chunks, embeddings, and index entries. Each question separately retrieves and assembles evidence.",
      "builds": [
        "Link the new pipeline to the open-book comparison: selected pages are evidence, page references are source IDs, and the generator writes the answer. Trace ingestion and question time separately. Chunk documents during ingestion.",
        "Embed the chunks in the chosen representation.",
        "Store searchable vectors with source identities.",
        "At question time, retrieve the relevant evidence.",
        "Assemble context and generate. The lab mocks generation for offline checks."
      ]
    },
    "three-places-for-knowledge": {
      "idea": "Weights, full context, and retrieval provide different ways to supply information.",
      "question": "Which approach can preserve an explicit, updateable source trail?",
      "answer": "Retrieval, provided source identities and versions survive through context assembly and citation.",
      "builds": [
        "Compare three ways to supply information: model weights, the full corpus in the prompt, and retrieved passages. Ask how each approach handles a changed source and how much text each question must process. Start with the limits of retrieving fresh facts from learned weights.",
        "Place the corpus in context and consider its size and evidence-use costs.",
        "Retrieve a subset with source IDs and evaluate its support for the answer."
      ]
    },
    "design-the-retrieval-record": {
      "idea": "A useful chunk preserves enough coherent context to support the intended question.",
      "question": "Why not always use the smallest possible fragment?",
      "answer": "It can split a claim from the context needed to interpret references or pronouns.",
      "builds": [
        "Noor finds “it” without its definition in the selected chunk. Ask where to put the record boundary so the claim remains interpretable before discussing target sizes. Identify the document's topics.",
        "Choose boundaries around the topic needed for the question.",
        "Split too finely and inspect the lost context.",
        "Add overlap and discuss its extra index and prompt cost."
      ]
    },
    "a-synonym-failure": {
      "idea": "Exact retrieval can still fail when its representation misses a paraphrase.",
      "question": "Is the buffer-pool paraphrase failure caused by ANN approximation?",
      "answer": "No. The browser searches exactly. Its hashed-word representation does not bridge the vocabulary change.",
      "builds": [
        "Maya’s paraphrase misses the source even though result positions map to the correct records. Ask whether ANN caused the miss, then reveal that this widget uses exact search. Read the first buffer-pool question and its retrieved source.",
        "Read the paraphrase and compare the result.",
        "Confirm the shared information need, then test representation changes."
      ]
    },
    "build-an-evaluation-set": {
      "idea": "Retrieval evaluation needs independently labeled evidence and questions held out from tuning.",
      "question": "Should the current system's answer decide which sources are relevant?",
      "answer": "No. Relevance needs an explicit evidence judgment independent of the system being evaluated.",
      "builds": [
        "Noor asks how to tell whether a change helps beyond one question. Have pairs write a question requiring a particular passage and label that evidence before seeing the retriever’s results.",
        "Ask another person to label its supporting sources.",
        "Hold out partner questions and include paraphrases, negatives, and unanswerable cases."
      ]
    },
    "presence-in-the-top-results": {
      "idea": "Hit@k asks whether any relevant source appears among the first k results.",
      "question": "Does moving a relevant result from rank three to rank one change hit@3?",
      "answer": "No. Both are hits. Two of the three pictured questions hit, giving 2/3.",
      "builds": [
        "Read the three ranked lists before showing the formula. Ask whether a relevant source at rank three counts as a hit in the top three.",
        "Mark independently labeled relevant items.",
        "Score whether each question hits within the first three results.",
        "Average the two hits and one miss to obtain about 0.67."
      ]
    },
    "rank-changes-the-score": {
      "idea": "Reciprocal rank rewards placing the first relevant result earlier.",
      "question": "What is the mean of reciprocal ranks 1, 1/3, and 0?",
      "answer": "4/9, approximately 0.444, for these truncated result lists.",
      "builds": [
        "Keep the same three lists. Ask how we could reward placing relevant evidence earlier, then calculate each reciprocal rank before taking the mean.",
        "Find the first relevant result in each list.",
        "Assign reciprocal ranks 1, 1/3, and 0.",
        "Average them and separate ranking quality from answer faithfulness."
      ]
    },
    "measure-chunking-instead-of-guessing": {
      "idea": "Chunking choices should be compared with the same labeled questions and retrieval setup.",
      "question": "Which supplied chunk sizes tie, and why is that result limited?",
      "answer": "60 and 90 words tie on this small corpus of already short sources. It does not establish a rule for long documents.",
      "builds": [
        "Now return to the measured twelve-question fixture. Keep the embedder, cutoff, and questions fixed while comparing the chunk sizes. Read the 10-word result: 67 chunks, hit@3 of 0.75, and MRR@3 about 0.667.",
        "Read the 60-word result: 25 chunks, hit@3 about 0.917, and MRR@3 about 0.778.",
        "Compare 90 words: 24 chunks with the same scores, and discuss the corpus's short sources."
      ]
    },
    "context-has-a-budget": {
      "idea": "Choose passages that cover the question without filling the prompt with repeated or irrelevant text.",
      "question": "Does sorting the same retrieval scores again create a reranker?",
      "answer": "No. Reranking needs another relevance signal over the candidate set.",
      "builds": [
        "The retrieved candidates do not all fit in the prompt. Inspect them for relevant evidence, repeated information, and unrelated text before choosing which to include.",
        "Use a new relevance signal to choose a smaller evidence set.",
        "Assemble the evidence with source IDs and deliberate ordering."
      ]
    },
    "two-retrieval-paths": {
      "idea": "Semantic retrieval and exact-token retrieval can contribute complementary candidates.",
      "question": "Why not simply add raw scores from unrelated retrievers?",
      "answer": "Their scales may differ. Fusion needs a justified method and evaluation.",
      "builds": [
        "The next question includes an exact error code. Predict where keyword search might help before proposing fusion or reranking. Use semantic retrieval to connect paraphrases.",
        "Use exact-token retrieval for a distinctive error code.",
        "Merge candidates with a justified fusion method.",
        "Rerank the combined set using question-passage relevance."
      ]
    },
    "filters-change-the-candidate-set": {
      "idea": "Authorization must constrain which chunks can become evidence.",
      "question": "Can access control rely on asking the model to ignore forbidden passages?",
      "answer": "No. The system must enforce authorization before unauthorized content becomes evidence.",
      "builds": [
        "Before any candidate becomes evidence, ask whether the current user is allowed to receive it. Authorization is a constraint, not a relevance score. Identify all stored chunks and their access metadata.",
        "Restrict candidates to the authorized subset.",
        "Retrieve top-k within the supported filtered plan and check its recall behavior."
      ]
    },
    "a-changed-source-invalidates-copies": {
      "idea": "Changing a document can make its chunks and vectors stale. Changing the embedding model requires compatible replacement vectors.",
      "question": "What must change when the embedding model changes?",
      "answer": "Every stored vector must be regenerated compatibly. Record model revision and preprocessing as well as its name.",
      "builds": [
        "Maya edits D7. Find the chunks and vectors still based on its old text. Identify their source and model versions, then ask how changing the embedding model would affect the rest of the index.",
        "Change a document and locate its stale chunks.",
        "Build compatible replacement embeddings and index entries.",
        "Switch queries to the updated records and keep the source and model versions needed to check citations and reproduce evaluation."
      ]
    },
    "failure-diagnosis-workshop": {
      "idea": "Find the first stage that went wrong by inspecting retrieved IDs, rankings, the assembled prompt, and the answer.",
      "question": "What should we inspect when the answer is unsupported despite correct retrieved evidence?",
      "answer": "Context assembly and generation, including whether cited passages support the claims.",
      "builds": [
        "Ask pairs where the first failure appears: missing source IDs, poor ranking, omitted prompt text, or an unsupported claim. Have them propose a check for that stage. For missing evidence, inspect relevance labels, chunks, embeddings, index recall, and filters.",
        "For wrong ranking, inspect scores and a possible reranking experiment.",
        "For an unsupported claim, inspect assembled context and citation support."
      ]
    },
    "a-measurable-rag-system": {
      "idea": "Keep source IDs with retrieved passages and evaluate retrieval and answer quality separately.",
      "question": "A relevant source is in the prompt, but the answer makes an unsupported claim. Which artifact would you inspect next?",
      "answer": "Open the exact prompt and cited passage, then compare the claim with the evidence. Retrieval presence alone does not prove support.",
      "builds": [
        "Return to the recovery question. Show the selected chunks and their source IDs so students can trace each passage back to its document.",
        "Retrieve evidence for one question.",
        "Evaluate retrieval and answer quality on held-out questions.",
        "Repeat the same open-book model at the end. Ask a student to explain selected pages, references, and checked claims. Connect the explanation to records and metrics."
      ]
    }
  },
  "13": {
    "one-job-many-machines": {
      "idea": "Distributing a scan adds parallel capacity along with coordination and partial failures.",
      "question": "Does dividing an ideal scan time by the worker count guarantee that speedup?",
      "answer": "No. Network movement, coordination, imbalance, and failures add work beyond the capacity model.",
      "builds": [
        "Calibrate with the two small documents from the reading: can either local wal count be called global? Then scale the same job to the diagram’s assumed 10 TB. Keep the scan estimate distinct from a benchmark. Calculate the ideal single-reader time for ten terabytes.",
        "Divide the data among readers and state the hypothetical throughput assumptions.",
        "Lose a worker and identify the extra coordination and recovery requirements."
      ]
    },
    "partitioning": {
      "idea": "Partitioning uses a routing rule to assign each record to a partition.",
      "question": "How does partitioning differ from replication?",
      "answer": "Partitions hold different subsets of the data. Replicas keep copies so data can remain available when a worker fails or becomes busy.",
      "builds": [
        "Link ownership to sorting mail into destination trays. Map key to address and worker to owner. Name the limit: a routing rule does not ensure equal work or create replicas. Identify the keys that need owners.",
        "Assign keys to four partitions using a deterministic rule.",
        "Route kim to its owner and discuss grouping equal keys correctly."
      ]
    },
    "hash-routing": {
      "idea": "A hash tells us which partition holds one key, but nearby keys may land in different partitions.",
      "question": "How can a query find dee through fay without an ordering property?",
      "answer": "It must consult all hash partitions, even though only some contain matching keys.",
      "builds": [
        "Keep the input fixed so the hash-routing mechanism is the only change. Ask for the destination of a point lookup before the range case. Read the names before assigning owners.",
        "Compute the toy character-sum hash modulo four.",
        "Route kim's point lookup to one owner.",
        "Query the range and explain why hashing provides no neighboring-key locality."
      ]
    },
    "range-routing": {
      "idea": "Range partitioning keeps neighboring keys together but can create uneven load.",
      "question": "Why can the d-through-f query contact fewer owners here?",
      "answer": "The relevant neighboring keys share a known ordered range.",
      "builds": [
        "Use the familiar sorted-key interval from B+ trees to explain range ownership. Ask why keeping neighbors together helps a range but can also concentrate writes. Keep the same names as the hash-routing example.",
        "Assign them to sorted key ranges.",
        "Route a point lookup to its range owner.",
        "Read the d-through-f range and discuss split points and write hotspots."
      ]
    },
    "skew-creates-idle-time": {
      "idea": "One heavily used key can dominate a stage even when many workers are available.",
      "question": "Will adding workers fix a hot key that remains indivisible on one owner?",
      "answer": "No. Its owner's work still limits completion of the stage.",
      "builds": [
        "The routing rule is correct, yet one worker remains busy after the others finish. Ask which input property could cause that before naming skew. Begin with evenly distributed work.",
        "Assign forty percent to the hot key and compare the 3,800-versus-600 row loads.",
        "Increase the skew and identify waiting at the completion barrier."
      ]
    },
    "salt-and-combine": {
      "idea": "Salting can divide a hot aggregation when partial results combine correctly.",
      "question": "Can partial averages always be averaged directly?",
      "answer": "No. Preserve sum and count, then combine them. Unequal bucket sizes make unweighted averages wrong.",
      "builds": [
        "Noor proposes splitting the hot group. Ask which partial information an operator must retain to combine correctly. Use sum and count for an average. Identify the overloaded key.",
        "Split it into salted subkeys.",
        "Compute the four partial counts of twenty-five.",
        "Combine them under the original key to obtain one hundred."
      ]
    },
    "map-is-local-computation": {
      "idea": "A mapper can emit zero or more key-value pairs from each input record.",
      "question": "Why does the mapper emit the word the twice?",
      "answer": "It emits one pair per occurrence. Repeated words remain separate occurrences at this stage.",
      "builds": [
        "Count occurrences on paper before mapping. Ask why repeated words must remain repeated outputs rather than a set of distinct tokens. Read the four-word input document.",
        "Split it into word occurrences.",
        "Emit four pairs and identify each key's eventual destination."
      ]
    },
    "shuffle-manufactures-locality": {
      "idea": "Shuffle brings equal keys together regardless of which input produced them.",
      "question": "Where must every log pair arrive for this aggregation?",
      "answer": "At the same key owner so the complete group can be combined.",
      "builds": [
        "Bring back the mail trays: equal keys must travel together even when different mappers emitted them. Ask which expensive work those arrows hide. Inspect the scattered mapper outputs.",
        "Route pairs to their key owners.",
        "Group equal keys and name the serialization, file, and network costs behind the arrows."
      ]
    },
    "reduce-network-bytes-early": {
      "idea": "A valid local combine reduces the data sent through shuffle.",
      "question": "Can four local (log, 1) pairs travel as one (log, 4) pair?",
      "answer": "Yes for sum. The combine must preserve correct aggregation and does not replace the global reduce.",
      "builds": [
        "Count the pairs waiting for shuffle. Ask which equal keys can be summed locally so fewer pairs need to travel between workers.",
        "Combine equal local keys with a sum.",
        "Send the smaller output and contrast sum with subtraction's incompatible behavior."
      ]
    },
    "a-lazy-spark-plan": {
      "idea": "Spark transformations describe dependencies. An action triggers their execution.",
      "question": "When does this lazy word-count chain need to process the data?",
      "answer": "When an action such as collect requests the result.",
      "builds": [
        "Trace the Spark plan for grouping and counting equal words. Start with the input, then build each transformation without executing it. An action will request the result.",
        "Describe flatMap turning lines into words.",
        "Describe map turning words into (word, 1) pairs.",
        "Add the grouping dependency for reduceByKey.",
        "Trigger the action and limit collect to results that fit at the driver."
      ]
    },
    "stages-follow-dependencies": {
      "idea": "Shuffle dependencies create stage boundaries in this simple Spark job.",
      "question": "Where does the stage boundary fall in this word-count chain?",
      "answer": "At the shuffle between map-side work and reduce-side work.",
      "builds": [
        "Follow flatMap and map within each partition. They can run together because neither needs records from another partition. Ask where grouping equal words requires a shuffle.",
        "Locate the shuffle dependency.",
        "Ask where the shuffle separates map-side and reduce-side stages before revealing that division.",
        "Inspect the two stages and distinguish stages from a count of API calls."
      ]
    },
    "lineage-rebuilds-lost-partitions": {
      "idea": "Lineage records how to rebuild lost outputs from available dependencies.",
      "question": "Is lineage a durable transaction log for external side effects?",
      "answer": "No. It is a recomputation recipe. Replayable transformations and accessible dependencies are required.",
      "builds": [
        "A worker loses an output partition. Follow the recorded transformations back to the inputs needed to recompute it. Ask whether those inputs remain available and explain how this recipe differs from a transaction log.",
        "Lose one worker's output partition.",
        "Find the necessary ancestors that remain available.",
        "Recompute replacement output and discuss the limits of replay."
      ]
    },
    "launch-before-waiting": {
      "idea": "Launching independent tasks before waiting permits concurrency.",
      "question": "Which schedule permits overlap: immediate get inside the loop or get after launching all tasks?",
      "answer": "Launching first and then waiting allows overlap, subject to resources and overhead.",
      "builds": [
        "Change workloads to independent KNN calls. Ask students to draw both launch/wait schedules before interpreting any laptop timing. Wait after each remote call and show the serial dependency.",
        "Launch all independent calls before waiting for their results.",
        "Identify the worker state needed for each KNN search.",
        "Reuse explicit actor state across calls without reloading it each time."
      ]
    },
    "choose-the-execution-shape": {
      "idea": "Choose an execution framework based on the work the job needs and the step that limits it.",
      "question": "What should justify paying distribution's movement and coordination costs?",
      "answer": "Evidence that the workload's size, latency, or concurrency requirements need it.",
      "builds": [
        "Ask pairs which step limits the workload and which engine they would try first. Include a local engine in the comparison. Start with a large job that joins tables and groups the results.",
        "Consider independent Python calls as separate tasks.",
        "Consider a job that fits comfortably on one machine and explain why a local engine is a reasonable starting point."
      ]
    },
    "place-move-recover": {
      "idea": "A distributed job must place data, group it, execute dependencies, and recover lost work.",
      "question": "What stays the same when the two-record word count changes from two partitions to seven?",
      "answer": "The word totals stay the same. Placement and schedule may change. Repeated occurrences and complete grouping must remain correct.",
      "builds": [
        "Return to the small word count. Identify which worker owns each key. Ask how unequal key frequencies could give one worker most of the work.",
        "Explain the movement needed to group equal keys.",
        "Explain the execution plan and when work starts.",
        "Repeat assign, group, execute, recover on the original small count. Ask what changes with seven partitions and which result must stay unchanged."
      ]
    }
  },
  "14": {
    "organize-writes-differently": {
      "idea": "An immutable file can retain an old value while a newer visible record determines the read.",
      "question": "If old@5 remains after DELETE@9, should a current read return the old value?",
      "answer": "No. The newer visible tombstone suppresses the old value. It must survive until older records and snapshot requirements are accounted for.",
      "builds": [
        "Calibrate with WAL and immutable files. In the fictional investigation, old@5 is still present after new@8 and DELETE@9. Ask which record should win before discussing the storage layout. Recall scattered B+ tree page updates.",
        "Introduce sequential logging on the write path.",
        "Show sorted runs and ask where future read and merge costs arise."
      ]
    },
    "a-multidimensional-map": {
      "idea": "The original Bigtable model addresses cells by row, column, and version.",
      "question": "Why reverse a domain name in an ordered row key?",
      "answer": "Related domains then share a prefix, helping prefix-local scans.",
      "builds": [
        "Identify a cell by its row key before asking where it is stored. Connect the sorted keys to familiar B+ tree ranges. The key names the row but does not specify a physical file location.",
        "Separate declared column families from qualifiers.",
        "Add the version timestamp and qualify its difference from a cross-row transaction snapshot."
      ]
    },
    "sparse-cells-and-versions": {
      "idea": "Sparse storage can omit absent cells and retain multiple versions of present cells.",
      "question": "Does a missing qualifier require a fixed-width reservation in every row?",
      "answer": "No. Sparse cells can be omitted, although metadata and stored versions still consume space.",
      "builds": [
        "Ask what is absent versus present before explaining sparse storage. Keep cell versions distinct from a full transaction snapshot. Identify the absent cells in the sparse table.",
        "Add a qualifier only to the row that needs it.",
        "Add another cell version and discuss retention and the requested timestamp."
      ]
    },
    "tablets-separate-placement-from-storage": {
      "idea": "Tablet placement and durable storage ownership are separate parts of the architecture.",
      "question": "Why can a tablet server fail without losing the stored data?",
      "answer": "In the original architecture, replicated GFS holds the logs and SSTables. Reassignment and replay can rebuild service.",
      "builds": [
        "Link tablets to assigned intervals in an ordered key space. Ask why the serving owner can change while replicated durable files remain available. Divide the ordered keys into contiguous tablet ranges.",
        "Assign those ranges to tablet servers.",
        "Locate durable files separately from server caches and active state.",
        "Reassign a tablet and identify the recovery work that remains."
      ]
    },
    "splitting-cannot-fix-a-moving-hotspot": {
      "idea": "Splitting a range does not remove a hotspot created by ever-increasing keys.",
      "question": "Where does the next timestamp-prefixed burst go after the hot tablet splits?",
      "answer": "The burst goes to the newest range again. Splitting reduces the old range’s size, but the increasing timestamps still target its new end.",
      "builds": [
        "Predict the destination of the next timestamp key after a split. The incoming pattern, not just the tablet’s size, creates the hotspot. Begin with distributed writes.",
        "Send increasing timestamps to the tail.",
        "Split the hot range.",
        "Send another burst and discuss the locality tradeoff of a hash prefix or new key order."
      ]
    },
    "the-log-protects-memory": {
      "idea": "A durable log can rebuild writes lost from the memtable after a crash.",
      "question": "What fails if the engine acknowledges only a RAM update before crashing?",
      "answer": "The acknowledged write can be lost unless its recovery information is durable elsewhere.",
      "builds": [
        "Return to the recovery contract: what would a crash after acknowledgment lose if only RAM held the update? Trace the log’s durability boundary. Receive a write under the engine's durability contract.",
        "Append its recovery record.",
        "Make the required log progress durable before acknowledgement.",
        "Update memory and explain how replay can reconstruct it."
      ]
    },
    "the-memtable-stays-ordered": {
      "idea": "An ordered memtable prepares incoming writes for a sequential sorted flush.",
      "question": "Why keep keys sorted in memory even if they arrive out of order?",
      "answer": "The later flush can stream them to disk in key order.",
      "builds": [
        "Link the memtable to an ordered notebook. Entries arrive unsorted, but keeping them ordered prepares the eventual sorted output. Show the arrival order of the keys.",
        "Insert each into the ordered memory structure.",
        "Update k2 and distinguish the simple latest-value view from snapshot version retention."
      ]
    },
    "freeze-a-sorted-file": {
      "idea": "A frozen memtable becomes an immutable sorted file while new writes use active memory.",
      "question": "Where does a later update to k2 go after this file is written?",
      "answer": "Into the active memtable, and eventually a newer file.",
      "builds": [
        "Link the immutable run to sealed sorted pages. Ask where the next update must go when those pages cannot be edited. Fill the active memory structure.",
        "Freeze it while keeping its contents readable.",
        "Flush its sorted entries sequentially to a file.",
        "Accept later writes in a new active memtable."
      ]
    },
    "merge-sorted-runs": {
      "idea": "Compaction merges sorted runs while respecting version-retention rules.",
      "question": "Is merging free just because its input reads are sequential?",
      "answer": "No. It rewrites output and consumes bandwidth, and retained versions affect what may be discarded.",
      "builds": [
        "Place two immutable sorted files side by side. Ask how merging them could make later lookups cheaper while retaining every version still needed by a reader.",
        "Choose the next key from their merge cursors.",
        "Resolve duplicate k2 versions under the visibility and retention rules.",
        "Write the merged output and account for the background work."
      ]
    },
    "deletion-must-hide-older-values": {
      "idea": "A deletion marker prevents older stored values from reappearing.",
      "question": "Why not simply remove the newest k2 entry?",
      "answer": "A read could then discover the older k2 value. A tombstone must hide it until safe reclamation.",
      "builds": [
        "Return explicitly to the opening old file. Ask why removing a marker could expose bytes that were never edited. Locate the old value in an earlier file.",
        "Write a tombstone as the newer record.",
        "Stop the lookup at the tombstone.",
        "Remove the tombstone only when older values cannot reappear and no active snapshot still needs the retained history."
      ]
    },
    "a-one-sided-membership-test": {
      "idea": "A Bloom filter can prove absence, while a possible match still requires checking data.",
      "question": "What does a zero among the query's required bits prove?",
      "answer": "A missing bit establishes absence if insertion was correct and operations are supported. All set bits indicate only possible presence.",
      "builds": [
        "Before naming the filter, ask what a one-sided answer can prove. Distinguish definite absence from the work of checking a possible match. Begin with empty bits.",
        "Insert k1 through k6 using the three deterministic hashes.",
        "Show the zero bit that proves k7 absent.",
        "Show a possible match whose bits are all set.",
        "Check uninserted k17 and explain the false positive's extra file lookup."
      ]
    },
    "skip-files-then-find-a-block": {
      "idea": "Filters, sparse indexes, and caches eliminate work at different levels.",
      "question": "Does a Bloom-filter match prove the key exists?",
      "answer": "No. The engine still locates the candidate block and checks its entries and visible versions.",
      "builds": [
        "Walk down the levels of skipped work: file, block, storage read. Ask what each structure can and cannot prove. Use the filter to skip a definitely absent file.",
        "Use the sparse index to locate a candidate block.",
        "Read and inspect that block.",
        "Reuse a cached block to avoid another storage read."
      ]
    },
    "the-read-write-space-budget": {
      "idea": "Compare read work, write work, storage space, and durability requirements for the expected workload.",
      "question": "Why is fast log append alone insufficient for sustained LSM write performance?",
      "answer": "Compaction must keep up with incoming writes. Otherwise files accumulate and writes may have to slow down.",
      "builds": [
        "Noor asks what other work the fast write path creates. Compare reads, writes, space, and durability, including background maintenance. Begin with how B+ trees organize pages and can batch writes.",
        "Identify sorted LSM memory and files.",
        "Account for compaction's read, write, and space pressure.",
        "Choose a starting design from workload requirements and testable costs."
      ]
    },
    "a-network-partition-forces-a-choice": {
      "idea": "During a network partition, a replica may be unable to learn that another replica accepted a write.",
      "question": "What can replica 2 infer about v2 from silence alone?",
      "answer": "Silence does not tell replica 2 whether v2 was written. To preserve linearizability, the system may need to refuse the isolated read.",
      "builds": [
        "Now cut the link between replicas. Ask what the isolated replica can know before naming guarantees. Explain the concrete choice at the request. Begin with agreeing replicas.",
        "Write v2 at replica 1 and interrupt communication.",
        "Consider waiting or refusing the isolated request.",
        "Consider serving v1 and state the consistency consequence.",
        "Restore communication and discuss reconciliation under the system's contract."
      ]
    },
    "trace-an-acknowledged-write": {
      "idea": "An acknowledged LSM write moves through logging, memory, sorted files, and later lookup.",
      "question": "Why must a compaction retain DELETE@9 while an unmerged file still holds old@5?",
      "answer": "Dropping the marker could expose the old value again. Cover the older versions and required snapshots before reclaiming it.",
      "builds": [
        "Return to key k. Identify the durable log record that would let the engine rebuild its write after a crash.",
        "Place the write in ordered memory.",
        "Flush it into a sorted file and account for later compaction.",
        "Repeat log, buffer, flush, resolve on k. Ask why the old file can remain while the current read returns no value. State the safety condition for compaction."
      ]
    }
  },
  "15": {
    "the-path-is-the-answer": {
      "idea": "A graph query can ask for the path connecting records.",
      "question": "If two routes end at Dee, does a query for distinct reachable people need two copies of Dee?",
      "answer": "No. A query for distinct people returns Dee once. A query for routes can return both paths. Decide which result is required first.",
      "builds": [
        "Calibrate with the src/dst join students know. Introduce Maya’s whiteboard: two routes can end at Dee. Ask whether the result requires routes or distinct people before tracing a route to Fay. Identify the familiar student records as nodes.",
        "Add directed follows relationships and ask a one-hop question.",
        "Reveal ada to cyd to eli to fay and distinguish a path from a matching row."
      ]
    },
    "property-graph": {
      "idea": "A property graph attaches named values to nodes and typed relationships.",
      "question": "Where would the fact since 2026 belong?",
      "answer": "On the Follows relationship, because it describes the connection rather than either endpoint alone.",
      "builds": [
        "Link to a directed campus map: intersections are nodes, routes are edges. Map properties to the thing they describe and state that storage alone does not choose query semantics. Identify the nodes.",
        "Add direction and a type to the edges.",
        "Place the illustrative properties on the appropriate node or relationship."
      ]
    },
    "store-adjacency-at-write-time": {
      "idea": "Maintained adjacency makes later neighbor expansion direct.",
      "question": "How would a relational edge table find ada's neighbors?",
      "answer": "Match src using an index or scan. Stored adjacency maintains the neighbor relationship for later reads.",
      "builds": [
        "Find ada’s outgoing edges by matching src in the relational edge table. Then compare how a stored adjacency list can point directly to the same neighbors.",
        "Resolve endpoints while creating a relationship.",
        "Store and read the neighbor list, accounting for its write-time maintenance."
      ]
    },
    "one-hop": {
      "idea": "A one-hop query follows edges in the direction specified by the query.",
      "question": "Who does ada follow, and who follows ada?",
      "answer": "Ada follows ben and cyd. Ben and fay follow ada.",
      "builds": [
        "Keep the first query to one outgoing hop. Ask how reversing direction would change the result before returning the endpoints. Start at ada and predict the outgoing neighbors.",
        "Expand the outgoing edges.",
        "Return ben and cyd, then contrast the reversed-direction question."
      ]
    },
    "two-hops-with-exclusions": {
      "idea": "Two-hop paths can produce repeated endpoints that need explicit exclusions and deduplication.",
      "question": "What distinct endpoints remain after excluding ada and existing neighbors?",
      "answer": "Dee and eli. Dee is reached by two paths but is one person.",
      "builds": [
        "Predict the two-hop list before exclusions. Let the class point at Dee twice and explain why DISTINCT people needs only one Dee. Enumerate dee, ada, dee, and eli as raw two-hop endpoints.",
        "Remove the starting node ada.",
        "Exclude existing neighbors and return distinct dee and eli."
      ]
    },
    "breadth-first-reachability": {
      "idea": "Breadth-first search discovers unvisited nodes in layers of increasing hop distance.",
      "question": "Which new nodes enter successive frontiers from ada?",
      "answer": "Ben and cyd, then dee and eli, then fay.",
      "builds": [
        "Use the map’s frontier as a picture before naming the algorithm. Ask which previously unvisited people belong to each distance layer. Begin with ada in the frontier and visited set.",
        "Discover ben and cyd at distance one.",
        "Discover dee and eli while skipping already visited nodes.",
        "Discover fay at distance three and state the equal-edge-cost assumption."
      ]
    },
    "the-query-draws-a-shape": {
      "idea": "Graph patterns and recursive SQL can both express bounded traversal.",
      "question": "How does the query remove ada and repeated endpoints?",
      "answer": "Exclude b.name equal to ada and use DISTINCT for endpoint deduplication.",
      "builds": [
        "Draw the bounded relationship first, then translate it into syntax. Keep SQL recursion in view and require equivalent duplicate and cycle rules. Read the single directed relationship pattern.",
        "Extend it to one through three outgoing Follows edges.",
        "Compare a recursive SQL base case and bounded iterative join."
      ]
    },
    "find-the-shortest-path": {
      "idea": "With equal-cost edges, BFS's first target discovery gives the minimum hop count.",
      "question": "What is the shortest route from ada to fay here?",
      "answer": "Ada to cyd to eli to fay, using three edges.",
      "builds": [
        "Now change the question from reachable people to a route. Ask why predecessor information is needed to reconstruct the connecting path. Expand the first frontier.",
        "Expand the second frontier and retain predecessor links.",
        "Discover fay and establish the minimum hop count.",
        "Follow predecessors backward to reconstruct the path."
      ]
    },
    "a-supernode-is-skew-again": {
      "idea": "A high-degree node can dominate traversal work even with direct adjacency access.",
      "question": "Does cheap neighbor lookup make millions of neighbors cheap to expand?",
      "answer": "No. The number of neighbors still dominates. Limiting expansion changes semantics and recall.",
      "builds": [
        "Link this high-degree hub back to Lecture 13’s hot key. Direct lookup does not remove the cost of inspecting a large neighbor set. Expand an ordinary-degree node.",
        "Increase degree and compare the volume of work.",
        "Apply the illustrative expansion budget and discuss what it omits."
      ]
    },
    "choose-a-graph-workload": {
      "idea": "Identify the traversal depth. Determine whether queries inspect a few paths or the complete graph. Choose a tool for that workload.",
      "question": "Does a graph engine automatically outperform relational execution on every relationship query?",
      "answer": "No. Compare equivalent semantics and include the cost of maintaining the relationships.",
      "builds": [
        "Ask whether the workload benefits enough from a graph store to justify maintaining another copy of the data. Start with a shallow department join that relational operators already handle.",
        "Consider unknown-depth dependency paths in a graph query engine.",
        "Consider whole-graph iterative analytics in a graph-compute framework."
      ]
    },
    "connections-augment-similarity": {
      "idea": "Entity relationships can add connected evidence to similarity-based retrieval.",
      "question": "Why might a WAL-and-buffer-pool question need more than one similar passage?",
      "answer": "Its answer may depend on a relationship explained across sources, which graph expansion can help connect.",
      "builds": [
        "Return to the evidence question from Lecture 12. Ask what a connection could add that a single similarity score omits. Retrieve nearby passages as starting evidence.",
        "Identify named entities in those passages.",
        "Follow a relevant one-hop relationship.",
        "Combine the connected and vector evidence, then check entity and edge correctness."
      ]
    },
    "does-graph-expansion-help": {
      "idea": "Graph expansion should be measured against a vector-only retrieval baseline.",
      "question": "When could expansion make retrieval worse?",
      "answer": "Ambiguous entities or high-degree hubs can introduce irrelevant evidence and extra latency.",
      "builds": [
        "Save the vector-only results. Ask for one question that extra graph neighbors might help and another for which those neighbors could add irrelevant evidence.",
        "Add relationship neighbors and predict a helped and a harmed question.",
        "Compare support, noise, context size, and latency on the same held-out questions."
      ]
    },
    "five-mechanisms-recur": {
      "idea": "Caches, indexes, logs, plans, and partitions recur across systems, but their guarantees differ.",
      "question": "Is Spark lineage the same mechanism as a write-ahead log?",
      "answer": "No. Lineage records a recomputation recipe. WAL records information for transaction durability and recovery.",
      "builds": [
        "Ask what each earlier mechanism guarantees. A cache reuses bytes. An index narrows search. A log supports recovery. Identify caches in buffer pools and SSTable block reads.",
        "Identify indexes in B+ trees, IVF, and adjacency.",
        "Identify durable logs and contrast them with lineage.",
        "Identify plans in iterators, Spark, and graph queries.",
        "Identify partitions in shuffle, tablets, and vector lists."
      ]
    },
    "read-a-new-system": {
      "idea": "Concrete architecture questions make an unfamiliar database easier to evaluate.",
      "question": "What evidence should follow a product's architectural claims?",
      "answer": "A workload-specific benchmark with equivalent results and measurements of the relevant costs and failures.",
      "builds": [
        "Apply the course’s questions to an unfamiliar system. Start with what one block contains and how the system reads or writes it. The next steps ask how it skips work, survives failure, executes queries, and assigns data to workers.",
        "Ask how it skips data for the workload.",
        "Ask which data or recovery log records are durable when the client receives a successful write reply.",
        "Ask how it turns queries into execution.",
        "Ask how it partitions data and requests, then choose a benchmark."
      ]
    },
    "finish-with-measured-decisions": {
      "idea": "A useful project explanation connects a measured result to a design decision.",
      "question": "What result requirement and experiment explain one design choice in your project?",
      "answer": "Compare both configurations on the same workload and required results. Show the measurements behind the choice and one failure whose cause you identified.",
      "builds": [
        "State the question the project answers and what a correct result contains. Ask another student to explain one observed failure and the experiment that identified its cause.",
        "Present the evidence behind a comparison.",
        "Explain the decision changed by that evidence.",
        "Compare two configurations on the same workload and required result. Explain which measurements support the choice, then show one observed failure and how its cause was identified."
      ]
    }
  }

};
  for (const [id, scenes] of Object.entries(notes)) {
    const deck = window.COURSE_DECKS[id];
    if (!deck) continue;
    for (const scene of deck.scenes) {
      if (scene.teaching || !scenes[scene.id]) continue;
      scene.teaching = {...scenes[scene.id], reference: scene.notes};
    }
  }
})();

/* CLEAR applications for the existing early-course diagrams and worked examples.
 * Apply after their native teaching cues are installed; drawings and pacing stay fixed. */
(function () {
  'use strict';
  const topics = {
    1: {
      story: 'At a lab desk, Maya asks the database to list students with a GPA above 3.5. Both runs return ada, cyd, and eli. Noor points to the Disk reads counter: two on the first run, zero on the second. Maya asks why it did not read the file again. The first run kept the student data in memory, so the second can check the same rows there. This is a fictional classroom investigation.',
      calibrate: 'Does SELECT name with a GPA condition request matching names, or prescribe which stored blocks the engine must read?',
      answer: 'It requests matching names. The engine chooses a plan, and that plan determines which blocks it reads.',
      opening: 'Read the query as asking for students with a GPA above 3.5. Explain that the slides store GPA in tenths, so 35 represents 3.5. Keep ada, cyd, and eli visible. Before following either path, ask whether a second run must read their data from disk.',
      analogy: ['lecture-01-scene-09','Compare the query with a workshop order. SQL states the request. The plan specifies operations. Operators request rows. Lower layers obtain the bytes. The actual interfaces determine what each station can do.'],
      closing: 'Follow the same query from SQL through its plan to the rows and pages it reads. Then change a row while its page stays in memory and ask how the next result should change.',
      question: 'If a table changes between two runs while its pages stay cached, can zero new storage reads justify returning the old answer?',
      expected: 'No. Cached pages are inputs to execution, not a saved answer. Reevaluate the query against the current buffered data. Distinguish examined rows, returned rows, and storage reads.',
      idea: 'A query’s answer and the work needed to produce it are separate properties.'
    },
    2: {
      story: 'Maya requests B7, then asks for it twice more. Noor points to its copy in memory and asks whether they can use it again. Noor then starts reading B7 while Maya requests an uncached block. If the pool needs room, can it reuse B7’s frame before Noor finishes reading? This is a fictional classroom investigation.',
      calibrate: 'Does frame 0 have to contain block 0? What does a pin protect while a caller uses a page?',
      answer: 'A frame is a reusable memory slot and can contain another numbered block. A positive pin count protects that frame’s current contents from replacement.',
      opening: 'Use the repeated B7 request as the opening task. Distinguish a cached block from a cached query result before revealing the shorter request path.',
      analogy: ['lecture-02-scene-03','Map books to blocks, work desks to frames, and active readers to pins. Replacing a book is safe only when its users finish. A reused frame retains its memory address while its bytes change.'],
      closing: 'Follow a request for B7: find or load it, pin it, read it, and unpin it. Explain when its frame can be replaced. Keep the pool size fixed and change the request order to explain a different hit rate.',
      question: 'The oldest frame is pinned and a newer one is unpinned and dirty. Which may be reused, and can correct replacement still produce zero scan hits?',
      expected: 'The unpinned frame can be reused after its dirty page is written. A scan larger than the pool can still miss every time because each block is evicted before reuse. Correct replacement does not guarantee cache hits.',
      idea: 'Pins and dirty writes make frame reuse safe. Access order determines how useful that reuse is.'
    },
    3: {
      story: 'Maya saves cyd’s byte address and renames ben to benjamin in a packed page. Noor asks whether the shifted bytes still leave that address pointing to cyd. This is a fictional classroom investigation. The next scene makes the movement visible.',
      calibrate: 'What do Page and Buffer already know, and what additional rules are needed to interpret one student’s fields?',
      answer: 'They manage bytes and blocks. A schema and layout supply field meanings, boundaries, and offsets.',
      opening: 'Point to the anonymous byte grid before naming its fields. Ask students to identify the missing interpretation rule. Use the saved-address failure to motivate slots.',
      analogy: ['lecture-03-scene-04','Map equal tray compartments to slots and positions within each compartment to field offsets. Count bytes, including string prefixes and reserved content capacity. Characters can take different numbers of UTF-8 bytes.'],
      closing: 'Use the saved address to find the slot, then use the layout to find its fields. Explain how the page pin and catalog support that read. Delete the row, reuse its slot, and ask which row the same address now identifies.',
      question: 'Can a reused RID still be the same physical address while naming a different row? Which rules let a new process interpret its fields?',
      expected: 'Yes. A RID is a block and slot address, not a permanent identity. The saved schema and layout specify how to interpret the new occupant’s bytes.',
      idea: 'The layout tells us where each field is stored, and the catalog saves those rules for the next run.'
    },
    4: {
      story: 'Maya runs the query for students with gpa > 35. After ada, she expects ben, but the filter skips ben’s GPA of 31 and returns cyd. Noor asks how many rows that one result required the scan to visit. This is a fictional classroom investigation using the six-row example.',
      calibrate: 'When TableScan.next() returns True, does it provide a whole result table or position the scan at one current row?',
      answer: 'It positions the scan at one row. The caller can read that row’s fields. Another next call advances again.',
      opening: 'Start with the operator tree before any next() call. Have the class trace the first next() request down to TableScan before revealing a returned row.',
      analogy: ['lecture-04-scene-05','Link the interface to nested Python generators: asking for the next item resumes work and a wrapper can skip items. Rewind, field routing, and close remain explicit scan contracts. Blocking operators later qualify the streaming model.'],
      closing: 'Return to one requested name. Trace next() calls, skipped input rows, the caller’s field read, and close() calls on every input. Then compare equivalent plans with different candidate counts.',
      question: 'What work can a filter save by running before ProductScan, and what must stay correct?',
      expected: 'It can reduce candidate pairs while returning the same rows and duplicates. The filter must use only fields from its input, and close must still release every underlying scan. Measure runtime separately from pair counts.',
      idea: 'One successful result request can cause many input visits. The plan determines that work.'
    },
    5: {
      story: 'At the prompt, Maya points to FROM and to “from” inside quotes. Noor asks why the lexer gives those same letters different token kinds. This fictional classroom puzzle returns in the quotes scene. First follow a simple SELECT through the front end.',
      calibrate: 'Has constructing a query description already executed the scan? Does a quoted string with keyword letters have to be a keyword token?',
      answer: 'No to both. Parsing records a request before execution. The lexer distinguishes a quoted string value from a keyword.',
      opening: 'Follow the visible SELECT through tokens, QueryData, and scan operators. Name each representation before moving to the next. Reserve actual row reads for execution.',
      analogy: ['lecture-05-scene-06','Link tokens and grammar to words and sentence structure. Recognizing words does not establish legal arrangement, schema validity, or a way to execute the request. Connect each grammar rule to its consuming parser method.'],
      closing: 'Return to the typed query and trace tokens, QueryData, scan objects, and execution. Explain that TableScan visits 300 students while SelectScan accepts sixty. Parsing only records the condition.',
      question: 'If WHERE returns one fifth as many names, what work can remain unchanged and which observations are still needed before claiming a speedup?',
      expected: 'The scan still visits all 300 students. Selection adds checks and reduces output work. Compare the operator counters and repeated timings. Parsing and planning remain separate from row execution.',
      idea: 'Tokens describe text, QueryData describes the request, and scans execute it.'
    },
    6: {
      story: 'Maya stops at the root separator 36 and asks whether she has found eli. Noor points to the right leaf and then RID (0, 4). The root’s 36 selects the right child. The leaf’s 36 supplies the RID. The heap fetch returns the row. This is a fictional classroom investigation using the existing toy tree.',
      calibrate: 'What does a RID identify, and must two rows with the same search key share one RID?',
      answer: 'A RID identifies one heap block and slot. Duplicate search keys can lead to multiple RIDs in a leaf entry.',
      opening: 'Ask students to distinguish a GPA value, a routing separator, and a row address. Follow the existing drawing through the leaf to the actual heap row.',
      analogy: ['b-tree','Use an ordered directory: internal signs provide routes, leaf entries provide addresses, and the heap contains the rows. The displayed inequalities and next-leaf links define the actual lookup and range rules.'],
      closing: 'Return to GPA 36, then explain the existing split-and-lookup sequence. Change the incoming row to a duplicate key and ask which list changes instead of adding a distinct-key slot.',
      question: 'Does adding a RID for an existing key force a distinct-key overflow, and what must every split preserve?',
      expected: 'In this lab’s model it extends that key’s RID list. Every split preserves actual keys and whole RID lists, sorted leaf order, routing, leaf links, and equal leaf depth. A returned RID still needs a heap fetch.',
      idea: 'The index locates each key’s RID list, and those addresses lead to the rows in the heap.'
    },
    7: {
      story: 'Maya tries to transfer $50 from A, which holds $60, to B, which holds $90. A’s new $10 balance reaches disk, but a power failure interrupts the credit to B. After restarting, the saved total is $100 instead of $150. Noor opens the transaction log and asks how it can help restore the missing $50. This is a fictional classroom investigation. The displayed balances illustrate the recovery rule.',
      calibrate: 'Does a dirty page in memory prove that a transaction committed durably? What distinction did fsync introduce in Lab 1?',
      answer: 'No. A dirty page may exist only in memory, or it may have reached disk before commit. Check the durable log and completion records. The required write order depends on the engine’s policy.',
      opening: 'Let students establish the original account total before applying a debit. Identify the incomplete transfer and the durable evidence available after interruption.',
      analogy: ['write-ahead-logging','Link WAL to preserving repair information before changing an item. The old value supplies physical undo in this lab. A note in RAM is insufficient. Required log information must reach durable storage before protected data.'],
      closing: 'Return to the transfer under FORCE/STEAL. Explain when its log records, changed pages, and COMMIT record reach storage. Then interrupt recovery and ask what the next restart must repair.',
      question: 'Undo repaired the buffer. Why must its flush precede a durable ROLLBACK record?',
      expected: 'Otherwise another crash could leave damaged data beside a completion record that makes the next recovery skip the repair. Recovery must make its own changes durable before declaring completion.',
      idea: 'The engine must save the required log records and pages before declaring a commit or repair complete.'
    },
    8: {
      story: 'Maya and Noor each deposit $10 into an account holding $100. Both read $100 and write $110. Maya asks why the balance is not $120 even though both deposits completed. This is a fictional classroom schedule that the later animation traces.',
      calibrate: 'What balance would serial deposits produce, and can durable writes alone establish that result under concurrency?',
      answer: 'Serial deposits produce 120. Durability can preserve an incorrect 110. Isolation must constrain the interleaving.',
      opening: 'Ask for the intended serial result before running the conflicting schedule. Distinguish this ordering problem from the earlier crash-recovery promise.',
      analogy: ['shared-and-exclusive','Link locks to compatible or exclusive reservations on an item. A buffer pin protects a frame from reuse. A transaction lock constrains conflicting data access. These protections have different lifetimes and jobs.'],
      closing: 'Return to the deposits, identify the first incompatible lock upgrade, and then explain the separate reader/writer snapshot example. Change the second read from a statement snapshot to a transaction snapshot.',
      question: 'A writer commits 120. What can a reader’s second ordinary PostgreSQL SELECT see at Read Committed and Repeatable Read? What does snapshot isolation still permit?',
      expected: 'It can see 120 with a new statement snapshot at Read Committed and retains 100 with the existing transaction snapshot at Repeatable Read. A new transaction can see 120. Snapshot isolation can still permit write skew.',
      idea: 'Locks control conflicting access, while snapshots determine which row versions a reader sees.'
    },
    9: {
      story: 'Maya wants students with a GPA above 3.5 in one selected department. One plan pairs all 300 students with three majors before filtering. Another pairs the 60 students above that GPA cutoff with one selected major. Both return twenty rows, from 900 versus sixty pairs. Noor asks which rows can be ruled out before making pairs. This is a fictional classroom investigation using the course’s join fixture.',
      calibrate: 'Does sixty candidate pairs mean sixty result rows? What must agree before comparing two plans?',
      answer: 'No. The join still checks candidates. Plans must return the same required rows, including duplicates, before their work is comparable.',
      opening: 'State the request: return students with a GPA above 3.5 in one selected department. The fixture stores GPA in tenths, so the SQL tests gpa > 35. Explain that each candidate pairs a student row with a major row. Point to the input-only filters and predict how many pairs each plan forms before discussing elapsed time.',
      analogy: ['optimizer','Compare choosing a query plan to choosing a route from a map. Statistics summarize rows and value distributions. The cost model estimates operator work. Plan search compares combinations. Check the estimates against measured counts.'],
      closing: 'Return to the twenty-row answer. Estimate candidate work, compare costs in common units, and check execution. Name one incorrect assumption that could make the other plan cheaper.',
      question: 'A scan costs 1,000 page accesses. An index costs 3 accesses plus the match count. Which costs less at 100 and 2,000 matches? What assumptions could change the choice?',
      expected: 'The model gives 103 and 2,003 accesses: index for 100, scan for 2,000. Cache hits, shared heap pages, clustering, CPU costs, and inaccurate counts can change a real comparison.',
      idea: 'Compare plans that return the same rows, estimate their work, then check those estimates by running them.'
    },
    10: {
      story: 'Maya groups the same three toy rides by ride and by field. Noor first asks for average fare, then every detail of Ride 2. This is a fictional classroom investigation. $36, $24, and $30 are illustrative fares, separate from the real taxi sample.',
      calibrate: 'Which fields contribute to average fare, and which are needed for a complete ride? Must either layout change the stored facts?',
      answer: 'The average needs fares across rides. A complete ride needs its fields. Both layouts preserve the same facts and can answer both queries.',
      opening: 'Read one ride in both layouts. Ask students to identify the values each query needs before revealing the average or discussing file formats.',
      analogy: ['read-a-column-layout','Compare a column to a list of one field from every record, kept in the same row order. Matching positions connect the fields of a row. Pages, chunks, compression, and metadata determine the actual bytes read.'],
      closingId: 'choose-the-shape',
      closing: 'Return to the opening ride and average queries, then change the aggregate to one month. Have students identify needed columns and eligible files before naming projection and pruning.',
      question: 'How would a full-ride lookup, an average fare over all rides, and an average for one month differ in required values and possible skipping?',
      expected: 'The first needs every field of one ride. The second needs the fares from all rides. The third may also skip files for other months if the layout and query support it. Check the results and measure the actual work.',
      idea: 'The storage layout and query conditions determine which unneeded fields and rows the engine can skip.'
    }
  };
  const titles = {
    1: ['One query, two runs','SQL text and an executable plan','Read blocks, return matching rows','Scan the cached blocks again','Rows share a schema','Keys and physical addresses','Transaction guarantees','Equal results, different access paths','The query’s path through the engine','A model of storage access','Count accesses before pricing them','Schemas stored as catalog rows','Build the storage interfaces first','Integers and strings in page bytes','Buffered writes and durable storage','Explain the second run'],
    2: ['One block, three requests','Compare writes with and without fsync','Blocks and reusable memory frames','A cyclic scan defeats reuse','Frequently used blocks can stay cached','Pins protect active page users','Hits update recency too','Choose only an unpinned victim','Locate a resident block','Write dirty bytes before frame reuse','Database and operating-system caches','Keep scans from evicting useful pages','Count the time spent on misses','One frame can change a workload','Buffer-manager responsibilities','Reuse and safe frame replacement'],
    3: ['Which bytes belong to one row?','A packed update moves later bytes','Fixed slots preserve neighboring addresses','Schema fields become byte offsets','Locate a field by slot and offset','String capacity counts bytes','Deletion changes the slot flag','Reserved capacity changes scan work','Missing values and zero values','Store large values separately','Follow an external value only when needed','Interpret one pinned record page','Scan occupied slots across blocks','A RID identifies a block and slot','Save schema rules in catalog rows','Find the field after a restart'],
    4: ['What starts the operator tree?','Storing intermediate results needs space','Requests down, rows up','Count input visits and returned rows','The common scan interface','Selection skips rejected rows','Projection exposes selected fields','Predicates test terms in order','Product rewinds its right input','Candidate pairs and matching rows','Empty and exhausted inputs','Close every descendant scan','Filter inputs before forming pairs','Streaming and blocking operators','Compose a product, filter, and projection','Explain one result and its work']
  };
  const beats = {
    1: {'lecture-01-scene-03':'Predict a block read separately from a returned row. Explain why moving a whole block does not yet test its predicate.', 'lecture-01-scene-14':'Predict the bytes for integer 1 and the prefix length of a multibyte string before revealing their storage.'},
    2: {'lecture-02-scene-08':'Before selecting a victim, remove pinned frames from the eligible set. Then predict the oldest remaining frame.', 'lecture-02-scene-13':'Predict whether one expensive miss can dominate several cheap hits before interpreting the average-time model.'},
    3: {'lecture-03-scene-02':'Keep the saved byte address visible while ben becomes benjamin. Predict which later row no longer starts there.', 'lecture-03-scene-05':'Calculate slot number times slot size plus field offset before revealing the highlighted byte.', 'lecture-03-scene-14':'Change the occupant after deletion and explain which address stays the same while row identity changes.'},
    4: {'lecture-04-scene-04':'Predict how many child next calls are required to return the next qualifying name, then count rejected inputs.', 'lecture-04-scene-09':'Predict the first pair after the right input ends. Identify which input advances and which rewinds.', 'lecture-04-scene-13':'Predict 300 × 3 versus 60 × 1 candidates before revealing the counts. Explain why both plans still need the join predicate.'},
    5: {'lecture-05-scene-03':'Return to Maya’s quoted-from puzzle. Ask for token kinds before revealing how identical letters acquire different roles.', 'lecture-05-scene-08':'Predict the returned description and the next unread token before advancing the parser call.', 'lecture-05-scene-12':'Check that both plans return the same rows. Predict their candidate pairs, then compare those counts with results and timings.'},
    6: {'find-37':'Predict the next child from the separator inequality before following its pointer. Keep the key, leaf entry, and heap address separate.', 'walk-a-range':'Predict whether every RID for key 31 contributes and where the inclusive upper bound stops the scan.', 'the-fifth-key':'Pause before overflow is repaired. Keep the whole RID list beside each key and predict the routing copy that appears in the parent.'},
    7: {'two-writes-reverse-undo':'Predict the buffer after undoing the newest SET before revealing 40. Then predict the earlier restoration to 60. Keep the durable page state separate.', 'repair-can-crash-too':'Place a crash before and after the repair flush, then before and after the completion record. State what a second recovery must see.'},
    8: {'statement-or-transaction-snapshot':'Name the snapshot boundary before predicting the second read. Use the same reader/writer schedule under both isolation levels.', 'write-skew':'Predict both decisions from the original snapshot. Ask why updating different rows can evade a direct write-write conflict.'},
    9: {'price-the-work':'Calculate the toy match count before converting it to page accesses. Use the same cost unit for the full scan and index.', 'when-estimates-fail':'Ask which distribution or independence assumption the visible data violates before changing the cost estimate.'},
    10: {'the-point-lookup-reverses-it':'Return to Noor’s changed request. Predict the values needed for a complete ride versus all fares before comparing their grouping.', 'train-inside-the-query-engine':'Name the training and test rows before fitting. Predict which stage creates coefficients and which later stage only applies them.', 'duckdb-pytorch-fare-model':'Ask for an error pattern before training. Trace SQL selection, Arrow batches, PyTorch weight updates, and the SQL prediction call separately. Compare the same held-out rides and metric.'}
  };
  window.CourseClearLearning = function (deck) {
    const topic=topics[deck.id];if(!topic)return;
    if(deck.clearLearningApplied)return;
    deck.clearLearningApplied=true;
    if(titles[deck.id])deck.scenes.forEach((scene,i)=>{scene.title=titles[deck.id][i];});
    if(deck.id===7)deck.scenes[0].title='Recover an interrupted transfer';
    if(deck.id===8){deck.scenes[0].title='Two deposits in one account';deck.scenes.at(-1).title='Locks and snapshot boundaries';}
    if(deck.id===9){deck.scenes[0].title='Same rows, different candidate work';deck.scenes.at(-1).title='Explain a choice and its assumptions';}
    if(deck.id===10)deck.scenes.find(s=>s.id==='choose-the-shape').title='Match storage to the query';
    const opening=deck.scenes[0],close=topic.closingId?deck.scenes.find(s=>s.id===topic.closingId):deck.scenes.at(-1);
    opening.teaching.builds[0]=topic.opening;
    opening.teaching.context=[topic.story,opening.teaching.context].filter(Boolean).join(' ');
    opening.teaching.question=topic.calibrate;opening.teaching.answer=topic.answer;
    const linked=deck.scenes.find(s=>s.id===topic.analogy[0]);
    linked.teaching.context=[topic.analogy[1],linked.teaching.context].filter(Boolean).join(' ');
    close.teaching.idea=topic.idea;close.teaching.question=topic.question;close.teaching.answer=topic.expected;
    close.teaching.builds[close.steps-1]+=' '+topic.closing;
    for(const [id,cue] of Object.entries(beats[deck.id]||{})){
      const scene=deck.scenes.find(s=>s.id===id);if(!scene)throw new Error('Missing CLEAR scene: '+deck.id+'/'+id);
      scene.teaching.builds[0]=cue+' '+scene.teaching.builds[0];
    }
    for(const scene of deck.scenes){
      const t=scene.teaching;
      scene.notes=[t.idea,...t.builds,'Ask: '+t.question,'Expected answer: '+t.answer,t.context,t.reference].filter(Boolean).join('\n\n');
    }
  };
})();
