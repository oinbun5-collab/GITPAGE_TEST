#!/usr/bin/env node
// WIKI/ → sites/{public,personal}/content sync.
// - Personal site (Quartz): copies every WIKI/*.md
// - Public site (Astro Fuwari): copies only files with publish: true
//   and rewrites frontmatter into Fuwari's expected shape.

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WIKI_DIR = join(ROOT, "WIKI");
const PERSONAL_DIR = join(ROOT, "sites/personal/content");
const PUBLIC_DIR = join(ROOT, "sites/public/src/content/posts");

// Minimal YAML frontmatter parser — handles the fields our CLAUDE.md spec defines.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const yaml = match[1];
  const body = match[2];
  const fm = {};
  for (const line of yaml.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

// Astro/Fuwari content schema parses `published` as a Date type — must be
// emitted as bare YYYY-MM-DD (no quotes). Same for any other date-shaped value.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function serializeFrontmatter(fm) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((s) => JSON.stringify(s)).join(", ")}]`);
    } else if (typeof v === "boolean") {
      lines.push(`${k}: ${v}`);
    } else if (v === "" || v == null) {
      lines.push(`${k}: ""`);
    } else if (typeof v === "string" && DATE_RE.test(v)) {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${JSON.stringify(String(v))}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function ensureCleanDir(dir, keepGitkeep = true) {
  if (existsSync(dir)) {
    const entries = await readdir(dir);
    for (const f of entries) {
      if (f === ".gitkeep") continue;
      await rm(join(dir, f), { recursive: true, force: true });
    }
  } else {
    await mkdir(dir, { recursive: true });
  }
  if (keepGitkeep) {
    const gk = join(dir, ".gitkeep");
    if (!existsSync(gk)) await writeFile(gk, "");
  }
}

async function main() {
  if (!existsSync(WIKI_DIR)) {
    console.error(`✗ WIKI dir not found: ${WIKI_DIR}`);
    process.exit(1);
  }

  await ensureCleanDir(PERSONAL_DIR);
  await ensureCleanDir(PUBLIC_DIR);

  const files = (await readdir(WIKI_DIR)).filter((f) => f.endsWith(".md"));
  let personalCount = 0;
  let publicCount = 0;

  for (const file of files) {
    const raw = await readFile(join(WIKI_DIR, file), "utf-8");
    const { frontmatter: fm, body } = parseFrontmatter(raw);

    // 1) Personal (Quartz) — copy as-is. Quartz reads our frontmatter natively.
    await writeFile(join(PERSONAL_DIR, file), raw);
    personalCount++;

    // 2) Public (Fuwari) — only if publish: true. Rewrite frontmatter.
    if (fm.publish === true) {
      const fuwariFm = {
        title: fm.title || file.replace(/\.md$/, ""),
        published: fm.created || new Date().toISOString().slice(0, 10),
        description: fm.summary || "",
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        category: fm.category || "Uncategorized",
        draft: false,
        ...(fm.cover ? { image: fm.cover } : {}),
      };
      const out = serializeFrontmatter(fuwariFm) + body;
      await writeFile(join(PUBLIC_DIR, file), out);
      publicCount++;
    }
  }

  // Quartz needs a content/index.md homepage. Generate one from synced files.
  const items = [];
  for (const file of files) {
    const raw = await readFile(join(WIKI_DIR, file), "utf-8");
    const { frontmatter: fm } = parseFrontmatter(raw);
    items.push({
      slug: file.replace(/\.md$/, ""),
      title: fm.title || file,
      summary: fm.summary || "",
      published: fm.publish === true,
    });
  }

  const indexBody = [
    "---",
    'title: "MR_5PM Notes"',
    "---",
    "",
    "# MR_5PM Notes 📓",
    "",
    "AI · 콘텐츠 · 개발에 대한 모든 작업 노트와 글을 모아둔 곳입니다.",
    "",
    "## 전체 글",
    "",
    ...items.map(
      (it) => `- ${it.published ? "🔓" : "🔒"} [[${it.slug}|${it.title}]]${it.summary ? ` — ${it.summary}` : ""}`,
    ),
    "",
    "> 🔓 = 공개 사이트(메인)에도 노출 · 🔒 = 여기 (Notes) 에서만",
    "",
  ].join("\n");

  await writeFile(join(PERSONAL_DIR, "index.md"), indexBody);

  console.log(`✓ Synced ${personalCount} files → sites/personal/content/`);
  console.log(`✓ Generated content/index.md with ${items.length} entries`);
  console.log(`✓ Synced ${publicCount} files → sites/public/src/content/posts/ (publish: true only)`);
}

main().catch((e) => {
  console.error("✗ sync failed:", e);
  process.exit(1);
});
