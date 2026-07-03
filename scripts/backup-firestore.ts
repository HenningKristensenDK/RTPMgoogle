/**
 * One-off/repeatable local backup of key Firestore collections.
 * Writes JSON snapshots to backups/<YYYY-MM-DD>/<collection>.json
 * (gitignored — local only, never committed).
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/backup-firestore.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

const COLLECTIONS = ["roles_and_responsibilities", "organizations", "risks"];

// Recursively convert Firestore Timestamps to ISO strings so the backup is
// plain, human-readable JSON.
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)])
    );
  }
  return value;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outDir = `backups/${today}`;
  mkdirSync(outDir, { recursive: true });

  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    const docs = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
    const outPath = `${outDir}/${name}.json`;
    writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf8");
    console.log(`  ${name}: ${docs.length} docs -> ${outPath}`);
  }

  console.log(`Done. Backup written to ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
