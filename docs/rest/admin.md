# Admin — `/admin`

Requires `Token` auth plus a non-zero `permissions` bitfield on the account
(401 otherwise). Each route also checks a specific
[AdminPermissions](#adminpermissions-bitfield) bit — insufficient bits →
403 `missingPermissions`.

## AdminPermissions bitfield

| Bit | Name |
|---|---|
| 1 | `SYSADMIN` |
| 2 | `VIEW_REPORTS` |
| 4 | `EDIT_REPORTS` |
| 8 | `VIEW_NOTES` |
| 16 | `EDIT_NOTES` |
| 32 | `VIEW_POSTS` |
| 64 | `DELETE_POSTS` |
| 128 | `VIEW_ALTS` |
| 256 | `SEND_ALERTS` |
| 512 | `KICK_USERS` |
| 1024 | `CLEAR_PROFILE_DETAILS` |
| 2048 | `VIEW_BAN_STATES` |
| 4096 | `EDIT_BAN_STATES` |
| 8192 | `DELETE_USERS` |
| 16384 | `VIEW_IPS` |
| 32768 | `BLOCK_IPS` |
| 65536 | `VIEW_CHATS` |
| 131072 | `EDIT_CHATS` |
| 262144 | `SEND_ANNOUNCEMENTS` |

## Reports

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/reports?status&type&page` | VIEW_REPORTS | `status`: `pending` `escalated` `no_action_taken` `action_taken`; `type`: `post`/`user` |
| `GET /admin/reports/<id>` | VIEW_REPORTS | |
| `PATCH /admin/reports/<id>` | EDIT_REPORTS | `{status: "no_action_taken"\|"action_taken"}` |
| `POST /admin/reports/<id>/escalate` | EDIT_REPORTS | |

## Admin notes

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/notes/<identifier>` | VIEW_NOTES | `identifier` is a user UUID |
| `PUT /admin/notes/<identifier>` | EDIT_NOTES | `{notes}` |

## Posts

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/posts/<post_id>` | VIEW_POSTS | incl. revisions & deleted |
| `DELETE /admin/posts/<post_id>` | DELETE_POSTS | `mod_deleted` |
| `POST /admin/posts/<post_id>/restore` | DELETE_POSTS | |

## Users

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/users?page` | any user-moderation bit | |
| `GET /admin/users/<username>` | varies | fields gated per-permission (netlog VIEW_IPS, alts VIEW_ALTS, ban VIEW_BAN_STATES, full profile SYSADMIN) |
| `PATCH /admin/users/<username>` | SYSADMIN | `{permissions?: int}` |
| `DELETE /admin/users/<username>?mode=` | DELETE_USERS (SYSADMIN for non-own) | `mode`: `cancel` `schedule` `immediate` `purge` |
| `POST /admin/users/<username>/ban` | EDIT_BAN_STATES (SYSADMIN for others) | `{state: "none"\|"temp_restriction"\|"perm_restriction"\|"temp_ban"\|"perm_ban", restrictions: int, expires: int, reason: str}` |
| `GET /admin/users/<username>/posts?origin&page` | VIEW_POSTS / VIEW_CHATS | |
| `DELETE /admin/users/<username>/posts?origin=` | DELETE_POSTS (SYSADMIN for others) | |
| `POST /admin/users/<username>/alert` | SEND_ALERTS | `{content: 1–4000}` → inbox message |
| `POST /admin/users/<username>/kick` | KICK_USERS | disconnect CloudLink sessions |
| `POST /admin/users/<username>/restore-password` | SYSADMIN | |
| `DELETE /admin/users/<username>/avatar` | CLEAR_PROFILE_DETAILS | |
| `DELETE /admin/users/<username>/quote` | CLEAR_PROFILE_DETAILS | |

## Chats

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/chats/<chat_id>` | VIEW_CHATS | |
| `PATCH /admin/chats/<chat_id>` | EDIT_CHATS | `{nickname?, icon?, icon_color?}` |
| `DELETE /admin/chats/<chat_id>` | EDIT_CHATS | marks `deleted` |
| `POST /admin/chats/<chat_id>/restore` | EDIT_CHATS | |
| `POST /admin/chats/<chat_id>/members/<username>/transfer` | EDIT_CHATS | |
| `GET /admin/chats/<chat_id>/posts?page` | VIEW_CHATS | |

## Network

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/netinfo/<ip>` | VIEW_IPS | accounts seen from the IP |
| `GET /admin/netblocks?page` | VIEW_IPS | |
| `GET /admin/netblocks/<cidr>` | VIEW_IPS | |
| `PUT /admin/netblocks/<cidr>` | BLOCK_IPS | `{type: 0\|1}` — 0 blocks access, 1 blocks registration |
| `DELETE /admin/netblocks/<cidr>` | BLOCK_IPS | |

## Announcements & server

| Route | Permission | Notes |
|---|---|---|
| `GET /admin/announcements?page` | VIEW_POSTS | |
| `POST /admin/announcements` | SEND_ANNOUNCEMENTS | `{content}` → inbox post to every user |
| `POST /admin/server/kick-all` | SYSADMIN | |
| `POST /admin/server/enable-repair-mode` | SYSADMIN | all routes except `/status` → 503 |
| `POST /admin/server/registration/disable` | SYSADMIN | |
| `POST /admin/server/registration/enable` | SYSADMIN | |
