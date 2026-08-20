"""Lecture 15 live demo — a graph database in 5 minutes.

    pip install kuzu
    python3 kuzu_demo.py

The toy data is the course's six students, now following each other.
Each section prints the Cypher it runs, then the result — so the demo
survives even if the instructor's fingers don't.
"""

import shutil

import kuzu

shutil.rmtree("demo_db", ignore_errors=True)
db = kuzu.Database("demo_db")
conn = kuzu.Connection(db)


def run(title, query):
    print(f"\n--- {title}")
    print(query.strip())
    result = conn.execute(query)
    while result.has_next():
        print("   ", result.get_next())


# ---- schema + data: 6 students, 9 follows edges --------------------------
conn.execute("CREATE NODE TABLE Student(name STRING, gpa INT64, PRIMARY KEY(name))")
conn.execute("CREATE REL TABLE Follows(FROM Student TO Student)")

STUDENTS = [("ada", 39), ("ben", 31), ("cyd", 37), ("dee", 28), ("eli", 36), ("fay", 34)]
FOLLOWS = [("ada", "ben"), ("ada", "cyd"), ("ben", "dee"), ("cyd", "dee"),
           ("dee", "eli"), ("eli", "fay"), ("fay", "ada"), ("cyd", "eli"), ("ben", "ada")]

for name, gpa in STUDENTS:
    conn.execute(f"CREATE (:Student {{name: '{name}', gpa: {gpa}}})")
for a, b in FOLLOWS:
    conn.execute(f"MATCH (a:Student), (b:Student) WHERE a.name = '{a}' AND b.name = '{b}' "
                 f"CREATE (a)-[:Follows]->(b)")
print(f"loaded {len(STUDENTS)} students, {len(FOLLOWS)} follows edges")

# ---- the demo queries ----------------------------------------------------
run("1 · one hop: who does ada follow?", """
MATCH (a:Student {name: 'ada'})-[:Follows]->(b)
RETURN b.name ORDER BY b.name
""")

run("2 · two hops: friends-of-friends (not ada, not already followed)", """
MATCH (a:Student {name: 'ada'})-[:Follows]->()-[:Follows]->(fof)
WHERE fof.name <> 'ada'
  AND NOT EXISTS { MATCH (a)-[:Follows]->(fof) }
RETURN DISTINCT fof.name ORDER BY fof.name
""")

run("3 · variable length: everyone within 3 hops of ada", """
MATCH (a:Student {name: 'ada'})-[:Follows*1..3]->(b)
WHERE b.name <> 'ada'
RETURN DISTINCT b.name ORDER BY b.name
""")

run("4 · shortest path: how does ada reach fay?", """
MATCH p = (a:Student {name: 'ada'})-[:Follows* SHORTEST]->(b:Student {name: 'fay'})
RETURN LIST_TRANSFORM(nodes(p), n -> n.name) AS path
""")
