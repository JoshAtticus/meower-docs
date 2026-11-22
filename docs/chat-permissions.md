# Group chat roles & permissions

Applies to **group chats only** (`type` 0). DMs have no roles — every member
can do everything a DM allows. The site-wide `EDIT_CHATS` admin permission
overrides pin/unpin and the admin endpoints.

## Chat fields

Group chats carry three extra fields:

- `roles` — list of role objects (see below).
- `member_roles` — `{username: [role_id, …]}`.
- `invites_enabled` — bool (default `true`).
- `allow_sharing` — bool (default `true`): non-members may read shared posts.
- `share_context` — bool (default `true`, forced off while `allow_sharing`
  is off): non-members may also read surrounding context.

## Role object

```json
{"_id": "default", "name": "Default", "tier": 0,
 "permissions": {"send_messages": true}, "preset": true,
 "colors": ["ff8800"]}
```

- `_id` — preset roles have stable ids; custom roles use UUIDs.
- `tier` — integer −1–4 (see [tiers](#tiers)); changeable via PATCH except
  for `administrator`.
- `permissions` — `{perm_key: bool}`. `true` = Allow, `false` = Deny,
  key absent = Inherit.
- `colors` — up to 2 six-hex strings (none / solid / gradient); cosmetic.
- `preset` — built-in role.

## Permissions

| Key | Tier |
|---|---|
| `send_messages`, `delete_own_messages`, `invite_members`, `add_emotes`, `edit_emotes`, `delete_emotes`, `change_color`, `change_name`, `change_icon`, `delete_icon`, `pin_messages`, `unpin_messages`, `add_reactions`, `share_posts`, `react`, `edit_messages` | 0 |
| `delete_others_messages`, `remove_members` | 1 |
| `ban_members`, `modify_roles`, `assign_roles` | 2 |
| `change_settings`, `create_roles`, `delete_roles`, `toggle_invites` | 3 |

## Tiers

- Role tiers are −1–3 for creatable roles (**−1 = Cosmetic**: grants no
  permissions and is excluded from inheritance); **4 = Administrator** (all
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
2. Tier −1 (cosmetic) → **no** permissions, ever.
3. Start with every permission any **lower-tier, non-cosmetic** role
   explicitly allows.
4. Add this role's own `true`s.
5. Remove this role's own `false`s.

Denies do **not** cascade upward: a `false` on a lower-tier role only
affects that role. `member_permissions(user)` = owner → all; non-member →
none; else union over their roles.

### Cosmetic roles & `display_override`

- A `tier: -1` role is cosmetic: `permissions` is always `{}` (permission
  edits are stripped server-side) and it contributes nothing to inheritance.
- Roles carry `display_override` (bool, default `false`), allowed **only**
  on cosmetic roles (setting it `true` on any other tier → 400
  `notCosmetic`; moving a role off tier −1 resets it to `false`).
- The role shown for a member (name + colour): if the member has any role
  with `display_override`, the **most recently assigned** of those wins;
  otherwise the highest-tier role (ties → most recent).

### Changing a role's tier

`PATCH /chats/<id>/roles/<rid>` accepts `tier` in −1..4:

- `administrator`'s tier can never change → 400 `tierLocked`.
- The actor must manage the role at its current tier **and** the new tier:
  the owner may set any tier, anyone else needs `new_tier < rank(actor)`
  (else 403 `missingPermission`).
- Effects: → −1 strips `permissions`; leaving −1 strips `permissions` and
  resets `display_override`; lowering a numeric tier drops explicit `true`
  allows for perms whose required tier is above the new tier (explicit
  `false` denies are kept).

## Preset roles

| id | Name | Tier | Grants |
|---|---|---|---|
| `default` | Default | 0 | send_messages, delete_own_messages, invite_members, add_reactions, share_posts, react, edit_messages |
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
| `private` | `invites_enabled: false`, `allow_sharing`/`share_context` false, Default role without `share_posts` (everything else as normal) |
| `announcements`, `emojis` | default reduced to `add_reactions` + `react` + `share_posts` + `edit_messages` |
| `other` / omitted | presets unchanged |

## Legacy migration

Group chats created before roles get migrated lazily (`ensure_roles`) and in
a startup pass: roles = presets, owner → `default`+`administrator`, other
members → `default` (plus `pinner` if they had `allow_pinning`),
`invites_enabled: true`, `allow_pinning` removed.
