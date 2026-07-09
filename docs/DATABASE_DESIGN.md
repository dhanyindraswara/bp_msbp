# Database Design — BP Hierarchy + SIPOC (STONES)

Desain data untuk **hierarki Business Process (LVL 0–3)** + **SIPOC** di level LVL 3,
dengan RISK & Performance Indicator. Dibuat untuk stack STONES (Firebase Firestore,
target biaya ~$0, mudah di-maintain).

Sumber: `DATABASE_DESIGN_IDEA.xlsx` — 1 baris = 1 BP LVL 3, kolom SUPPLIER, INPUTS,
PROCESS, OUTPUTS, CUSTOMERS, RISK, PERFORMANCE INDICATOR yang **tiap kolomnya bisa banyak**.

---

## 1. Masalah pada sketsa Excel

Sketsa flat table punya 2 sumber kerumitan yang harus dipisah:

1. **Redundansi hierarki.** Tiap baris LVL 3 mengulang teks `ITM / CORE / C4. Marine…
   / C4.1 …`. Kalau nama LVL 1 berubah, kamu harus edit semua baris. → Normalisasi jadi
   pohon.
2. **Kolom "bisa banyak" (multi-value).** SUPPLIER/INPUT/PROCESS/OUTPUT/CUSTOMER/RISK/KPI
   tidak muat di 1 sel. Kalau dipaksa 1 baris = 1 LVL 3, kolomnya jadi list koma yang tak
   bisa di-query. → Pindah ke tabel anak (one-to-many).

Keputusan desain (dikonfirmasi owner):
- **RISK & PERFORMANCE INDICATOR** = daftar berdiri sendiri milik LVL 3 (bukan per-baris flow).
- **SUPPLIER & CUSTOMER** = referensi **polimorfik**: bisa menunjuk *proses lain*, *unit
  struktur organisasi*, atau *aktor free-text*.
- **INPUT & OUTPUT** = free text.
- Baris SIPOC **berpasangan**: `supplier → input → process → output → customer`
  (konsisten dengan `project.sipoc` yang sudah dipakai app).

---

## 2. Model logis (relational) — 5 entitas

Ini bentuk normalisasi "benar" (kalau nanti pindah ke SQL, ini cetakannya).

### 2.1 `bp_node` — pohon hierarki (SEMUA level dalam 1 tabel)
| kolom | tipe | catatan |
|---|---|---|
| `id` | PK | |
| `entity` | text | "ITM" |
| `parent_id` | FK → bp_node.id | null untuk LVL 0 |
| `level` | int 0..3 | |
| `code` | text | "C4.1.1" |
| `title` | text | "Barge & Shipment Planning" |
| `sort_order` | int | urutan tampil |

> **Kenapa 1 tabel untuk semua level (self-referencing tree):** tambah LVL 4 nanti =
> **nol perubahan skema**; ambil satu subtree gampang; tidak ada teks LVL 0–2 yang
> diduplikasi di tiap LVL 3. Ini yang menghapus redundansi Excel.

### 2.2 `org_unit` — sumber dropdown struktur organisasi
| kolom | tipe | catatan |
|---|---|---|
| `id` | PK | |
| `name` | text | "Marine Ops Dept" |
| `parent_id` | FK → org_unit.id | opsional (struktur berjenjang) |

### 2.3 `sipoc_row` — baris SIPOC (anak dari LVL 3, berpasangan)
| kolom | tipe | catatan |
|---|---|---|
| `id` | PK | |
| `bp_node_id` | FK → bp_node.id | **harus level 3** |
| `seq` | int | urutan baris |
| `supplier_type` | enum `PROCESS`\|`ORG`\|`FREE` | referensi polimorfik |
| `supplier_ref_id` | FK (bp_node / org_unit) nullable | isi hanya jika PROCESS/ORG |
| `supplier_label` | text | teks tampil (selalu diisi = denormalisasi) |
| `input` | text | free text |
| `process` | text | aktivitas |
| `output` | text | free text |
| `customer_type` | enum `PROCESS`\|`ORG`\|`FREE` | sama seperti supplier |
| `customer_ref_id` | FK nullable | |
| `customer_label` | text | |

> **Referensi polimorfik (type + ref_id + label):** `label` selalu disimpan jadi
> nampilin SIPOC **tanpa join**; `ref_id` dipakai kalau perlu telusuri ke proses/unit
> aslinya. Kalau nama proses/unit berubah, cukup refresh `label` baris yang ref-nya cocok.

### 2.4 `bp_risk` — daftar risiko LVL 3
| kolom | tipe |
|---|---|
| `id` | PK |
| `bp_node_id` | FK → bp_node.id (level 3) |
| `seq` | int |
| `description` | text |

### 2.5 `bp_kpi` — daftar Performance Indicator LVL 3
| kolom | tipe |
|---|---|
| `id` | PK |
| `bp_node_id` | FK → bp_node.id (level 3) |
| `seq` | int |
| `indicator` | text |
| `target` | text (opsional) |

**Kenapa bukan 1 tabel generic (EAV) untuk semua kolom multi-value?** Karena SIPOC-row
butuh pairing (supplier↔input↔output↔customer dalam satu baris), sedangkan risk & KPI
tidak. Memaksa semua ke 1 tabel "type + value" akan **menghancurkan pairing** dan bikin
query ribet. 3 tabel anak (sipoc_row, bp_risk, bp_kpi) = sweet spot antara jumlah tabel
dan kejelasan.

### Diagram ringkas
```
org_unit ─┐ (ref)
          ├──< sipoc_row >── bp_node (LVL3) ──< bp_risk
bp_node ──┘ (ref)                │           └─< bp_kpi
  └─ self parent_id (LVL0→1→2→3)
```

---

## 3. Implementasi konkret di Firestore (yang paling MURAH & mudah maintain)

Firestore itu document store — jangan tiru 5 tabel relational mentah-mentah. Petakan jadi
**2 collection saja**:

### Collection `bp_nodes` — pohon + SIPOC di-embed
Karena list SIPOC/risk/KPI per LVL 3 **kecil** (paling belasan item) dan **selalu dibaca
bareng node-nya**, embed sebagai array di dokumen LVL 3 = **1 read dapat semua**, tanpa join,
realtime `onSnapshot` langsung jalan, dan biaya read minimal (Firestore ditagih per-dokumen).

```jsonc
// bp_nodes/{nodeId}
{
  "entity": "ITM",
  "parent": "<nodeId LVL2>",        // null untuk LVL0
  "level": 3,
  "code": "C4.1.1",
  "title": "Barge & Shipment Planning",
  "path": ["CORE", "C4. Marine & Logistic", "C4.1 …", "C4.1.1 …"], // breadcrumb, denormalized
  "sortOrder": 1,

  // --- hanya diisi kalau level == 3 ---
  "sipoc": [
    {
      "id": "r1", "seq": 1,
      "supplier": { "type": "PROCESS", "refId": "<nodeId>", "label": "C4.2.1 Barge Operation" },
      "input":  "Rencana muat harian",
      "process":"Susun jadwal barge",
      "output": "Draft schedule",
      "customer": { "type": "ORG", "refId": "<orgUnitId>", "label": "Marine Ops Dept" }
    }
    // supplier/customer.type === "FREE" → refId: null, label diisi teks bebas
  ],
  "risks": [ { "id": "k1", "seq": 1, "description": "Cuaca ekstrem menunda barge" } ],
  "kpis":  [ { "id": "p1", "seq": 1, "indicator": "% shipment on-time", "target": "≥ 95%" } ]
}
```

### Collection `org_units` — reference data dropdown
```jsonc
// org_units/{orgUnitId}
{ "name": "Marine Ops Dept", "parent": "<orgUnitId>" }
```

**Aturan embed vs subcollection:** embed selama dokumen < 1 MB (kasus kamu jauh di bawah).
Pindah `sipoc`/`risks`/`kpis` ke subcollection **hanya kalau** suatu list bisa tembus
ratusan item — tidak terjadi di sini.

**Dropdown Supplier/Customer** diisi dari:
- proses lain → query `bp_nodes` (mis. `where level == 3`),
- struktur organisasi → `org_units`,
- aktor free-text → user ketik langsung (`type: "FREE"`).
Ketiganya disimpan seragam sebagai `{ type, refId, label }`.

---

## 4. Kenapa desain ini "murah + mudah maintain"

- **2 collection**, bukan 7 tabel per-kolom → sedikit yang di-maintain.
- **Embed array** → 1 dokumen read per BP LVL 3, cocok target biaya ~$0 Firestore.
- **Tree 1 tabel** → tambah level/pindah cabang tanpa migrasi skema.
- **`label` denormalized** → render tanpa join; **`refId`** jaga ketertelusuran.
- **Selaras `project.sipoc` app sekarang** → perubahan kode minimal; tinggal tambah
  `risks`, `kpis`, dan bungkus supplier/customer jadi objek `{type,refId,label}`.

## 4b. Implementasi di app (sudah dibangun)

Menu baru **BP Architecture** (`src/menus/BpArchitecture.jsx` + `src/lib/bpTree.js`)
mewujudkan model ini di web:

- **Penyimpanan:** tiap node = 1 dokumen di collection `bp_documents` yang sudah ada,
  dengan `docType: 'BPNODE'` + payload `node:{ entity, parent, level, code, title,
  sortOrder, sipoc[], risks[], kpis[] }`. Sama persis pola KNOWLEDGE/SOP/FLOW → **tanpa
  collection baru, tanpa security-rule baru, tanpa deploy function**. Node difilter keluar
  dari Repository/Dashboard/Global Search/Ask AI.
- **UI:** dua panel — navigator pohon (kiri, badge L0–L3, tombol `+` untuk tambah anak,
  chip "n SIPOC" di daun) + editor node (kanan). Node LVL 3 memunculkan editor SIPOC
  (baris supplier→input→process→output→customer), Risk, dan Performance Indicator.
- **Supplier/Customer** memakai kontrol polimorfik `{type, refId, label}`: tipe **Proses**
  → dropdown node lain; **Organisasi** → label teks (di-wire ke `org_units` nanti);
  **Bebas** → free text.
- Ada tombol **"Buat struktur contoh"** untuk seed pohon (ITM holding + TCM) saat masih kosong.

### Multi-entity (LVL 0 = perusahaan)

- **LVL 0 = satu entity/korporasi** (ITM, TCM, BEK, IMM, …). Field `entity` + `code` di
  node LVL 0 = kode perusahaan; ada flag `isHolding` untuk menandai holding (ITM). Node LVL 0
  bisa ditambah lewat tombol **"+ Entity"**.
- **Anak-anaknya mewarisi `entity`** dari root LVL 0-nya (`entityCodeOf` menelusuri parent
  chain). Editor menampilkan chip entity, dan ada **tab filter per-entity** di atas pohon.
- **Numbering** ngikut skema ITM & bisa di-edit: LVL 1 pakai huruf kategori
  (Core→`C.1`, Enabler→`E.1`, Management→`M.1`; field `category`), LVL 2 `C1.1`, LVL 3
  `C.1.1.1`. Tombol **"saran"** mengisi kode berikutnya otomatis (`suggestChildCode`).
- **Koneksi antar-proses:** Supplier/Customer tipe `PROCESS` bisa menunjuk node mana pun
  **lintas entity** (opsi dropdown diprefix kode entity), ada tombol lompat ↗ ke node
  tujuan, dan tiap node punya bagian **"Dipakai oleh"** (inbound links via `inboundRefs`)
  yang meng-klik-kan balik ke proses yang mereferensikannya.

## 5. Kalau nanti butuh lebih
- **Pindah RISK/KPI jadi register lintas-BP** (dashboard risiko se-perusahaan) → angkat
  `risks`/`kpis` jadi collection sendiri dengan `bpNodeId` (persis tabel 2.4/2.5).
- **Pairing risk per-baris flow** → tambah `riskRefIds: []` di tiap `sipoc` row.
- **Versioning per BP** → sudah ada di STONES (version history) — node LVL 3 bisa ikut pola doc yang sama.
