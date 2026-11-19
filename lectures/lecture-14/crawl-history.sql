-- Run the entire script in the BigQuery SQL editor using GoogleSQL.
-- Each row records one observation. visit_no gives the order of these five visits.
CREATE TEMP TABLE crawl_history (
  visit_no INT64,
  page_key STRING,
  source_site STRING,
  link_text STRING
);

INSERT INTO crawl_history (visit_no, page_key, source_site, link_text)
VALUES
  (1, 'r2', 'school', 'Moon facts'),
  (2, 'r1', 'cnnsi.com', 'CNN'),
  (3, 'r2', 'school', 'Moon phases'),
  (4, 'r2', 'school', 'Moon phases'),
  (5, 'r2', 'school', 'Explore the Moon');

-- Which destination page appears in the most observations?
SELECT page_key, COUNT(*) AS visits
FROM crawl_history
GROUP BY page_key
ORDER BY visits DESC, page_key;

-- On which visits did the crawler observe a change to the school's Moon link?
WITH history AS (
  SELECT visit_no, link_text,
    LAG(link_text) OVER (
      ORDER BY visit_no) AS prior_text
  FROM crawl_history
  WHERE page_key = 'r2'
    AND source_site = 'school'
)
SELECT visit_no, prior_text, link_text
FROM history
WHERE prior_text <> link_text
ORDER BY visit_no;
