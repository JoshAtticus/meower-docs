# Chats — `/chats`

All endpoints require `Token` auth unless noted. Most chat-management routes
share the `update_chat:<user>` ratelimit bucket (5 per 5s; 10 per 5s for
invites). Roles & permissions are covered in
[chat-permissions.md](../chat-permissions.md).

## Chat object

```json
{
  "_id": "uuid",
  "type": 0,
  "nickname": "my group",
  "icon": "",
  "icon_color": "000000",
  "owner": "username",
  "members": ["…"],
  "created": 0, "last_active": 0,
  "deleted": false,
  "announce_deletes": false, "announce_deleter": false,
  "roles": [ …role objects… ],
  "member_roles": {"user": ["default", "administrator"]},
  "invites_enabled": true,
  "allow_sharing": true,
  "share_context": false,
  "bans": [{"username": "…", "banned_by": "…", "banned_at": 0, "expires": null}],
  "emojis": [{"_id": "file-id", "name": "…", "animated": false}],
  "stickers": [{…}],
  "error": false
}
```

- `type`: `0` group chat · `1` DM.
- `allow_sharing`/`share_context` (groups only; `allow_sharing` defaults to `true`, `share_context` to `false` except in Announcements chats): whether
  non-members may read this chat's posts via `GET /posts?id=` and
  `/posts/<id>/context`; they additionally need a per-post share token
  (`?s=`, see [`GET /posts/<id>/share`](posts.md#get-postspost_idshare)),
  and context requires `share_context`.
- `dm_request` (DMs only) appears when a request is pending:
  `{from, to, first_message_sent}` — `ignored`/`created` are never exposed.
- `block_notice` (DMs only) is the username of the member who blocked the
  other with `notify: true`.
- Role object: `{_id, name, tier (−1–4; −1 = cosmetic), permissions: {perm: bool},
display_override?: bool, preset: bool, colors?: string[]}`.

## `GET /chats/`

All your chats: every group you belong to plus your `active_dms` and
favorited DMs. `{error, autoget, page#:1, pages:1}`.

## `POST /chats/`

Create a group chat. Ratelimit `create_chat:<user>` 5/30s; 150-group cap →
403 `tooManyChats`; `NEW_CHATS` restriction → 403 `accountBanned`.

| Body | Type | Required | Constraints |
|---|---|---|---|
| `nickname` | string | yes | 1–32 |
| `icon` | string | no | uploads file id (claimed; 500 `unableToClaimIcon`) |
| `icon_color` | string | no | 6-char hex |
| `purpose` | string | no | `friends` `public` `private` `announcements` `emojis` `other` — tweaks preset roles/invites (see [purposes](../chat-permissions.md#chat-purposes)) |
| `announce_deletes`/`announce_deleter`/`invites_enabled` | bool | no | also accepted |

The creator becomes `owner` with `["default", "administrator"]` roles.
`200` — chat object + `create_chat` event to you.

## `GET /chats/<chat_id>`

Your member view of one chat (legacy groups are migrated to roles on read).
404 if not a member.

## `PATCH /chats/<chat_id>`

Update fields — each field you actually change is checked individually (all
permitted or nothing applies):

| Field | Permission (groups) |
|---|---|
| `nickname` | `change_name` |
| `icon` non-empty | `change_icon` |
| `icon: ""` | `delete_icon` |
| `icon_color` | `change_color` |
| `announce_deletes`, `announce_deleter` | `change_settings` |
| `invites_enabled` | `toggle_invites` |
| `allow_sharing`, `share_context` | `change_settings` |

`share_context` can only be `true` while `allow_sharing` is `true`:
turning `allow_sharing` off forces `share_context` off; setting
`share_context: true` while sharing is off → `400 sharingDisabled`.

DMs: only the owner may patch. `EDITING_CHAT_DETAILS` restriction → 403.
Emits `update_chat` and `Server` announcement posts. `200` — chat object.
Errors: 403 `missingPermission`, 500 `unableToClaimIcon`.

## `DELETE /chats/<chat_id>`

- **Group**: leave. Ownership passes to `members[0]` (new owner gains
  `administrator`); last member out deletes the chat and its posts.
- **DM**: removes it from your `active_dms` only.

Emits `delete_chat` to you. `200 {"error": false}`.

## `POST /chats/<chat_id>/typing`

Broadcast `typing` `{chat_id, username}` to members (`livechat` works too).
`200 {"error": false}`.

## `PUT /chats/<chat_id>/members/<username>`

Legacy "add member". Groups need `invite_members`; with `invites_enabled`
off, only the owner or `toggle_invites` holders may add (403
`invitesDisabled`). If the target **is a friend** they're added directly;
otherwise a [chat invite](invites.md) is sent instead (invite object
returned). New members get the `default` role. Errors: 403 `chatFull` (256
members), `chatBanned`, 409 `chatMemberAlreadyExists`, 403 if either party
blocks the other, 404.

## `DELETE /chats/<chat_id>/members/<username>`

Remove a member — `remove_members` + `outranks(actor, target)`. Errors: 403
`missingPermission` / `insufficientRank`, 404.

## `POST /chats/<chat_id>/members/<username>/transfer`

Owner only. New owner gains `administrator`. `200` — chat.

## `POST /chats/<chat_id>/invites`

Body `{username: 1–20, expires_in?: 60–2592000 (seconds)}` → creates a pending
invite: `{_id, chat_id, from, to, created, expires, error:false}`. Same
permission gate as adding members (`invite_members`, `invitesDisabled`).
409 `inviteAlreadyExists` if one is pending. The invitee gets a `chat_invite`
event + inbox message; members get `chat_invites_update`.

## `GET /chats/<chat_id>/invites`

Pending invites for the chat (expired ones are swept first).
`{error, autoget:[{_id,chat_id,from,to,created,expires}], page#:1, pages:1}`.

## `POST /chats/<chat_id>/dm_request/accept` · `POST /chats/<chat_id>/dm_request/ignore`

DM requests (recipient only — the `dm_request.to` user). Accept clears the
request and posts a `Server` notice; ignore flags it and removes the DM from
your `active_dms` (nothing is sent to the requester). 403/404 otherwise.

## `PUT /chats/<chat_id>/bans/<username>`

`ban_members` + `outranks(actor, target)` (never the owner). Body
`{expires_in?: 60–2592000}` (`null` = permanent). Removes the member and any
invites to/from them. `200 {"error": false, "ban": {username, banned_by,
banned_at, expires}}`.

## `GET /chats/<chat_id>/bans`

Active bans (unexpired); `ban_members` only.

## `DELETE /chats/<chat_id>/bans/<username>`

Unban; `ban_members` (+ outranks if still a member).

## `GET /chats/<chat_id>/pins?page=n`

Pinned posts in the chat (any member).

## Emotes — `/chats/<chat_id>/emojis|stickers`

- `GET /chats/<chat_id>/<emojis|stickers>` — list `{_id,name,animated}`.
- `GET /chats/<chat_id>/<emojis|stickers>/<id>` — one emote.
- `PUT /chats/<chat_id>/<emojis|stickers>/<id>` — create; `<id>` is an uploads
  file id, body `{name}` (1–32, `[A-Za-z0-9_-]`). `add_emotes` (DMs free).
  Caps: 250 emojis / 50 stickers → `tooManyEmojis`/`tooManyStickers`; 400
  `nameRequired`, 409 `nameTaken`, 500 `unableToClaimEmote`. Emits
  `create_emoji`/`create_sticker`.
- `PATCH …` — rename; `edit_emotes`. Emits `update_emoji`/`update_sticker`
  `{_id, chat_id, name}`.
- `DELETE …` — `delete_emotes`; unclaims the file. Emits
  `delete_emoji`/`delete_sticker` `{_id, chat_id}`.

## Roles — `/chats/<chat_id>/roles`

Group chats only. Rules in [chat-permissions](../chat-permissions.md#role-api).

- `POST /chats/<chat_id>/roles` — body `{name: 1–32, tier: −1–3,
permissions: {perm: bool}, display_override?: bool, colors?: string[0–2]
(6-hex)}`. Needs `create_roles`; non-owner/admin actors need `tier < rank(actor)`;
each `true` perm needs `PERMISSIONS[perm] ≤ tier` and grant rights. Tier −1
(cosmetic) roles store `permissions: {}` regardless of what you send, and
are the only roles that may have `display_override` (else 400
`notCosmetic`). Errors: 400 `unknownPermission` / `permissionAboveRoleTier`
/ `badColors` / `notCosmetic`, 403 `missingPermission` / `insufficientRank`.
`200` — role object.
- `PATCH /chats/<chat_id>/roles/<role_id>` — `{name?, tier?, permissions?:
{perm: true|false|null}, display_override?, colors?}` (`null` = reset to
inherit). `modify_roles` + `can_manage_role`; the `administrator` role only
  accepts a `colors` change from the owner, and its tier is locked (400
  `tierLocked`). Tier changes need `new_tier < rank(actor)` for non-owners;
  see [tier changes](../chat-permissions.md#changing-a-roles-tier) for the
  permission/override resets. `display_override` requires tier −1 (400
  `notCosmetic`).
- `DELETE /chats/<chat_id>/roles/<role_id>` — `delete_roles` +
  `can_manage_role`; `default`/`administrator` can't be deleted (403).
- `PUT /chats/<chat_id>/members/<u>/roles/<role_id>` /
  `DELETE …` — assign/unassign. `assign_roles` + `outranks(actor, target)` +
  `can_manage_role`; actors can't change their own roles (owner excepted);
  `administrator` can only be (un)assigned by the owner and never removed
  from the owner.
- Every change emits `update_chat` `{_id, roles, member_roles,
invites_enabled?}`.
