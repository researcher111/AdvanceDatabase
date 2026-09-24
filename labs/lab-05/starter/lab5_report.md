# Lab 5: Query plans and measured work

Name:
Environment (Python version and operating system):

Submit four individual files to the Lab 5 programming assignment on Gradescope:
`queries.sql`, `results-300.json`, `results-600.json`, and this completed report
as `lab5_report.md` or `lab5_report.pdf`. Do not upload a folder or ZIP.
Automatic checks are worth 70 points; staff review this report for 30 more.
A report-received check does not grade its contents. There is no runtime target.

Staff rubric: implementation walkthrough (8), original predictions with reasons
(6), six operator-based comparisons (12), timing limitations and reflection (4).

## 1. Explain the supplied implementation

- Trace `SELECT name FROM students WHERE gpa > 35`: what does each of
  `parse_query`, `_parse_predicate`, and `_parse_term` return?
- Why is `mid2` represented as `F("mid2")`, but `'ds'` is a string literal?
- Why must selection happen before projection for this query?
- Which call starts reading result rows? Why does the runner use `finally`?

## 2. Write SQL

Complete and submit `queries.sql`: exactly six statements in S1, S2, S3, J1,
J2, J3 order, separated by semicolons.
Paste the six statements here as well, so this report is readable on its own.

## 3. Predict before measuring

Keep your original predictions, including any that turn out to be wrong.
For each comparison, give a count or formula and name the operator responsible.

| Comparison | Predicted row visits / pairs / output cells | Reason |
|---|---|---|
| S1 vs S2: add a selective WHERE | | |
| S2 vs S3: change only the SELECT list | | |
| J1: simple vs early-filter plan | | |
| J1 vs J2: reverse FROM order | | |
| J1 vs J3: make the GPA condition more selective | | |
| J1 with 300 vs 600 students | | |

## 4. Record evidence

Upload `results-300.json` and `results-600.json` as separate, unedited files.
Run the same six queries on both sizes with at least seven samples per plan:

```sh
python3 measure_sql.py --queries queries.sql --students 300 --repeat 7 --json > results-300.json
python3 measure_sql.py --queries queries.sql --students 600 --repeat 7 --json > results-600.json
```

If you edit any SQL, regenerate both JSON files before resubmitting. Keep your
original predictions and explain corrections rather than rewriting predictions.
Summarize results for both plan modes below; expand the table to include all
six queries × two sizes × two plans (24 rows).

| Query | Students | Plan | Student row visits | Major row visits | Candidate pairs | Comparisons | Rows | Output cells | Median ms |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| | | | | | | | | | |

## 5. Explain differences from first principles

1. Did fewer returned rows imply fewer table row visits? Explain from TableScan
   and SelectScan's next() methods; distinguish visits from disk reads.
2. Did selecting fewer columns avoid scanning rows? Which work did it reduce?
3. Derive the simple and early-filter pair counts for J1. Explain why the early
   plan still revisits majors even though only one major passes its filter.
4. J1 and J2 return the same rows. Which side is restarted? Explain any changes
   in base-row visits even when the candidate-pair count stays the same.
5. Explain J3's counts using the number of students that pass its filter.
6. Which counts doubled with 600 students? Why needn't the measured time double?
7. Compare the pair-count ratio with the timing ratio for J1. Use comparisons,
   source scans, and output work to explain why those ratios can differ.
8. State what was timed, what was excluded, and how repeats/caching/noise limit
   a claim that one query is faster. If a timing difference is tiny, say so.

## 6. One failed prediction

Quote an original prediction, the evidence that changed it, and your revised
explanation. If all predictions matched, explain the least obvious result.
