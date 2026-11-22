# CloudLink realtime protocol

CloudLink is the websocket API for live events. Local default:
`ws://127.0.0.1:3000/?v=1`.

## Connecting & protocol version

- `?v=1` selects protocol **v1** (any other/missing value → legacy **v0**).
- `?token=<token>` auto-authenticates on connect (skips `authpswd`).
- All packets are JSON objects with at least `{"cmd": str, "val": any}`;
  `listener` is an optional client-chosen string echoed back on replies.

On connect the server sends a `ulist` packet (online users, `;`-separated,
trailing `;`). v0 clients additionally get a `statuscode` `TAEnabled`.

## Sending commands

Commands can be sent at the root — `{"cmd": "authpswd", "val": {…}}` — or
wrapped — `{"cmd": "direct", "val": {"cmd": "authpswd", "val": {…}}}`. A
direct wrapper whose `val` is a **string** marks the socket "trusted" and
returns `OK` (legacy handshaking).

| Client command | val | Response |
|---|---|---|
| `ping` | any | `statuscode: I:100 \| OK` |
| `get_ulist` | any | `ulist` packet |
| `authpswd` | `{username, pswd}` | `auth` packet + `statuscode OK` |
| `gen_account` | `{username, pswd, captcha?}` | `auth` packet + `statuscode OK` |

`authpswd` proxies `POST /auth/login` — `pswd` may be a password **or an
existing token** (that's how bots log in). Auth errors are mapped to
statuscodes (`Unauthorized`→`PasswordInvalid`, `mfaRequired`→`2FARequired`,
`usernameExists`→`IDExists`, `accountDeleted`→`Deleted`,
`accountBanned`→`Banned`, `tooManyRequests`→`RateLimit`,
`invalidCaptcha`→`InvalidCaptcha`, `passwordRecentlyChanged`→`statuscode`
`PasswordRecentlyChanged` with `changed_at`, `ipBlocked`/`registrationBlocked`→`Blocked`).

### `auth` packet (v1)

```json
{"cmd": "auth", "val": {
  "username": "…", "token": "…",
  "account": { …account + config… },
  "relationships": […],
  "chats": […]          // omitted for v0 clients
}}
```

## Events (v1)

Every event is `{"cmd": <name>, "val": <payload>}`:

| `cmd` | Payload | Audience |
|---|---|---|
| `ulist` | `"user1;user2;"` | everyone |
| `statuscode` | status string | requester |
| `auth` / `banned` | see above / `ban` object | requester |
| `post` | full post object | all (home/livechat) or chat members |
| `update_post` | full post object | same |
| `delete_post` | `{chat_id, post_id}` | same |
| `inbox_message` | post object (`type` 2) | recipient (or all when `u` is `Server`) |
| `typing` | `{chat_id, username}` | chat members (`home`/`livechat` → all) |
| `create_chat` | chat object | the user the chat appeared for |
| `update_chat` | `{_id, …changed fields…}` (e.g. `members`, `owner`, `roles`, `member_roles`, `invites_enabled`, `bans`, `dm_request`, `block_notice`, `nickname`, `icon`…) | chat members |
| `delete_chat` | `{chat_id}` | the affected user |
| `update_config` | changed config keys | all your sessions |
| `update_profile` | `{_id, pfp_data?/avatar?/avatar_color?/quote?}` | everyone |
| `update_relationship` | `{username, state, updated_at}` | your sessions |
| `update_friends` | `{}` | the two users |
| `chat_invite` | invite + `chat_nickname` | invitee |
| `chat_invites_update` | `{chat_id}` | chat members |
| `create_emoji` / `create_sticker` | `{_id, name, animated}` | chat members |
| `update_emoji` / `update_sticker` | `{_id, chat_id, name}` | chat members |
| `delete_emoji` / `delete_sticker` | `{_id, chat_id}` | chat members |
| `post_reaction_add` / `post_reaction_remove` | `{chat_id, post_id, emoji, username}` | post audience |

## Events (v0 translation)

For `v`≠1 clients the same events are wrapped differently:

- Root commands `statuscode`, `ulist`, `pmsg`, `pvar` → `{"cmd": <name>,
"val": …}`.
- Everything else → `{"cmd": "direct", "val": {"mode": <event>, "payload":
…}}`, except:
  - `post` on home → `{"cmd": "direct", "val": {"mode": 1, …post…}}`; other
    origins → `"state": 2` instead of `mode`.
  - `typing` home → `{"state": 101, "chatid": "livechat", "u": user}`; other
    → `{"state": 100, "chatid": <chat>, "u": user}`.
  - `delete_chat` / `delete_post` → `{"mode": "delete", "id": <id>}`.
  - `auth` includes no `chats` field.

## Statuscodes

`{"cmd": "statuscode", "val": "<code>"}` (with `listener` when replying to a
packet that had one):

| Code | Meaning |
|---|---|
| `I:100 \| OK` | success |
| `E:101 \| Syntax` | malformed packet |
| `E:102 \| Datatype` | wrong `val` type |
| `E:103 \| ID not found` | |
| `E:104 \| Internal` | server error in handler |
| `E:106 \| Too many requests` | REST ratelimit mapped |
| `I:112 \| Trusted Access enabled` | sent to v0 clients on connect |
| `E:116 \| Username required` | |
| `E:118 \| Invalid command` | |
| `E:119 \| IP Blocked` | |
| `I:011 \| Invalid Password` | login failed |
| `E:126 \| Password recently changed` | + `changed_at` |
| `E:127 \| Invalid captcha` | |
| `I:015 \| Account exists` | register conflict |
| `I:016 \| 2FA Required` | mfaRequired |
| `E:018 \| Account Banned` | |
| `E:025 \| Deleted` | account deleted |
