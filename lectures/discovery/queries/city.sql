-- ClickHouse SQL. A different population from the course's 2024 sample.
-- One output row = hour and day type in July 2015, for filtered yellow trips.
SELECT
    if(toDayOfWeek(pickup_date) >= 6, 'Weekend', 'Weekday') AS day_type,
    toHour(pickup_datetime) AS hour,
    count() AS trips,
    uniqExact(pickup_date) AS observed_dates,
    round(count() / uniqExact(pickup_date), 1) AS trips_per_observed_day
FROM nyc_taxi.trips
WHERE pickup_date >= '2015-07-01' AND pickup_date < '2015-08-01'
  AND cab_type = 'yellow'
  AND passenger_count BETWEEN 1 AND 6
  AND trip_distance BETWEEN 0.1 AND 100
  AND fare_amount BETWEEN 1 AND 500
GROUP BY day_type, hour
ORDER BY day_type, hour
