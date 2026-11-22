# Posts — `/posts`

## Post object

```json
{
  "_id": "01J8Z4K0A0BCDEFGHJKMNPQRST",
  "post_id": "01J8Z4K0A0BCDEFGHJKMNPQRST",
  "post_origin": "home",
  "type": 1,
  "u": "author",
  "author": {"_id": "author", "uuid": "…", "flags": 0, "pfp_data": 1, "avatar": "", "avatar_color": "000000"},
  "t": {"e": 1700000000},
  "p": "post content",
  "attachments": [{"id": "fileid24…", "mime": "image/webp", "size": 1234, "filename": "x.png", "width": 10, "height": 10, "thumbnail_mime": "image/webp", "thumbnail_size": 500}],
  "reply_to": [ …embedded parent post objects… ],
  "reactions": [{"emoji": "👍", "count": 3, "user_reacted": false}],
  "emojis": [{"_id": "fileid24…", "name": "party", "animated": false}],
  "stickers": [{"_id": "fileid24…", "name": "meowy", "animated": false}],
  "pinned": false,
  "isDeleted": false,
  "edited_at": 1700000100,
  "error": false
}
```

- `post_origin` — `"home"`, `"inbox"`, `"livechat"`, or a chat id. `type` is
  `2` for inbox posts, `1` otherwise.
- `reply_to` in responses is a list of embedded post objects (`null` entries
  when replies are stripped); when *creating* a post you send post **ids**.
- `emojis` is populated from `<:FILEID>` tokens found in the content —
  see [custom emoji](#custom-emoji-in-content).
- `nonce` is present on the `post` event if you sent one.

### Custom emoji in content

A chat emoji is embedded in content as `<:FILE_ID>`, e.g.
`<:aB3fG7hJkLmN0pQrStUvWx>`. Render it from the uploads service:
`GET {uploads}/emojis/<file-id>`.

## `GET /posts/?id=<post_id>`

Single post. 404 if it doesn't exist, is deleted, or you can't see its origin
(inbox posts that aren't yours, chats you aren't in). For **group chats**,
non-members (and anonymous callers) can still read the post when the chat's
`allow_sharing` is on — banned users count as non-members.

## `GET /posts/<post_id>/context?limit=n`

The post plus up to `limit` (1–10, default 5) surrounding posts in the same
origin: `{post, before, after}`. For group chats, non-members additionally
need `share_context` on (implies `allow_sharing`), else 404 even though the
post itself is readable.

## `PATCH /posts/?id=<post_id>`

Edit **your own** post (body: `PostBody`, only `content` is applied; must be
non-empty). In group chats the author needs the `edit_messages` permission
(403 `missingPermission`). Restricted users (`HOME_POSTS`/`CHAT_POSTS` per
origin) → 403 `accountBanned`. Editing the first message of a pending DM request → 403
`dmRequestPending`. Creates a revision entry, sets `edited_at`, emits
`update_post`.

## `DELETE /posts/?id=<post_id>`

- Own post in `home` or a DM: always allowed.
- Group chats: own post needs `delete_own_messages`; someone else's needs
  `delete_others_messages` **and** `outranks(actor, author)`; `Server` posts
  need rank ≥ 4 (admin tier). See [chat-permissions](../chat-permissions.md).
- Group chats with `announce_deletes` get a `Server` message announcing the
  deletion (`announce_deleter` controls whether the deleter is named).

`200 {"error": false}` · Errors: 403 `missingPermission`,
`insufficientRank`, 403/404/429.

## `DELETE /posts/<post_id>/attachments/<attachment_id>`

Remove an attachment from your own post; deletes the post entirely if no
content/attachments remain. 404 if the attachment isn't on the post.

## `POST /posts/<post_id>/report`

Body `{reason?: string ≤2000, comment?: string ≤2000}`. Three reports from
unique IPs auto-escalate and hide the post. Ratelimit `report:<user>` 3/5s.
`200 {"error": false}`.

## `POST /posts/<post_id>/pin` · `DELETE /posts/<post_id>/pin`

Pin/unpin a post in its origin chat. Group chats: `pin_messages` /
`unpin_messages` permission (site moderators with `EDIT_CHATS` bypass). Emits
`update_post` and a `Server` announcement message. Returns the post.
Errors: 403 `missingPermission`, 401/404.

## `GET /posts/<chat_id>?page=n`

Posts in a chat you belong to (group or DM), newest first. Auth + membership.

## `POST /posts/<chat_id>`

Post in a chat. Body = `PostBody` (same fields/constraints as
[home](home.md#post-home)). Chat id `livechat` is special: the post is
broadcast to everyone but never stored.

- Group chat → needs `send_messages` permission (403 `missingPermission`).
- Chat-banned → 403 `chatBanned` + `expires`.
- **DM requests**: between non-friends, whoever posts first becomes the
  requester — the first message must be **text only** (`dmRequestTextOnly`),
  then the requester is blocked until the recipient replies or accepts
  (`dmRequestPending`). The recipient replying accepts the request.
- Blocked in either direction → 403 (bare `missingPermissions`).

`200` — created post. Emits `post` to chat members (everyone for
`livechat`), `update_chat` when a DM request changes.

## `GET /posts/<post_id>/reactions/<emoji>?page=n`

Users who reacted with `<emoji>` (unicode emoji or chat-emoji file id).
`autoget` = account objects.

## `POST /posts/<post_id>/reactions/<emoji>`

React. `<emoji>` must be exactly one unicode emoji or an existing chat-emoji
file id. Max 50 distinct reactions per post → 403 `tooManyReactions`. Group
chats need `react` when joining a reaction already on the post, or
`add_reactions` when the emoji isn't on the post yet → 403
`missingPermission`. Removing your own reaction is always allowed.
Ratelimit 5/5s.

`200 {"error": false}` + `post_reaction_add` event
`{chat_id, post_id, emoji, username}`.

## `DELETE /posts/<post_id>/reactions/<emoji>/<username>`

Remove a reaction; `<username>` may be `@me` for yourself. Removing **another
user's** reaction is only allowed for the chat owner (and only in chats).
404 if the reaction doesn't exist. `200 {"error": false}` +
`post_reaction_remove` event (same shape).
