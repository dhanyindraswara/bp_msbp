# STONES — Business Process Suite

Web app untuk **mengembangkan, mengelola, dan menyimpan** Business Process (BP), SOP, dan
dokumen perusahaan — dengan approval workflow, versioning, import PDF, generator flowchart SOP,
dan asisten AI yang bisa membaca knowledge base internal. (Evolusi dari "ITM SIPOC Studio".)

- **Live:** https://dhanyindraswara.github.io/bp_msbp/
- 📖 **Panduan pengguna:** [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- 🏗️ **Arsitektur / dev:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Menu (sidebar bergrup)

- **Dashboard** — reporting (hitungan live; chart menyusul).
- **Business Process**
  - **Document Development** — studio inti: satu tabel **SIPOC** → **Business Process Map**
    (React Flow) + **RASCI** otomatis, title block ITM, export PNG. Plus workflow
    (Draft→In Review→Approved→Published), versi + audit trail, dan komentar.
  - **Document Import** — upload PDF SOP/BP/policy → AI (Gemini) ekstrak jadi data terstruktur →
    review → simpan.
- **Flow Process**
  - **Auto Flow Process** — generator **flowchart swimlane SOP** dari input lane + langkah; kotak
    bisa di-drag & rename, export PNG.
- **Document Action Request** — antrian review (approve/reject) + New BP.
- **Repository** — semua dokumen (open/duplicate/delete).
- **Global Search** — cari lintas dokumen.
- **Ask AI** — chat tanya/analisa BP (Gemini), membaca semua BP + referensi aktif.
- **AI Knowledge Base** — upload dokumen referensi sebagai sumber pengetahuan Ask AI.

## Stack

- **React 18** + **Vite** (base path `/bp_msbp/`)
- **[React Flow](https://reactflow.dev) v11** untuk Business Process Map
- **SheetJS (`xlsx`)** untuk import/export `.xlsx`/`.csv`
- **html-to-image** untuk export PNG
- **Firebase v12** — **Auth** (Google sign-in), **Cloud Firestore** (realtime + offline cache),
  **Cloud Storage** (lampiran PDF/PNG), **Cloud Functions** (proxy ke **Google Gemini**)
- **Tailwind CSS** + CSS komponen custom

## Menjalankan

```bash
npm install
npm run dev       # dev server → http://localhost:5173/bp_msbp/
npm run build     # build produksi → dist/
npm run preview   # preview build produksi
npm run deploy    # publish dist/ ke branch gh-pages (GitHub Pages)
```

Cloud Functions di-deploy terpisah dari terminal PC: `firebase deploy --only functions`
(butuh secret `GEMINI_API_KEY`). Perubahan **frontend saja tidak** butuh deploy function.

## Backend & data

Model **serverless / client-first**: browser bicara langsung ke Firebase; satu-satunya kode
server adalah Cloud Functions (proxy AI). Semua dokumen ada di collection Firestore
`bp_documents` (1 dokumen = 1 entitas; tipe dibedakan `docType`: `BP`/`SOP`/`FLOW`/`KNOWLEDGE`).
Baca bersifat realtime + sinkron dari cache in-memory; tanpa `apiKey` app jalan di
`localStorage`. Detail lengkap ada di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Keamanan

Akses dikunci **Firebase Auth** (login Google) + **Security Rules** (`request.auth != null`).
Firebase Web `apiKey` di repo adalah key publik client (by design) — proteksi asli = Rules +
Auth, plus API key restriction di GCP. API key AI sensitif disimpan sebagai **Firebase secret**,
tidak pernah di repo.

## Catatan SheetJS

Build ini memakai `xlsx@0.18.5` dari npm registry (CDN SheetJS tidak terjangkau di lingkungan
build) — API-nya sama untuk semua pemanggilan yang dipakai app (`read`, `sheet_to_json`,
`aoa_to_sheet`, `writeFile`).

---

Prototype desain asli (Claude Design export) ada di `project/` (`.dc.html` + screenshot) untuk
referensi historis.
