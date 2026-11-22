# Authentication — `/auth`

Shared request body (`AuthRequest`) for both endpoints:

| Field | Type | Required | Constraints |
|---|---|---|---|
| `username` | string | yes | 1–20 chars |
| `password` | string | yes | 1–255 chars (8–72 enforced on register) |
| `totp_code` | string | no | exactly 6 digits |
| `mfa_recovery_code` | string | no | exactly 10 chars |
| `captcha` | string | no | ≤2000 chars (hCaptcha response) |

## `POST /auth/login`

No auth required. Ratelimits: `login:i:<ip>` 50/900s; `login:u:<user>` 5/60s on
failure.

```bash
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "me", "password": "hunter2hunter2"}'
```

Response `200`:

```json
{"error": false, "account": { …account incl. config… }, "token": "…"}
```

Credential notes:

- `password` may be an **existing session token** instead of the real password
  (used for session resume and CloudLink `authpswd`). Bot accounts can **only**
  authenticate this way — they have no password.
- If the account has TOTP authenticators and no `totp_code`/
  `mfa_recovery_code` is given, the server tries appending the code to the end
  of `password` itself: last 6 chars → TOTP, last 10 chars → recovery code.
- Using a valid `mfa_recovery_code` **deletes all authenticators**, rotates the
  recovery code and sends an inbox alert.
- A password changed within the last 14 days is accepted but rejected with a
  hint (see errors).

### Errors

| Status | `type` | Condition |
|---|---|---|
| 401 | `Unauthorized` | bad credentials |
| 401 | `accountDeleted` | account is deleted |
| 401 | `mfaRequired` | 2FA needed; response includes `mfa_methods: ["totp"]` |
| 401 | `passwordRecentlyChanged` | old password still in the 14-day grace window; response includes `changed_at` |
| 401 | `Unauthorized` | wrong `totp_code`/`mfa_recovery_code` |
| 429 | `tooManyRequests` | |

## `POST /auth/register`

No auth required. `username` must match `[a-zA-Z0-9-_]{1,20}` (400 otherwise),
`password` must be 8–72 chars (400 otherwise). If the instance sets a captcha
secret, `captcha` is verified against hCaptcha.

```bash
curl -X POST https://api.example.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "hunter2hunter2"}'
```

Response `200`: same shape as login (`{error: false, account, token}`) — you
are logged in immediately.

### Errors

| Status | `type` | Condition |
|---|---|---|
| 403 | `registrationDisabled` | instance closed registration |
| 403 | `registrationBlocked` | requester's IP is registration-netblocked |
| 403 | `invalidCaptcha` | |
| 409 | `usernameExists` | |
| 400 | `badRequest` | bad username format or password length |
| 429 | `tooManyRequests` | |
