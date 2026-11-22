# Chat invites — `/invites`

Auth required. Invites are created via
[`POST /chats/<id>/invites`](chats.md#post-chatschat_idinvites) (or the legacy
`PUT …/members/<u>` when the target isn't a friend).

Invite object:

```json
{"_id": "uuid", "chat_id": "uuid", "chat_nickname": "…", "chat_owner": "…",
 "from": "inviter", "to": "you", "created": 0, "expires": null}
```

`expires` is a unix timestamp or `null` (never). Expired invites are deleted
lazily and treated as 404.

## `GET /invites/`

Your pending invites: `{error, autoget, page#:1, pages:1}`.

## `POST /invites/<invite_id>/accept`

Join the chat — `default` role assigned. Emits `create_chat` to you,
`update_chat` to members, `chat_invites_update`, and a `Server` join message.
`200` — the chat object.

Errors: 404 (unknown/expired invite or deleted chat), 403 `chatFull` (256
members), 403 `chatBanned` + `expires`.

## `DELETE /invites/<invite_id>`

Decline an invite addressed to you, or revoke one. Revoking is allowed for
the invitee, the inviter, or any member with `remove_members`. Emits
`chat_invites_update`. `200 {"error": false}` · Errors: 403/404.
