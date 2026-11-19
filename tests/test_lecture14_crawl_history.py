"""Keep the two worked BigQuery examples in sync with the downloadable script."""
from contextlib import closing
from html import unescape
from pathlib import Path
import re
import sqlite3
import unittest


LECTURE = Path(__file__).resolve().parents[1] / "lectures" / "lecture-14"


class CrawlHistoryTests(unittest.TestCase):
    def test_reading_queries_and_results(self):
        # The fixture uses a GoogleSQL subset that SQLite can execute locally.
        queries = []
        results = []
        statement = ""
        with closing(sqlite3.connect(":memory:")) as database:
            for line in (LECTURE / "crawl-history.sql").read_text().splitlines():
                if line.lstrip().startswith("--"):
                    continue
                statement += line + "\n"
                if sqlite3.complete_statement(statement):
                    cursor = database.execute(statement)
                    if cursor.description:
                        queries.append(statement.strip())
                        results.append(cursor.fetchall())
                    statement = ""
        self.assertFalse(statement.strip(), "Incomplete SQL at end of script")
        self.assertEqual(results, [
            [("r2", 4), ("r1", 1)],
            [(3, "Moon facts", "Moon phases"), (5, "Moon phases", "Explore the Moon")],
        ])

        reading = (LECTURE / "bigtable.html").read_text()
        examples = re.findall(r'<code class="language-sql">(.*?)</code>', reading, re.DOTALL)
        self.assertEqual(queries, [unescape(query).strip() for query in examples])


if __name__ == "__main__":
    unittest.main()
