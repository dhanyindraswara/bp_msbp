# STONES — Business Process Suite (project memory)

Web app buat mengembangkan, mengelola, dan menyimpan Business Process (BP), SOP,
dan dokumen perusahaan. Evolusi dari "ITM SIPOC Studio". Owner: dhanyindraswara.

## Stack & deploy
- **React 18 + Vite**, base path `/bp_msbp/`, Tailwind + design tokens (Inter font).
- **reactflow v11** (process map), **xlsx@0.18.5**, **html-to-image** (export PNG).
- **Firebase v12** — project **`stones-bp`** (Blaze plan, target biaya ~$0):
  - **Firestore** (collection `bp_documents`, persistent IndexedDB cache, realtime onSnapshot).
  - **Auth** (Google sign-in) — akses dikunci: Security Rules `request.auth != null`.
  - **Storage** (upload PDF/PNG; file di Storage, metadata di subcollection `files/`).
  - **Cloud Functions** (callable v2) — AI proxy (lihat bawah).
- **Deploy web:** GitHub Pages, repo `dhanyindraswara/bp_msbp`, branch `gh-pages` (build `dist/`).
  Live: https://dhanyindraswara.github.io/bp_msbp/
- **Deploy function:** dari terminal PC (`firebase deploy --only functions`). User pakai
  PowerShell — ingat: **nggak ada `&&`** (satu command per baris), jangan run dari `C:\WINDOWS\system32`.

## Menu (STONES shell — src/App.jsx, `NAV` array; nav dikelompokkan)
Grup sidebar: **Dashboard** (atas, standalone) · grup **Business Process** (Document
Development, Document Import) · grup **Flow Process** (Auto Flow Process) · lalu standalone
(Document Action Request, Repository, Global Search, Ask AI, AI Knowledge Base).
1. **Document Action Request** (`request`) — daftar/permintaan + add new BP.
2. **Document Development** (`develop`) — studio utama: SIPOC editor → auto business-process
   map (ProcessMap.jsx) + RASCI, ITM title block (logo, Prepared/Reviewed/Approved, BP No,
   revision), export PNG persis web.
3. **Document Import** (`import`) — impor PDF → SOP terstruktur (lihat Fase A).
4. **Auto Flow Process** (`flow`) — generator flowchart swimlane SOP (lihat bawah).
5. **Repository** (`repository`) — semua BP tersimpan (by id/name/version).
6. **Global Search** (`search`).
7. **Ask AI** (`ai`) — chat tanya/analisa BP (lihat bawah).
8. **AI Knowledge Base** (`knowledge`) — upload dokumen referensi (lihat bawah).
9. **Dashboard** (`dashboard`).

## Auto Flow Process (`flow`) — menu generator flowchart SOP
- `src/menus/AutoFlow.jsx` (form) + `src/components/FlowChart.jsx` (render) + `src/lib/flow.js`
  (model + layout engine murni: node + konektor ortogonal ber-slot). Disimpan sebagai doc
  `docType: 'FLOW'` (payload `flow`), `project`-nya tetap `blankProject()` valid. `openDoc` di
  App merutekan doc FLOW ke menu ini. Kotak bisa di-drag (`step.pos`) & double-click rename;
  kepala dokumen bisa di-hide via toggle.

## AI Knowledge Base (`knowledge`) — source of knowledge buat Ask AI
- `src/menus/KnowledgeBase.jsx` + `src/lib/knowledge.js`. Upload PDF (reuse fungsi `extractDoc`
  yang sudah deploy → `draftToKnowledgeText`) atau paste teks. Disimpan sebagai doc
  `docType: 'KNOWLEDGE'` di collection `bp_documents` (payload `knowledge:{title,content,kind,enabled}`)
  → **tanpa collection/security-rule baru**. Tiap entri punya toggle aktif/nonaktif.
- `ai.js buildContext()` skip doc KNOWLEDGE di loop BP, lalu **append** bagian
  "REFERENCE DOCUMENTS" dari `buildKnowledgeContext()` (hanya entri enabled). Fungsi `askAI`
  lama langsung pakai — **nggak perlu deploy function**. Doc KNOWLEDGE difilter keluar dari
  Repository/Dashboard/Global Search.

## Fase 1 (sudah jadi)
Version history + audit trail, approval workflow (Draft→In Review→Approved→Published),
comments. Deep-link share via `?doc=BP-xxxx`.

## Ask AI — SETUP FINAL (penting, ini yang paling banyak dioprek)
- Arsitektur: web app → **Cloud Function `askAI`** (us-central1, auth-protected) → **Google Gemini API**.
  Kode: `functions/index.js`. Client: `src/lib/ai.js` (httpsCallable `askAI`, kirim `{question, context}`).
- **Provider = Google Gemini** (model `gemini-2.5-flash`), BUKAN Grok/xAI lagi.
  - Alasan pindah: Grok/xAI API berbayar, team user $0 kredit. Gemini punya free tier beneran.
- **API key** disimpan sebagai Firebase secret **`GEMINI_API_KEY`** (server-side, TIDAK di repo).
  Set ulang: `firebase functions:secrets:set GEMINI_API_KEY` (paste di prompt ber-mask) lalu
  `firebase deploy --only functions`. Key gratis dari https://aistudio.google.com/apikey.
- **System prompt** sudah diperlonggar jadi "senior business-process analyst/consultant" —
  bisa analisa (bottleneck, gap, ownership, PPI lemah) + kasih rekomendasi perbaikan, bukan
  cuma lookup. `temperature: 0.4`. (Kalau jawaban terlalu dangkal → kualitas tergantung
  kelengkapan SIPOC/PPI di BP-nya.)
- Free tier Gemini: no expiry, tapi ada rate limit (~10 req/min, ~250 req/hari) dan **data free
  tier bisa dipakai Google buat training** → kalau BP sensitif, pertimbangkan upgrade paid tier.

## Keamanan (sudah dibereskan)
- **Firebase Web apiKey** (`AIzaSyD_Wn...` di `src/lib/firebaseConfig.js`) ke-flag GitHub secret
  scanning — ini **normal & by design** (key publik client Firebase). Proteksi asli = Security
  Rules + Auth, bukan nyembunyiin key. Sudah di-hardening: **API key restriction** di GCP
  (Application restrictions → Websites: `dhanyindraswara.github.io/*`, `localhost/*`).
  Alert GitHub boleh di-close "Won't fix".
- Jangan pernah hardcode API key sensitif (Gemini/xAI) ke repo — selalu via Firebase secret.

## Catatan kerja
- Container Claude (web) TIDAK bisa push ke repo (git proxy 403) — perubahan kode function
  dikasih ke user buat di-paste + deploy manual dari PC-nya. Web app deploy tetap via GitHub Pages.
- Model layout map: max 4 kotak proses per baris (wrap ke bawah), aktor distribusi 4 sisi,
  legend font 8px + 2 kolom, "Data/Document/Information Flow" baca `derived.flows`.

## Document Import (Fase A — dibangun)
- Menu **Document Import** (`import`): upload PDF (SOP/BP/policy, maks ±7MB) →
  Cloud Function **`extractDoc`** (Gemini baca PDF native, responseMimeType JSON,
  timeout 300s) → draft terstruktur → layar review side-by-side (PDF kiri, form
  kanan: metadata, tujuan/scope, aktor, steps, RASCI, PPI) → simpan ke store
  sebagai doc dengan `docType` + payload `sop`, PDF asli dilampirkan via Storage.
- `createDoc(project, extra)` menerima field ekstra; Ask AI `buildContext()` ikut
  baca payload `sop` (steps/RASCI/PPI). Repository nampilin chip tipe (SOP dsb).
- Skema ekstraksi: type, docNo, title, revision, effectiveDate, owner,
  approvals{prepared/reviewed/approvedBy}, purpose, scope, definitions[],
  actors[], steps[{no,activity,pic,input,output,docRef}], rasci[{activity,R,A,S,C,I}],
  ppi[], notes. RASCI diturunkan dari PIC kalau tak ada matriks eksplisit.
- Deploy web dari PC user: `npm run build` lalu `npm run deploy` (gh-pages -d dist).

## TODO / next
- **Fase B**: batch upload (banyak PDF sekaligus, antrian + status per dokumen).
- **Fase C**: tombol "Generate BP from SOP" — naikin level SOP → draft SIPOC/BP
  di Document Development.
- AI answer di web: render blok "Alur:"/"Flow:" sebagai diagram visual (butuh deploy web).
- Kandidat lama yang di-skip: **RBAC/role admin** (setup siapa yang boleh akses).
- Privasi: untuk impor massal dokumen internal, pertimbangkan Gemini paid tier.
