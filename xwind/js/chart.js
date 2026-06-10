/* The classic crosswind-component chart, built as SVG and "self-drawn" on load.

   Geometry: origin O at the bottom-left. Quarter-circle arcs (centered on O)
   are lines of constant WIND SPEED; straight rays from O are lines of constant
   WIND ANGLE off the runway. Vertical axis = headwind, horizontal = crosswind.

   A point at (angle th, speed V) sits at:
       x = O.x + V*sin(th) * S      (crosswind component along x)
       y = O.y - V*cos(th) * S      (headwind  component along y)
*/

const SVGNS = "http://www.w3.org/2000/svg";

// ---- layout constants (viewBox is 0 0 600 600) ----
const O = { x: 78, y: 540 };       // chart origin (bottom-left)
const MAX_KT = 40;                 // outer arc
const R_MAX = 452;                 // px radius of the outer (MAX_KT) arc
const S = R_MAX / MAX_KT;          // px per knot
const ARC_KT = [10, 20, 30, 40];   // labeled speed arcs
const MAJOR_STEP = 10;             // labeled angle rays, degrees
const MINOR_STEP = 2;              // fine angle rays, degrees

function el(name, attrs = {}) {
  const n = document.createElementNS(SVGNS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function pt(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: O.x + r * Math.sin(a), y: O.y - r * Math.cos(a) };
}

// quarter-arc path from the vertical axis (top) round to the horizontal axis
function arcPath(r) {
  const a = pt(0, r);   // top
  const b = pt(90, r);  // right
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

// Prepare a stroked element for a "draw-on" animation; returns its length.
function prepDraw(node) {
  const len = node.getTotalLength();
  node.style.strokeDasharray = len;
  node.style.strokeDashoffset = len;
  return len;
}

function draw(node, len, dur, delay) {
  return node.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    { duration: dur, delay, easing: "ease-in-out", fill: "forwards" }
  );
}

function fadeIn(node, dur, delay) {
  node.style.opacity = 0;
  return node.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: dur, delay, easing: "ease-out", fill: "forwards" }
  );
}

export function createChart(svg, handlers = {}) {
  svg.innerHTML = "";
  let cur = null;   // latest state, for the drag handlers

  // group order = paint order (back to front)
  const gArcsMinor = el("g", { class: "g-arcs-minor" });
  const gRaysMinor = el("g", { class: "g-rays-minor" });
  const gRaysMajor = el("g", { class: "g-rays-major" });
  const gArcs = el("g", { class: "g-arcs" });
  const gAxes = el("g", { class: "g-axes" });
  const gHilite = el("g", { class: "g-hilite" });
  gHilite.style.pointerEvents = "none";   // only the component handles re-enable this
  const gLabels = el("g", { class: "g-labels" });
  svg.append(gArcsMinor, gRaysMinor, gRaysMajor, gArcs, gAxes, gHilite, gLabels);

  const INK = "#15293a";

  // ---- minor speed arcs (5,15,25,35) ----
  const minorArcs = [];
  for (let v = 5; v < MAX_KT; v += 10) {
    const p = el("path", { d: arcPath(v * S), fill: "none", stroke: "#9fb8cb", "stroke-width": 0.8 });
    gArcsMinor.append(p); minorArcs.push(p);
  }

  // ---- major speed arcs ----
  const arcs = ARC_KT.map((v) => {
    const p = el("path", { d: arcPath(v * S), fill: "none", stroke: INK, "stroke-width": 1.6 });
    gArcs.append(p); return p;
  });

  // ---- minor angle rays ----
  const minorRays = [];
  for (let th = 0; th <= 90; th += MINOR_STEP) {
    if (th % MAJOR_STEP === 0) continue;
    const e = pt(th, R_MAX);
    const l = el("line", { x1: O.x, y1: O.y, x2: e.x, y2: e.y, stroke: "#9fb8cb", "stroke-width": 0.7 });
    gRaysMinor.append(l); minorRays.push(l);
  }

  // ---- major angle rays ----
  const majorRays = [];
  for (let th = 0; th <= 90; th += MAJOR_STEP) {
    const e = pt(th, R_MAX);
    const l = el("line", { x1: O.x, y1: O.y, x2: e.x, y2: e.y, stroke: INK, "stroke-width": 1.4 });
    gRaysMajor.append(l); majorRays.push(l);
  }

  // ---- axes (vertical = headwind, horizontal = crosswind) ----
  const vTop = pt(0, R_MAX), hRight = pt(90, R_MAX);
  const vAxis = el("line", { x1: O.x, y1: O.y, x2: vTop.x, y2: vTop.y, stroke: INK, "stroke-width": 2.4 });
  const hAxis = el("line", { x1: O.x, y1: O.y, x2: hRight.x, y2: hRight.y, stroke: INK, "stroke-width": 2.4 });
  gAxes.append(vAxis, hAxis);

  // ---- labels: ticks, titles, angle chips ----
  // speed ticks on both axes
  const vTicks = [];   // vertical (headwind) tick labels — relabeled for tailwind
  for (const v of ARC_KT) {
    // headwind (vertical) ticks — left of axis
    const yp = O.y - v * S;
    gLabels.append(el("line", { x1: O.x - 5, y1: yp, x2: O.x, y2: yp, stroke: INK, "stroke-width": 1.4 }));
    const ty = txt(O.x - 10, yp + 4, String(v), { "text-anchor": "end", "font-size": 15, fill: INK });
    gLabels.append(ty); vTicks.push({ el: ty, v });
    // crosswind (horizontal) ticks — below axis
    const xp = O.x + v * S;
    gLabels.append(el("line", { x1: xp, y1: O.y, x2: xp, y2: O.y + 5, stroke: INK, "stroke-width": 1.4 }));
    gLabels.append(txt(xp, O.y + 22, String(v), { "text-anchor": "middle", "font-size": 15, fill: INK }));
  }
  // 0 label at origin
  gLabels.append(txt(O.x - 10, O.y + 4, "0", { "text-anchor": "end", "font-size": 15, fill: INK }));

  // axis titles
  const ht = txt(26, (O.y + (O.y - R_MAX)) / 2, "Headwind component",
    { "text-anchor": "middle", "font-size": 15, fill: "#1d6fb8", "font-weight": 700 });
  ht.setAttribute("transform", `rotate(-90 26 ${(O.y + (O.y - R_MAX)) / 2})`);
  gLabels.append(ht);
  gLabels.append(txt((O.x + hRight.x) / 2, 588, "Crosswind component",
    { "text-anchor": "middle", "font-size": 15, fill: "#1d6fb8", "font-weight": 700 }));

  // angle chips at the outer end of each major ray
  const chips = [];
  for (let th = 0; th <= 90; th += MAJOR_STEP) {
    const c = pt(th, R_MAX + 16);
    const g = el("g");
    const label = `${th}°`;
    const w = 13 + label.length * 8;
    g.append(el("rect", { x: c.x - w / 2, y: c.y - 11, width: w, height: 20, rx: 5, fill: "#2d3748" }));
    g.append(txt(c.x, c.y + 4, label, { "text-anchor": "middle", "font-size": 12.5, fill: "#fff", "font-weight": 600 }));
    // click a label to set the wind that many degrees off the current runway
    g.classList.add("angle-chip");
    g.addEventListener("pointerdown", (e) => { e.preventDefault(); handlers.onSetAngle?.(th); });
    gLabels.append(g); chips.push(g);
  }

  // "Wind velocity" diagonal note, along ~33 deg
  const wv = pt(33, R_MAX * 0.62);
  const wvNote = txt(wv.x, wv.y, "Wind velocity",
    { "text-anchor": "middle", "font-size": 14, fill: "#3a5468", "font-style": "italic", "font-weight": 600 });
  wvNote.setAttribute("transform", `rotate(33 ${wv.x} ${wv.y})`);
  gLabels.append(wvNote);

  // ---------------------------------------------------------------------------
  //  Highlight overlay (the live worked solution)
  // ---------------------------------------------------------------------------
  const wedge = el("path", { fill: "var(--hi-wedge)", stroke: "var(--hi-wedge-edge)", "stroke-width": 1.2 });
  const ray = el("line", { stroke: "var(--hi-angle)", "stroke-width": 3, "stroke-linecap": "round" });
  const compH = el("line", { stroke: "var(--hi-comp)", "stroke-width": 2.4, "stroke-dasharray": "6 4" });
  const compV = el("line", { stroke: "var(--hi-comp)", "stroke-width": 2.4, "stroke-dasharray": "6 4" });
  const dot = el("circle", { r: 6.5, fill: "var(--hi-angle)", stroke: "#fff", "stroke-width": 1.5 });
  const hwDot = el("circle", { r: 6, fill: "var(--hi-comp)", stroke: "#fff", "stroke-width": 1.5 });
  const xwDot = el("circle", { r: 6, fill: "var(--hi-comp)", stroke: "#fff", "stroke-width": 1.5 });
  const hwTag = mkTag("var(--hi-comp)");
  const xwTag = mkTag("var(--hi-comp)");
  // hypotenuse (origin -> wind point = the wind vector itself); tour-only
  const hypLine = el("line", { stroke: "#6741d9", "stroke-width": 4, "stroke-linecap": "round" });
  hypLine.style.display = "none";
  gHilite.append(wedge, ray, compH, compV, hypLine, dot, hwDot, xwDot, hwTag.g, xwTag.g);

  // floating exact-angle chip for in-between (non-10°) wind angles
  const angTag = el("g");
  const angRect = el("rect", { rx: 5, height: 20, fill: "#e8590c" });
  const angText = txt(0, 0, "", { "text-anchor": "middle", "font-size": 12.5, fill: "#fff", "font-weight": 700 });
  angTag.append(angRect, angText);
  gHilite.append(angTag);

  // crosswind-limit marker (tour): vertical line + over-limit band + label
  const limBand = el("rect", { fill: "rgba(214,51,108,0.12)" });
  const limLine = el("line", { stroke: "#d6336c", "stroke-width": 2.4, "stroke-dasharray": "7 4" });
  const limLbl = el("g");
  const limRect = el("rect", { rx: 5, height: 20, fill: "#d6336c" });
  const limTxt = txt(0, 0, "", { "text-anchor": "middle", "font-size": 12, fill: "#fff", "font-weight": 700 });
  limLbl.append(limRect, limTxt);
  const gLimit = el("g");
  gLimit.style.display = "none";
  gLimit.style.pointerEvents = "none";   // purely visual — don't block the HW/XW handles
  gLimit.append(limBand, limLine, limLbl);
  svg.append(gLimit);

  function updateHighlight(st) {
    cur = st;
    const V = st.windSpeed;
    const off = st.off ?? 0;        // 0..90 chart angle (acute), set by main
    const show = V > 0;
    gHilite.style.display = show ? "" : "none";
    // relabel the vertical axis: same arcs/rays, just headwind vs tailwind
    const tail = show && st.tailwind;
    ht.textContent = tail ? "Tailwind component" : "Headwind component";
    ht.setAttribute("fill", tail ? "#e03131" : "#1d6fb8");
    // vertical ticks go negative + red in a tailwind (loss of headwind component)
    vTicks.forEach(({ el: t, v }) => {
      t.textContent = tail ? `-${v}` : `${v}`;
      t.setAttribute("fill", tail ? "#e03131" : INK);
    });

    // angle labels: highlight the matching 10° chip, or pop up the exact angle
    const onTen = off % 10 === 0;
    chips.forEach((c, i) => {
      c.firstChild.setAttribute("fill", show && i * 10 === off ? "#e8590c" : "#2d3748");
    });
    if (show && !onTen) {
      const cc = pt(off, R_MAX + 16);
      const label = `${off}°`;
      const w = 13 + label.length * 8;
      angText.textContent = label;
      angText.setAttribute("x", cc.x); angText.setAttribute("y", cc.y + 4);
      angRect.setAttribute("x", cc.x - w / 2); angRect.setAttribute("y", cc.y - 11); angRect.setAttribute("width", w);
      angTag.style.display = "";
    } else {
      angTag.style.display = "none";
    }

    if (!show) return;

    const r = V * S;
    // wedge: filled quarter-disc of radius r
    const a0 = pt(0, r), a90 = pt(90, r);
    wedge.setAttribute("d", `M ${O.x} ${O.y} L ${a0.x} ${a0.y} A ${r} ${r} 0 0 1 ${a90.x} ${a90.y} Z`);

    // angle ray from origin all the way out to the chart edge (so the angle is
    // easy to read), with the wind point marked at the magnitude arc
    const P = pt(off, r);
    const E = pt(off, R_MAX);
    ray.setAttribute("x1", O.x); ray.setAttribute("y1", O.y);
    ray.setAttribute("x2", E.x); ray.setAttribute("y2", E.y);
    dot.setAttribute("cx", P.x); dot.setAttribute("cy", P.y);
    hypLine.setAttribute("x1", O.x); hypLine.setAttribute("y1", O.y);
    hypLine.setAttribute("x2", P.x); hypLine.setAttribute("y2", P.y);

    // component drop-lines
    const hw = V * Math.cos((off * Math.PI) / 180);   // headwind
    const xw = V * Math.sin((off * Math.PI) / 180);   // crosswind
    const hwY = O.y - hw * S, xwX = O.x + xw * S;
    compH.setAttribute("x1", P.x); compH.setAttribute("y1", P.y);
    compH.setAttribute("x2", O.x); compH.setAttribute("y2", P.y);
    compV.setAttribute("x1", P.x); compV.setAttribute("y1", P.y);
    compV.setAttribute("x2", P.x); compV.setAttribute("y2", O.y);
    hwDot.setAttribute("cx", O.x); hwDot.setAttribute("cy", hwY);
    xwDot.setAttribute("cx", xwX); xwDot.setAttribute("cy", O.y);

    setTag(hwTag, O.x + 10, hwY - 2, `${tail ? "TW" : "HW"} ${hw.toFixed(0)}`);
    setTag(xwTag, xwX, O.y - 14, `XW ${xw.toFixed(0)}`);
  }

  // ---------------------------------------------------------------------------
  //  Load timeline (the 7 steps)
  // ---------------------------------------------------------------------------
  function play({ reduced = false } = {}) {
    // hide highlight until the structure is drawn
    gHilite.style.opacity = 0;

    if (reduced) {
      gHilite.style.opacity = 1;
      return Promise.resolve();
    }

    // prep draw-ons
    const vLen = prepDraw(vAxis);
    const hLen = prepDraw(hAxis);
    const arcLens = arcs.map(prepDraw);
    const minorArcLens = minorArcs.map(prepDraw);
    const majLens = majorRays.map(prepDraw);
    const minLens = minorRays.map(prepDraw);

    // groups that fade in at the end
    gLabels.style.opacity = 0;

    let t = 0;
    // step 1 — vertical axis up
    draw(vAxis, vLen, 440, t); t += 360;
    // steps 2-3 — speed arcs sweep from vertical to horizontal (back arcs too)
    minorArcs.forEach((a, i) => draw(a, minorArcLens[i], 520, t + i * 70));
    arcs.forEach((a, i) => draw(a, arcLens[i], 560, t + i * 95));
    t += 560 + arcs.length * 95;
    // step 4 — horizontal axis out
    draw(hAxis, hLen, 440, t); t += 420;
    // step 5 — major angle rays
    majorRays.forEach((l, i) => draw(l, majLens[i], 360, t + i * 55));
    t += 360 + majorRays.length * 55;
    // step 6 — minor angle rays (quick)
    minorRays.forEach((l, i) => draw(l, minLens[i], 240, t + i * 12));
    t += 240 + minorRays.length * 12 * 0.4;
    // step 7 — labels / chips / titles fade in, then the worked solution
    const fl = fadeIn(gLabels, 520, t);
    t += 360;
    const fh = fadeIn(gHilite, 600, t);

    return fh.finished.catch(() => {});
  }

  // --- drag the component handles: at the FIXED wind angle, dragging a leg
  //     scales the wind speed so the other leg + magnitude follow (the triangle).
  function svgPoint(evt) {
    const m = svg.getScreenCTM().inverse();
    const p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(m);
  }
  function attachComponentDrag(dotEl, kind) {
    dotEl.style.cursor = kind === "x" ? "ew-resize" : "ns-resize";
    dotEl.style.pointerEvents = "all";
    dotEl.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const move = (ev) => {
        if (!cur) return;
        const sp = svgPoint(ev);
        const th = ((cur.off ?? 0) * Math.PI) / 180;
        let V;
        if (kind === "x") {
          const s = Math.sin(th);
          if (s < 0.09) return;       // ~pure headwind: crosswind can't drive speed
          V = Math.max(0, Math.min(MAX_KT, (sp.x - O.x) / S)) / s;
        } else {
          const c = Math.cos(th);
          if (c < 0.09) return;       // ~pure crosswind
          V = Math.max(0, Math.min(MAX_KT, (O.y - sp.y) / S)) / c;
        }
        handlers.onSetSpeed?.(Math.max(0, Math.min(40, Math.round(V))));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }
  attachComponentDrag(xwDot, "x");
  attachComponentDrag(hwDot, "y");

  // free-drag the intersection point: sets angle, headwind and crosswind all at
  // once (i.e. both wind direction and wind speed from one gesture).
  function attachPointDrag(dotEl) {
    dotEl.style.cursor = "grab";
    dotEl.style.pointerEvents = "all";
    dotEl.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dotEl.style.cursor = "grabbing";
      const move = (ev) => {
        const sp = svgPoint(ev);
        const dx = Math.max(0, (sp.x - O.x) / S);   // crosswind kt
        const dy = Math.max(0, (O.y - sp.y) / S);   // headwind kt
        const V = Math.min(40, Math.sqrt(dx * dx + dy * dy));
        const ang = Math.max(0, Math.min(90, (Math.atan2(dx, dy) * 180) / Math.PI));
        handlers.onSetVector?.(Math.round(ang / 5) * 5, Math.round(V));
      };
      const up = () => {
        dotEl.style.cursor = "grab";
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }
  attachPointDrag(dot);

  // ---- guided-tour hooks ----
  let arcTimer = 0;
  function tourFlashArcs() {
    clearInterval(arcTimer);
    let i = 0;
    const step = () => {
      arcs.forEach((a, k) => {
        a.setAttribute("stroke", k === i ? "#e8590c" : "#15293a");
        a.setAttribute("stroke-width", k === i ? 3.4 : 1.6);
      });
      i = (i + 1) % arcs.length;
    };
    step();
    arcTimer = setInterval(step, 650);
  }
  function tourStopArcs() {
    clearInterval(arcTimer); arcTimer = 0;
    arcs.forEach((a) => { a.setAttribute("stroke", "#15293a"); a.setAttribute("stroke-width", 1.6); });
  }
  function tourWedge(on) {
    wedge.setAttribute("fill", on ? "rgba(255,150,35,0.42)" : "var(--hi-wedge)");
    wedge.setAttribute("stroke-width", on ? 2.6 : 1.2);
  }
  function tourComponents(on) {
    [compH, compV].forEach((l) => { l.setAttribute("stroke-width", on ? 4 : 2.4); l.classList.toggle("xw-pulse", on); });
  }
  function tourHyp(on) { hypLine.style.display = on ? "" : "none"; }
  function tourLimit(kt) {
    if (!kt) { gLimit.style.display = "none"; return; }
    gLimit.style.display = "";
    const x = O.x + kt * S, top = O.y - R_MAX;
    limLine.setAttribute("x1", x); limLine.setAttribute("y1", O.y);
    limLine.setAttribute("x2", x); limLine.setAttribute("y2", top);
    limBand.setAttribute("x", x); limBand.setAttribute("y", top);
    limBand.setAttribute("width", O.x + R_MAX - x); limBand.setAttribute("height", R_MAX);
    const label = `max XW ${kt}`;
    const w = 16 + label.length * 7;
    limTxt.textContent = label;
    limTxt.setAttribute("x", x); limTxt.setAttribute("y", top - 8);
    limRect.setAttribute("x", x - w / 2); limRect.setAttribute("y", top - 22); limRect.setAttribute("width", w);
  }

  return {
    updateHighlight, play, geom: { O, S, R_MAX, MAX_KT },
    els: { chips, arcs, wedge, compH, compV, ray, dot, hwDot, xwDot, axisTitle: ht },
    tour: { flashArcs: tourFlashArcs, stopArcs: tourStopArcs, wedge: tourWedge, components: tourComponents, limit: tourLimit, hypotenuse: tourHyp },
  };
}

// ---- small helpers ----
function txt(x, y, s, attrs = {}) {
  const t = el("text", { x, y, "font-family": "Helvetica Neue, Arial, sans-serif", ...attrs });
  t.textContent = s;
  return t;
}

function mkTag(color) {
  const g = el("g");
  const rect = el("rect", { rx: 4, height: 18, fill: color });
  const t = txt(0, 0, "", { "font-size": 12, fill: "#fff", "font-weight": 700, "text-anchor": "start" });
  g.append(rect, t);
  return { g, rect, t };
}

function setTag(tag, x, y, s) {
  tag.t.textContent = s;
  tag.t.setAttribute("x", x + 6);
  tag.t.setAttribute("y", y + 13);
  const w = s.length * 7.2 + 12;
  tag.rect.setAttribute("x", x);
  tag.rect.setAttribute("y", y);
  tag.rect.setAttribute("width", w);
}
