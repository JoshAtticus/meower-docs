# Uploads service

The uploads service is a **separate Go service** (Chi router + MongoDB +
MinIO object storage + ImageMagick), not part of the Quart REST server.
Local default: `http://127.0.0.1:3002`.

> Note: this is documented from the uploads service source in the workspace
> (`uploads/router.go`, `uploads/file.go`, `uploads/user.go`) plus what the
> client calls.

## Buckets

| Bucket | Purpose | Notes |
|---|---|---|
| `icons` | user avatars & chat icons | |
| `emojis` | custom chat emojis | |
| `stickers` | chat stickers | |
| `attachments` | post attachments | images get `width`/`height`/`thumbnail_*` metadata |

## `POST /<bucket>`

Multipart upload (`multipart/form-data` with the file field). Auth:
`Authorization: <token>` (a `usersv0` token — same as the REST `Token`
header). The file id returned is then **referenced** in REST calls —
`attachments`/`stickers` arrays on posts, `icon` on chats, emote ids on
`/chats/<id>/emojis` — and the REST server "claims" it (500
`unableToClaim*` errors if the id doesn't exist in uploads).

```bash
curl -X POST http://127.0.0.1:3002/icons \
  -H "Authorization: $TOKEN" -F "file=@avatar.png"
```

## `GET /<bucket>/<file_id>`

Download a file by its id. No auth required.

## `DELETE /<bucket>/<file_id>`

Delete a file you uploaded (`Authorization` header as above).
