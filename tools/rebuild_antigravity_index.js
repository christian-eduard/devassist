const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const APPLY = process.argv.includes("--apply");
const HOME = process.env.HOME;
const DB = path.join(
  HOME,
  "Library/Application Support/Antigravity/User/globalStorage/state.vscdb",
);
const CONVERSATIONS = path.join(HOME, ".gemini/antigravity/conversations");
const BRAIN = path.join(HOME, ".gemini/antigravity/brain");
const WORKSPACES = path.join(
  HOME,
  "Library/Application Support/Antigravity/User/workspaceStorage",
);
const OUT_DIR = path.join(HOME, "Desktop/DevAssist/antigravity_rebuild_reports");
const KEY = "antigravityUnifiedStateSync.trajectorySummaries";

function varint(n) {
  let x = BigInt(n);
  const out = [];
  while (x >= 0x80n) {
    out.push(Number((x & 0x7fn) | 0x80n));
    x >>= 7n;
  }
  out.push(Number(x));
  return Buffer.from(out);
}

function readVarint(buf, pos) {
  let x = 0n;
  let shift = 0n;
  while (pos < buf.length) {
    const c = buf[pos++];
    x |= BigInt(c & 0x7f) << shift;
    if (!(c & 0x80)) return [Number(x), pos];
    shift += 7n;
  }
  return [Number(x), pos];
}

function field(no, wire) {
  return varint((BigInt(no) << 3n) | BigInt(wire));
}

function bytes(no, value) {
  const b = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return Buffer.concat([field(no, 2), varint(b.length), b]);
}

function uint(no, value) {
  return Buffer.concat([field(no, 0), varint(value)]);
}

function stripField(buf, target) {
  const kept = [];
  let pos = 0;
  while (pos < buf.length) {
    const start = pos;
    let tag;
    try {
      [tag, pos] = readVarint(buf, pos);
    } catch {
      kept.push(buf.slice(start));
      break;
    }
    const no = tag >> 3;
    const wire = tag & 7;
    if (wire === 0) {
      [, pos] = readVarint(buf, pos);
    } else if (wire === 2) {
      const [len, p2] = readVarint(buf, pos);
      pos = p2 + len;
    } else if (wire === 1) {
      pos += 8;
    } else if (wire === 5) {
      pos += 4;
    } else {
      kept.push(buf.slice(start));
      break;
    }
    if (no !== target) kept.push(buf.slice(start, pos));
  }
  return Buffer.concat(kept);
}

function readLengthFields(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    let tag;
    try {
      [tag, pos] = readVarint(buf, pos);
    } catch {
      break;
    }
    const no = tag >> 3;
    const wire = tag & 7;
    if (wire === 2) {
      const [len, p2] = readVarint(buf, pos);
      pos = p2;
      if (pos + len > buf.length) break;
      const sub = buf.slice(pos, pos + len);
      pos += len;
      out.push({ no, sub, str: sub.toString("utf8") });
    } else if (wire === 0) {
      let value;
      [value, pos] = readVarint(buf, pos);
      out.push({ no, value });
    } else if (wire === 1) {
      pos += 8;
    } else if (wire === 5) {
      pos += 4;
    } else {
      break;
    }
  }
  return out;
}

function sqliteValue() {
  return execFileSync("sqlite3", [DB, `select value from ItemTable where key='${KEY}';`], {
    encoding: "utf8",
  }).trim();
}

function parseExisting() {
  const raw = sqliteValue();
  const decoded = Buffer.from(raw, "base64");
  const existing = new Map();
  for (const row of readLengthFields(decoded).filter((f) => f.no === 1)) {
    const f = readLengthFields(row.sub);
    const id = f.find((x) => x.no === 1)?.str;
    const wrapper = f.find((x) => x.no === 2)?.sub;
    const encoded = wrapper ? readLengthFields(wrapper).find((x) => x.no === 1)?.str : "";
    if (!id || !encoded) continue;
    let inner;
    try {
      inner = Buffer.from(encoded, "base64");
    } catch {
      continue;
    }
    const innerFields = readLengthFields(inner);
    const title = innerFields.find((x) => x.no === 1)?.str;
    existing.set(id, { inner, title, workspace: extractWorkspaceFromInner(inner) });
  }
  return { raw, existing };
}

function extractWorkspaceFromInner(inner) {
  for (const f of readLengthFields(inner)) {
    if (f.no === 9) {
      const uri = readLengthFields(f.sub).find((x) => x.no === 1)?.str;
      if (uri?.startsWith("file:///") || uri?.startsWith("vscode-remote://")) return uri;
    }
    if (f.no === 17) {
      const innerWs = readLengthFields(f.sub).find((x) => x.no === 1)?.sub;
      if (innerWs) {
        const uri = readLengthFields(innerWs).find((x) => x.no === 1)?.str;
        if (uri?.startsWith("file:///") || uri?.startsWith("vscode-remote://")) return uri;
      }
    }
  }
  return "";
}

function timestamp(seconds) {
  return bytes(1, Buffer.concat([uint(1, Math.floor(seconds)), uint(2, 0)]));
}

function timestampFields(seconds) {
  const ts = Buffer.concat([uint(1, Math.floor(seconds)), uint(2, 0)]);
  return Buffer.concat([bytes(3, ts), bytes(7, ts), bytes(10, ts)]);
}

function hasTimestamp(inner) {
  return readLengthFields(inner).some((f) => f.no === 3 || f.no === 7 || f.no === 10);
}

function workspaceField(uri) {
  const msg = Buffer.concat([bytes(1, uri), bytes(2, uri)]);
  return bytes(9, msg);
}

function buildEntry(item) {
  let inner;
  if (item.existing?.inner) {
    inner = Buffer.concat([bytes(1, item.title), stripField(item.existing.inner, 1)]);
    if (item.workspace && !item.existing.workspace) inner = Buffer.concat([inner, workspaceField(item.workspace)]);
    if (!hasTimestamp(item.existing.inner)) inner = Buffer.concat([inner, timestampFields(item.mtime)]);
  } else {
    inner = Buffer.concat([
      bytes(1, item.title),
      uint(2, 1),
      timestampFields(item.mtime),
      bytes(4, item.id),
      uint(5, 2),
      item.workspace ? workspaceField(item.workspace) : Buffer.alloc(0),
      bytes(15, Buffer.alloc(0)),
      uint(16, 1),
    ]);
  }
  const wrapper = bytes(1, inner.toString("base64"));
  return bytes(1, Buffer.concat([bytes(1, item.id), bytes(2, wrapper)]));
}

function pathToUri(p) {
  if (p.startsWith("file:///") || p.startsWith("vscode-remote://")) return p;
  return `file://${p.split(path.sep).map((s) => encodeURIComponent(s)).join("/")}`;
}

function decodeFileUri(uri) {
  if (!uri.startsWith("file://")) return uri;
  return decodeURIComponent(uri.slice("file://".length));
}

function loadWorkspaces() {
  const out = [];
  if (!fs.existsSync(WORKSPACES)) return out;
  for (const id of fs.readdirSync(WORKSPACES)) {
    const file = path.join(WORKSPACES, id, "workspace.json");
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const uri = data.folder || data.workspace;
      if (uri) out.push(uri);
    } catch {}
  }
  return [...new Set(out)].sort((a, b) => b.length - a.length);
}

function listBrainFiles(id) {
  const root = path.join(BRAIN, id);
  const files = [];
  function walk(dir, depth = 0) {
    if (depth > 6) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === ".tempmediaStorage") continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, depth + 1);
      else if (/\.(md|json|txt|resolved)$/i.test(ent.name)) files.push(p);
    }
  }
  try {
    if (fs.existsSync(root)) walk(root);
  } catch {}
  return files;
}

function titleFromBrain(id) {
  const files = listBrainFiles(id)
    .filter((f) => /\.md(\.resolved)?$/i.test(f))
    .filter((f) => !f.includes(`${path.sep}.system_generated${path.sep}`));
  for (const f of files) {
    try {
      const txt = fs.readFileSync(f, "utf8").slice(0, 8192);
      const line = txt.split(/\r?\n/).find((l) => /^#\s+/.test(l));
      if (line) return line.replace(/^#+\s*/, "").trim().slice(0, 100);
    } catch {}
  }
  for (const f of listBrainFiles(id).filter((x) => x.endsWith(".metadata.json"))) {
    try {
      const summary = JSON.parse(fs.readFileSync(f, "utf8")).summary;
      if (summary) return summary.replace(/\s+/g, " ").slice(0, 90);
    } catch {}
  }
  return "";
}

function inferWorkspace(id, known) {
  const counts = new Map();
  for (const f of listBrainFiles(id)) {
    let txt = "";
    try {
      txt = fs.readFileSync(f, "utf8").slice(0, 65536);
    } catch {
      continue;
    }
    const candidates = new Set();
    for (const m of txt.matchAll(/file:\/\/\/[^)\s"'\]>]+/g)) candidates.add(m[0]);
    for (const m of txt.matchAll(/\/Users\/chris\/Desktop\/[^\s"')\]>]+/g)) candidates.add(pathToUri(m[0]));
    for (const candidate of candidates) {
      const cNorm = decodeFileUri(candidate).replace(/\/+$/, "");
      for (const ws of known) {
        const wNorm = decodeFileUri(ws).replace(/\/+$/, "");
        if (cNorm === wNorm || cNorm.startsWith(wNorm + "/")) {
          counts.set(ws, (counts.get(ws) || 0) + 1);
          break;
        }
      }
    }
  }
  if (!counts.size) return "";
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const known = loadWorkspaces();
  const { raw, existing } = parseExisting();
  const pbFiles = fs.readdirSync(CONVERSATIONS).filter((f) => f.endsWith(".pb"));
  const rows = pbFiles
    .map((f) => {
      const id = f.slice(0, -3);
      const full = path.join(CONVERSATIONS, f);
      const stat = fs.statSync(full);
      const ex = existing.get(id);
      const workspace = ex?.workspace || inferWorkspace(id, known);
      const title =
        ex?.title && !/^Conversation /.test(ex.title)
          ? ex.title
          : titleFromBrain(id) || `Conversation (${new Date(stat.mtimeMs).toISOString().slice(0, 10)}) ${id.slice(0, 8)}`;
      return {
        id,
        title,
        mtime: Math.floor(stat.mtimeMs / 1000),
        date: stat.mtime.toISOString(),
        size: stat.size,
        workspace,
        titleSource: ex?.title ? "existing" : titleFromBrain(id) ? "brain" : "fallback",
        workspaceSource: ex?.workspace ? "existing" : workspace ? "brain/known-workspace" : "none",
        existing: ex,
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const reportRows = rows.map(({ existing, ...r }) => r);
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const reportPath = path.join(OUT_DIR, `antigravity_rebuild_dryrun_${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportRows, null, 2));

  const byWorkspace = {};
  for (const r of reportRows) (byWorkspace[r.workspace || "(unassigned)"] ??= []).push(r);
  const mdPath = path.join(OUT_DIR, `antigravity_rebuild_dryrun_${stamp}.md`);
  let md = `# Antigravity rebuild dry-run ${stamp}\n\n`;
  md += `- Conversations: ${rows.length}\n`;
  md += `- Known workspaces: ${known.length}\n`;
  md += `- Existing indexed summaries before rebuild: ${existing.size}\n`;
  md += `- With workspace after rebuild: ${rows.filter((r) => r.workspace).length}\n`;
  md += `- Unassigned: ${rows.filter((r) => !r.workspace).length}\n\n`;
  for (const [ws, arr] of Object.entries(byWorkspace).sort()) {
    md += `## ${ws}\n\n`;
    for (const r of arr) md += `- ${r.date.slice(0, 10)} | ${r.id} | ${r.title}\n`;
    md += "\n";
  }
  fs.writeFileSync(mdPath, md);

  console.log(`Report JSON: ${reportPath}`);
  console.log(`Report MD: ${mdPath}`);
  console.log(`Conversations: ${rows.length}`);
  console.log(`Known workspaces: ${known.length}`);
  console.log(`Existing indexed summaries before rebuild: ${existing.size}`);
  console.log(`With workspace after rebuild: ${rows.filter((r) => r.workspace).length}`);
  console.log(`Unassigned: ${rows.filter((r) => !r.workspace).length}`);

  if (!APPLY) return;

  const backup = path.join(OUT_DIR, `trajectorySummaries_before_rebuild_${stamp}.txt`);
  fs.writeFileSync(backup, raw);
  const rebuilt = Buffer.concat(rows.map(buildEntry)).toString("base64");
  execFileSync("sqlite3", [DB, `update ItemTable set value='${rebuilt}' where key='${KEY}';`]);
  console.log(`Applied rebuild. Backup: ${backup}`);
}

main();
