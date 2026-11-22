# Users — `/users/<username>`

`username` is case-insensitive; responses always use canonical casing. Deleted
or unknown users → 404 on every route in this blueprint.

## `GET /users/<username>/`

Public profile — no auth required. See
[Account object](../getting-started.md#account-object); includes `bot` and
`bot_owner` for bot accounts.

```bash
curl https://api.example.com/users/JoshAtticus/
```

## `GET /users/<username>/posts?page=n`

The user's home posts, newest first. Public.

## `GET /users/<username>/relationship`

Your relationship **to** that user. Auth required; 400 if `<username>` is you.

```json
{"state": 0, "updated_at": 1700000000}
```

States: `0` none · `1` friend request (friends if mutual) · `2` blocking.

## `PATCH /users/<username>/relationship`

Change your relationship. Ratelimit `relationships:<user>` 10/15s.

| Body | Type | Required |
|---|---|---|
| `state` | `0 \| 1 \| 2` | yes |
| `notify` | bool | no — only meaningful with `state: 2` |

`200 {state, updated_at}`

Side effects:

- `state: 1` — sends a friend-request inbox message; if the target already sent
  you a request you become friends (inbox messages to both, pending DM
  requests between you auto-accepted). Emits `update_friends`.
- `state: 0` — removes your relationship and clears their pending request to
  you; unblocking restarts the DM-request expiry countdown and clears a block
  notice they had set.
- `state: 2` — removes any friend request/friendship from them. With
  `notify: true`, the target gets your DM pushed to the front of their active
  DMs with `block_notice: <you>` so they can see they were blocked.
- Always emits `update_relationship` `{username, state, updated_at}` to your
  sessions.

## `POST /users/<username>/report`

Body `{reason?: string ≤2000, comment?: string ≤2000}`. Ratelimit 3/5s.
`200 {"error": false}`.

## `GET /users/<username>/dm`

Get or create your DM chat with the user. Auth; ratelimit
`create_chat:<user>` 5/30s; 400 if it's yourself.

- Returns the existing DM if there is one.
- If you aren't friends and the chat isn't already in your `active_dms`, the
  DM gets a pending `dm_request` slot (`{from: null, to: null,
first_message_sent: false}`): whoever posts first becomes the requester — see
[posts](posts.md#post-postschat_id) and [chats](chats.md#dm-requests).
- Non-friends creating a DM requires the `NEW_CHATS` restriction to be off
  (403 `accountBanned`).

`200` — the chat object with `emojis`/`stickers`/`error`.
