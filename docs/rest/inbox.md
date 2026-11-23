# Inbox — `/inbox`

Auth required. The inbox is a private post feed: messages addressed to you
plus `Server` announcements (friend requests, invites, security alerts,
announce-deletes notices are *not* here — those are chat posts).

## `GET /inbox/?page=n&category=<cat>`

Posts where `u` is you or `Server` in origin `inbox`, newest first, 25/page.

Optional `category` filters by the post's inbox category — one of
`friends`, `chats`, `security`, `moderation`, `announcement`, `account`
(anything else → 400). Pagination applies after the filter.

```json
{"error": false, "autoget": […post objects (type 2)…], "page#": 1, "pages": 3}
```

Each inbox post object carries `category` — one of the above, or `null`
when the message wasn't categorised (clients show a generic
"Notification" label).

New inbox posts arrive over CloudLink as `inbox_message` events, and a
Server-originated inbox post flips your `unread_inbox` flag.
