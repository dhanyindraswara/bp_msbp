// STONES — public landing page (pre-auth). Tells the story: building &
// managing Business Processes is a tangled mess of scattered files → STONES
// straightens it into one governed platform. Hero mascot = a mining haul
// truck (Hitachi HD style) instead of ClickUp's mask.
import { useEffect, useRef } from 'react'

// Reveal-on-scroll: elements with .rv get .in when they enter the viewport.
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.rv'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.18 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

const FIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

/* ---------------- Hero: animated haul truck ---------------- */
function TruckHero() {
  return (
    <div className="ld-stage">
      <div className="ld-stage-glow" />
      <div className="ld-ghost ld-ghost-a">SATU<br />PLATFORM</div>
      <div className="ld-ghost ld-ghost-b">SEMUA<br />PROSES</div>

      {/* callouts, ClickUp-style monospace labels */}
      <div className="ld-callout ld-callout-l" style={{ top: '18%' }}>
        <span>GOVERNANCE 24/7</span>
        <i />
      </div>
      <div className="ld-callout ld-callout-r" style={{ top: '30%' }}>
        <i />
        <span>SINGLE SOURCE OF TRUTH</span>
      </div>
      <div className="ld-callout ld-callout-l" style={{ top: '62%' }}>
        <span>AI-POWERED IMPORT</span>
        <i />
      </div>

      <svg className="ld-truck" viewBox="0 0 760 440" role="img" aria-label="Haul truck STONES">
        <defs>
          <linearGradient id="ldBed" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff7a1a" />
            <stop offset="0.45" stopColor="#f0439c" />
            <stop offset="1" stopColor="#2f8bff" />
          </linearGradient>
          <linearGradient id="ldCab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#31435a" />
            <stop offset="1" stopColor="#1c2733" />
          </linearGradient>
        </defs>

        {/* dust puffs behind the rear wheel */}
        <g className="ld-dust">
          <circle cx="70" cy="380" r="16" />
          <circle cx="38" cy="360" r="11" />
          <circle cx="20" cy="385" r="8" />
        </g>

        <g className="ld-truck-body">
          {/* chassis */}
          <rect x="105" y="272" width="545" height="42" rx="10" fill="#1c2733" />
          {/* radiator / front box */}
          <rect x="596" y="176" width="66" height="122" rx="10" fill="url(#ldCab)" />
          <rect x="606" y="206" width="46" height="8" rx="4" fill="#4d6076" />
          <rect x="606" y="222" width="46" height="8" rx="4" fill="#4d6076" />
          <rect x="606" y="238" width="46" height="8" rx="4" fill="#4d6076" />
          {/* headlight */}
          <rect x="648" y="186" width="12" height="14" rx="3" fill="#ffd66e" className="ld-lamp" />
          {/* deck + rails */}
          <rect x="380" y="172" width="286" height="10" rx="5" fill="#2b3a4b" />
          <path d="M392 172 v-22 M430 172 v-22 M468 172 v-22 M392 152 h76" stroke="#3b4f66" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* cab on the deck, under the canopy */}
          <rect x="478" y="112" width="92" height="62" rx="9" fill="url(#ldCab)" />
          <path d="M488 122 h50 v28 h-50 z" fill="#bfe0ff" opacity="0.92" />
          <rect x="546" y="122" width="14" height="28" rx="3" fill="#8fb7dd" opacity="0.8" />
          {/* exhaust stack + smoke */}
          <rect x="452" y="118" width="10" height="56" rx="4" fill="#2b3a4b" />
          <g className="ld-smoke">
            <circle cx="457" cy="104" r="7" />
            <circle cx="463" cy="86" r="9" />
            <circle cx="455" cy="66" r="11" />
          </g>
          {/* dump bed + canopy over the cab (gradient, the "mask" of STONES) */}
          <path
            d="M38 128 L330 98 L343 118 L662 88 L666 112 L360 140 L352 252 L148 252 L66 196 Z"
            fill="url(#ldBed)"
          />
          {/* bed ribs */}
          <path d="M150 132 L165 246 M226 124 L238 248 M300 117 L310 250" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="7" strokeLinecap="round" />
          <text x="212" y="212" fill="#ffffff" fontSize="26" fontWeight="800" letterSpacing="4" opacity="0.9" fontFamily="Inter, sans-serif">STONES</text>
          <text x="588" y="168" fill="#93a7bc" fontSize="13" fontWeight="700" letterSpacing="1" fontFamily="Inter, sans-serif">HD-785</text>
          {/* ladder */}
          <path d="M652 300 L614 182 M636 300 L600 190 M612 262 h30 M602 232 h30" stroke="#3b4f66" strokeWidth="6" fill="none" strokeLinecap="round" />

          {/* wheels */}
          <g className="ld-wheel">
            <circle cx="186" cy="330" r="72" fill="#161d26" />
            <circle cx="186" cy="330" r="34" fill="#3b4f66" />
            <circle cx="186" cy="330" r="14" fill="#0f141a" />
            <path d="M186 302 v-22 M186 358 v22 M158 330 h-22 M214 330 h22 M166 310 l-15 -15 M206 310 l15 -15 M166 350 l-15 15 M206 350 l15 15" stroke="#0f141a" strokeWidth="8" strokeLinecap="round" />
          </g>
          <g className="ld-wheel">
            <circle cx="548" cy="336" r="66" fill="#161d26" />
            <circle cx="548" cy="336" r="31" fill="#3b4f66" />
            <circle cx="548" cy="336" r="13" fill="#0f141a" />
            <path d="M548 311 v-20 M548 361 v20 M523 336 h-20 M573 336 h20 M530 318 l-14 -14 M566 318 l14 -14 M530 354 l-14 14 M566 354 l14 14" stroke="#0f141a" strokeWidth="7" strokeLinecap="round" />
          </g>
        </g>

        {/* moving ground */}
        <line className="ld-ground" x1="0" y1="408" x2="760" y2="408" stroke="#d8d3cb" strokeWidth="5" strokeLinecap="round" strokeDasharray="26 34" />
      </svg>
    </div>
  )
}

/* ---------------- Chaos → clean thread ---------------- */
const CHIPS = [
  { t: 'XLS', c: '#1d7044', style: { left: '4%', top: '12%' }, d: 0 },
  { t: 'DOC', c: '#2b5797', style: { left: '13%', top: '58%' }, d: 1 },
  { t: 'PDF', c: '#c0392b', style: { left: '21%', top: '8%' }, d: 2 },
  { t: 'VSD', c: '#7a4dbf', style: { left: '29%', top: '52%' }, d: 3 },
  { t: 'PPT', c: '#c96a12', style: { left: '9%', top: '34%' }, d: 4 },
  { t: '@', c: '#5a626e', style: { left: '25%', top: '30%' }, d: 5 },
]
const BUBBLES = [
  { t: 'SOP terbaru yang mana?', style: { left: '38%', top: '6%' }, d: 0 },
  { t: 'Siapa PIC proses ini?', style: { left: '48%', top: '58%' }, d: 1 },
  { t: 'Ini masih berlaku?', style: { left: '43%', top: '32%' }, d: 2 },
]

function ChaosThread() {
  return (
    <div className="ld-thread rv">
      <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ldClean" gradientUnits="userSpaceOnUse" x1="862" y1="160" x2="1190" y2="160">
            <stop offset="0" stopColor="#2f6fb0" />
            <stop offset="1" stopColor="#2f8bff" />
          </linearGradient>
        </defs>
        {/* tangled part */}
        <path
          className="ld-mess"
          d="M-20 190 C 60 60, 150 50, 175 140 C 195 215, 95 235, 120 150 C 142 82, 245 70, 280 145 C 308 205, 215 225, 245 150 C 272 88, 380 90, 410 160 C 435 220, 350 235, 385 160 C 415 100, 520 95, 555 160 C 580 208, 505 222, 535 160 C 560 108, 650 118, 700 160"
          fill="none"
          stroke="#e6e2db"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* STONES node */}
        <g className="ld-node">
          <rect x="712" y="128" width="150" height="64" rx="18" fill="#12324e" />
          <text x="787" y="168" textAnchor="middle" fill="#fff" fontSize="21" fontWeight="800" letterSpacing="3" fontFamily="Inter, sans-serif">STONES</text>
        </g>
        {/* clean part */}
        <path className="ld-clean" d="M862 160 H 1190" fill="none" stroke="url(#ldClean)" strokeWidth="10" strokeLinecap="round" />
        <g className="ld-clean-nodes" fill="#fff" stroke="#2f6fb0" strokeWidth="5">
          <circle cx="930" cy="160" r="15" />
          <circle cx="1030" cy="160" r="15" />
          <circle cx="1130" cy="160" r="15" />
        </g>
      </svg>
      {CHIPS.map((f) => (
        <span key={f.t} className="ld-chipfile ld-floaty" style={{ ...f.style, background: f.c, animationDelay: f.d * 0.55 + 's' }}>
          {f.t}
        </span>
      ))}
      {BUBBLES.map((b) => (
        <span key={b.t} className="ld-bubble ld-floaty" style={{ ...b.style, animationDelay: (b.d * 0.7 + 0.3) + 's' }}>
          {b.t}
        </span>
      ))}
      <div className="ld-thread-caption">
        <span>Sebelum: file tercecer &amp; pertanyaan tanpa jawaban</span>
        <span className="ld-thread-caption-after">Sesudah: satu alur proses yang jelas</span>
      </div>
    </div>
  )
}

/* ---------------- Feature + step data ---------------- */
const FEATURES = [
  {
    t: 'Process Architecture',
    s: 'Peta hierarki proses L0–L3 yang bisa dijelajahi — dari value chain sampai aktivitas detail, semua terhubung.',
    d: 'M12 3v6M12 15v6M5 9h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM8 3h8M8 21h8',
  },
  {
    t: 'AI Document Import',
    s: 'Upload PDF SOP lama — AI membaca, mengekstrak langkah, aktor, dan RASCI, lalu menyusunnya jadi dokumen terstruktur.',
    d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  },
  {
    t: 'SIPOC → Peta BP Otomatis',
    s: 'Isi satu tabel SIPOC, dapatkan business process map + matriks RASCI lengkap dengan title block standar perusahaan.',
    d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1',
  },
  {
    t: 'Auto Flow Process',
    s: 'Flowchart swimlane SOP tergambar otomatis dari daftar langkah — rapi, konsisten, siap ekspor PNG.',
    d: 'M4 5h6v4H4zM14 5h6v4h-6zM9 15h6v4H9zM7 9v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9',
  },
  {
    t: 'Governance & Approval',
    s: 'Draft → Review → Approved → Published. Versi, audit trail, dan komentar menempel di setiap dokumen.',
    d: 'M9 11l3 3l8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  },
  {
    t: 'Ask AI + Knowledge Base',
    s: 'Tanya apa saja tentang proses perusahaan — AI menjawab dari seluruh BP, SOP, dan dokumen referensi Anda.',
    d: 'M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2zM9 10h.01M13 10h.01M17 10h.01',
  },
]

const STEPS = [
  { n: '01', t: 'Kumpulkan', s: 'Impor PDF SOP lama atau mulai dari tabel SIPOC. Tidak perlu menggambar ulang dari nol.' },
  { n: '02', t: 'Rapikan', s: 'AI dan layout engine menyusun peta proses, flowchart, dan RASCI secara otomatis dan konsisten.' },
  { n: '03', t: 'Kelola', s: 'Publikasikan lewat approval workflow. Semua orang menemukan versi resmi lewat satu pencarian.' },
]

/* ---------------- Page ---------------- */
export default function Landing({ onEnter }) {
  useReveal()
  const rootRef = useRef(null)
  return (
    <div className="ld" ref={rootRef}>
      <header className="ld-top">
        <div className="ld-top-inner">
          <div className="ld-brandrow">
            <div className="ld-mark">S</div>
            <div>
              <div className="ld-logo">STONES</div>
              <div className="ld-logo-sub">Business Process Suite</div>
            </div>
          </div>
          <nav className="ld-nav">
            <a href="#masalah">Masalah</a>
            <a href="#fitur">Platform</a>
            <a href="#cara">Cara kerja</a>
          </nav>
          <button className="ld-btn ld-btn-dark" onClick={onEnter}>Masuk</button>
        </div>
      </header>

      {/* HERO */}
      <section className="ld-hero">
        <div className="ld-hero-badge rv in">Era baru pengelolaan proses pertambangan</div>
        <h1 className="ld-h1">
          <span className="ld-h1-fade">Era baru operasional tambang,</span>
          <br />
          dengan <span className="ld-h1-grad">STONES</span><sup className="ld-tm">™</sup>
        </h1>
        <p className="ld-hero-sub">
          Kembangkan, kelola, dan temukan Business Process, SOP, dan dokumen perusahaan —
          dalam satu platform yang digerakkan AI.
        </p>
        <div className="ld-hero-cta">
          <button className="ld-btn ld-btn-dark ld-btn-lg" onClick={onEnter}>Mulai sekarang</button>
          <a className="ld-btn ld-btn-ghost ld-btn-lg" href="#masalah">Pelajari dulu</a>
        </div>
        <TruckHero />
      </section>

      {/* CHAOS */}
      <section className="ld-sec" id="masalah">
        <h2 className="ld-h2 rv">
          <span className="ld-h1-fade">Sebagian besar pengetahuan proses</span> hilang di dokumen
          <br />
          <span className="ld-h1-fade">— dan operasi</span> tersesat tanpanya
        </h2>
        <p className="ld-sec-sub rv">
          Proses digambar di Visio, disimpan di Excel, dikirim lewat email, dan hilang di folder pribadi.
          STONES meluruskannya jadi satu sumber kebenaran.
        </p>
        <ChaosThread />
        <div className="ld-pains">
          <div className="ld-pain rv">
            <h3>Berpindah-pindah aplikasi</h3>
            <p>Proses yang sama digambar ulang di Visio, Excel, dan PowerPoint. Kelelahan digital menurunkan performa tim hingga <b>32%</b>.</p>
          </div>
          <div className="ld-pain rv" style={{ transitionDelay: '.12s' }}>
            <h3>Pengetahuan tak terdokumentasi</h3>
            <p><b>Sebagian besar</b> pengetahuan proses hanya ada di kepala orang. Saat orangnya pindah, prosesnya ikut pergi.</p>
          </div>
          <div className="ld-pain rv" style={{ transitionDelay: '.24s' }}>
            <h3>Jam terbuang mencari</h3>
            <p>Rata-rata <b>2,5 jam sehari</b> habis untuk mencari dokumen, memastikan versi, dan menyambung-nyambungkan konteks.</p>
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section className="ld-sec ld-sec-alt" id="fitur">
        <h2 className="ld-h2 rv">Satu platform untuk <span className="ld-h1-grad">seluruh proses</span></h2>
        <p className="ld-sec-sub rv">
          Dari arsitektur proses level perusahaan sampai langkah kerja di lapangan — semuanya terhubung, tergovernansi, dan bisa dicari.
        </p>
        <div className="ld-grid">
          {FEATURES.map((f, i) => (
            <div className="ld-card rv" key={f.t} style={{ transitionDelay: (i % 3) * 0.1 + 's' }}>
              <div className="ld-card-ic"><FIcon d={f.d} /></div>
              <h3>{f.t}</h3>
              <p>{f.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="ld-sec" id="cara">
        <h2 className="ld-h2 rv">Dari PDF berdebu ke proses hidup, <span className="ld-h1-grad">tiga langkah</span></h2>
        <div className="ld-steps">
          {STEPS.map((s, i) => (
            <div className="ld-step rv" key={s.n} style={{ transitionDelay: i * 0.12 + 's' }}>
              <div className="ld-step-n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ld-cta rv">
        <div className="ld-cta-glow" />
        <h2>Bawa proses tambang Anda ke satu tempat</h2>
        <p>Masuk dengan akun Google perusahaan dan mulai dalam hitungan detik.</p>
        <button className="ld-btn ld-btn-light ld-btn-lg" onClick={onEnter}>Masuk ke STONES</button>
      </section>

      <footer className="ld-foot">
        <div className="ld-brandrow">
          <div className="ld-mark ld-mark-sm">S</div>
          <span className="ld-foot-name">STONES · Business Process Suite</span>
        </div>
        <span>© {new Date().getFullYear()} — dibangun untuk operasi pertambangan modern</span>
      </footer>
    </div>
  )
}
