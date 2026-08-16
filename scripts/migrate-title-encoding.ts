/**
 * One-off production migration: fix the mojibake/replacement-character bug
 * (U+FFFD "�") baked into several risk `title`/`notes` strings — a lost byte
 * from some earlier encoding mishap, not a display bug (display-layer
 * patches targeting "◆" in SendUpdateModal.tsx / Dashboard.tsx never
 * actually matched U+FFFD and have been removed as dead code).
 *
 * Disambiguation: U+FFFD surrounded by spaces on both sides was an em-dash
 * used as a word separator ("delivery � 110" -> "delivery - 110"); U+FFFD
 * with no surrounding whitespace was a degree sign ("-5�C" -> "-5°C", the
 * one such case in this data: RK-017's notes).
 *
 * Surgical field-level patch, not a full-document overwrite — every other
 * field is left untouched. Safe to re-run: skips docs with no U+FFFD left.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/migrate-title-encoding.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { SEED_PROJECT } from "../src/lib/seedData.ts";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key) });
} else {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

const REPLACEMENT_CHAR = "�";

function fixMojibake(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === REPLACEMENT_CHAR) {
      const before = text[i - 1];
      const after = text[i + 1];
      result += before === " " && after === " " ? "-" : "°";
    } else {
      result += text[i];
    }
  }
  return result;
}

async function main() {
  console.log(`Fixing title/notes encoding for "${SEED_PROJECT.name}"…`);

  const snap = await db.collection("risks").where("projectId", "==", SEED_PROJECT.id).get();

  let patched = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const title: string = data.title || "";
    const notes: string = data.notes || "";
    if (!title.includes(REPLACEMENT_CHAR) && !notes.includes(REPLACEMENT_CHAR)) continue;

    const nextTitle = fixMojibake(title);
    const nextNotes = fixMojibake(notes);
    await doc.ref.update({ title: nextTitle, notes: nextNotes });
    patched++;
    console.log(`  ${data.riskId || doc.id}: "${nextTitle}"`);
  }

  console.log(`Patched ${patched} risk docs.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
