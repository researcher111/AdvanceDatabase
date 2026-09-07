# Advanced Databases for Data Science

Course site: **https://researcher111.github.io/AdvanceDatabase/**

DS 6XXX, UVA School of Data Science. Fifteen lecture decks and eleven labs that
build **microdb**, a working relational database engine in Python, one subsystem
per week: file manager, buffer pool, record pages and catalog, iterator-model
operators, SQL front end, B+ tree, transactions and recovery. Act II moves to the
analytics stack, vector search, RAG, distributed compute, LSM engines and graphs.

Every page is plain HTML, CSS and JavaScript. There is no build step: open any
`.html` file in a browser and it works. Press `P` on a lecture page for
presentation mode.

## Get the code

```bash
git clone https://github.com/researcher111/AdvanceDatabase.git
cd AdvanceDatabase
```

Each lab's starter code and test harness live in `labs/lab-NN/starter/`. To start
Lab 1, for example:

```bash
cd labs/lab-01/starter
python3 test_filemanager.py      # 0/9 passing is the correct starting state
```

Labs 1 to 7 are cumulative: each `starter/` folder ships a working reference
implementation of every layer below the one you are building, so a difficult week
does not prevent you from starting the next. Lab 6 supplies an in-memory index;
Lab 7 supplies a separate transaction API. Integrating them with the SQL REPL
is an optional extension.

## Layout

| Path | What it is |
|------|------------|
| `index.html` | course home |
| `schedule.html` | day-by-day schedule, the source of truth for dates |
| `project.html` | the team RAG project spec |
| `lectures/lecture-NN/` | one lecture deck |
| `labs/lab-NN/` | one lab page plus its `starter/` code |
| `labs/_shared/` | the shared style base every page loads |

## Requirements

Python 3.11 or newer. Labs 1 to 7 are pure standard library. Later labs add
`duckdb` (Lab 8) and optional `pandas` for the dataframe comparison. Lab 11’s
graded portion uses only the standard library; its Spark and Ray exercises
need `pyspark`, a compatible JDK (17 or newer), and `ray`.

Clone the whole repository or download each complete `starter/` directory.
Labs 8–11 include data files that the individual Python download links do not
include. Labs 9–10 require no model download or paid API for the graded work.

Run each lab from its `starter/` directory. Unimplemented exercises deliberately
fail their tests; implement the marked methods before expecting a passing suite.
Measurements and reflections are for discussion, as stated on the lab pages.

## Maintainer checks

Run `python3 -m unittest discover -s tests -v` from the repository root to check
supplied infrastructure. These ungraded checks do not require student TODOs
to be completed and are separate from each lab’s exercise tests.

## Note

Reference solutions, autograders, quiz and exam generators are kept in a separate
private repository and are deliberately not published here.
