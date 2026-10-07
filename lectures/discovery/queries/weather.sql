-- ClickHouse SQL. One output row = one date at the Central Park station.
-- Keep encoded zeros visible: the mirror's pivot can turn absent elements into 0.
SELECT date, name,
       tempMin / 10.0 AS min_c,
       tempMax / 10.0 AS max_c,
       tempAvg / 10.0 AS encoded_avg_c,
       precipitation / 10.0 AS encoded_precip_mm
FROM noaa.noaa
WHERE station_id = 'USW00094728'
  AND date >= '2015-07-01' AND date < '2015-08-01'
ORDER BY date
