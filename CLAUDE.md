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

## Landing + Login (pra-auth) — redesign 2026 (lihat REDESIGN.md)
- Signed-out: **Landing page** (`src/Landing.jsx`) — hero animasi haul truck HD (SVG murni),
  section benang-kusut (chaos → STONES → alur rapi), grid fitur, CTA. CTA/„Masuk" →
  **Login** (`src/Login.jsx`, dark glass card + Google). Login split-hero lama dihapus.
- Animasi CSS + IntersectionObserver, hormat `prefers-reduced-motion`. Palet landing:
  gradien `#ff7a1a → #f0439c → #2f8bff` di atas warm paper `#fbfaf7`.

## Menu (STONES shell — src/App.jsx, `NAV` array; nav dikelompokkan per job-to-be-done)
Grup sidebar: **Dashboard** (atas) · **Proses** (Process Architecture, Process Taxonomy,
High Level Process, Taxonomy Description) · **Studio** (Document Development, Document
Import, Auto Flow Process) · **Library** (Repository, Global Search, Action Request) ·
**Intelligence** (Ask AI, AI Knowledge Base).
- **Command palette Ctrl/⌘+K** (`src/components/CommandPalette.jsx`) + pill "Cari…" di
  sidebar: lompat menu, buka dokumen by nama/ID, atau lempar query ke Global Search
  (`initialQuery` prop, remount via `key`).
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

## Taxonomy suite (`taxonomy` / `hlp` / `taxdesc`) — 3 menu generator diagram
Semua reuse pola FLOW: form kiri + live preview kanan, autosave debounce, "Load sample" /
"baru" / "Simpan ke Repository", export PNG (html-to-image). Disimpan sebagai doc dengan
`docType` khusus + payload sendiri, `project`-nya tetap `blankProject()` valid. `openDoc` di
App merutekan tiap docType ke menunya (state `taxOpenId`/`hlpOpenId`/`descOpenId`). Muncul di
Repository (chip tipe), tak difilter keluar.
- **Business Process Taxonomy** (`taxonomy`): `src/menus/TaxonomyBuilder.jsx` +
  `src/components/TaxonomyChart.jsx` + `src/lib/taxonomy.js`. Diagram hierarki L0→L3: rail label
  level (L0..L3) + 2 band membentang (L0 core process, L1 grup) + grid kolom (tiap kolom = 1
  kotak kategori L2 + tumpukan L3). Tiap kotak punya `code`/`name`/`hi` (highlight outline biru).
  `docType:'TAXONOMY'`, payload `taxonomy`.
- **High Level Process** (`hlp`): `src/menus/HighLevelProcess.jsx` +
  `src/components/HlpChart.jsx` + `src/lib/hlp.js`. Value chain perusahaan: stack band
  (Management/Core/Enabler), tiap band tray abu-abu berisi kotak proses (badge bulat kode + nama
  italic), highlight biru. Title + subtitle + footnote/legend. `docType:'HLP'`, payload `hlp`.
- **Taxonomy Description** (`taxdesc`): `src/menus/TaxonomyDescription.jsx` +
  `src/components/TaxDescTable.jsx` + `src/lib/taxdesc.js`. Tabel deskripsi proses: header biru
  nomor proses (kolom), baris atribut tetap (`TAXDESC_ROWS`: name, description, KPI, responsible,
  accountable). KPI/responsible/accountable multi-baris → bullet list. `docType:'TAXDESC'`,
  payload `taxdesc`.

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
- **Multi-provider, dipanggil LANGSUNG dari browser (client-side)** — BUKAN lewat Cloud Function.
  `src/lib/providers.js` = registry provider (OpenRouter, Google Gemini, Groq, OpenAI, Custom
  OpenAI-compatible) + `chat(body)` generik (semua endpoint OpenAI-compatible `/chat/completions`)
  + key mgmt + `fetchModels()` per provider. Tiap provider simpan key sendiri (localStorage
  `stones-aikey-<id>`), provider aktif di `stones-ai-provider`, model per-provider di
  `stones-aimodel-<kind>-<id>`. Custom base URL di `stones-ai-custombase`.
- **API key di-input user di dalam app**, disimpan **cuma di browser** — TIDAK di repo/bundle,
  TIDAK di-handle Claude. Komponen `src/components/ApiKeyField.jsx` = dropdown provider + field
  key (password) + custom base URL. User bisa isi banyak provider & ganti-ganti.
- **Pemilih model di layar** (`src/components/ModelPicker.jsx`): **fetch daftar model LIVE** dari
  `openrouter.ai/api/v1/models` (`openrouter.fetchModels`, cache localStorage), ada search +
  toggle **"Gratis saja"** (`isFreeModel`), extract difilter ke model vision (`supportsFiles`).
  Pilihan persist di localStorage (`getModel`/`getExtractModel`, terima id apa pun). `AI_MODELS`/
  `EXTRACT_MODELS` di `ai.js` cuma fallback kalau fetch gagal. Default = model `:free`.
- **Ask AI** (`ai.js`): `askAI(question, model)` → `orChat` dengan SYSTEM_PROMPT "senior
  business-process analyst" (`temperature 0.4`) + `buildContext()` (semua BP + REFERENCE dari
  knowledge base). `cleanText()` strip markdown biar bubble plain text.
- **Document Import** (`extract.js`): `extractFromPdf(file, model)` — provider-aware. OpenRouter →
  `chat` + `plugins:[{file-parser, pdf:{engine:'pdf-text'}}]`; Google Gemini → endpoint native
  `generateContent` (inline_data PDF, baca scan). Provider tanpa dukungan PDF (Groq/OpenAI) →
  error jelas suruh pilih OpenRouter/Gemini. Balikin JSON (skema SOP) → `normalizeDraft`.
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
