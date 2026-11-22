# Bot management — `/bots`

Bots are real accounts (`flags` has bit `32`/`BOT`, `pswd` is `null`) that
authenticate everywhere with a single bot **token** — never a password.
See the [bots guide](../bots.md) for usage.

Management endpoints need a normal (non-bot) `Token`; bots get
`403 {"error": true, "type": "botsCannotManageBots"}` on every route except
the public `GET /bots/<id>`. Destructive actions (delete, token regenerate)
require a `totp_code` when the **owner** has TOTP authenticators:
`403 mfaRequired` if absent, `401 invalidTOTPCode` if wrong.

## `POST /bots/`

Create a bot. Ratelimit `bots:create:<user>` 5/60s; max 10 bots per owner.

| Body | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | must match `[a-zA-Z0-9-_]{1,20}` |
| `description` | string | no | ≤250, default `""` |

`200`:

```json
{"error": false, "id": "mybot", "name": "mybot", "description": "…",
 "owner": "you", "token": "…", "icon": ""}
```

`token` is returned **only here** (and on regenerate).

Errors: 400 `illegalCharacters`, 409 `usernameExists` (case-insensitive, vs
all accounts), 403 `botsCannotManageBots` / `tooManyBots`, 429.

## `GET /bots/?page=n`

Your bots, 25/page: `{error, bots: [{id, name, icon}], page, pages}`.

## `GET /bots/<id>`

**Public** — no auth needed:

```json
{"error": false, "id": "mybot", "name": "mybot", "description": "…", "owner": "you", "icon": ""}
```

404 `notFound` if it doesn't exist.

## `PATCH /bots/<id>`

Owner only. Body `{name?: string|null, description?: string|null}`.
`name` is immutable — any value that differs → `400 nameImmutable`.
`200` — same shape as GET.

## `DELETE /bots/<id>`

Owner only + MFA check (optional JSON body `{totp_code}`). Deletes the bot
account **and** its posts/relationships (the bot's token stops working).
`200 {"error": false}`.

## `POST /bots/<id>/token/regenerate`

Owner only + MFA check (optional `{totp_code}`). Replaces the bot's tokens
with one new token and kicks its CloudLink sessions.

`200 {"error": false, "token": "…"}`

## Notes

- Deleting the owner cascades: all their bots (metadata + accounts) are
  deleted too.
- A bot's public profile (`GET /users/<name>`) shows `bot: true` and
  `bot_owner`.
