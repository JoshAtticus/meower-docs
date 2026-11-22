# Meower2 API

Meower2 is a revival of the Meower chat server. This repository documents its HTTP REST API, the CloudLink realtime websocket protocol, the group-chat roles & permissions system, bot accounts, and the companion uploads service — everything you need to build a client or a bot.

The documentation is generated from the server source code. Every endpoint, field, error type, status code and event name was taken directly from the implementation.

## Quick start

Log in and grab a token (all examples use a placeholder base URL — see [Base URLs](docs/getting-started.md#base-urls)):

```bash
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "me", "password": "hunter2hunter2"}'
```

```json
{"error": false, "account": {…}, "token": "<session-token>"}
```

Read the latest home posts:

```bash
curl https://api.example.com/home/ -H "Token: <session-token>"
```

Post to home:

```bash
curl -X POST https://api.example.com/home/ \
  -H "Token: <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, Meower!"}'
```

Get realtime updates by connecting to CloudLink and authenticating with the same token — see [docs/cloudlink.md](docs/cloudlink.md).

## Contents

### Guides

- [Getting started](docs/getting-started.md) — base URLs, authentication, request/response conventions, pagination, IDs, timestamps, ratelimits
- [CloudLink realtime protocol](docs/cloudlink.md) — websocket packets, authentication, every server event
- [Group chat roles & permissions](docs/chat-permissions.md) — permission tiers, role inheritance, preset roles, chat purposes
- [Bots](docs/bots.md) — creating bots, using bot tokens, working example bots in JavaScript and Python
- [Uploads](docs/uploads.md) — uploading and serving icons, attachments, emojis and stickers

### REST API reference

| Area | File |
|---|---|
| Authentication & registration | [docs/rest/auth.md](docs/rest/auth.md) |
| Current user (`/me`) | [docs/rest/me.md](docs/rest/me.md) |
| Home timeline | [docs/rest/home.md](docs/rest/home.md) |
| Posts (anywhere) | [docs/rest/posts.md](docs/rest/posts.md) |
| Users, profiles & relationships | [docs/rest/users.md](docs/rest/users.md) |
| Chats (groups & DMs) | [docs/rest/chats.md](docs/rest/chats.md) |
| Chat invites | [docs/rest/invites.md](docs/rest/invites.md) |
| Inbox | [docs/rest/inbox.md](docs/rest/inbox.md) |
| Search | [docs/rest/search.md](docs/rest/search.md) |
| Default emoji packs | [docs/rest/emojis.md](docs/rest/emojis.md) |
| Bot management | [docs/rest/bots.md](docs/rest/bots.md) |
| Admin / moderation | [docs/rest/admin.md](docs/rest/admin.md) |

### Machine-readable

- [`llms.txt`](llms.txt) — summary + index for LLM consumers ([llmstxt.org](https://llmstxt.org) format)
- [`llms-full.txt`](llms-full.txt) — every doc concatenated into one file. Regenerate with:

  ```bash
  node scripts/build-llms-full.mjs
  ```

## License

MIT © JoshAtticus 2026 — see [LICENSE](LICENSE).
