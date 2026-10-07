-- Open the database built by discovery.py. These queries do not modify data.

-- 1. Does December have more taxi trips?
SELECT month, count(*) AS rides,
       round(median(fare), 2) AS median_fare,
       round(sum(fare + tip), 2) AS sample_fare_tip
FROM rides
GROUP BY month ORDER BY month;

-- 2. Do cash passengers never tip?
SELECT payment, count(*) AS rides,
       round(avg(tip), 2) AS mean_recorded_tip,
       round(100.0 * avg(CASE WHEN tip = 0 THEN 1 ELSE 0 END), 1)
         AS zero_recorded_tip_pct
FROM rides
GROUP BY payment ORDER BY payment;

-- 3. Is a JFK trip more expensive than a LaGuardia trip?
SELECT pickup_name AS airport, count(*) AS rides,
       round(median(fare), 2) AS median_fare,
       round(median(distance), 2) AS median_miles,
       round(median(duration_min), 1) AS median_minutes,
       round(median(fare / nullif(distance, 0)), 2) AS median_fare_per_mile
FROM trips
WHERE pickup_zone IN (132, 138)
GROUP BY pickup_name ORDER BY airport;

-- 4. Do JFK, Times Square, and the East Village share a daily rhythm?
WITH hourly AS (
  SELECT pickup_name AS zone, hour, count(*) AS rides
  FROM trips WHERE pickup_zone IN (132, 230, 79)
  GROUP BY pickup_name, hour
)
SELECT zone, hour, rides,
       round(100.0 * rides / sum(rides) OVER (PARTITION BY zone), 2)
         AS within_zone_pct
FROM hourly ORDER BY zone, hour;

-- 5. Which borough has the most expensive typical trip?
WITH cohorts AS (
  SELECT pickup_borough AS borough, 'All sampled trips' AS cohort, fare
  FROM trips
  UNION ALL
  SELECT pickup_borough, '2–5 miles; no airport pickup', fare
  FROM trips
  WHERE distance BETWEEN 2 AND 5 AND pickup_zone NOT IN (132, 138)
)
SELECT borough || ' · ' || cohort AS comparison,
       count(*) AS rides, round(median(fare), 2) AS median_fare
FROM cohorts
WHERE borough IN ('Manhattan', 'Queens', 'Brooklyn', 'Bronx', 'Staten Island')
GROUP BY borough, cohort HAVING count(*) >= 50
ORDER BY borough, cohort;

-- 6. Where do the trips from each borough go?
WITH routes AS (
  SELECT pickup_borough, dropoff_borough, count(*) AS rides
  FROM trips
  WHERE pickup_borough IN ('Manhattan','Queens','Brooklyn','Bronx','Staten Island')
    AND dropoff_borough IN ('Manhattan','Queens','Brooklyn','Bronx','Staten Island')
  GROUP BY pickup_borough, dropoff_borough
), ranked AS (
  SELECT *, row_number() OVER (
    PARTITION BY pickup_borough ORDER BY rides DESC, dropoff_borough
  ) AS destination_rank,
  round(100.0 * rides / sum(rides) OVER (PARTITION BY pickup_borough), 1)
    AS within_origin_pct
  FROM routes
)
SELECT pickup_borough || ' → ' || dropoff_borough AS route,
       rides, within_origin_pct, destination_rank
FROM ranked WHERE destination_rank <= 2
ORDER BY pickup_borough, destination_rank;

-- 7. Can a join invent taxi trips?
WITH duplicate_zones AS (
  SELECT * FROM zones
  UNION ALL SELECT * FROM zones WHERE LocationID = 230
)
SELECT 'Correct dimension' AS version, count(*) AS joined_rows,
       count(DISTINCT ride_id) AS distinct_rides,
       round(sum(fare + tip), 2) AS sample_fare_tip
FROM rides JOIN zones ON pickup_zone = LocationID
UNION ALL
SELECT 'Deliberately duplicated lookup', count(*), count(DISTINCT ride_id),
       round(sum(fare + tip), 2)
FROM rides JOIN duplicate_zones ON pickup_zone = LocationID;
