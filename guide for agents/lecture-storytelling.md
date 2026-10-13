# Storytelling for technical lectures

Use this guide when revising lecture readings, audience slides, or presenter notes. Give students a concrete problem to follow, let them predict what happens, and use each result to motivate the next technical decision. Preserve the mathematics, measurements, and distinctions that make the lesson useful.

For the explanation structure, start with the [CLEAR guide](clear-explanations.md), based on Vinh Giang’s video. Use this storytelling guide to make the opening task and its consequences concrete. Both source transcripts are saved in `guide for agents/sources/`.

## Video notes

Source: [Philipp Humm’s storytelling video](https://www.youtube.com/watch?v=hNuAv-42jzY&t=53s), published February 3, 2025. The supplied link starts at 0:53; these notes cover the whole video. The full [user-provided captions](sources/philipp-humm-storytelling-captions.txt) are saved alongside this guide, with their wording preserved and timestamps formatted for reading. The table below paraphrases those captions. Names and punctuation in automatic captions can be inaccurate. The improvement percentage in the video title is promotional wording, not a measured result used by this course.

| Video time | Advice in my own words |
| --- | --- |
| [0:00](https://www.youtube.com/watch?v=hNuAv-42jzY) | A short story can hold attention without requiring a complicated structure. The opening example demonstrates a conversation rather than reporting its outcome. |
| [0:37](https://www.youtube.com/watch?v=hNuAv-42jzY&t=37s) | Enter one consequential moment. Let the audience experience the exchange instead of describing events from a distance. |
| [1:32](https://www.youtube.com/watch?v=hNuAv-42jzY&t=92s) | Give a recognizable physical location. A few useful details orient the listener; an inventory of the room slows the story. |
| [2:29](https://www.youtube.com/watch?v=hNuAv-42jzY&t=149s) | Show what someone does. Concrete verbs start the movement and bring the audience into the event. |
| [3:16](https://www.youtube.com/watch?v=hNuAv-42jzY&t=196s) | Share the thought that matters at that moment. Ordinary, imperfect inner speech is more believable than a polished professional statement. |
| [4:29](https://www.youtube.com/watch?v=hNuAv-42jzY&t=269s) | Make emotion visible through behavior or a physical reaction, rather than only naming the feeling. |
| [5:38](https://www.youtube.com/watch?v=hNuAv-42jzY&t=338s) | Let characters speak. A brief, distinctive line carries more life than a summary of what they discussed. |
| [6:54](https://www.youtube.com/watch?v=hNuAv-42jzY&t=414s) | The closing example combines setting, action, thought, dialogue, and visible reaction around a mistaken assumption and its reversal. |

The author also explains the approach in [his article about entering a moment](https://storylab.co/zoom-into-the-moment-storytelling/) and [his article about action, emotion, and dialogue](https://storylab.co/3-storytelling-techniques/). The former uses a later four-part framework; the linked video presents five techniques.

## Apply the five techniques to a lecture

These are course-authoring adaptations of the advice, not additional claims from the video.

| Technique | Use in a technical lesson | Lecture 11 example |
| --- | --- | --- |
| Location | Start where the system is being used. Choose a lab desk, terminal, query result, or whiteboard rather than an abstract industry overview. | Maya turns her laptop toward Noor during a project rehearsal. |
| Actions | Give the student or system an observable operation. Use verbs such as type, score, assign, probe, count, and compare. | Maya saves the exact result IDs before trying IVF. |
| Thoughts | Expose a plausible expectation that the next result can test. Keep it short and natural. | Maya expects a nearby point to be found, even though its list may be skipped. |
| Emotions | Show a modest reaction to a result. Make the technical consequence carry the stakes; avoid adding drama to every definition. | Maya starts to nod at the shortcut, then stops to ask what happens to skipped passages. |
| Dialogue | Let a question move the explanation forward. Use a second voice to challenge an assumption or request evidence. | Noor asks whether the returned passage actually explains recovery. |

Label invented classroom scenes as fictional. Invented dialogue can motivate an example; it must not imply that a benchmark, student experience, or product result actually occurred.

## Build the causal sequence

1. **Enter the problem.** Someone attempts a concrete task and meets an obstacle. State enough context to understand the failure.
2. **Try the simplest method.** Show the inputs, operation, and result. Preserve this result as the baseline.
3. **Introduce a new pressure.** More data, a changed query, a failure, or a workload constraint makes the next mechanism necessary.
4. **Ask for a prediction.** Put the relevant data on screen before revealing what the mechanism does.
5. **Show the consequence.** Trace the operation and make the missed row, changed state, extra work, or wrong assumption visible.
6. **Make a measured decision.** Choose between alternatives using stated requirements and evidence. Keep estimates separate from measurements.
7. **Return to the opening task.** Explain what the student can now diagnose or justify. Leave the next unresolved question as the bridge to the next lecture.

Each section should answer a question raised by the previous section. A transition such as “The loop works, but now ten million vectors arrive” creates a reason to learn about indexes. “Next we cover indexes” supplies only an agenda.

## Audience slides and presenter notes

Keep the audience slide focused on the current event: one question, diagram, formula, or result with a short explanatory caption. Use the same query, IDs, and units across successive builds so the audience can see what changes. Keep detailed dialogue and teaching instructions in presenter notes.

At each build, describe the visible state, ask for a prediction, pause, then reveal the operation or result. Do not place a future answer in an earlier caption. Keep essential qualifications visible when omitting them would make the slide misleading, such as “toy coordinates,” “balanced-list estimate,” or “comparisons, not latency.”

Preserve existing scene IDs, timing, controls, trace fixtures, and source links when revising these course decks. Titles and captions may change while those technical contracts remain stable. Check the final deck in audience, presenter, and printable-guide views.

## Lecture 11 story map

The fictional rehearsal follows the question “How does a database recover after a crash?” It illustrates motivation; the numerical demonstrations use separately identified toy vectors and Lab 9 measurements.

| Stage | Question that motivates the next step | Technical result |
| --- | --- | --- |
| An exact-string search fails | How can different words describe the same idea? | An embedding model defines a space for similarity comparisons. |
| Every vector is scored | How will we recognize a shortcut’s mistakes? | Exact search supplies reference neighbor IDs. |
| The workload grows | Can we examine fewer candidates? | IVF selects lists; HNSW explores a graph. |
| A list is skipped | Where did the closest vector go? | In the four-vector fixture, v1 scores 0.96 but is outside the first probed list. |
| More lists are searched | How much work is enough? | In Lab 9’s measured choices, probe 4 meets the classroom targets of 0.90 mean recall and at most 1,000 average comparisons. |
| A passage is opened | Does agreement with exact search mean the evidence is useful? | Geometric recall and task relevance need separate evaluation. |

The balanced-list formula gives **20 + 4 × 200 = 820** distance evaluations for n = 4,000, C = 20, P = 4. The separately measured Lab 9 probe-4 result is **0.9175 mean recall with a floored mean of 924 comparisons**, about **4.3× fewer comparisons** than exact search. Neither count establishes an elapsed-time speedup.

## Review before saving

- Can a student state the opening task and explain why it matters?
- Does each new mechanism solve a problem the lecture has already made visible?
- Are the character’s expectation and the system’s actual result distinguishable?
- Do students get a chance to predict before seeing each reveal?
- Are fictional scenes, toy examples, estimates, and measurements clearly identified?
- Do formulas, IDs, units, and numerical claims agree across the reading and slides?
- Is the final decision justified by evidence, with the remaining question stated clearly?

For future revisions, read this file explicitly. It is persistent repository context; it does not depend on a future chat remembering this conversation.
