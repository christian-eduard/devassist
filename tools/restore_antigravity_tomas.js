const { copyFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const home = process.env.HOME;
const db = path.join(
  home,
  "Library/Application Support/Antigravity/User/globalStorage/state.vscdb",
);
const backup = path.join(
  home,
  "Desktop/DevAssist",
  `antigravity_global_state_before_tomas_restore_${new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14)}.vscdb`,
);

const key = "antigravityUnifiedStateSync.trajectorySummaries";
const workspaceUri = "file:///Users/chris/Desktop/Asistente%20tomas";
const items = [
  {
    id: "286bc9d0-c876-46a1-94b6-c953c56d9999",
    title: "Auditing Sara OpenClaw Assistant",
    mtime: 1777694293,
  },
  {
    id: "2c1fa054-3c72-4b2b-bdbc-447abb25da14",
    title: "Planning OpenClaw VPS Deployment",
    mtime: 1777515335,
  },
  {
    id: "e5abf6ce-8405-4f59-8afd-bf111d9c20eb",
    title: "Reviewing Asistente Tomas Project History",
    mtime: 1770047614,
  },
];

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

function field(no, wire) {
  return varint((BigInt(no) << 3n) | BigInt(wire));
}

function bytes(no, value) {
  const b = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return Buffer.concat([field(no, 2), varint(b.length), b]);
}

function uint(no, value) {
  return Buffer.concat([field(no, 0), varint(value)]);
}

function timestamp(seconds) {
  return Buffer.concat([uint(1, seconds), uint(2, 0)]);
}

function workspace(value) {
  return Buffer.concat([bytes(1, value), bytes(2, value)]);
}

function summary(item) {
  const body = Buffer.concat([
    bytes(1, item.title),
    uint(2, 1),
    bytes(3, timestamp(item.mtime)),
    bytes(4, item.id),
    uint(5, 2),
    bytes(7, timestamp(item.mtime)),
    bytes(9, workspace(workspaceUri)),
    bytes(10, timestamp(item.mtime)),
    bytes(15, Buffer.alloc(0)),
    uint(16, 1),
    bytes(
      17,
      Buffer.concat([
        bytes(1, workspace(workspaceUri)),
        bytes(2, timestamp(item.mtime)),
        bytes(3, item.id),
        bytes(7, workspaceUri),
      ]),
    ),
  ]);
  return body.toString("base64");
}

function row(item) {
  const c0 = bytes(1, summary(item));
  return bytes(1, Buffer.concat([bytes(1, item.id), bytes(2, c0)]));
}

function readValue() {
  return execFileSync("sqlite3", [db, `select value from ItemTable where key='${key}';`], {
    encoding: "utf8",
  }).trim();
}

const before = readValue();
const beforeBuffer = Buffer.from(before, "base64");
const existing = new Set(
  [...beforeBuffer.toString("latin1").matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)].map(
    (m) => m[0],
  ),
);

const missing = items.filter((item) => !existing.has(item.id));
if (missing.length === 0) {
  console.log("No changes needed; all Tomas summaries are already present.");
  process.exit(0);
}

copyFileSync(db, backup);

const after = Buffer.concat([beforeBuffer, ...missing.map(row)]).toString("base64");
execFileSync("sqlite3", [
  db,
  `update ItemTable set value='${after}' where key='${key}';`,
]);

const verify = Buffer.from(readValue(), "base64").toString("latin1");
const added = missing.filter((item) => verify.includes(item.id)).map((item) => item.id);
console.log(`Backup: ${backup}`);
console.log(`Added ${added.length} trajectory summaries:`);
for (const id of added) console.log(`- ${id}`);
