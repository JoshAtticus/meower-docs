# Explore — `/explore`

## `GET /explore?range=week|month|year|all&page=n`

Ranked home posts (public, no auth). `range` defaults to `week`
(week = 7d, month = 30d, year = 365d, `all` = no cutoff); 25 per page.

Ranking score, computed in a Mongo aggregation over the denormalised post
counters:

```
score = (3·like_count + 1.5·reaction_count + 4·reply_count + 1)
        / (age_hours/24 + 2)^0.5
```

Response: post page shape; every post additionally carries `like_count`,
`reaction_count`, `reply_count` and `score` (rounded to 2 decimals).
Results per `(range, page)` are cached in Redis for 60 seconds
(`explore:*` keys). Posts by accounts the requester has blocked are excluded.
