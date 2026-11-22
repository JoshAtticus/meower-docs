# Default emoji packs — `/emojis`

## `GET /emojis/<lang>`

The server's built-in emoji set, localized. `lang` is one of:
`ar de en es fa fr id it ja ko pt ru tr zh` (404 otherwise).

```json
{"error": false, "groups": [
  {"slug": "people", "name": "People", "icon_emoji": "😀",
   "emojis": [
     [["😀", "😀"], [":grinning_face:", ":smiley:"]],
     …
   ]}
]}
```

Each emoji entry is `[[unicode variants…], [":name:", ":aliases:"]]`.

This is the static picker data — chat-scoped custom emojis/stickers live
under [`/chats/<id>/emojis` and `/chats/<id>/stickers`](chats.md#emotes---chatschat_idemojisstickers)
and are embedded in posts as `<:file-id>` (see
[posts.md](posts.md#custom-emoji-in-content)).
