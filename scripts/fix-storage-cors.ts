/**
 * One-off fix: configures CORS on the Firebase Storage bucket so client-side
 * `fetch()` reads of a Storage download URL succeed from the app's origins.
 *
 * Without this, <img> tags work fine (images don't need CORS to display),
 * but anything that reads the response body via fetch() — e.g. pdf.js
 * rendering an uploaded PDF in the Documents module's DocumentViewer — fails
 * with a generic "Failed to fetch" error, since GCS/Firebase Storage buckets
 * have no CORS policy by default.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *   npx ts-node --esm scripts/fix-storage-cors.ts
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { readFileSync, existsSync } from "node:fs";

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";
const BUCKET_NAME = "rtpm--v2.firebasestorage.app";

if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  initializeApp({ credential: cert(key), storageBucket: BUCKET_NAME });
} else {
  initializeApp({ credential: applicationDefault(), storageBucket: BUCKET_NAME });
}

async function main() {
  const bucket = getStorage().bucket();
  console.log(`Setting CORS policy on gs://${bucket.name}…`);

  await bucket.setCorsConfiguration([
    {
      origin: [
        "https://rtpm--v2.web.app",
        "http://localhost:5180",
        "http://localhost:5173",
      ],
      method: ["GET", "HEAD"],
      responseHeader: [
        "Content-Type",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
      ],
      maxAgeSeconds: 3600,
    },
  ]);

  const [metadata] = await bucket.getMetadata();
  console.log("Applied CORS configuration:", JSON.stringify(metadata.cors, null, 2));
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
