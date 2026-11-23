# Current user — `/me`

All endpoints require `Token` auth. Sensitive account-management endpoints
return `403 {"error": true, "type": "botsCannotDoThis"}` for bot accounts
(noted per endpoint).

## `GET /me`

Your full account incl. config (see [Account object](../getting-started.md#account-object)).

```bash
curl https://api.example.com/me -H "Token: $TOKEN"
```

`200 {"error": false, …account + settings…}`

## `DELETE /me`

Schedules the account for deletion in 7 days, revokes all tokens and
disconnects CloudLink sessions. Logging back in within 7 days cancels
(`delete_after` cleared). 🚫 bots.

| Body | Type | Required |
|---|---|---|
| `password` | string | yes |

Errors: 401 `invalidCredentials` (wrong password), 403 `botsCannotDoThis`,
429, 403 `accountBanned`.

## `PATCH /me/config`

Update profile fields and settings. Unknown/absent fields are ignored;
`null` values are dropped. Ratelimit `config:<user>` 10/5s.

| Body | Type | Constraints |
|---|---|---|
| `pfp_data` | int | built-in avatar id |
| `avatar` | string | uploads file id, `""` to clear |
| `avatar_color` | string | 6-char hex (no `#`) |
| `quote` | string | ≤360 |
| `display_name` | string \| null | trimmed, ≤32, no control chars/newlines; `""`/`null` clears → `invalidDisplayName` 400 |
| `unread_inbox` | bool | |
| `theme` | string | ≤256 |
| `mode` | bool | light/dark |
| `layout` | string | ≤256 |
| `sfx` | bool | |
| `bgm` | bool | |
| `bgm_song` | int | |
| `debug` | bool | |
| `hide_blocked_users` | bool | |
| `hide_presence` | bool | also toggles ulist visibility |
| `profile_theme` | bool | |
| `favorited_chats` | string[] | capped at 50 |

Setting `avatar` claims the file with the uploads service (`unableToClaimAvatar`
500 on failure) and unclaims the old one. If you're restricted from
`EDITING_PROFILE`, profile fields are silently dropped.

Events: `update_config` to your sessions; `update_profile` to everyone when
`pfp_data`/`avatar`/`avatar_color`/`quote`/`display_name` change.

`200 {"error": false}`

## `GET /me/relationships`

```json
{"error": false, "autoget": [{"username": "…", "state": 1, "updated_at": 0}], "page#": 1, "pages": 1}
```

Relationship states: `0` none · `1` friend request sent (friends if mutual) ·
`2` blocking.

## `GET /me/friends`

```json
{"error": false, "friends": ["mutual"], "incoming": ["they sent a request"], "outgoing": ["I sent a request"]}
```

## `PATCH /me/password`

🚫 bots.

| Body | Type | Constraints |
|---|---|---|
| `old` | string | required |
| `new` | string | 8–72 chars |

The previous hash is kept for 14 days (login with it returns
`passwordRecentlyChanged`). Sends an inbox alert.

`200 {"error": false}` · Errors: 401 `invalidCredentials`, 403
`botsCannotDoThis`, 429.

## `GET /me/authenticators`

```json
{"error": false, "autoget": [{"_id": "uuid", "type": "totp", "nickname": "…", "registered_at": 0}], "page#": 1, "pages": 1}
```

## `POST /me/authenticators`

Register a TOTP authenticator. 🚫 bots.

| Body | Type | Required | Constraints |
|---|---|---|---|
| `password` | string | yes | |
| `type` | `"totp"` | yes | only `totp` |
| `nickname` | string | no | ≤32 |
| `totp_secret` | string | yes | 32 chars (from `GET /me/authenticators/totp-secret`) |
| `totp_code` | string | yes | 6 digits, verified against the secret |

`200 {"error": false, "authenticator": {_id,type,nickname,registered_at},
"mfa_recovery_code": "…"}`. Sends an inbox alert. Errors: 401
`invalidTOTPCode`, 401 `invalidCredentials`, 403 `botsCannotDoThis`, 400, 429.

## `GET /me/authenticators/totp-secret`

Generates a new secret + provisioning URI + QR SVG. 🚫 bots.

`200 {"error": false, "secret": "BASE32…", "provisioning_uri": "otpauth://…",
"qr_code_svg": "<svg…>"}`

## `PATCH /me/authenticators/<id>`

🚫 bots. Body `{nickname?: string ≤32}` → `200 {"error": false, …authenticator…}`.

## `DELETE /me/authenticators/<id>`

🚫 bots. Body `{password}` → `200 {"error": false}` + inbox alert.
Errors: 401 `invalidCredentials`, 404, 403 `botsCannotDoThis`, 429.

## `POST /me/reset-mfa-recovery-code`

🚫 bots. Body `{password}` → `200 {"error": false,
"mfa_recovery_code": "…"}` + inbox alert. Errors: 401 `invalidCredentials`,
429.

## `DELETE /me/tokens`

Revokes **all** your tokens and kicks every CloudLink session.
`200 {"error": false}`.

## `GET /me/reports?page=n`

Reports **you** filed, newest first. `autoget` entries contain the report doc
with your `reason`/`comment`/`time` merged in and `content` populated (post
stub `{_id,u,isDeleted}` or account object for user reports).

## `GET /me/export`

Current data-export request, if any exists (pending, or completed <7 days
old). `200`:

```json
{"_id": "uuid", "user": "…", "status": "pending|completed|failed", "created_at": 0, "completed_at": 0, "size": 12345, "expires_at": 0}
```

`size`/`expires_at` only when completed. 404 if none. 🚫 bots.

## `POST /me/export`

Request a new export (built in the background as a ZIP: `account.json`,
`settings.json`, `posts.json`, `post_revisions.json`, `chats.json`,
`relationships.json`, `reactions.json`, `reports_filed.json`, …). 429 if a
current request already exists. `200` returns the export doc. 🚫 bots.

## `GET /me/export/download`

Downloads the latest completed export (`meower-data-<username>.zip`), or 404.
🚫 bots.
