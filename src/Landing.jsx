// LEAP-STONES — public landing page (pre-auth). Story: building & managing
// Business Processes is a tangled mess of scattered files → LEAP-STONES
// straightens it into one governed platform. Visual identity follows the
// ITMG/Banpu design guide: Banpu Blue #00AEEF, Purple Blue #484792, Green
// #00B49C, airy white, translucent "leaf swoosh" gradients.
import { useEffect } from 'react'
import BrandMark from './components/BrandMark.jsx'

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

/* ---------------- Hero visual: live process canvas + leaf swooshes ------- */
// A glass "product canvas" showing the mining value chain as a governed
// process map, with floating proof-cards (approval, RASCI, Ask AI) — digital
// transformation, not heavy industrial artwork.
const CHAIN = [
  { x: 14, y: 44, w: 168, label: 'Mine Planning' },
  { x: 226, y: 44, w: 158, label: 'Coal Getting' },
  { x: 428, y: 44, w: 198, label: 'Hauling & Dispatch', hot: true },
  { x: 140, y: 190, w: 168, label: 'Coal Processing' },
  { x: 380, y: 190, w: 178, label: 'Barging & Shipping' },
]

function HeroVisual() {
  return (
    <div className="ld-stage">
      {/* leaf-swoosh backdrop (design-guide motif) */}
      <svg className="ld-swoosh" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="swA" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#00AEEF" />
            <stop offset="1" stopColor="#484792" />
          </linearGradient>
          <linearGradient id="swB" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#00B49C" />
            <stop offset="1" stopColor="#D2D4D3" />
          </linearGradient>
        </defs>
        <path className="ld-sw ld-sw-a" d="M0 560 C 300 545 620 430 820 210 C 900 120 960 50 1000 0 L1000 560 Z" fill="url(#swA)" />
        <path className="ld-sw ld-sw-b" d="M0 560 C 260 556 560 500 780 340 C 880 268 950 205 1000 150 L1000 560 Z" fill="url(#swB)" />
      </svg>

      {/* product canvas */}
      <div className="ld-canvas">
        <div className="ld-canvas-hd">
          <span className="ld-dot" /><span className="ld-dot" /><span className="ld-dot" />
          <span className="ld-canvas-title">LEAP-STONES · Process Architecture</span>
          <span className="ld-canvas-chip">Published · Rev 03</span>
        </div>
        <svg className="ld-flow" viewBox="0 0 640 290">
          <defs>
            <linearGradient id="ldHot" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00AEEF" />
              <stop offset="1" stopColor="#484792" />
            </linearGradient>
          </defs>
          {/* connectors */}
          <g className="ld-flow-lines" fill="none" stroke="#b9dff2" strokeWidth="2.5">
            <path d="M182 70 H226" />
            <path d="M384 70 H428" />
            <path d="M532 96 V143 H224 V190" />
            <path d="M308 216 H380" />
          </g>
          <g className="ld-flow-arrows" fill="#b9dff2">
            <path d="M220 65 l8 5 -8 5 z" />
            <path d="M422 65 l8 5 -8 5 z" />
            <path d="M219 184 l5 8 5 -8 z" />
            <path d="M374 211 l8 5 -8 5 z" />
          </g>
          {/* nodes */}
          {CHAIN.map((n, i) => (
            <g key={n.label} className="ld-flow-node" style={{ animationDelay: 0.5 + i * 0.28 + 's' }}>
              <rect x={n.x} y={n.y} width={n.w} height="52" rx="12" fill={n.hot ? 'url(#ldHot)' : '#ffffff'} stroke={n.hot ? 'none' : '#cfe7f5'} strokeWidth="1.5" />
              <text x={n.x + n.w / 2} y={n.y + 31} textAnchor="middle" fontSize="13.5" fontWeight="650" fontFamily="Inter, sans-serif" fill={n.hot ? '#fff' : '#232127'}>
                {n.label}
              </text>
              <text x={n.x + 14} y={n.y - 7} fontSize="9.5" fontWeight="800" letterSpacing="1.5" fontFamily="Inter, sans-serif" fill="#9fb3c2">
                {'L1.' + (i + 1)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* floating proof-cards */}
      <div className="ld-fcard ld-fcard-a ld-floaty">
        <span className="ld-fcheck">✓</span>
        <span>
          <b>Approved</b>
          <small>BP-0042 · Hauling &amp; Dispatch · Rev 03</small>
        </span>
      </div>
      <div className="ld-fcard ld-fcard-b ld-floaty">
        <span className="ld-rasci">
          {['R', 'A', 'S', 'C', 'I'].map((c) => <i key={c}>{c}</i>)}
        </span>
        <small>RASCI generated automatically</small>
      </div>
      <div className="ld-fcard ld-fcard-c ld-floaty">
        <small className="ld-fq">“Who is accountable for coal hauling?”</small>
        <span className="ld-fa"><b>Ask AI</b> — Hauling Superintendent. See BP-0042 §3.2</span>
      </div>
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
  { t: 'Which SOP is current?', style: { left: '38%', top: '6%' }, d: 0 },
  { t: 'Who owns this process?', style: { left: '48%', top: '58%' }, d: 1 },
  { t: 'Is this still valid?', style: { left: '43%', top: '32%' }, d: 2 },
]

function ChaosThread() {
  return (
    <div className="ld-thread rv">
      <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ldClean" gradientUnits="userSpaceOnUse" x1="880" y1="160" x2="1190" y2="160">
            <stop offset="0" stopColor="#00AEEF" />
            <stop offset="1" stopColor="#00B49C" />
          </linearGradient>
        </defs>
        {/* tangled part */}
        <path
          className="ld-mess"
          d="M-20 190 C 60 60, 150 50, 175 140 C 195 215, 95 235, 120 150 C 142 82, 245 70, 280 145 C 308 205, 215 225, 245 150 C 272 88, 380 90, 410 160 C 435 220, 350 235, 385 160 C 415 100, 520 95, 555 160 C 580 208, 505 222, 535 160 C 560 108, 650 118, 700 160"
          fill="none"
          stroke="#e2e7ec"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* LEAP-STONES node */}
        <g className="ld-node">
          <rect x="702" y="128" width="176" height="64" rx="18" fill="#484792" />
          <text x="790" y="167" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="800" letterSpacing="2" fontFamily="'Plus Jakarta Sans', Inter, sans-serif">LEAP-STONES</text>
        </g>
        {/* clean part */}
        <path className="ld-clean" d="M878 160 H 1190" fill="none" stroke="url(#ldClean)" strokeWidth="10" strokeLinecap="round" />
        <g className="ld-clean-nodes" fill="#fff" strokeWidth="5">
          <circle cx="945" cy="160" r="15" stroke="#00AEEF" />
          <circle cx="1040" cy="160" r="15" stroke="#00b2c9" />
          <circle cx="1135" cy="160" r="15" stroke="#00B49C" />
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
        <span>Before: scattered files &amp; unanswered questions</span>
        <span className="ld-thread-caption-after">After: one clear process flow</span>
      </div>
    </div>
  )
}

/* ---------------- Feature + step data ---------------- */
const FEATURES = [
  {
    t: 'Process Architecture',
    s: 'An explorable L0–L3 process hierarchy — from the value chain down to detailed activities, all connected.',
    d: 'M12 3v6M12 15v6M5 9h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM8 3h8M8 21h8',
  },
  {
    t: 'AI Document Import',
    s: 'Upload a legacy SOP PDF — AI reads it, extracts steps, actors, and RASCI, and turns it into a structured document.',
    d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  },
  {
    t: 'SIPOC → Auto Process Map',
    s: 'Fill in a single SIPOC table and get a business process map plus a complete RASCI matrix, with the company title block.',
    d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1',
  },
  {
    t: 'Auto Flow Process',
    s: 'Swimlane SOP flowcharts drawn automatically from a list of steps — tidy, consistent, ready to export as PNG.',
    d: 'M4 5h6v4H4zM14 5h6v4h-6zM9 15h6v4H9zM7 9v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9',
  },
  {
    t: 'Governance & Approval',
    s: 'Draft → Review → Approved → Published. Versions, an audit trail, and comments attached to every document.',
    d: 'M9 11l3 3l8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  },
  {
    t: 'Ask AI + Knowledge Base',
    s: 'Ask anything about your company\u2019s processes — AI answers from every BP, SOP, and reference document you have.',
    d: 'M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2zM9 10h.01M13 10h.01M17 10h.01',
  },
]

const STEPS = [
  { n: '01', t: 'Collect', s: 'Import legacy SOP PDFs or start from a SIPOC table. No need to redraw anything from scratch.' },
  { n: '02', t: 'Structure', s: 'AI and the layout engine compose process maps, flowcharts, and RASCI automatically and consistently.' },
  { n: '03', t: 'Govern', s: 'Publish through an approval workflow. Everyone finds the official version through a single search.' },
]

/* ---------------- Page ---------------- */
export default function Landing({ onEnter }) {
  useReveal()
  return (
    <div className="ld">
      <header className="ld-top">
        <div className="ld-top-inner">
          <div className="ld-brandrow">
            <div className="ld-mark"><BrandMark /></div>
            <div>
              <div className="ld-logo">LEAP-STONES</div>
              <div className="ld-logo-sub">Business Process Suite</div>
            </div>
          </div>
          <nav className="ld-nav">
            <a href="#masalah">The problem</a>
            <a href="#fitur">Platform</a>
            <a href="#cara">How it works</a>
          </nav>
          <button className="ld-btn ld-btn-dark" onClick={onEnter}>Sign in</button>
        </div>
      </header>

      {/* HERO */}
      <section className="ld-hero">
        <div className="ld-hero-badge rv in">Leap forward — digital transformation for mining operations</div>
        <h1 className="ld-h1">
          <span className="ld-h1-fade">A new era of mining operations,</span>
          <br />
          with <span className="ld-h1-grad">LEAP-STONES</span>
        </h1>
        <p className="ld-hero-sub">
          Develop, govern, and discover Business Processes, SOPs, and company
          documents — in one AI-powered platform.
        </p>
        <div className="ld-hero-cta">
          <button className="ld-btn ld-btn-dark ld-btn-lg" onClick={onEnter}>Get started</button>
          <a className="ld-btn ld-btn-ghost ld-btn-lg" href="#masalah">See how</a>
        </div>
        <HeroVisual />
      </section>

      {/* CHAOS */}
      <section className="ld-sec" id="masalah">
        <h2 className="ld-h2 rv">
          <span className="ld-h1-fade">Most process knowledge is</span> lost in documents
          <br />
          <span className="ld-h1-fade">— and operations are</span> lost without it
        </h2>
        <p className="ld-sec-sub rv">
          Processes get drawn in Visio, stored in Excel, sent over email, and lost in
          personal folders. LEAP-STONES straightens them into a single source of truth.
        </p>
        <ChaosThread />
        <div className="ld-pains">
          <div className="ld-pain rv">
            <h3>Constant app switching</h3>
            <p>The same process gets redrawn in Visio, Excel, and PowerPoint. Digital fatigue reduces team performance by up to <b>32%</b>.</p>
          </div>
          <div className="ld-pain rv" style={{ transitionDelay: '.12s' }}>
            <h3>Undocumented knowledge</h3>
            <p><b>Most</b> process knowledge lives only in people’s heads. When they move on, the process leaves with them.</p>
          </div>
          <div className="ld-pain rv" style={{ transitionDelay: '.24s' }}>
            <h3>Hours lost searching</h3>
            <p>On average, <b>2.5 hours a day</b> are wasted finding documents, checking versions, and stitching context back together.</p>
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section className="ld-sec ld-sec-alt" id="fitur">
        <h2 className="ld-h2 rv">One platform for <span className="ld-h1-grad">every process</span></h2>
        <p className="ld-sec-sub rv">
          From enterprise-level process architecture down to work instructions in the field — connected, governed, and searchable.
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
        <h2 className="ld-h2 rv">From dusty PDFs to living processes, <span className="ld-h1-grad">in three steps</span></h2>
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
        <h2>Bring your mining processes into one place</h2>
        <p>Sign in with your company Google account and get started in seconds.</p>
        <button className="ld-btn ld-btn-light ld-btn-lg" onClick={onEnter}>Enter LEAP-STONES</button>
      </section>

      <footer className="ld-foot">
        <div className="ld-brandrow">
          <div className="ld-mark ld-mark-sm"><BrandMark /></div>
          <span className="ld-foot-name">LEAP-STONES · Business Process Suite</span>
        </div>
        <span>© {new Date().getFullYear()} — built for modern mining operations</span>
      </footer>
    </div>
  )
}
