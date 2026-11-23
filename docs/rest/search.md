# Search — `/search`

## `GET /search?q=…&page=n&type=all|posts|users|chats`

Unified search — one merged, relevance-ordered list (25/page, `q` 1–200 chars,
`type` default `all`). Each item:

```json
{"type": "user|post|chat", "score": 12.3, "user|post|chat": {…payload…}}
```

`user` = public account object (as `/search/users`), `post` = normal post
object, `chat` = `{_id, nickname, icon, icon_color, members, mode}`. Response
also has `counts` (`{users, posts, chats}` candidate counts) and `pages`.

Scoring — users: exact username 100 > username prefix 60 > display_name prefix
50 > username contains 35 > display_name contains 30. Posts: `$text` score ×10
+ 2·log1p(like_count) + log1p(reply_count) over non-deleted home posts, plus an
escaped contains-regex fallback over home **and group chats/DMs the requester
is a member of** (score ≈5 minus small age penalty) — logged-out searches only
ever see home posts, and nobody sees posts in chats they aren't in. Chats:
member chats only — nickname prefix 40, contains 25. Merge order: score desc,
then users > chats > posts, then newest.

Both legacy endpoints below remain available. Query params:

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
