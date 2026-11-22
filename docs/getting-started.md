# Getting started

## Base URLs

Base URLs depend on the instance you are talking to. For a local development
setup the defaults are:

| Service | Local default |
|---|---|
| REST API | `http://127.0.0.1:3001` |
| CloudLink (websocket) | `ws://127.0.0.1:3000/?v=1` |
| Uploads | `http://127.0.0.1:3002` |

All examples in this documentation use `https://api.example.com` for the REST
API and `https://uploads.example.com` for uploads — substitute your instance's
URLs.

**API prefix:** the v0 blueprint is mounted at both `/` and `/v0`, so
`POST /auth/login` and `POST /v0/auth/login` are the same endpoint. The docs
show the unprefixed paths; add `/v0` if your client expects it.

## Authentication

After logging in ([POST /auth/login](rest/auth.md#post-authlogin)) or
registering you receive a `token`. Send it on every authenticated request with
the **`Token` header**:

```
Token: <token>
```

- Logging in with an existing token as the `password` also works (the client
  uses this to resume sessions and for CloudLink `authpswd`).
- Deleting your account, revoking tokens (`DELETE /me/tokens`), or regenerating
  a bot token invalidates tokens.
- If the account has TOTP authenticators, login returns `401` with
  `{"error": true, "type": "mfaRequired", "mfa_methods": ["totp"]}`. Resend the
  request including `totp_code` (6 digits) or `mfa_recovery_code` (10 hex
  chars) in the body — or simply append the code to the end of `password` (see
  [auth.md](rest/auth.md#post-authlogin)).
- Bots authenticate the same way with their bot token and can never log in
  with a password (see [bots.md](bots.md)).

## Requests

- JSON bodies, `Content-Type: application/json`.
- Validation errors return `400 {"error": true, "type": "badRequest"}`.
- The websocket API uses JSON packets; see [cloudlink.md](cloudlink.md).

## Response conventions

- Successful responses are JSON and usually include `"error": false`.
- Errors are `{"error": true, "type": "<type>"}` plus an HTTP status code.
  Some errors carry extra fields (e.g. `mfaRequired` → `mfa_methods`,
  `chatBanned` → `expires`, `passwordRecentlyChanged` → `changed_at`).

Common error types returned by the framework:

| Status | `type` | Meaning |
|---|---|---|
| 400 | `badRequest` | malformed JSON / schema validation failed |
| 401 | `Unauthorized` | missing or invalid `Token` |
| 403 | `missingPermissions` | generic forbidden |
| 404 | `notFound` | resource does not exist (also used to hide private resources) |
| 405 | `methodNotAllowed` | |
| 429 | `tooManyRequests` | ratelimit bucket exhausted |
| 500 | `Internal` | |
| 503 | `repairModeEnabled` | instance is in repair mode |
| 403 | `ipBlocked` | requester's IP is netblocked |
| 403 | `accountBanned` | banned account, or banned from a specific feature (restrictions) |

## Pagination

List endpoints take `?page=<n>` (1-based, 25 items per page) and return:

```json
{"error": false, "autoget": [ … ], "page#": 1, "pages": 4}
```

- `autoget` — the items.
- `page#` — the page returned (note the `#` in the key name).
- `pages` — total pages.

## IDs & timestamps

- **Posts** are ULIDs: 26-char Crockford base32 strings that sort by creation
  time (e.g. `01J8Z4K0A0BCDEFGHJKMNPQRST`).
- **Chats, invites, authenticators, reports, data exports** are UUID4 strings.
- **Files** (avatars, icons, attachments, emotes) are 24-char
  `[a-zA-Z0-9]` IDs served by the uploads service.
- **Usernames** match `[a-zA-Z0-9-_]{1,20}` and are unique case-insensitively.
- **Timestamps** are Unix seconds (`t.e`, `created`, `last_active`,
  `updated_at`, …).

## Ratelimits

Endpoints enforce per-bucket fixed-window limits; when a bucket is exhausted
the endpoint returns `429 {"error": true, "type": "tooManyRequests"}`. Buckets
are namespaced internally as `rtl:<bucket>:<subject>` — the main ones you'll
hit:

| Bucket | Limit |
|---|---|
| `post:<user>` | 6 posts/edits/deletes per 5s (bypassed by the `POST_RATELIMIT_BYPASS` flag) |
| `typing:<user>` | 6 per 5s |
| `update_chat:<user>` | 5 per 5s (chat updates, members, roles, emotes; invites use 10 per 5s) |
| `create_chat:<user>` | 5 per 30s |
| `config:<user>` | 10 per 5s |
| `react:<user>` | 5 per 5s |
| `relationships:<user>` | 10 per 15s |
| `report:<user>` | 3 per 5s |
| `login:i:<ip>` | 50 per 900s; `login:u:<user>` 5 failed attempts per 60s |
| `register:<ip>:s` | 5 per 900s (plus fail bucket) |
| `bots:create:<user>` | 5 per 60s |

## Root endpoints

### `GET /`

Instance info:

```json
{"captcha": {"enabled": false, "sitekey": "…or null"}}
```

### `GET /status`

Always available, even in repair mode or for blocked IPs:

```json
{
  "scratchDeprecated": true,
  "registrationEnabled": true,
  "isRepairMode": false,
  "ipBlocked": false,
  "ipRegistrationBlocked": false
}
```

### `GET /statistics`

```json
{"error": false, "users": 123, "posts": 4567, "chats": 89}
```

### `GET /ulist?page=n`

Currently online usernames, 25 per page (same pagination shape, `autoget`
contains public account objects).

## Account object

Public account objects (from `/users/<name>`, search, ulist, etc.) contain:

| Field | Type | Notes |
|---|---|---|
| `_id` | string | username |
| `uuid` | string | account UUID |
| `flags` | int | [UserFlags](#userflags) bitfield |
| `permissions` | int | admin permission bitfield |
| `created` | int | unix seconds |
| `pfp_data` | int | built-in avatar id |
| `avatar` | string | uploaded icon file id or `""` |
| `avatar_color` | string | 6-char hex |
| `quote` | string | status/bio (max 360) |
| `last_seen` | int | unix seconds |
| `bot` | bool | bot account flag |
| `bot_owner` | string | only on bot accounts — owner username |
| `lvl` | int | always `0` (legacy) |
| `banned` | bool | |

`GET /me` returns the same plus `ban` and all user settings
(`unread_inbox`, `theme`, `mode`, `layout`, `sfx`, `bgm`, `bgm_song`, `debug`,
`hide_blocked_users`, `hide_presence`, `profile_theme`, `active_dms`,
`favorited_chats`).

### UserFlags

| Bit | Name | Meaning |
|---|---|---|
| 1 | `SYSTEM` | system account (Server, Notification, Announcement) |
| 2 | `DELETED` | deleted account |
| 4 | `PROTECTED` | protected account |
| 8 | `POST_RATELIMIT_BYPASS` | skips the post ratelimit |
| 16 | `ULTRA_HD_UPLOADS` | joke flag |
| 32 | `BOT` | bot account |

### Ban states & restrictions

`account.ban.state` is one of `none`, `temp_restriction`, `perm_restriction`,
`temp_ban`, `perm_ban`, with `expires` and `reason`. A `perm_ban` or unexpired
`temp_ban` blocks all authenticated requests (`403 accountBanned`).

Restriction bits on `ban.restrictions` block specific features (also returned
as `403 accountBanned`):

| Bit | Restriction |
|---|---|
| 1 | home posts |
| 2 | chat posts |
| 4 | creating chats / adding members |
| 8 | editing chat details |
| 16 | editing own profile (profile fields silently dropped) |
