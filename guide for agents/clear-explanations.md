# Explain complex ideas with CLEAR

Use this file when creating or revising teaching material. This includes readings, slides, presenter notes, labs, interactive explanations, reviews, and discovery sessions. Apply it when adapting a video or transcript too.

**Use CLEAR and ASD-STE100 style by default for all future teaching material in this repository.** CLEAR organizes the explanation. The ASD-STE100 style rules below guide its wording. Use a different style only when the user requests it.

Begin with what the audience knows. Connect the new idea to something familiar. Show the mechanism, state its essential meaning, and revisit that meaning at the end.

## Source and saved transcript

The primary reference is Vinh Giang’s [How to Explain Anything To Anyone](https://www.youtube.com/watch?v=Sqh6rt1hN2A), published June 19, 2026. The full [user-provided transcript](sources/vinh-giang-clear-transcript.txt) preserves the supplied wording, with timestamps formatted for reading. The notes below paraphrase the explanation. The subsequent authoring workflow adapts it for reusable teaching materials.

## The five ideas

| Idea | Timestamp | Meaning |
| --- | --- | --- |
| Calibrate | [2:53](https://www.youtube.com/watch?v=Sqh6rt1hN2A&t=173s) | Find out what the audience already understands. Ask a qualifying question instead of assuming either expertise or complete unfamiliarity. Keep technical depth when it suits the audience. |
| Link | [4:14](https://www.youtube.com/watch?v=Sqh6rt1hN2A&t=254s) | Connect an unfamiliar idea to a familiar one through an analogy, metaphor, or comparison. Give listeners an existing reference point. |
| Envision | [7:27](https://www.youtube.com/watch?v=Sqh6rt1hN2A&t=447s) | Draw the idea when words alone are difficult to follow. Simple shapes and a visible structure can make the relationship easier to grasp. |
| Abstract | [7:48](https://www.youtube.com/watch?v=Sqh6rt1hN2A&t=468s) | Reduce the explanation to its essential structure and use language people can understand. Simplification should make the idea accessible. |
| Repeat | [12:16](https://www.youtube.com/watch?v=Sqh6rt1hN2A&t=736s) | Close the explanation by returning to its main structure. Revisit the model so the audience can connect the parts. |

The opening describes how unnecessary complexity can leave listeners pretending to understand. Around [10:50](https://www.youtube.com/watch?v=Sqh6rt1hN2A&t=650s), Giang connects effective teaching with the ability to pass knowledge to other people. These are reasons to design for understanding rather than for the appearance of expertise.

## Default wording: ASD-STE100 style

Use these rules during each CLEAR step, including the first draft and later revisions. Apply them to visible text, teaching cues, glossary entries, and interactive messages.

The rules adapt [ASD-STE100 Simplified Technical English, Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf) for this course. See the [official overview](https://www.asd-ste100.org/about_STE.html) for the standard's purpose. This course adaptation does not establish full compliance with the standard or its approved vocabulary.

### Write direct sentences

- Limit an instruction sentence to **20 words**. Give one instruction per sentence, except when actions must occur together.
- Limit a descriptive sentence to **25 words**. Keep one main idea in each sentence.
- Use the imperative for instructions: “Count the returned IDs.” Put a necessary condition before the instruction.
- Prefer active voice. Name the actor when the reader needs to know who performs the action.
- Use familiar words. Define a technical term or acronym before using it without explanation. Reuse the same term for the same concept.
- Make pronoun references clear. Repeat the relevant noun when “it,” “this,” or “they” could refer to several items.
- Avoid contractions and prose semicolons. Keep headings and diagram labels short.
- Keep one topic in each paragraph. Use no more than **six sentences** per paragraph. Keep the explanation connected and natural.

### Preserve meaning while simplifying

Retain causes, conditions, exceptions, units, and uncertainty. A shorter sentence must support the same technical conclusion. Keep illustrative examples separate from measurements.

Preserve literal content exactly. This includes code, commands, formulas, API names, filenames, URLs, source titles, and quoted fixture text. Prose word limits do not apply to these items. Preserve their spelling and case. If an identifier starts a sentence, add a subject when needed: “The file `rides.parquet` contains the rows.”

Preserve source quotations and the saved transcripts. Preserve numerical fixtures, measured datasets, required formats, test thresholds, deadlines, and submission requirements. Change them only when the user requests a substantive change. Keep required and optional work distinct.

Review each rewritten sentence in context. Do not rely on replacing punctuation or counting words alone. When splitting a sentence, restore any missing subject or verb. Keep the causal connection explicit.

### Examples from this course

| Before | CLEAR with ASD-STE100 style |
| --- | --- |
| Update the centers and repeat assignment. The real groups follow vector geometry. | Move each centroid to the average position of its assigned vectors. Assign each vector to its nearest centroid again. |
| Count seven shared IDs. The shortcut missed three exact neighbors. | Seven IDs occur in both result lists. The approximate search missed IDs 4, 7, and 10 from the exact result. |
| Run the plan, then use the counters to check each prediction. | Run the plan. Use the counters to check each prediction. |

## Reusable authoring workflow

This workflow is our adaptation of CLEAR. Use the [storytelling guide](lecture-storytelling.md) when a concrete scene will help motivate the topic.

1. **Write the audience and outcome.** State what the audience already knows and what they should be able to explain, choose, or do afterward. Prepare one short opening question that checks the assumed knowledge.
2. **Choose the familiar connection.** Name the familiar object or process, map its parts to the new mechanism, and state where the analogy stops working. An analogy introduces the mechanism; it does not establish a technical claim.
3. **Draw a small example.** Use the fewest inputs that reveal the important behavior. Keep IDs, labels, units, and positions consistent across builds. Let the audience predict before revealing a result.
4. **State the essential idea.** Write one plain sentence connecting the mechanism to its consequence. Then add the formula, technical term, and necessary conditions. Keep details available in notes or supporting material.
5. **Return and transfer.** Revisit the same diagram and essential sentence. Ask the audience to explain a different input or defend a decision using the model. This transfer question is our teaching adaptation, not an additional step claimed by the video.

Simplifying a lecture does not mean removing its evidence. Preserve the conditions that change the answer, distinguish examples from measurements, and keep the chosen metric and baseline visible.

Apply the ASD-STE100 wording rules before the final review. Check sentences in context, then inspect the rendered page or slide. Confirm that labels, examples, instructions, and presenter notes still agree.

## Use the transcript in slides

Apply the communication method to the subject being taught. For a vector-search lecture, the audience needs vectors, lists, neighbor IDs, and search results. The communication framework belongs in the reusable guide and teaching cues; each audience slide should show the relevant mechanism or decision.

| CLEAR step | Audience slide | Presenter cue |
| --- | --- | --- |
| Calibrate | Show the opening task and the relevant inputs. | Ask what an exact-key lookup can do and what students already know about vector scores. Adapt the explanation to their answer. |
| Link | Show the familiar comparison beside the new mechanism. | Map each part explicitly, then name one limit of the analogy. |
| Envision | Trace a small example one change at a time. | Ask for the next state before revealing it. Point to the item the operation changes or skips. |
| Abstract | Give one short claim with the diagram or formula that supports it. | Explain the essential consequence before adding settings, implementation details, or exceptions. |
| Repeat | Revisit the original model and question. | Ask someone to explain the model in their own words and apply it to a new case. |

## Lecture 11 application

The fictional project rehearsal supplies a reason to care. CLEAR supplies the explanation sequence.

- **Calibrate:** ask whether an exact-string lookup will find a paraphrase. Check whether students can compute the dot product of two unit vectors before discussing cosine scores.
- **Link:** compare IVF lists to shelves of books. A centroid is like a shelf label, a list is like a shelf, and a stored vector is like a book. Choosing a promising label does not guarantee that every useful book is on that shelf. Actual membership and selection are computed from vector geometry.
- **Envision:** show the four-vector fixture before the general IVF work estimate. Keep q, v0, v1, c0, and c1 visible while the first list is searched and the best neighbor is skipped.
- **Abstract:** “Searching fewer candidates can miss true neighbors. Measure that loss against exact search.” Introduce recall as the fraction of saved exact neighbors that return.
- **Repeat:** return to the same recovery question and the same sequence: save exact IDs, search fewer candidates, compare neighbor IDs, and read the passage. Ask students to explain why finding every geometric neighbor still does not establish useful evidence.

Keep the balanced-list estimate of **820** evaluations separate from the Lab 9 measured probe-4 result of **924** floored average comparisons and **0.9175** average recall. The first explains the work model; the second supports a classroom choice among measured settings.

## Applications across the course

The same method connects all fifteen lecture readings and slide decks, all eleven labs, the midterm review, and the discovery sessions. Preserve the distinction between optional material and required coursework. Lab 5 supplies the front end; Lab 7 is optional practice; Lab 8’s model investigation retains its existing deliverables.

| Topic | Familiar connection | Small example to trace | Closing transfer question |
| --- | --- | --- | --- |
| Lecture 1 and Lab 1 | Workshop responsibilities and numbered storage boxes | The same student query on cold and resident blocks; exact bytes and block positions | Can a cached page replace executing a query, or a self-consistent round trip prove the file format? |
| Lecture 2 and Lab 2 | Books on limited work desks, with active users | Repeated B7 requests; a pinned clean frame and an unpinned dirty victim | Why can safe replacement coexist with a zero-hit cyclic scan? |
| Lecture 3 and Lab 3 | Fixed compartments and positions within them | A packed update moves an address; a 24-byte slot locates GPA at byte 92 | What stays the same when a deleted RID is reused, and what changes? |
| Lecture 4 and Lab 4 | Nested Python generators | One result request skips rejected rows; a product rewinds its right input | What must valid filter pushdown preserve besides the result count? |
| Lecture 5 and Lab 5 | Reading instructions before carrying them out | Characters, token kinds, QueryData, scans, and rows remain separate | Why can sixty returned names still require three hundred source visits? |
| Lecture 6 and Lab 6 | Ordered directory signs, entries, and addresses | Separator 36 routes to a leaf RID; insert 5 into a four-key leaf | How does a duplicate key differ from a distinct key, and what must a split retain? |
| Lecture 7 and optional Lab 7 | Saving repair information before a change | Undo restores 10 → 40 → 60, then flushes before recording completion | What if recovery declares completion before its repair becomes durable? |
| Optional Lecture 8 and Lab 7’s provided lock table | Compatible reservations and dated views | Two deposits lose an update; a fixed schedule exposes different second reads | Why do durable writes, pins, locks, and snapshots provide different guarantees? |
| Optional Lecture 9 | A route estimated from a sketch | Equivalent joins form 900 or 60 candidates; an index model prices 103 or 2,003 accesses | Which assumptions could change the estimated best plan? |
| Lecture 10 and Lab 8 | One complete record versus one list of fields; practice versus reserved questions | Three toy fares under two layouts; training and held-out predictions | Which values can the query skip, and what comparison supports a model improvement? |

### Later topics

| Topic | Familiar connection | Small example before the general explanation | Closing transfer question |
| --- | --- | --- | --- |
| Lecture 11 and Lab 9 | Shelf labels and the books on each shelf | Four vectors, two centroid lists, a skipped v1, and separately counted centroid and candidate work | Why can searching every list match exact results while doing more comparisons? |
| Lecture 12 and Lab 10 | An open-book answer with page references | A search position maps to a chunk copy and its source ID; three toy rankings separate hit rate from reciprocal rank | What does a relevant source in the prompt leave unproved about the generated claim? |
| Lecture 13 and Lab 11 | Sorting mail into destination trays | Two records emit four occurrences; equal words meet before their totals are computed | What must stay the same when the partition count changes, and what can still affect timing? |
| Lecture 14 | An ordered notebook sealed into sorted pages | old@5, new@8, and DELETE@9 remain in different structures while the newest visible record wins | Why must an incomplete compaction keep a deletion marker? |
| Lecture 15 | Directed routes and distinct destinations on a map | Two walks reach Dee, while a visited frontier keeps Dee once | Which result and cycle rules must match before comparing SQL and graph execution? |

For the labs, use **predict, run, explain** around existing traces and function checks. Keep these learning prompts separate from graded deliverables. Preserve required API and prompt formats, test thresholds, starter files, submission dates, and the distinction between required and optional engine exercises.

## Template for another video

Copy these fields into notes for each new source. Preserve the source and its timestamped ideas separately from your adaptations.

```text
Video title:
Creator:
Source URL:
Publication date when known:
Transcript file and provenance:

Audience and prior knowledge:
Desired learning outcome:

Source ideas
- Timestamp:
- Idea in my own words:
- Example or evidence used in the video:
- Relevant limit or condition:

Application to my topic
- Calibrate: opening question and expected answer
- Link: familiar comparison, explicit mapping, and limit
- Envision: smallest useful diagram or worked example
- Abstract: essential claim and necessary technical conditions
- Repeat: model to revisit and question that checks transfer

ASD-STE100 wording pass
- Technical terms and first-use definitions:
- Instructions: one action per sentence, at most 20 words
- Descriptions: at most 25 words per sentence
- Paragraphs: one topic, at most six sentences
- Conditions, evidence, and literal content to preserve:

Deliverables
- Reading or script to change:
- Audience slides to change:
- Presenter cues to change:
- Verification needed:
```

## Check each sentence

This is a course-authoring adaptation of CLEAR: make the action, object, and consequence easy to identify before adding more detail.

- Name the operation and the affected item. Replace “the source disappeared” with “the selected chunk lost its source ID during prompt assembly.”
- Introduce an example before referring back to it: state the query’s goal and the counter or output being compared. When switching examples, name the query you are returning to.
- Use a pronoun when its reference is clear. If “it,” “this,” or “that” could refer to several things, name the relevant query, record, page, or result.
- State the concrete consequence. Replace “an incomplete durable state” with “the debit reached disk without its matching credit, reducing the total balance.”
- Tell students what to inspect. Replace “trace one question all the way to its results” with “compare the returned neighbor IDs with exact search, then read the passages to check whether they answer the question.”
- Keep technical conditions in the sentence or its immediate explanation. For example, distinguish current reads from older snapshots before saying that a deletion marker can be removed.

Read a story sentence aloud and ask whether a student can say what happened, why it matters, and what to check next. Keep the familiar comparison, but explain how it maps to the actual mechanism.

## Final review

- Does the opening question check the assumed audience knowledge?
- Can each part of the analogy be mapped to a real part of the mechanism?
- Does the diagram show why the result occurs?
- Do students see the example before the general formula?
- Is the essential claim precise enough to remain true when simplified?
- Does each action name its object, and does each consequence say what actually changes?
- Does the ending revisit the same model and test whether students can use it?
- Are source ideas, invented scenes, toy inputs, estimates, and measured results distinguishable?
- Do instructions and descriptions meet the 20-word and 25-word limits, with the literal-content exceptions above?
- Are actors, technical terms, pronoun references, and conditions clear? Does each paragraph stay on one topic?
- Did the rewrite preserve code, formulas, source wording, measurements, and assignment requirements?
- Do the rendered text, diagrams, controls, and presenter notes still agree?

Read this file explicitly in future work. It is saved repository context, so another chat or another video can use the same workflow.
