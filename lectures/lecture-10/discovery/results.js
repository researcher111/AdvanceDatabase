window.TAXI_DISCOVERY = {
  "source": "Cleaned course sample: 60,000 NYC yellow-taxi trips, 2024; 5,000 per month.",
  "duckdb_version": "1.5.6",
  "sha256": {
    "rides_2024_sample.csv.gz": "5742c777a165f28a7718d7b3fd774ba064dea38aee2674d8fb06591755dc77e6",
    "taxi_zone_lookup.csv": "1a99e105092230f8620f301edcca7f80d3080642ff404d28ed957d3fa222c8ed"
  },
  "cases": [
    {
      "id": "sample",
      "title": "Does December have more taxi trips?",
      "predict": "Predict which month will have the most rows. What would that count actually measure?",
      "sql": "SELECT month, count(*) AS rides,\n       round(median(fare), 2) AS median_fare,\n       round(sum(fare + tip), 2) AS sample_fare_tip\nFROM rides\nGROUP BY month ORDER BY month;",
      "chart": {
        "type": "bar",
        "x": "month",
        "metrics": [
          "rides",
          "median_fare",
          "sample_fare_tip"
        ]
      },
      "interpret": "Every month has 5,000 rows because the course sample was constructed that way. Neither these counts nor these monthly sums estimate citywide demand or revenue without the original monthly sampling fractions. Switch the chart to median_fare: this asks about the sampled trip distribution instead of how many city trips occurred.",
      "follow": "Change median(fare) to avg(fare). Which months change most? Explain what a few expensive trips can do to the mean.",
      "result": {
        "columns": [
          "month",
          "rides",
          "median_fare",
          "sample_fare_tip"
        ],
        "rows": [
          [
            1,
            5000,
            12.8,
            111003.22
          ],
          [
            2,
            5000,
            13.5,
            112513.26
          ],
          [
            3,
            5000,
            12.8,
            113566.49
          ],
          [
            4,
            5000,
            13.5,
            114560.05
          ],
          [
            5,
            5000,
            14.2,
            117834.14
          ],
          [
            6,
            5000,
            13.5,
            116189.91
          ],
          [
            7,
            5000,
            14.2,
            119482.53
          ],
          [
            8,
            5000,
            13.5,
            123212.75
          ],
          [
            9,
            5000,
            14.2,
            123040.07
          ],
          [
            10,
            5000,
            14.2,
            120095.33
          ],
          [
            11,
            5000,
            13.5,
            115476.87
          ],
          [
            12,
            5000,
            14.2,
            121479.99
          ]
        ],
        "truncated": false
      }
    },
    {
      "id": "tips",
      "title": "Do cash passengers never tip?",
      "predict": "Predict the recorded tip for card versus cash. Is a zero necessarily an observed absence?",
      "sql": "SELECT payment, count(*) AS rides,\n       round(avg(tip), 2) AS mean_recorded_tip,\n       round(100.0 * avg(CASE WHEN tip = 0 THEN 1 ELSE 0 END), 1)\n         AS zero_recorded_tip_pct\nFROM rides\nGROUP BY payment ORDER BY payment;",
      "chart": {
        "type": "bar",
        "x": "payment",
        "metrics": [
          "mean_recorded_tip",
          "zero_recorded_tip_pct",
          "rides"
        ]
      },
      "interpret": "Cash tips are not recorded in the TLC tip field. The zero values describe a measurement limitation, not evidence that cash passengers are less generous. A card-only comparison answers a narrower question; it still does not identify a causal effect of payment method.",
      "follow": "Filter to payment = 'card', group by hour, and include count(*). Which hours have enough observations to compare? Keep the word recorded in your conclusion.",
      "result": {
        "columns": [
          "payment",
          "rides",
          "mean_recorded_tip",
          "zero_recorded_tip_pct"
        ],
        "rows": [
          [
            "card",
            51172,
            4.35,
            5.8
          ],
          [
            "cash",
            8828,
            0.0,
            100.0
          ]
        ],
        "truncated": false
      }
    },
    {
      "id": "airports",
      "title": "Is a JFK trip more expensive than a LaGuardia trip?",
      "predict": "Predict the ranking by typical fare. Would you predict the same ranking for fare per mile?",
      "sql": "SELECT pickup_name AS airport, count(*) AS rides,\n       round(median(fare), 2) AS median_fare,\n       round(median(distance), 2) AS median_miles,\n       round(median(duration_min), 1) AS median_minutes,\n       round(median(fare / nullif(distance, 0)), 2) AS median_fare_per_mile\nFROM trips\nWHERE pickup_zone IN (132, 138)\nGROUP BY pickup_name ORDER BY airport;",
      "chart": {
        "type": "bar",
        "x": "airport",
        "metrics": [
          "median_fare",
          "median_fare_per_mile",
          "median_minutes",
          "rides"
        ]
      },
      "interpret": "The unit is a sampled trip picked up at the named airport. A larger fare can accompany a longer route; fare per mile asks a different question. The median of trip-level ratios is not the ratio of two medians. Fare excludes several surcharges and tolls, so it is not the full passenger bill or driver profit.",
      "follow": "Add AND dropoff_borough = 'Manhattan'. Does the comparison persist for a more similar destination group? Compare the sample sizes before interpreting the change.",
      "result": {
        "columns": [
          "airport",
          "rides",
          "median_fare",
          "median_miles",
          "median_minutes",
          "median_fare_per_mile"
        ],
        "rows": [
          [
            "JFK Airport",
            3102,
            70.0,
            17.52,
            42.6,
            3.97
          ],
          [
            "LaGuardia Airport",
            2052,
            42.9,
            9.59,
            29.8,
            4.36
          ]
        ],
        "truncated": false
      }
    },
    {
      "id": "rhythms",
      "title": "Do JFK, Times Square, and the East Village share a daily rhythm?",
      "predict": "Predict each location’s busiest hour. How can you compare a busy zone with a less frequent one?",
      "sql": "WITH hourly AS (\n  SELECT pickup_name AS zone, hour, count(*) AS rides\n  FROM trips WHERE pickup_zone IN (132, 230, 79)\n  GROUP BY pickup_name, hour\n)\nSELECT zone, hour, rides,\n       round(100.0 * rides / sum(rides) OVER (PARTITION BY zone), 2)\n         AS within_zone_pct\nFROM hourly ORDER BY zone, hour;",
      "chart": {
        "type": "heatmap",
        "x": "hour",
        "group": "zone",
        "metrics": [
          "within_zone_pct",
          "rides"
        ]
      },
      "interpret": "Each row of the heatmap is one pickup zone. Percentages divide by that zone’s sampled trips, so a large zone does not dominate solely because it has more rows. Hover or focus a cell, then inspect the table for its sample size. Pickup times pool the sampled 2024 months; this is not a count of trips in one particular day.",
      "follow": "Add AND month IN (6, 7, 8) inside the CTE. Compare the summer profile with winter. A changed profile suggests a new hypothesis; it does not explain its cause.",
      "result": {
        "columns": [
          "zone",
          "hour",
          "rides",
          "within_zone_pct"
        ],
        "rows": [
          [
            "East Village",
            0,
            96,
            7.91
          ],
          [
            "East Village",
            1,
            89,
            7.34
          ],
          [
            "East Village",
            2,
            60,
            4.95
          ],
          [
            "East Village",
            3,
            51,
            4.2
          ],
          [
            "East Village",
            4,
            10,
            0.82
          ],
          [
            "East Village",
            5,
            7,
            0.58
          ],
          [
            "East Village",
            6,
            8,
            0.66
          ],
          [
            "East Village",
            7,
            10,
            0.82
          ],
          [
            "East Village",
            8,
            29,
            2.39
          ],
          [
            "East Village",
            9,
            31,
            2.56
          ],
          [
            "East Village",
            10,
            33,
            2.72
          ],
          [
            "East Village",
            11,
            40,
            3.3
          ],
          [
            "East Village",
            12,
            40,
            3.3
          ],
          [
            "East Village",
            13,
            42,
            3.46
          ],
          [
            "East Village",
            14,
            31,
            2.56
          ],
          [
            "East Village",
            15,
            49,
            4.04
          ],
          [
            "East Village",
            16,
            36,
            2.97
          ],
          [
            "East Village",
            17,
            45,
            3.71
          ],
          [
            "East Village",
            18,
            65,
            5.36
          ],
          [
            "East Village",
            19,
            67,
            5.52
          ],
          [
            "East Village",
            20,
            80,
            6.6
          ],
          [
            "East Village",
            21,
            87,
            7.17
          ],
          [
            "East Village",
            22,
            107,
            8.82
          ],
          [
            "East Village",
            23,
            100,
            8.24
          ],
          [
            "JFK Airport",
            0,
            119,
            3.84
          ],
          [
            "JFK Airport",
            1,
            60,
            1.93
          ],
          [
            "JFK Airport",
            2,
            18,
            0.58
          ],
          [
            "JFK Airport",
            3,
            13,
            0.42
          ],
          [
            "JFK Airport",
            4,
            10,
            0.32
          ],
          [
            "JFK Airport",
            5,
            44,
            1.42
          ],
          [
            "JFK Airport",
            6,
            90,
            2.9
          ],
          [
            "JFK Airport",
            7,
            112,
            3.61
          ],
          [
            "JFK Airport",
            8,
            54,
            1.74
          ],
          [
            "JFK Airport",
            9,
            63,
            2.03
          ],
          [
            "JFK Airport",
            10,
            78,
            2.51
          ],
          [
            "JFK Airport",
            11,
            81,
            2.61
          ],
          [
            "JFK Airport",
            12,
            121,
            3.9
          ],
          [
            "JFK Airport",
            13,
            143,
            4.61
          ],
          [
            "JFK Airport",
            14,
            192,
            6.19
          ],
          [
            "JFK Airport",
            15,
            220,
            7.09
          ],
          [
            "JFK Airport",
            16,
            237,
            7.64
          ],
          [
            "JFK Airport",
            17,
            218,
            7.03
          ],
          [
            "JFK Airport",
            18,
            201,
            6.48
          ],
          [
            "JFK Airport",
            19,
            218,
            7.03
          ],
          [
            "JFK Airport",
            20,
            201,
            6.48
          ],
          [
            "JFK Airport",
            21,
            212,
            6.83
          ],
          [
            "JFK Airport",
            22,
            228,
            7.35
          ],
          [
            "JFK Airport",
            23,
            169,
            5.45
          ],
          [
            "Times Sq/Theatre District",
            0,
            60,
            3.05
          ],
          [
            "Times Sq/Theatre District",
            1,
            20,
            1.02
          ],
          [
            "Times Sq/Theatre District",
            2,
            23,
            1.17
          ],
          [
            "Times Sq/Theatre District",
            3,
            14,
            0.71
          ],
          [
            "Times Sq/Theatre District",
            4,
            16,
            0.81
          ],
          [
            "Times Sq/Theatre District",
            5,
            16,
            0.81
          ],
          [
            "Times Sq/Theatre District",
            6,
            16,
            0.81
          ],
          [
            "Times Sq/Theatre District",
            7,
            37,
            1.88
          ],
          [
            "Times Sq/Theatre District",
            8,
            56,
            2.85
          ],
          [
            "Times Sq/Theatre District",
            9,
            86,
            4.37
          ],
          [
            "Times Sq/Theatre District",
            10,
            90,
            4.57
          ],
          [
            "Times Sq/Theatre District",
            11,
            103,
            5.23
          ],
          [
            "Times Sq/Theatre District",
            12,
            87,
            4.42
          ],
          [
            "Times Sq/Theatre District",
            13,
            79,
            4.01
          ],
          [
            "Times Sq/Theatre District",
            14,
            103,
            5.23
          ],
          [
            "Times Sq/Theatre District",
            15,
            105,
            5.34
          ],
          [
            "Times Sq/Theatre District",
            16,
            140,
            7.11
          ],
          [
            "Times Sq/Theatre District",
            17,
            137,
            6.96
          ],
          [
            "Times Sq/Theatre District",
            18,
            151,
            7.67
          ],
          [
            "Times Sq/Theatre District",
            19,
            115,
            5.84
          ],
          [
            "Times Sq/Theatre District",
            20,
            122,
            6.2
          ],
          [
            "Times Sq/Theatre District",
            21,
            130,
            6.61
          ],
          [
            "Times Sq/Theatre District",
            22,
            177,
            8.99
          ],
          [
            "Times Sq/Theatre District",
            23,
            85,
            4.32
          ]
        ],
        "truncated": false
      }
    },
    {
      "id": "mix",
      "title": "Which borough has the most expensive typical trip?",
      "predict": "Rank the boroughs first. Then predict whether the order changes when you compare trips of similar length.",
      "sql": "WITH cohorts AS (\n  SELECT pickup_borough AS borough, 'All sampled trips' AS cohort, fare\n  FROM trips\n  UNION ALL\n  SELECT pickup_borough, '2–5 miles; no airport pickup', fare\n  FROM trips\n  WHERE distance BETWEEN 2 AND 5 AND pickup_zone NOT IN (132, 138)\n)\nSELECT borough || ' · ' || cohort AS comparison,\n       count(*) AS rides, round(median(fare), 2) AS median_fare\nFROM cohorts\nWHERE borough IN ('Manhattan', 'Queens', 'Brooklyn', 'Bronx', 'Staten Island')\nGROUP BY borough, cohort HAVING count(*) >= 50\nORDER BY borough, cohort;",
      "chart": {
        "type": "bar",
        "x": "comparison",
        "metrics": [
          "median_fare",
          "rides"
        ]
      },
      "interpret": "The two cohorts have different trip mixes. Narrowing the distance and removing airport pickups makes one aspect of the comparison more similar, but it does not control every difference. Groups below 50 rides are omitted explicitly; missing bars do not mean zero fare. A changed ranking is evidence that composition matters, not proof that a borough causes a fare.",
      "follow": "Try 1–3 miles, then 5–10 miles. Include duration or time of day as another grouping variable. Report the rule you chose before looking at the new rankings.",
      "result": {
        "columns": [
          "comparison",
          "rides",
          "median_fare"
        ],
        "rows": [
          [
            "Bronx · All sampled trips",
            112,
            33.5
          ],
          [
            "Brooklyn · 2–5 miles; no airport pickup",
            157,
            20.5
          ],
          [
            "Brooklyn · All sampled trips",
            493,
            24.5
          ],
          [
            "Manhattan · 2–5 miles; no airport pickup",
            15293,
            18.4
          ],
          [
            "Manhattan · All sampled trips",
            53442,
            12.8
          ],
          [
            "Queens · 2–5 miles; no airport pickup",
            102,
            21.2
          ],
          [
            "Queens · All sampled trips",
            5753,
            54.1
          ]
        ],
        "truncated": false
      }
    },
    {
      "id": "routes",
      "title": "Where do the trips from each borough go?",
      "predict": "Does a trip usually stay in its pickup borough? Predict which origin will have a different top destination.",
      "sql": "WITH routes AS (\n  SELECT pickup_borough, dropoff_borough, count(*) AS rides\n  FROM trips\n  WHERE pickup_borough IN ('Manhattan','Queens','Brooklyn','Bronx','Staten Island')\n    AND dropoff_borough IN ('Manhattan','Queens','Brooklyn','Bronx','Staten Island')\n  GROUP BY pickup_borough, dropoff_borough\n), ranked AS (\n  SELECT *, row_number() OVER (\n    PARTITION BY pickup_borough ORDER BY rides DESC, dropoff_borough\n  ) AS destination_rank,\n  round(100.0 * rides / sum(rides) OVER (PARTITION BY pickup_borough), 1)\n    AS within_origin_pct\n  FROM routes\n)\nSELECT pickup_borough || ' → ' || dropoff_borough AS route,\n       rides, within_origin_pct, destination_rank\nFROM ranked WHERE destination_rank <= 2\nORDER BY pickup_borough, destination_rank;",
      "chart": {
        "type": "bar",
        "x": "route",
        "metrics": [
          "within_origin_pct",
          "rides"
        ]
      },
      "interpret": "Two joins give the pickup and dropoff their names. Grouping makes route counts, and the window ranks destinations within each origin. The denominator includes all five named destination boroughs before the top-two filter, so the two displayed shares need not add to 100%. Low-count origins deserve extra caution.",
      "follow": "Remove destination_rank <= 2 and inspect every destination. Then count trips excluded by the borough filters. How would including unknown or outside-city destinations change the denominator?",
      "result": {
        "columns": [
          "route",
          "rides",
          "within_origin_pct",
          "destination_rank"
        ],
        "rows": [
          [
            "Bronx → Manhattan",
            60,
            53.6,
            1
          ],
          [
            "Bronx → Bronx",
            31,
            27.7,
            2
          ],
          [
            "Brooklyn → Brooklyn",
            265,
            54.0,
            1
          ],
          [
            "Brooklyn → Manhattan",
            148,
            30.1,
            2
          ],
          [
            "Manhattan → Manhattan",
            49936,
            94.1,
            1
          ],
          [
            "Manhattan → Queens",
            1743,
            3.3,
            2
          ],
          [
            "Queens → Manhattan",
            3446,
            62.1,
            1
          ],
          [
            "Queens → Queens",
            1044,
            18.8,
            2
          ]
        ],
        "truncated": false
      }
    },
    {
      "id": "join",
      "title": "Can a join invent taxi trips?",
      "predict": "The real zones table has one row per LocationID. Predict what happens if a lookup accidentally contains two Times Square rows.",
      "sql": "WITH duplicate_zones AS (\n  SELECT * FROM zones\n  UNION ALL SELECT * FROM zones WHERE LocationID = 230\n)\nSELECT 'Correct dimension' AS version, count(*) AS joined_rows,\n       count(DISTINCT ride_id) AS distinct_rides,\n       round(sum(fare + tip), 2) AS sample_fare_tip\nFROM rides JOIN zones ON pickup_zone = LocationID\nUNION ALL\nSELECT 'Deliberately duplicated lookup', count(*), count(DISTINCT ride_id),\n       round(sum(fare + tip), 2)\nFROM rides JOIN duplicate_zones ON pickup_zone = LocationID;",
      "chart": {
        "type": "bar",
        "x": "version",
        "metrics": [
          "joined_rows",
          "distinct_rides",
          "sample_fare_tip"
        ]
      },
      "interpret": "The extra lookup row is a deliberate experiment, not a flaw in the shipped zones table. The join repeats every matching Times Square ride: joined rows and the sum grow, while distinct ride IDs do not. A credible discovery starts by checking the unit of observation and join cardinality.",
      "follow": "Compare count(*) and count(DISTINCT ride_id) after both joins in the trips view. Explain why fixing the dimension key is preferable to adding DISTINCT to a revenue query.",
      "result": {
        "columns": [
          "version",
          "joined_rows",
          "distinct_rides",
          "sample_fare_tip"
        ],
        "rows": [
          [
            "Correct dimension",
            60000,
            60000,
            1408454.61
          ],
          [
            "Deliberately duplicated lookup",
            61968,
            60000,
            1454412.12
          ]
        ],
        "truncated": false
      }
    }
  ]
};
