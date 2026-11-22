# Group chat roles & permissions

Applies to **group chats only** (`type` 0). DMs have no roles — every member
can do everything a DM allows. The site-wide `EDIT_CHATS` admin permission
overrides pin/unpin and the admin endpoints.

## Chat fields

Group chats carry three extra fields:

- `roles` — list of role objects (see below).
- `member_roles` — `{username: [role_id, …]}`.
- `invites_enabled` — bool (default `true`).

## Role object

```json
{"_id": "default", "name": "Default", "tier": 0,
 "permissions": {"send_messages": true}, "preset": true,
 "colors": ["ff8800"]}
```

- `_id` — preset roles have stable ids; custom roles use UUIDs.
- `tier` — integer 0–4 (see [tiers](#tiers)); immutable after creation.
- `permissions` — `{perm_key: bool}`. `true` = Allow, `false` = Deny,
  key absent = Inherit.
- `colors` — up to 2 six-hex strings (none / solid / gradient); cosmetic.
- `preset` — built-in role.

## Permissions

| Key | Tier |
|---|---|
| `send_messages`, `delete_own_messages`, `invite_members`, `add_emotes`, `edit_emotes`, `delete_emotes`, `change_color`, `change_name`, `change_icon`, `delete_icon`, `pin_messages`, `unpin_messages`, `add_reactions` | 0 |
| `delete_others_messages`, `remove_members` | 1 |
| `ban_members`, `modify_roles`, `assign_roles` | 2 |
| `change_settings`, `create_roles`, `delete_roles`, `toggle_invites` | 3 |

## Tiers

- Role tiers are 0–3 for creatable roles; **4 = Administrator** (all
  permissions, preset only); **owner rank = 5**.
- A permission can only be set to `true` on a role whose tier ≥ the
  permission's required tier.
- `rank(user)` = owner → 5; else max tier of their roles; no roles → −1.
- `outranks(a, b)` = `rank(a) > rank(b)` — required for removing, banning,
  deleting others' messages and assigning roles.
- Grant rule: a non-owner/non-admin actor can only grant a permission whose
  tier is **strictly below** their rank.

## Effective permissions (inheritance)

`role_effective(role)`:

1. Tier ≥ 4 → **all** permissions.
2. Start with every permission any **lower-tier** role explicitly allows.
3. Add this role's own `true`s.
4. Remove this role's own `false`s.

Denies do **not** cascade upward: a `false` on a lower-tier role only
affects that role. `member_permissions(user)` = owner → all; non-member →
none; else union over their roles.

## Preset roles

| id | Name | Tier | Grants |
|---|---|---|---|
| `default` | Default | 0 | send_messages, delete_own_messages, invite_members, add_reactions |
| `stickerer` | Stickerer | 0 | add_emotes, edit_emotes, delete_emotes |
| `customiser` | Customiser | 0 | change_color, change_name, change_icon, delete_icon |
| `pinner` | Pinner | 0 | pin_messages, unpin_messages |
| `minimod` | Minimod | 1 | delete_others_messages, remove_members |
| `moderator` | Moderator | 2 | ban_members, modify_roles, assign_roles |
| `higher_moderator` | Higher Moderator | 3 | change_settings, create_roles, delete_roles, toggle_invites |
| `administrator` | Administrator | 4 | *(all)* |

New chats: owner gets `["default", "administrator"]`, everyone else
`["default"]`. Removing `default` is the mute mechanism — without it a
member can't send.

## Role API rules

Endpoints in [chats.md — roles](rest/chats.md#roles---chatschat_idroles).

- `can_manage_role(actor, role)` — never for `administrator` (except the
  owner changing its `colors`, and owner-only assignment); owner or rank ≥ 4
  → always; else `role.tier < rank(actor)`.
- Self role changes: non-owner actors cannot add/remove **their own** roles.
- `default` can be removed from a member (mutes them); `default` and
  `administrator` can't be deleted; `administrator` can't be edited and can
  never be removed from the owner.
- After any roles/`member_roles`/`invites_enabled` change the server sends
  `update_chat {_id, roles, member_roles, invites_enabled?}` to members.

## Chat purposes

`purpose` (creation-only field on `ChatBody`) adjusts the preset `default`
role and `invites_enabled`:

| Purpose | Effect |
|---|---|
| `friends` | default gains all stickerer + customiser + pinner permissions |
| `public` | presets unchanged |
| `private` | `invites_enabled: false` |
| `announcements`, `emojis` | default reduced to `add_reactions` only |
| `other` / omitted | presets unchanged |

## Legacy migration

Group chats created before roles get migrated lazily (`ensure_roles`) and in
a startup pass: roles = presets, owner → `default`+`administrator`, other
members → `default` (plus `pinner` if they had `allow_pinning`),
`invites_enabled: true`, `allow_pinning` removed.
