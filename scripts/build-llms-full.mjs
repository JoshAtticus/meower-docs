// Concatenates the docs into llms-full.txt (TOC order).
// Run:  node scripts/build-llms-full.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  "README.md",
  "docs/getting-started.md",
  "docs/rest/auth.md",
  "docs/rest/me.md",
  "docs/rest/home.md",
  "docs/rest/posts.md",
  "docs/rest/users.md",
  "docs/rest/chats.md",
  "docs/rest/invites.md",
  "docs/rest/inbox.md",
  "docs/rest/search.md",
  "docs/rest/emojis.md",
  "docs/rest/bots.md",
  "docs/rest/admin.md",
  "docs/cloudlink.md",
  "docs/chat-permissions.md",
  "docs/bots.md",
  "docs/uploads.md",
];

const out = files
  .map((f) => {
    const body = readFileSync(join(root, f), "utf8").trim();
    return `<!-- ${f} -->\n\n${body}`;
  })
  .join("\n\n---\n\n");

writeFileSync(join(root, "llms-full.txt"), out + "\n");
console.log(`llms-full.txt written (${files.length} files)`);
