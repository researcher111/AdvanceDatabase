"""microdb · part 5 — the SQL front end: text in, plans out.

Lab 5 of Advanced Databases for Data Science (DS 6XXX, Fall 2026).
Runs on Labs 1-4 (reference implementations ship in this folder).

microSQL, the subset we speak (case-insensitive keywords):

    SELECT * | field {, field}  FROM table {, table}  [WHERE term {AND term}]
    term   :=  field (= | < | >) value        value := number | 'string' | field
    INSERT INTO table VALUES ( value {, value } )
    CREATE TABLE table ( field INT | field VARCHAR ( n ) {, ...} )

Three stages, one per class below:

    Lexer   (provided)   text  -> a stream of tokens
    Parser  (yours)      tokens -> plain-data descriptions (QueryData, ...)
    Planner (yours)      QueryData -> a scan tree, built from Lab 4 operators

parse_insert and parse_create are PROVIDED, on purpose: they are worked
examples of recursive descent. Read them first — parse_query is the same
song in a longer verse.

Run the tests any time:   python3 test_sql.py
Talk to your database:    python3 microdb.py        (the REPL, provided)
See your plans:           python3 measure_sql.py    (after tests pass)
"""

from __future__ import annotations

import re

from record_manager import Schema, Layout, TableScan
from query_engine import Predicate, F, SelectScan, ProjectScan, ProductScan


# ---------------------------------------------------------------- lexer

KEYWORDS = {"select", "from", "where", "and", "insert", "into", "values",
            "create", "table", "int", "varchar"}


class ParseError(Exception):
    """Bad microSQL. The message says what was expected and what was found."""


class Lexer:
    """Splits SQL text into tokens. Provided complete.

    Token kinds:  KEYWORD  ID  NUM  STR  PUNCT      e.g. for
    "SELECT name FROM students WHERE gpa > 35":
        (KEYWORD select) (ID name) (KEYWORD from) (ID students)
        (KEYWORD where) (ID gpa) (PUNCT >) (NUM 35)
    """

    TOKEN_RE = re.compile(r"""
        \s*(?:
          (?P<NUM>\d+)
        | '(?P<STR>[^']*)'
        | (?P<WORD>[A-Za-z_][A-Za-z0-9_]*)
        | (?P<PUNCT>[(),=<>*])
        )""", re.VERBOSE)

    def __init__(self, text: str):
        self.tokens: list[tuple[str, object]] = []
        pos = 0
        while pos < len(text.rstrip()):
            m = self.TOKEN_RE.match(text, pos)
            if m is None:
                raise ParseError(f"cannot read SQL at: {text[pos:pos + 20]!r}")
            if m.group("NUM") is not None:
                self.tokens.append(("NUM", int(m.group("NUM"))))
            elif m.group("STR") is not None:
                self.tokens.append(("STR", m.group("STR")))
            elif m.group("WORD") is not None:
                word = m.group("WORD")
                kind = "KEYWORD" if word.lower() in KEYWORDS else "ID"
                self.tokens.append((kind, word.lower()))
            else:
                self.tokens.append(("PUNCT", m.group("PUNCT")))
            pos = m.end()
        self.pos = 0

    # -- the four helpers every recursive-descent parser lives on --

    def peek(self) -> tuple[str, object]:
        """Look at the current token without consuming it."""
        return self.tokens[self.pos] if self.pos < len(self.tokens) else ("EOF", None)

    def next(self) -> tuple[str, object]:
        """Consume and return the current token."""
        tok = self.peek()
        self.pos += 1
        return tok

    def match(self, kind: str, value=None) -> bool:
        """Is the current token this kind (and value, if given)?"""
        k, v = self.peek()
        return k == kind and (value is None or v == value)

    def expect(self, kind: str, value=None) -> object:
        """Consume the current token, or die with a helpful ParseError."""
        if not self.match(kind, value):
            want = value if value is not None else kind
            k, v = self.peek()
            raise ParseError(f"expected {want!r}, found {v!r}")
        return self.next()[1]


# ------------------------------------------------- parsed descriptions

class QueryData:
    """What a SELECT said, as plain data: no bytes, no scans, just intent."""

    def __init__(self, fields: list[str], tables: list[str], predicate):
        self.fields = fields          # ["*"] means every field
        self.tables = tables
        self.predicate = predicate    # a Predicate, or None


class InsertData:
    def __init__(self, table: str, values: list):
        self.table = table
        self.values = values


class CreateData:
    def __init__(self, table: str, schema: Schema):
        self.table = table
        self.schema = schema


# ---------------------------------------------------------------- parser

class Parser:
    """Tokens -> descriptions, by recursive descent: one method per
    grammar rule, each consuming exactly the tokens its rule owns."""

    def __init__(self, text: str):
        self.lex = Lexer(text)

    def parse(self):
        """Dispatch on the first keyword. Provided."""
        if self.lex.match("KEYWORD", "select"):
            return self.parse_query()
        if self.lex.match("KEYWORD", "insert"):
            return self.parse_insert()
        if self.lex.match("KEYWORD", "create"):
            return self.parse_create()
        raise ParseError(f"statement must start with SELECT, INSERT or CREATE")

    # ---- worked example #1: INSERT (provided — imitate me) ----

    def parse_insert(self) -> InsertData:
        self.lex.expect("KEYWORD", "insert")
        self.lex.expect("KEYWORD", "into")
        table = self.lex.expect("ID")
        self.lex.expect("KEYWORD", "values")
        self.lex.expect("PUNCT", "(")
        values = [self._parse_literal()]
        while self.lex.match("PUNCT", ","):
            self.lex.next()
            values.append(self._parse_literal())
        self.lex.expect("PUNCT", ")")
        return InsertData(table, values)

    # ---- worked example #2: CREATE TABLE (provided — imitate me) ----

    def parse_create(self) -> CreateData:
        self.lex.expect("KEYWORD", "create")
        self.lex.expect("KEYWORD", "table")
        table = self.lex.expect("ID")
        self.lex.expect("PUNCT", "(")
        schema = Schema()
        self._parse_field_def(schema)
        while self.lex.match("PUNCT", ","):
            self.lex.next()
            self._parse_field_def(schema)
        self.lex.expect("PUNCT", ")")
        return CreateData(table, schema)

    def _parse_field_def(self, schema: Schema) -> None:
        name = self.lex.expect("ID")
        if self.lex.match("KEYWORD", "int"):
            self.lex.next()
            schema.add_int_field(name)
        elif self.lex.match("KEYWORD", "varchar"):
            self.lex.next()
            self.lex.expect("PUNCT", "(")
            length = self.lex.expect("NUM")
            self.lex.expect("PUNCT", ")")
            schema.add_string_field(name, length)
        else:
            raise ParseError(f"field {name!r} needs a type: INT or VARCHAR(n)")

    def _parse_literal(self):
        """A number or a 'string'. Provided."""
        if self.lex.match("NUM") or self.lex.match("STR"):
            return self.lex.next()[1]
        k, v = self.lex.peek()
        raise ParseError(f"expected a number or 'string', found {v!r}")

    # ---------------- YOUR JOB starts here. ----------------

    def parse_query(self) -> QueryData:
        """SELECT fieldlist FROM tablelist [WHERE predicate]

        Sketch: expect SELECT; read the field list (either a lone * or
        IDs separated by commas); expect FROM; read table IDs separated
        by commas; if WHERE follows, read the predicate. Return QueryData.
        parse_insert above has every move you need."""
        # TODO
        raise NotImplementedError

    def _parse_predicate(self) -> Predicate:
        """term {AND term} — collect terms, return Predicate(*terms)."""
        # TODO
        raise NotImplementedError

    def _parse_term(self) -> tuple:
        """field op value  ->  ("gpa", ">", 35) or ("mid", "=", F("mid2"))

        The right-hand side is the fork: NUM and STR tokens are literals;
        an ID token is a FIELD — wrap it in F so the predicate knows."""
        # TODO
        raise NotImplementedError

    # ---------------- YOUR JOB ends here. ----------------


# ---------------------------------------------------------------- planner

class Database:
    """The friendly face: db.execute(sql) does the whole trip.
    Construction and non-query execution are provided; plan_query is yours."""

    def __init__(self, fm, bm, catalog):
        self.fm = fm
        self.bm = bm
        self.catalog = catalog

    def execute(self, sql: str):
        """SELECT returns a list of row-dicts; INSERT/CREATE return a note."""
        data = Parser(sql).parse()
        if isinstance(data, QueryData):
            return self._run_query(data)
        if isinstance(data, InsertData):
            return self._run_insert(data)
        return self._run_create(data)

    # ---------------- YOUR JOB starts here. ----------------

    def plan_query(self, data: QueryData):
        """QueryData -> a scan tree. The naive (correct, unoptimized) plan:

            1. a TableScan per table (layout via self.catalog.get_layout)
            2. fold multiple tables into ProductScans, left to right
            3. wrap in a SelectScan if there is a predicate
            4. wrap in a ProjectScan unless fields == ["*"]

        Return the top scan. Do not call before_first — the runner does."""
        # TODO
        raise NotImplementedError

    # ---------------- YOUR JOB ends here. ----------------

    def _run_query(self, data: QueryData) -> list[dict]:
        plan = self.plan_query(data)
        if data.fields == ["*"]:
            fields = []
            for tbl in data.tables:
                fields += self.catalog.get_layout(tbl).schema.fields()
        else:
            fields = data.fields
        plan.before_first()
        rows = []
        while plan.next():
            rows.append({f: plan.get_val(f) for f in fields})
        plan.close()
        return rows

    def _run_insert(self, data: InsertData) -> str:
        layout = self.catalog.get_layout(data.table)
        fields = layout.schema.fields()
        if len(fields) != len(data.values):
            raise ParseError(f"{data.table} has {len(fields)} fields, "
                             f"got {len(data.values)} values")
        ts = TableScan(self.bm, self.fm, data.table, layout)
        ts.insert()
        for fld, val in zip(fields, data.values):
            if layout.schema.type_of(fld) == "int":
                ts.set_int(fld, val)
            else:
                ts.set_string(fld, val)
        ts.close()
        return f"1 row into {data.table}"

    def _run_create(self, data: CreateData) -> str:
        self.catalog.create_table(data.table, data.schema)
        return f"table {data.table} created"


def render_plan(scan, indent: int = 0) -> str:
    """Pretty-print a scan tree (provided — measure_sql.py uses it)."""
    pad = "  " * indent
    name = type(scan).__name__
    if name == "TableScan":
        return f"{pad}TableScan({scan.filename.removesuffix('.tbl')})"
    if name == "SelectScan":
        def show(rhs):
            return rhs.name if isinstance(rhs, F) else repr(rhs)
        terms = " AND ".join(f"{f} {op} {show(rhs)}"
                             for f, op, rhs in scan.predicate.terms)
        return f"{pad}SelectScan[{terms}]\n" + render_plan(scan.scan, indent + 1)
    if name == "ProjectScan":
        return f"{pad}ProjectScan{scan.fields}\n" + render_plan(scan.scan, indent + 1)
    if name == "ProductScan":
        return (f"{pad}ProductScan\n" + render_plan(scan.left, indent + 1)
                + "\n" + render_plan(scan.right, indent + 1))
    return f"{pad}{name}"
