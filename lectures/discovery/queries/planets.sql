SELECT discoverymethod, COUNT(*) AS planets,
       COUNT(pl_orbper) AS with_period, COUNT(pl_rade) AS with_radius
FROM pscomppars
WHERE disc_year BETWEEN 1990 AND 2024
GROUP BY discoverymethod
ORDER BY planets DESC
