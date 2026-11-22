# Inbox — `/inbox`

Auth required. The inbox is a private post feed: messages addressed to you
plus `Server` announcements (friend requests, invites, security alerts,
announce-deletes notices are *not* here — those are chat posts).

## `GET /inbox/?page=n`

Posts where `u` is you or `Server` in origin `inbox`, newest first, 25/page.

```json
{"error": false, "autoget": […post objects (type 2)…], "page#": 1, "pages": 3}
```

New inbox posts arrive over CloudLink as `inbox_message` events, and a
Server-originated inbox post flips your `unread_inbox` flag.
