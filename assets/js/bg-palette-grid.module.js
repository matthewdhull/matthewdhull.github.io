// Palette-driven static dotted background (primary)
// Looks for a site-wide canvas #bg-site, falling back to #bg-experiment

(function () {
  const siteCanvas = document.getElementById('bg-site');
  const pageCanvas = document.getElementById('bg-experiment');
  const canvas = siteCanvas || pageCanvas;
  if (!canvas) return;
  if (siteCanvas && pageCanvas) { pageCanvas.style.display = 'none'; }

  // Per-section palettes. Home keeps the original Ayu-inspired set; each other
  // section amplifies ONE of its accent hues into a bold dark->bright ramp.
  // Selected per page via <html data-bg="..."> (falls back to URL sniffing).
  const PALETTES = {
    home: [
      '#171c28', '#1d2433', '#2f3b54', '#6679a4', '#8695b7', '#a2aabc',
      '#d7dce2', '#ffcc66', '#5ccfe6', '#bae67e', '#ffae57', '#ffd580',
      '#c3a6ff', '#ef6b73'
    ],
    // MUTED OLIVE -> sage -> soft chartreuse — derived from new_green_palette.jpg.
    // NOT inverted: the dark olive (#3a4632, the screenshot's dominant tone) backs
    // the field and the soft chartreuse blooms out at the centroids — a calm dark
    // scheme, no neon. Stops sampled from the reference and kept luminance-monotonic.
    publications: ['#3a4632', '#41513a', '#4a6446', '#517245', '#58844c', '#5f9752', '#69aa5a', '#7cc06c', '#98d488'],
    // STASHED — previous forced-light neon-chartreuse ramp (rendered INVERTED). Kept
    // for quick revert: swap back here and re-add `publications: true` to INVERTED below.
    // publications: ['#010a05', '#031c0d', '#063017', '#0a5a28', '#16a040', '#37d957', '#6cf06a', '#9bf85e', '#c6ff55'],
    // VIOLET -> magenta -> hot pink (from #c3a6ff + #ef6b73) — complementary to green
    projects:     ['#180325', '#420a52', '#7a0f9e', '#b012c8', '#e81fb0', '#ff4cc0', '#ff7ad6', '#ffb0e4', '#ffe0f6'],
    // ORANGE -> amber -> gold (from #ffae57 + #ffcc66) — warm, far from blue family
    posts:        ['#1a0c00', '#4d2400', '#9e5200', '#e07e00', '#ff9e1f', '#ffbe3d', '#ffd86b', '#ffe9a0', '#fff6d0'],
    // CYAN -> electric blue (from #5ccfe6)
    news:         ['#02101f', '#063a5e', '#0a6fb0', '#129ad6', '#1fc8f0', '#4cdcff', '#8becff', '#bdf2ff', '#eafbff'],
    // VIOLET -> indigo -> lavender (from #c3a6ff) — fallback for talks/teaching/misc
    default:      ['#0a0620', '#1e0f4d', '#3a1f9e', '#5c2ee0', '#7a52ff', '#a98bff', '#c9b0ff', '#e2d4ff', '#f4eeff']
  };

  function pickPaletteKey() {
    const ds = (document.documentElement.dataset.bg || '').toLowerCase();
    if (ds && PALETTES[ds]) return ds;
    const p = location.pathname.toLowerCase();
    if (p.indexOf('/publications') !== -1) return 'publications';
    if (p.indexOf('/projects') !== -1) return 'projects';
    if (p.indexOf('/year-archive') !== -1 || p.indexOf('/posts') !== -1) return 'posts';
    if (p.indexOf('/news') !== -1) return 'news';
    if (p === '/' || p === '') return 'home';
    return 'default';
  }
  const paletteKey = pickPaletteKey();
  // Sections rendered "inverted": the brightest tone dominates the field and the
  // dark tones become the centroids in the spots (a forced light mode). Publications
  // is no longer inverted — its new muted-olive ramp backs the field at its dark end
  // (see PALETTES note) so the page is now a dark scheme.
  const INVERTED = {};
  // ONE field gamma for every section, so the dotted field + bloom geometry is
  // IDENTICAL on every page. Navigating between sections then morphs ONLY the colors
  // — the pattern (where the blooms sit, how the banding spreads) never shifts.
  // (A per-section gamma — home 1.6 vs inner pages 1.25 — made the banding visibly
  // change shape between Home and inner pages, which read as a jarring pattern jump
  // on top of the intended color morph.) We adopt the homepage's gold-standard 1.6
  // so home is unchanged and every other page inherits its exact look.
  const gamma = 1.1;

  const hexToRgb = (h) => { const n = h.replace('#', ''); const b = parseInt(n, 16); return { r: (b >> 16) & 255, g: (b >> 8) & 255, b: b & 255 }; };
  const luminance = (c) => { const { r, g, b } = hexToRgb(c); return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255); };
  // A section's palette sorted dark->bright, then reversed if that section renders inverted.
  function sortedFor(key) {
    const pal = PALETTES[key] || PALETTES.default;
    const asc = pal.slice().sort((a, b) => luminance(a) - luminance(b));
    return INVERTED[key] ? asc.reverse() : asc;
  }
  const sorted = sortedFor(paletteKey);

  // Cross-navigation color morph: remember the section we arrived FROM so this
  // page can start by rendering the *previous* palette and then transition the
  // colors outward from the centroids, instead of flashing in the new scheme.
  let prevKey = null;
  try { prevKey = sessionStorage.getItem('bgPrevKey'); } catch (e) {}
  try { sessionStorage.setItem('bgPrevKey', paletteKey); } catch (e) {}
  let doTransition = !!(prevKey && prevKey !== paletteKey && PALETTES[prevKey]);
  const prevSorted = doTransition ? sortedFor(prevKey) : sorted;

  // Precompute rgb for both palettes so the per-cell morph is a cheap lerp.
  const rgbOf = (arr) => arr.map(hexToRgb);
  const sortedRgb = rgbOf(sorted);
  const prevRgb = rgbOf(prevSorted);
  const sampleIdx = (len, t) => Math.min(len - 1, Math.floor(t * (len - 1)));
  // Morph the radiating wavefront across ~1.1s, easing the front motion.
  const TRANS_MS = 1100;
  const REVEAL_AT = 0.85;  // reveal the page chrome once the field is mostly settled
  const FRONT_W = 0.55; // soft band width of the radiating edge (in field-t units)
  const smooth = (p) => p * p * (3 - 2 * p);
  let transStart = null;
  function transProgress() {
    if (!doTransition) return 1;
    if (transStart === null) return 0;
    const p = (performance.now() - transStart) / TRANS_MS;
    if (p <= 0) return 0;
    if (p >= 1) { doTransition = false; return 1; }
    return smooth(p);
  }
  // Local progress for a band at field value t, given global progress P.
  // The wavefront starts at the centroid (t=1) and sweeps out to the edges (t=0).
  function localProgress(t, P) {
    if (P >= 1) return 1;
    if (P <= 0) return 0;
    const threshold = 1 - P * (1 + FRONT_W);
    const lp = (t - threshold) / FRONT_W;
    return lp <= 0 ? 0 : (lp >= 1 ? 1 : lp);
  }

  const ctx = canvas.getContext('2d');
  canvas.style.width = '100%'; canvas.style.height = '100%';
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  // Every section renders the canvas at FULL opacity so the field's color bands —
  // and the depth they create — stay crisp on inner pages, matching the homepage.
  // (A dimmed canvas lets the flat themed body color bleed through and blends the
  // varied field toward it, flattening the banding.) We force this inline rather than
  // reading it from CSS so a stale/cached stylesheet can't reintroduce the dimming.
  const targetOpacity = 1;
  canvas.style.opacity = doTransition ? '1' : '0';

  function resize() {
    const rect = siteCanvas ? { width: window.innerWidth, height: window.innerHeight }
      : ((canvas.parentElement || document.body).getBoundingClientRect());
    const w = Math.floor(rect.width || window.innerWidth);
    const h = Math.floor(rect.height || window.innerHeight);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    draw();
  }

  // fBm noise
  const hash = (x, y) => Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  const fract = (x) => x - Math.floor(x);
  function noise2D(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
    const s = fract(hash(xi, yi)), t = fract(hash(xi + 1, yi)), u = fract(hash(xi, yi + 1)), v = fract(hash(xi + 1, yi + 1));
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf); const a = s + sx * (t - s), b = u + sx * (v - u); return a + sy * (b - a);
  }
  function fbm(x, y) { let val = 0, amp = 0.5, freq = 1; for (let i = 0; i < 4; i++) { val += amp * noise2D(x * freq, y * freq); freq *= 2.02; amp *= 0.5; } return val; }

  const anim = {
    speed: 0.0006,
    ox: 0,
    oy: 0
  };

  function draw(offsetX, offsetY) {
    if (offsetX === undefined) offsetX = anim.ox;
    if (offsetY === undefined) offsetY = anim.oy;
    const W = canvas.width, H = canvas.height; ctx.save(); ctx.scale(dpr, dpr);
    const viewW = W / dpr;
    const viewH = H / dpr;
    const P = transProgress();
    const morphing = P < 1;
    // Color for a quantized field value t, morphed from prev->new palette by the
    // radiating wavefront. Edges (low t) are last to flip, so they back the field.
    function bandColor(t) {
      if (!(t >= 0)) t = 0; // guard NaN/undefined so a bad field value never halts the loop
      const cNew = sortedRgb[sampleIdx(sortedRgb.length, t)];
      if (!morphing) return 'rgb(' + cNew.r + ',' + cNew.g + ',' + cNew.b + ')';
      const lp = localProgress(t, P);
      if (lp >= 1) return 'rgb(' + cNew.r + ',' + cNew.g + ',' + cNew.b + ')';
      const cOld = prevRgb[sampleIdx(prevRgb.length, t)];
      if (lp <= 0) return 'rgb(' + cOld.r + ',' + cOld.g + ',' + cOld.b + ')';
      const r = Math.round(cOld.r + (cNew.r - cOld.r) * lp);
      const g = Math.round(cOld.g + (cNew.g - cOld.g) * lp);
      const b = Math.round(cOld.b + (cNew.b - cOld.b) * lp);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    ctx.fillStyle = bandColor(0); ctx.fillRect(0, 0, viewW, viewH);
    const minDim = Math.max(1, Math.min(viewW, viewH));
    const cell = Math.max(6, Math.min(10, Math.floor(minDim / 180)));
    const radius = Math.floor(cell * 0.38);
    const cols = Math.ceil(viewW / cell) + 1; const rows = Math.ceil(viewH / cell) + 1;
    const spots = [{ x: .22, y: .95, amp: 1.0, spread: .55 },
    { x: .88, y: .10, amp: .8, spread: .6 },
    { x: .70, y: .7, amp: .35, spread: .5 }];
    const spotsWorld = spots.map((s) => ({
      x: s.x * viewW,
      y: s.y * viewH,
      amp: s.amp,
      spread: s.spread * minDim
    }));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * cell + cell * .5, y = j * cell + cell * .5;
      let field = 0;
      for (const s of spotsWorld) {
        const dx = (x - s.x) / minDim, dy = (y - s.y) / minDim;
        const r2 = (dx * dx + dy * dy) / (s.spread / minDim * s.spread / minDim);
        field += s.amp * Math.exp(-3.5 * r2);
      }
      field += 0.45 * fbm((x / minDim) * 3 + offsetX, (y / minDim) * 3 + offsetY);
      let t = Math.max(0, Math.min(1, (field - 0.15) / 1.4)); t = Math.pow(t, gamma); t = Math.round(t * 12) / 12;
      ctx.beginPath(); ctx.fillStyle = bandColor(t); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  window.addEventListener('resize', resize, { passive: true });
  function tick(now) {
    // Start the color-morph clock on the first animation frame, so the page
    // shows the previous palette for one frame before the wavefront begins.
    if (transStart === null) transStart = now || performance.now();
    anim.ox += anim.speed;
    anim.oy += anim.speed * 0.6;
    draw(anim.ox, anim.oy);
    requestAnimationFrame(tick);
  }
  resize();
  requestAnimationFrame(tick);
  // First-load only: fade the freshly-drawn palette in (skipped while morphing,
  // where the canvas is already at full opacity showing the previous scheme).
  if (!doTransition) {
    requestAnimationFrame(() => {
      canvas.style.transition = 'opacity 900ms ease';
      canvas.style.opacity = String(targetOpacity);
    });
  }

  // Reveal the (pre-hidden) chrome + content once the field has mostly settled, so
  // themed nav/text fades up over a field that already matches its scheme. Swapping
  // pending->revealing keeps `intro` suppressed and lets the CSS opacity transition
  // drive the fade-in at a predictable time.
  if (document.documentElement.classList.contains('bg-pending')) {
    const revealMs = doTransition ? Math.round(TRANS_MS * REVEAL_AT) : 0;
    setTimeout(function () {
      const cl = document.documentElement.classList;
      cl.remove('bg-pending');
      cl.add('bg-revealing');
    }, revealMs);
  }
})();
