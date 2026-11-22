# Bots

Bots are real Meower accounts (username, profile, posts, DMs — everything)
that authenticate with a long-lived **bot token** instead of a password.
Each account can own up to **10** bots; owners can manage them in
**Settings → Account → Bots** or via [`/bots`](rest/bots.md).

## Creating a bot

**Settings UI**: Settings → Account → Bots → Manage → create with a name +
optional description. The token is shown **once** — copy it immediately.

**API**:

```bash
curl -X POST https://api.example.com/bots/ \
  -H "Token: $YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "mybot", "description": "hello"}'
# → {"error": false, "id": "mybot", "name": "mybot", "token": "BOT_TOKEN", …}
```

Deleting a bot or regenerating its token prompts for a 6-digit TOTP code if
your account has one (API: `mfaRequired` / `invalidTOTPCode`).

## Using the token

REST — send it as the `Token` header, same as a user token:

```bash
curl https://api.example.com/me -H "Token: $BOT_TOKEN"
```

CloudLink — `authpswd` with the token as `pswd`
(`?token=…` query auth works too):

```json
{"cmd": "authpswd", "val": {"username": "mybot", "pswd": "BOT_TOKEN"}}
```

## Restrictions

- Password login → 401 (bots can't log in with a password, and no password
  exists).
- `pswd: null`, so bots never appear in user search results.
- `/bots` management endpoints → 403 `botsCannotManageBots`.
- Self-service `/me` routes (delete account, password change, authenticators,
  data export) → 403 `botsCannotDoThis`.
- Profiles show `"bot": true` and `"bot_owner": "<owner>"`; delete the owner
  and their bots go with it.

## Example bot (Node.js)

Node 22+ has a global `WebSocket` (on 18–21 `npm i ws` and
`import WebSocket from "ws"`).

```js
const API = "http://127.0.0.1:3001";      // REST base
const WS  = "ws://127.0.0.1:3000/?v=1";   // CloudLink
const BOT = "mybot";
const TOKEN = "BOT_TOKEN";

const ws = new WebSocket(WS);
ws.onopen = () => ws.send(JSON.stringify({
  cmd: "authpswd", val: { username: BOT, pswd: TOKEN },
}));
ws.onmessage = async (ev) => {
  const { cmd, val } = JSON.parse(ev.data);
  if (cmd === "post" && val.p === "!ping") {
    // home posts go to POST /home, chat posts to POST /posts/<chat id>
    const path = val.post_origin === "home" ? "/home" : `/posts/${val.post_origin}`;
    await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "pong" }),
    });
  }
};
```

## Example bot (Python)

`pip install requests websockets`

```python
import asyncio, json, requests, websockets

API, WS_URL = "http://127.0.0.1:3001", "ws://127.0.0.1:3000/?v=1"
BOT, TOKEN = "mybot", "BOT_TOKEN"

async def main():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({
            "cmd": "authpswd",
            "val": {"username": BOT, "pswd": TOKEN}}))
        async for raw in ws:
            pkt = json.loads(raw)
            if pkt["cmd"] == "post" and pkt["val"]["p"] == "!ping":
                origin = pkt["val"]["post_origin"]
                path = "/home" if origin == "home" else f"/posts/{origin}"
                requests.post(
                    f"{API}{path}",
                    headers={"Token": TOKEN}, json={"content": "pong"})

asyncio.run(main())
```
