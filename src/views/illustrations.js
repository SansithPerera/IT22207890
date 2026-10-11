'use strict';
// Original betel leaf (Piper betle) illustrations, drawn as inline SVG so
// they stay sharp at any size and pick up the page's light/dark colours.
// All leaves share one drawing defined once per page in sprite().
const { raw, escapeHtml } = require('../lib/html');

// Leaf outline in its own coordinate space: base (petiole attachment) at 0,0,
// tip at 0,-284. Heart-shaped base, long drip tip, like a real betel leaf.
const LEAF = 'M0 0C10 22 54 34 90 14C124-4 132-62 120-108C108-156 74-192 42-222C22-240 10-258 0-284C-10-258-22-240-42-222C-74-192-108-156-120-108C-132-62-124-4-90 14C-54 34-10 22 0 0Z';
const HALF_VEINS = '<path d="M0-8C28-46 56-116 46-192C41-220 28-242 12-258" stroke-width="2.4"/><path d="M0-5C50-22 94-66 96-126C96-156 84-182 66-202" stroke-width="2.1"/><path d="M0-2C40 8 80-2 108-40" stroke-width="1.8"/><path d="M1-176C13-188 20-202 24-218M1-224C7-231 10-240 11-248" stroke-width="1.3"/><path d="M32-70C50-80 66-90 80-106M40-128C56-138 70-150 80-164M44-176C54-184 60-192 64-202M70-26C82-36 94-48 102-66M14-40C22-48 28-56 32-66M18-100C26-110 34-120 40-132" stroke-width=".9" opacity=".75"/>';
const VEINS = `<path d="M0-2C1-90 1-180 0-282" stroke-width="3.4"/><g>${HALF_VEINS}</g><g transform="scale(-1 1)">${HALF_VEINS}</g>`;

function leafVariant(id, { fill, veins, veinOpacity, outline, petiole, extra = '' }) {
  return `<g id="${id}">
    <path d="M0 0C2 20 8 40 20 62" stroke="${petiole}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
    <path d="${LEAF}" fill="url(#${fill})"/>
    <g clip-path="url(#bl-leaf-clip)">
      <rect x="-140" y="-290" width="280" height="330" fill="url(#bl-g-shade)"/>
      ${extra}
      <g stroke="${veins}" opacity="${veinOpacity}" fill="none" stroke-linecap="round">${VEINS}</g>
      <path d="${LEAF}" fill="url(#bl-g-gloss)"/>
    </g>
    <path d="${LEAF}" fill="none" stroke="${outline}" stroke-width="1.6"/>
  </g>`;
}

const SPOTS = [[38, -84, 11], [-52, -140, 8], [62, -168, 7], [-34, -44, 13], [12, -204, 6], [-78, -86, 6], [86, -60, 9]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="url(#bl-g-halo)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#bl-g-spot)"/>`).join('');

// Hidden <svg> with the shared drawings; include once near the top of <body>.
function sprite() {
  return raw(`<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="bl-g-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b9a3f"/><stop offset=".5" stop-color="#256f39"/><stop offset="1" stop-color="#0f4527"/></linearGradient>
    <linearGradient id="bl-g-young" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6d86a"/><stop offset=".5" stop-color="#78b043"/><stop offset="1" stop-color="#3f7d2c"/></linearGradient>
    <linearGradient id="bl-g-dry" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ead08a"/><stop offset=".55" stop-color="#c9943d"/><stop offset="1" stop-color="#8a5a24"/></linearGradient>
    <radialGradient id="bl-g-gloss" cx=".66" cy=".3" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".55" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="bl-g-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <radialGradient id="bl-g-spot"><stop offset="0" stop-color="#3d1f0a"/><stop offset=".6" stop-color="#6e3714"/><stop offset="1" stop-color="#9a6326"/></radialGradient>
    <radialGradient id="bl-g-halo"><stop offset=".45" stop-color="#e3c65a" stop-opacity=".85"/><stop offset="1" stop-color="#e3c65a" stop-opacity="0"/></radialGradient>
    <linearGradient id="bl-g-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6ec6e" stop-opacity="0"/><stop offset=".85" stop-color="#c6ec6e" stop-opacity=".32"/><stop offset="1" stop-color="#c6ec6e" stop-opacity=".9"/></linearGradient>
    <clipPath id="bl-leaf-clip"><path d="${LEAF}"/></clipPath>
    ${leafVariant('bl-leaf', { fill: 'bl-g-leaf', veins: '#bfe28a', veinOpacity: '.62', outline: '#0b3a1f', petiole: '#2f5c25' })}
    ${leafVariant('bl-leaf-young', { fill: 'bl-g-young', veins: '#f1f9cf', veinOpacity: '.6', outline: '#3b6b22', petiole: '#5c8a2e' })}
    ${leafVariant('bl-leaf-dry', { fill: 'bl-g-dry', veins: '#f6e4ad', veinOpacity: '.55', outline: '#6b4419', petiole: '#7a5a2a' })}
    ${leafVariant('bl-leaf-spot', { fill: 'bl-g-leaf', veins: '#bfe28a', veinOpacity: '.55', outline: '#0b3a1f', petiole: '#2f5c25', extra: SPOTS })}
  </defs></svg>`);
}

// <use> a leaf with its base at (x, y), rotated a degrees and scaled s.
const leaf = (variant, x, y, a, s, cls = '') => `<use href="#bl-${variant}" transform="translate(${x} ${y}) rotate(${a}) scale(${s})"${cls ? ` class="${cls}"` : ''}/>`;

// Corner brackets, like a camera focus frame.
function brackets(x1, y1, x2, y2, len, cls) {
  return `<path class="${cls}" d="M${x1} ${y1 + len}V${y1}H${x1 + len}M${x2 - len} ${y1}H${x2}V${y1 + len}M${x2} ${y2 - len}V${y2}H${x2 - len}M${x1 + len} ${y2}H${x1}V${y2 - len}" fill="none" stroke-width="3" stroke-linecap="square"/>`;
}

// The home page hero: a betel sprig under a detection frame, with a ruler
// like the scale bar on a herbarium sheet.
function heroArt({ label = 'betel_leaf · A · 0.926' } = {}) {
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const x = 40 + i * 20;
    const major = i % 2 === 0;
    return `<path d="M${x} 532V${major ? 520 : 525}"/>${major ? `<text x="${x}" y="550" text-anchor="middle">${i / 2}</text>` : ''}`;
  }).join('');
  return raw(`<svg class="hero-art" viewBox="0 0 600 560" role="img" aria-label="Illustration: a betel leaf sprig inside a detection frame, as the mobile app sees it">
    <g class="hero-leaves">
      ${leaf('leaf-young', 250, 428, -62, 0.84)}
      ${leaf('leaf', 350, 420, 50, 0.86)}
      <path d="M318 562C322 540 328 520 331 505" stroke="#2f5c25" stroke-width="8" fill="none" stroke-linecap="round"/>
      ${leaf('leaf', 300, 430, -5, 1.25)}
      <g class="dew"><ellipse cx="262" cy="258" rx="7" ry="5"/><ellipse cx="352" cy="198" rx="5" ry="3.6"/><ellipse cx="318" cy="352" rx="4" ry="3"/></g>
    </g>
    <g class="hero-scan" aria-hidden="true"><rect class="scan-bar" x="122" y="40" width="356" height="64" fill="url(#bl-g-scan)"/></g>
    ${brackets(118, 58, 482, 488, 34, 'frame-line')}
    <g class="frame-tag"><rect x="118" y="24" width="${label.length * 8.1 + 22}" height="26" rx="4"/><text x="129" y="42">${escapeHtml(label)}</text></g>
    <g class="ruler" aria-hidden="true"><path d="M40 532H240"/>${ticks}<text x="252" y="536">cm</text></g>
  </svg>`);
}

// Small illustrations for the four research components.
function componentArt(kind) {
  switch (kind) {
    case 'grading':
      return raw(`<svg class="comp-art" viewBox="0 0 320 200" role="img" aria-label="Three betel leaves graded A, C and E">
        ${leaf('leaf', 68, 158, -8, 0.44)}${leaf('leaf-young', 162, 160, 3, 0.41)}${leaf('leaf-dry', 254, 162, 9, 0.38)}
        <g class="grade-badge grade-a"><circle cx="106" cy="166" r="17"/><text x="106" y="172">A</text></g>
        <g class="grade-badge grade-c"><circle cx="198" cy="168" r="17"/><text x="198" y="174">C</text></g>
        <g class="grade-badge grade-e"><circle cx="286" cy="170" r="17"/><text x="286" y="176">E</text></g>
      </svg>`);
    case 'disease':
      return raw(`<svg class="comp-art" viewBox="0 0 320 200" role="img" aria-label="A betel leaf with brown spots under a magnifying glass">
        <defs><clipPath id="bl-lens"><circle cx="228" cy="82" r="44"/></clipPath></defs>
        ${leaf('leaf-spot', 108, 176, -10, 0.56)}
        <g clip-path="url(#bl-lens)"><rect x="180" y="34" width="96" height="96" fill="#256f39"/><path d="M180 112C210 92 240 76 278 70" stroke="#bfe28a" stroke-opacity=".55" stroke-width="3" fill="none"/><circle cx="230" cy="86" r="40" fill="url(#bl-g-halo)"/><circle cx="230" cy="86" r="21" fill="url(#bl-g-spot)"/></g>
        <circle class="lens-ring" cx="228" cy="82" r="44" fill="none" stroke-width="6"/>
        <path class="lens-ring" d="M260 114L292 146" stroke-width="11" stroke-linecap="round"/>
        <g class="art-tag tag-rust"><rect x="178" y="160" width="128" height="24" rx="4"/><text x="242" y="176" text-anchor="middle">bacterial · 95.0%</text></g>
      </svg>`);
    case 'yield': {
      const heights = [34, 46, 52, 66, 80, 96];
      const bars = heights.map((h, i) => `<rect class="${i > 3 ? 'bar bar-forecast' : 'bar'}" x="${146 + i * 26}" y="${172 - h}" width="17" height="${h}" rx="2"/>`).join('');
      const pts = heights.map((h, i) => `${154.5 + i * 26},${172 - h - 8}`).join(' ');
      return raw(`<svg class="comp-art" viewBox="0 0 320 200" role="img" aria-label="A betel leaf beside a rising yield forecast chart">
        ${leaf('leaf', 70, 176, -12, 0.5)}
        <path class="axis" d="M138 172H306"/>${bars}
        <polyline class="trend" points="${pts}" fill="none"/>
        <circle class="trend-dot" cx="${154.5 + 5 * 26}" cy="${172 - 96 - 8}" r="5"/>
        <g class="art-tag tag-gold"><rect x="196" y="22" width="110" height="24" rx="4"/><text x="251" y="38" text-anchor="middle">36 leaves/bed</text></g>
      </svg>`);
    }
    case 'pest':
      return raw(`<svg class="comp-art" viewBox="0 0 320 200" role="img" aria-label="A betel leaf with a beetle and an aphid inside detection boxes">
        ${leaf('leaf', 150, 184, 6, 0.6)}
        <g transform="translate(176 96) rotate(18)"><ellipse cx="0" cy="2" rx="9" ry="12" fill="#2a1d14"/><circle cx="0" cy="-12" r="5" fill="#2a1d14"/><path d="M0-9V14" stroke="#6b5240" stroke-width="1.2"/><path d="M-9-2l-7-4M-9 4l-8 2M-8 10l-6 6M9-2l7-4M9 4l8 2M8 10l6 6M-3-16l-5-7M3-16l5-7" stroke="#2a1d14" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="-3" cy="-1" rx="2.2" ry="4" fill="#fff" opacity=".25"/></g>
        <g transform="translate(112 138)"><ellipse cx="0" cy="0" rx="6" ry="8" fill="#cde58a"/><circle cx="0" cy="-8" r="3.4" fill="#b9d36f"/><path d="M-5-2l-5-3M-5 3l-6 1M5-2l5-3M5 3l6 1M-1-11l-3-5M1-11l3-5" stroke="#7d9a3a" stroke-width="1.2" stroke-linecap="round"/></g>
        <rect class="det-box" x="156" y="74" width="42" height="46" rx="2" fill="none"/>
        <g class="art-tag tag-teal"><rect x="156" y="52" width="84" height="20" rx="3"/><text x="198" y="66" text-anchor="middle">beetle 0.76</text></g>
        <rect class="det-box" x="98" y="124" width="28" height="30" rx="2" fill="none"/>
        <g class="art-tag tag-teal"><rect x="66" y="158" width="78" height="20" rx="3"/><text x="105" y="172" text-anchor="middle">aphid 0.84</text></g>
      </svg>`);
    default:
      return raw(`<svg class="comp-art" viewBox="0 0 320 200" role="img" aria-label="A betel leaf">${leaf('leaf', 160, 172, 0, 0.52)}</svg>`);
  }
}

// Logo mark: a leaf whose midrib ends in a node, for "leaf + AI".
function logoMark(size = 30) {
  return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <g transform="translate(16 26.4) scale(.084)">
      <path class="logo-leaf" d="${LEAF}"/>
      <path class="logo-vein" d="M0-4V-196M0-14C46-44 74-100 56-176M0-14C-46-44-74-100-56-176M0-6C36 0 72-12 98-44M0-6C-36 0-72-12-98-44" fill="none" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </g>
    <circle class="logo-node" cx="16" cy="9.6" r="2.3"/>
  </svg>`);
}

// Outline leaf used as a quiet watermark in page headers.
function outlineLeaf(className = 'header-leaf') {
  return raw(`<svg class="${className}" viewBox="-150 -300 300 380" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="${LEAF}" stroke-width="2.2"/><path d="M0 0C2 20 8 40 20 62" stroke-width="2.2"/><g opacity=".7">${VEINS}</g></g></svg>`);
}

module.exports = { sprite, heroArt, componentArt, logoMark, outlineLeaf, LEAF };
