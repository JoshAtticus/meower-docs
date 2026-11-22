# Home — `/home`

The public timeline. Post objects are described in
[posts.md](posts.md#post-object).

## `GET /home/?page=n`

Paginated home posts, newest first. **Public** — anonymous callers always get
page 1.

```bash
curl https://api.example.com/home/
```

```json
{"error": false, "autoget": […posts…], "page#": 1, "pages": 12}
```

## `POST /home/`

Create a post on home. Auth required; `POST_RATELIMIT_BYPASS` accounts skip the
`post:<user>` 6/5s bucket.

| Body | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | no | ≤4000 |
| `nonce` | string | no | ≤64, echoed back in the `post` event |
| `attachments` | string[] | no | file ids, ≤10, **images and videos only** |
| `reply_to` | string[] | no | post ids in `home`, ≤10 |
| `stickers` | string[] | no | sticker ids, ≤10 (unknown ids dropped) |

Needs `content`, ≥1 attachment, or ≥1 sticker (400 otherwise). Restricted
accounts (`HOME_POSTS`) get `403 accountBanned`.

`200` — the created post object (with `"error": false`).

Errors: 400 `tooManyAttachments` / `tooManyReplies` / `tooManyStickers`, 400
`mediaOnly` when an attachment's file record isn't an image or video (SVG excluded),
500 `unableToClaimAttachment`, 401, 403, 429.

## `POST /home/typing`

Broadcasts a `typing` event for `home` (`{chat_id: "home", username}`) to all
clients. Ratelimit `typing:<user>` 6/5s.

`200 {"error": false}`
