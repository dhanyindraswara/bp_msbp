\# STONES — Business Process Suite (project memory)



Web app buat mengembangkan, mengelola, dan menyimpan Business Process (BP), SOP,

dan dokumen perusahaan. Evolusi dari "ITM SIPOC Studio". Owner: dhanyindraswara.



\## Stack \& deploy

\- \*\*React 18 + Vite\*\*, base path `/bp\_msbp/`, Tailwind + design tokens (Inter font).

\- \*\*reactflow v11\*\* (process map), \*\*xlsx@0.18.5\*\*, \*\*html-to-image\*\* (export PNG).

\- \*\*Firebase v12\*\* — project \*\*`stones-bp`\*\* (Blaze plan, target biaya \~$0):

&#x20; - \*\*Firestore\*\* (collection `bp\_documents`, persistent cache, realtime onSnapshot).

&#x20; - \*\*Auth\*\* (Google) — Security Rules `request.auth != null`.

&#x20; - \*\*Storage\*\* (file di Storage, metadata di subcollection `files/`).

&#x20; - \*\*Cloud Functions\*\* (callable v2) — AI proxy.

\- \*\*Deploy web:\*\* GitHub Pages, repo `dhanyindraswara/bp\_msbp`, branch `gh-pages`.

&#x20; Live: https://dhanyindraswara.github.io/bp\_msbp/

\- \*\*Deploy function:\*\* dari terminal PC `firebase deploy --only functions`.

&#x20; PowerShell: nggak ada `\&\&`, jangan run dari C:\\WINDOWS\\system32.



\## Menu (src/App.jsx MENUS)

1\. Document Action Request  2. Document Development (studio SIPOC→map+RASCI, ITM title block, export PNG)

3\. Repository  4. Global Search  5. Ask AI  6. Dashboard



\## Fase 1 (jadi)

Versions + audit trail, approval (Draft→In Review→Approved→Published), comments, deep-link `?doc=BP-xxxx`.



\## Ask AI — SETUP FINAL

\- web → Cloud Function `askAI` (us-central1, auth) → \*\*Google Gemini API\*\* (`gemini-2.5-flash`).

&#x20; Kode: functions/index.js. Client: src/lib/ai.js (httpsCallable, kirim {question, context}).

\- Provider = \*\*Gemini\*\* (BUKAN Grok/xAI — xAI berbayar, kredit $0).

\- Key = Firebase secret \*\*`GEMINI\_API\_KEY`\*\* (server-side, TIDAK di repo). Gratis di https://aistudio.google.com/apikey.

&#x20; Ganti: `firebase functions:secrets:set GEMINI\_API\_KEY` → `firebase deploy --only functions`.

\- System prompt = "senior BP analyst/consultant" (bisa analisa + rekomendasi, bukan lookup doang), temp 0.4.

\- Free tier: no expiry, rate limit \~10 req/min \& \~250/hari, data free tier bisa dipakai training

&#x20; (kalau BP sensitif → pertimbangin paid tier).



\## Keamanan (beres)

\- Firebase Web apiKey (AIzaSyD\_Wn... di src/lib/firebaseConfig.js) ke-flag GitHub = NORMAL (key publik by design).

&#x20; Proteksi = Rules + Auth. Sudah di-restrict di GCP (Websites: dhanyindraswara.github.io/\*, localhost/\*).

&#x20; Alert GitHub close "Won't fix".

\- Jangan hardcode key sensitif (Gemini/xAI) ke repo — selalu via Firebase secret.



\## Catatan

\- Container Claude web TIDAK bisa push (git proxy 403) — perubahan function dikasih ke user buat deploy manual.

\- Map: max 4 kotak proses/baris, aktor 4 sisi, legend 8px 2 kolom, flow baca derived.flows.



\## TODO besok

\- Build menu lainnya (tanya user yang mana).

\- Cek deploy function terakhir (prompt analyst + temp 0.4) udah jalan.

\- Kandidat di-skip: RBAC/role admin (siapa boleh akses).

