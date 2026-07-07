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

## Ask AI + Document Import AI — SETUP FINAL (penting, ini yang paling banyak dioprek)
- **Provider = OpenRouter, dipanggil LANGSUNG dari browser (client-side)** — BUKAN lewat Cloud
  Function lagi, BUKAN Gemini/Grok lagi. Alasan pindah: limit Gemini free habis, dan user cuma
  bisa akses dari laptop kantor (nggak bisa buka terminal buat deploy function).
- **API key OpenRouter di-input user di dalam app**, disimpan **cuma di browser (localStorage
  `stones-openrouter-key`)** — TIDAK di repo, TIDAK di bundle, TIDAK di-handle Claude. Tiap orang
  pakai key sendiri. `src/lib/openrouter.js` = key mgmt + `orChat()` (fetch ke
  `openrouter.ai/api/v1/chat/completions`, OpenAI-compatible, header HTTP-Referer + X-Title).
  Komponen `src/components/ApiKeyField.jsx` (field password + tombol Simpan/Ganti).
- **Pemilih model di layar** (`src/components/ModelPicker.jsx`): **fetch daftar model LIVE** dari
  `openrouter.ai/api/v1/models` (`openrouter.fetchModels`, cache localStorage), ada search +
  toggle **"Gratis saja"** (`isFreeModel`), extract difilter ke model vision (`supportsFiles`).
  Pilihan persist di localStorage (`getModel`/`getExtractModel`, terima id apa pun). `AI_MODELS`/
  `EXTRACT_MODELS` di `ai.js` cuma fallback kalau fetch gagal. Default = model `:free`.
- **Ask AI** (`ai.js`): `askAI(question, model)` → `orChat` dengan SYSTEM_PROMPT "senior
  business-process analyst" (`temperature 0.4`) + `buildContext()` (semua BP + REFERENCE dari
  knowledge base). `cleanText()` strip markdown biar bubble plain text.
- **Document Import** (`extract.js`): `extractFromPdf(file, model)` → `orChat` dengan
  content part `type:'file'` (PDF base64) + `plugins:[{id:'file-parser', pdf:{engine:'native'}}]`
  → model vision baca PDF (scan pun bisa), balikin JSON (skema SOP), `normalizeDraft`.
- **Cloud Functions (`functions/index.js`) sekarang TIDAK dipakai app** (askAI/extractDoc lama).
  Dibiarkan untuk referensi; boleh dihapus nanti. Nggak perlu deploy function sama sekali.
- OpenRouter free tier: ada rate limit per model; kalau kena, ganti model atau top-up saldo.
  Saran: set **limit kredit** di dashboard OpenRouter buat key-nya.

## Keamanan (sudah dibereskan)
- **Firebase Web apiKey** (`AIzaSyD_Wn...` di `src/lib/firebaseConfig.js`) ke-flag GitHub secret
  scanning — ini **normal & by design** (key publik client Firebase). Proteksi asli = Security
  Rules + Auth, bukan nyembunyiin key. Sudah di-hardening: **API key restriction** di GCP
  (Application restrictions → Websites: `dhanyindraswara.github.io/*`, `localhost/*`).
  Alert GitHub boleh di-close "Won't fix".
- Jangan pernah hardcode API key sensitif ke repo/bundle. **OpenRouter key = BYO, disimpan di
  browser user** (localStorage), bukan di repo. Jangan minta user paste key ke chat; suruh
  input di field "Set API key" di app.

## Catatan kerja
- Container Claude **bisa push ke repo & deploy web** (`npm run deploy` → gh-pages) — dipakai
  buat semua perubahan frontend. Yang TIDAK bisa dari container: deploy Cloud Functions (butuh
  Firebase CLI + auth). Makanya AI dipindah client-side (nggak butuh function).
- Model layout map: max 4 kotak proses per baris (wrap ke bawah), aktor distribusi 4 sisi,
  legend font 8px + 2 kolom, "Data/Document/Information Flow" baca `derived.flows`.
- **Routing garis map** (`src/lib/router.js` + custom `RoutedEdge` di ProcessMap): garis
  antar-proses/aktor pakai A* ortogonal yang **menghindari kotak** (Hanan grid, obstacle =
  semua node kecuali source/target, margin 15px). Auto re-route pas node digeser; saat drag
  pakai `simpleRoute` (elbow cepat), A* jalan pas drop. Handoff = solid hitam, in/out = dashed
  biru/hijau; angka flow = label di titik tengah path.

## Document Import (Fase A — dibangun)
- Menu **Document Import** (`import`): upload PDF (SOP/BP/policy, maks ±7MB) →
  **OpenRouter client-side** (`extractFromPdf`, model vision + file-parser plugin baca PDF
  native/scan, balikin JSON) → draft terstruktur → layar review side-by-side (PDF kiri, form
  kanan: metadata, tujuan/scope, aktor, steps, RASCI, PPI) → simpan ke store
  sebagai doc dengan `docType` + payload `sop`, PDF asli dilampirkan via Storage.
- Saat simpan, `sopToSipoc`/`sopToPpi` (`src/lib/sopMap.js`) mengisi `project.sipoc`/`ppi` dari
  steps hasil ekstraksi (PIC→Supplier, PIC berikutnya→Customer) supaya SIPOC editor tidak kosong.
  Document Development juga backfill on-open (flag `sopBackfilled`) buat doc import lama.
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
- AI answer di web: render blok "Alur:"/"Flow:" sebagai diagram visual.
- Kandidat lama yang di-skip: **RBAC/role admin** (setup siapa yang boleh akses).
- Privasi: OpenRouter free tier bisa dipakai provider buat training — untuk dokumen sangat
  sensitif pilih model/endpoint paid yang no-logging.
- (Opsional) hapus `functions/index.js` yang sudah tidak dipakai, atau jadikan mode server-side alternatif.
