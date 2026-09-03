# Never call third-party APIs with a secret key directly from the client

This project's Firebase project (`rtpm-cf560`) was suspended by Google for
"abusive activity consistent with hijacking" — the most likely cause was the
Gemini API key being called directly from the frontend (`VITE_GEMINI_API_KEY`
in `src/services/geminiService.ts`), visible to anyone who opened the site's
JS bundle, scraped and abused by a bot.

**Rule:** any new third-party API that needs a secret key must go through a
Cloud Function (or equivalent server-side proxy) — never call it with the key
present in client-side code, even restricted/rate-limited. The Firebase Web
SDK config (`apiKey`, `authDomain`, etc. in `src/firebase/config.ts`) is the
one exception — those values are *designed* to be public and are protected by
Firestore/Storage security rules instead, not secrecy.

If you're adding a feature that needs a new external API key, stop and ask
whether it can wait for a Cloud Function, rather than wiring it into the
client "to get the demo working" — that's exactly how the last one leaked.
