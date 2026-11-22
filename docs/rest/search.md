# Search — `/search`

Both endpoints are **public** (no auth needed). Query params:

| Param | Type | Required | Constraints |
|---|---|---|---|
| `q` | string | yes | 1–4000 chars (MongoDB text search) |
| `page` | int | no | ≥1, default 1 |

## `GET /search/home?q=…&page=n`

Full-text search over non-deleted home posts → post page shape.

## `GET /search/users?q=…&page=n`

Full-text search over usernames/quotes → `autoget` of account objects.

> Note: the underlying query requires `pswd` to be a string, so bot accounts
> (and any other passwordless accounts) never appear in user search.
