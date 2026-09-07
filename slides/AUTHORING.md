# Editing a visual lecture

Each lecture is registered in one of `decks/lectures-01-05.js`,
`decks/lectures-06-10.js`, or `decks/lectures-11-15.js`. A deck contains its
source reading, date, and an ordered `scenes` array.

A scene has a stable `id`, an instructor-only `title`, `minutes`, `kind`,
`steps`, `states`, `notes`, and a `draw(d, step)` function. The minutes across
a lecture must total 60, excluding any quiz. `steps` counts states starting
at zero. `states` gives the presenter a brief description of each build.

Keep explanations, prediction questions, expected answers, caveats, and
source citations in the notes. On the projected canvas, use brief definitions,
necessary diagram labels, values, and formulas. The `definition` scene kind
adds a term and a definition of at most 18 words above the diagram.

The canvas is 1280 × 720. Use the drawing methods in `_shared/visuals.js`:
`rect`, `text`, `circle`, `line`, `arrow`, `path`, `box`, and `table`.
Every object needs a unique key within its build. Retain the same key when an
object moves between builds so the player can animate its position. Do not
add timers inside a drawing function; the player owns the timing and controls.

Regular diagrams should stay within x=70–1210 and y=65–640. Definition
scenes reserve the top 220 pixels for the term and definition. Use large
labels and prefer cutting text to shrinking it. Changes to scene IDs also
change where locally saved annotations appear, so keep IDs stable when
revising existing scenes.

Run `node scripts/validate_slides.mjs` from the repository root after editing.
You can pass lecture numbers to check a subset. Then open the deck, inspect
its overview, and step through every changed animation. Check the actual
rendered labels, numerical relationships, and classroom pacing. Toy examples
must be identified as such in the notes. Recompute examples described as
measurements when their data or implementation changes.
