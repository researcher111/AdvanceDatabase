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
implementation of every layer below the one you are building, so a rough week
never sinks the next one.

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
`duckdb` (Lab 8), and `pyspark` and `ray` (Lab 11).

## Note

Reference solutions, autograders, quiz and exam generators are kept in a separate
private repository and are deliberately not published here.
