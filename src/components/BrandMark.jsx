// LEAP-STONES brand mark — twin "leaf swoosh" from the ITMG/Banpu design
// guide, drawn white so it sits on the gradient tile (.ld-mark / .lg-mark /
// .stones-mark). Pure SVG, scales with the tile via width/height 100%.
export default function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="62%" height="62%" aria-hidden="true">
      <path d="M23 5c-8.5 3-12.2 9.8-10.4 18.6C17.6 19 21.8 12.4 23 5z" fill="#fff" />
      <path d="M14.2 13.5c-5 2.4-6.8 6.4-6 11.4 3.4-2.7 5.5-6.7 6-11.4z" fill="#fff" opacity=".55" />
    </svg>
  )
}
