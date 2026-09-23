# Maintaining the query walkthrough

`sqlfrontend.html#worked-example` accepts SELECT queries over the documented
students and majors schemas. It runs entirely in the browser, including from a
local file, without a Python runtime or network dependency. It constructs and
explains the simple plan; query execution remains in the existing terminal.

- `query-trace.js` mirrors the Python lexer, SELECT parser, and planner. Each
  frame is an independent snapshot so stepping backward does not mutate history.
  Lexer helpers are one step per direct call; their internal implementations can
  be expanded in the code panel. Numeric literals use BigInt to preserve Python
  integer precision.
- `query-trace-source.js` contains the exact Python methods and original line
  numbers, with docstrings omitted. Regenerate it after changing the starter:
  `python3 scripts/generate_lab5_query_source.py`.
- `query-walkthrough.js` owns rendering, playback, stage navigation, and editing.
  User-entered SQL is rendered with text nodes, never evaluated or inserted as HTML.
- `query-walkthrough.css` keeps the visual and code beside each other on desktop
  and stacks them on narrow screens. The native fullscreen view keeps controls visible. Exit with the button or Escape.

Run these checks from the repository root:

```sh
python3 scripts/generate_lab5_query_source.py --check
node tests/test_lab5_query_trace.js
node tests/test_teaching_traces.js
```

The trace test compares tokens, direct helper calls and cursor positions, parsed
objects, errors, and final scan trees against the actual Python engine. It also
checks that the source excerpt has not drifted.

With Playwright available to Node, run:

```sh
node tests/test_lab5_query_walkthrough_ui.js
```

Optional environment variables: `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects a
Chromium binary and `QUERY_REVIEW_DIR` saves review screenshots to an existing
directory. The UI test blocks external requests, exercises all initial source
highlights, and checks controls, errors, input escaping, and responsive layout.
