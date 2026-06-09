/* Top-down runway schematic (2D SVG, phase 1).
   Spins with the heading slider; runway numbers update to the magnetic heading.
   Windsocks sit at each touchdown end and lean downwind, inflating with speed.
   (Phase 3 swaps the socks for three.js cloth sims.) */

import { runwayNumber } from "./state.js";

const SVGNS = "http://www.w3.org/2000/svg";
const HALF_LEN = 150;   // runway half-length in viewBox units
const HALF_W = 24;      // runway half-width

function el(name, attrs = {}) {
  const n = document.createElementNS(SVGNS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

// bearing (deg, 0=up, CW) -> unit screen vector
function bvec(deg) {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

export function createRunway(svg) {
  svg.innerHTML = "";

  // compass ring
  const ring = el("circle", { cx: 0, cy: 0, r: 188, fill: "none", stroke: "#a9cd9a", "stroke-width": 1.5 });
  svg.append(ring);
  for (let b = 0; b < 360; b += 30) {
    const v = bvec(b);
    svg.append(el("line", {
      x1: v.x * 178, y1: v.y * 178, x2: v.x * 188, y2: v.y * 188,
      stroke: "#93c283", "stroke-width": b % 90 === 0 ? 2 : 1,
    }));
  }
  // N marker
  const nt = el("text", { x: 0, y: -160, "text-anchor": "middle", "font-size": 14, fill: "#e9efe2", "font-weight": 700 });
  nt.textContent = "N"; svg.append(nt);

  // rotating runway group
  const g = el("g");
  svg.append(g);

  // pavement
  g.append(el("rect", { x: -HALF_W, y: -HALF_LEN, width: HALF_W * 2, height: HALF_LEN * 2, rx: 4, fill: "#3a4754" }));
  // centerline dashes — kept to the middle so they don't strike through the numbers
  g.append(el("line", { x1: 0, y1: -HALF_LEN + 78, x2: 0, y2: HALF_LEN - 78, stroke: "#eef5fc", "stroke-width": 2.4, "stroke-dasharray": "14 12" }));
  // threshold bars
  for (const sgn of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      g.append(el("rect", { x: i * 6 - 2, y: sgn * (HALF_LEN - 18) - (sgn < 0 ? 12 : 0), width: 4, height: 12, fill: "#eef5fc" }));
    }
  }
  // runway numbers (painted on, rotate with pavement)
  const numTop = el("text", { x: 0, y: -HALF_LEN + 50, "text-anchor": "middle", "font-size": 23, "letter-spacing": "1", fill: "#eef5fc", "font-weight": 800, "font-family": "Helvetica Neue, Arial, sans-serif" });
  const numBot = el("text", { x: 0, y: HALF_LEN - 34, "text-anchor": "middle", "font-size": 23, "letter-spacing": "1", fill: "#eef5fc", "font-weight": 800, "font-family": "Helvetica Neue, Arial, sans-serif" });
  // Each number reads "up the runway" toward the far end (direction of travel).
  // The top-end number therefore faces down-runway -> flip it 180 locally.
  numTop.setAttribute("transform", "rotate(180 0 " + (-HALF_LEN + 44) + ")");
  g.append(numTop, numBot);

  // airplane silhouette (marks the intended runway); above pavement
  const plane = mkPlane();
  svg.append(plane.g);

  // windsocks (world frame, not rotated with runway) — one per end
  const socks = [mkSock(), mkSock()];
  socks.forEach((s) => svg.append(s.g));

  // wind origin arrow (upwind side, pointing downwind)
  const windArrow = el("g");
  const waLine = el("line", { stroke: "#dee5d8", "stroke-width": 3 });
  const waHead = el("polygon", { fill: "#dee5d8" });
  const waLabel = el("text", { "font-size": 12.5, fill: "#e9efe2", "font-weight": 700, "text-anchor": "middle" });
  windArrow.append(waLine, waHead, waLabel);
  svg.append(windArrow);

  function update(st) {
    const h = st.runwayHeading;
    g.setAttribute("transform", `rotate(${h} 0 0)`);
    // the threshold pointing toward bearing B carries the RECIPROCAL number
    // (a pilot lands toward B but touches down at, and reads, the far threshold)
    numTop.textContent = runwayNumber((h + 180) % 360);
    numBot.textContent = runwayNumber(h);

    // one sock per runway direction, placed abeam that runway's numbers on its
    // RIGHT side (right relative to that landing direction).
    const dirs = [h, (h + 180) % 360];
    dirs.forEach((B, i) => {
      const num = bvec((B + 180) % 360);          // the number sits on the -B threshold
      const right = bvec((B + 90) % 360);         // right wing of a pilot landing toward B
      // set well off to the side (a real sock sits clear of the runway, never
      // blowing over it) — fully extended it still won't reach the pavement
      const base = {
        x: num.x * (HALF_LEN - 40) + right.x * (HALF_W + 58),
        y: num.y * (HALF_LEN - 40) + right.y * (HALF_W + 58),
      };
      updateSock(socks[i], base, st);
    });

    // airplane silhouette on the INTENDED runway (slider heading), just past its
    // numbers, nose pointed down the runway — communicates which runway is in use.
    const pp = bvec((h + 180) % 360);
    plane.g.setAttribute("transform", `translate(${pp.x * (HALF_LEN - 84)} ${pp.y * (HALF_LEN - 84)}) rotate(${h})`);

    // wind arrow from upwind edge toward center (hidden when calm)
    windArrow.style.display = st.windSpeed > 0 ? "" : "none";
    const from = bvec(st.windDir);              // points toward where wind comes from
    const flow = bvec((st.windDir + 180) % 360); // direction wind blows
    const start = { x: from.x * 150, y: from.y * 150 };
    const end = { x: start.x + flow.x * 46, y: start.y + flow.y * 46 };
    waLine.setAttribute("x1", start.x); waLine.setAttribute("y1", start.y);
    waLine.setAttribute("x2", end.x); waLine.setAttribute("y2", end.y);
    const perp = { x: -flow.y, y: flow.x };
    const tip = end, b1 = { x: end.x - flow.x * 12 + perp.x * 6, y: end.y - flow.y * 12 + perp.y * 6 },
      b2 = { x: end.x - flow.x * 12 - perp.x * 6, y: end.y - flow.y * 12 - perp.y * 6 };
    waHead.setAttribute("points", `${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`);
    waLabel.setAttribute("x", start.x + from.x * 16);
    waLabel.setAttribute("y", start.y + from.y * 16 + 4);
    waLabel.textContent = String(st.windDir).padStart(3, "0");
  }

  return { update };
}

// Top-down single-engine GA silhouette, nose toward -y. Light blue with a blue
// outline (per reference) — reads against the dark pavement; the outline keeps
// it distinct from the white runway markings.
function mkPlane() {
  const g = el("g");
  const FILL = "#d3eef9", LINE = "#5b9bc9";
  const add = (name, a) => g.append(el(name, { fill: FILL, stroke: LINE, "stroke-width": 0.9, "stroke-linejoin": "round", ...a }));
  // main wing — long span, slight sweep, rounded tips
  add("path", { d: "M -3 -1 L -16.5 3 Q -19 3.8 -18 6 L -3 7.2 L 3 7.2 L 18 6 Q 19 3.8 16.5 3 L 3 -1 Z" });
  // horizontal stabilizer (tail), smaller with rounded tips
  add("path", { d: "M -2 9.5 L -8.5 11.6 Q -10 12.2 -9 13.2 L -2 14 L 2 14 L 9 13.2 Q 10 12.2 8.5 11.6 L 2 9.5 Z" });
  // fuselage — rounded nose, cockpit, tapered tail
  add("path", { d: "M 0 -15.5 C 2.6 -14.5 3.1 -10 3 -6 C 2.9 0 2.4 9 2 12.5 C 1.8 14.8 1 16 0 16.3 C -1 16 -1.8 14.8 -2 12.5 C -2.4 9 -2.9 0 -3 -6 C -3.1 -10 -2.6 -14.5 0 -15.5 Z" });
  // vertical fin at the tail
  add("path", { d: "M 0 9 L 1.5 14.5 L 0 16.5 L -1.5 14.5 Z" });
  // propeller + spinner at the nose
  add("rect", { x: -6.5, y: -16.6, width: 13, height: 1.8, rx: 0.9 });
  add("circle", { cx: 0, cy: -15.2, r: 1.7 });
  return { g };
}

function mkSock() {
  const g = el("g");
  const bands = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const p = el("path", { fill: i % 2 ? "#ffffff" : "#ff6a13", stroke: "#c44e0a", "stroke-width": 0.6, "stroke-linejoin": "round" });
    g.append(p); bands.push(p);
  }
  // mouth hoop (the rigid opening ring) — always visible, anchors the sock
  const mouth = el("circle", { fill: "none", stroke: "#c44e0a", "stroke-width": 1.6 });
  g.append(mouth);
  // mast: a small dark dot (top-down view of the pole)
  const mast = el("circle", { r: 2.4, fill: "#5b6b7a" });
  g.insertBefore(mast, g.firstChild);
  return { g, bands, mouth, mast };
}

// A windsock seen from above: it streams downwind, projecting longer as the wind
// lifts it from limp (hanging straight down -> just the hoop) to fully extended
// (~15 kt). Width is constant; only the projected LENGTH conveys speed, and it
// saturates at 15 kt so 40 kt is not drawn oversized.
function updateSock(sock, base, st) {
  const { bands, mouth, mast } = sock;
  const flow = bvec((st.windDir + 180) % 360);
  const perp = { x: -flow.y, y: flow.x };

  const t = Math.max(0, Math.min(1, st.windSpeed / 15)); // extension 0..1
  const MOUTHR = 5.5, TIPR = 3.4, MAXLEN = 30;
  const len = 3 + t * MAXLEN;                            // ~3 (hoop only) -> 33
  const seg = len / bands.length;

  bands.forEach((band, i) => {
    const f0 = i / bands.length, f1 = (i + 1) / bands.length;
    const r0 = MOUTHR + (TIPR - MOUTHR) * f0;
    const r1 = MOUTHR + (TIPR - MOUTHR) * f1;
    const c0 = { x: base.x + flow.x * seg * i, y: base.y + flow.y * seg * i };
    const c1 = { x: base.x + flow.x * seg * (i + 1), y: base.y + flow.y * seg * (i + 1) };
    const a = { x: c0.x + perp.x * r0, y: c0.y + perp.y * r0 };
    const b = { x: c0.x - perp.x * r0, y: c0.y - perp.y * r0 };
    const c = { x: c1.x - perp.x * r1, y: c1.y - perp.y * r1 };
    const d = { x: c1.x + perp.x * r1, y: c1.y + perp.y * r1 };
    band.setAttribute("d", `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`);
    // at calm, collapse the downwind bands so only the hoop reads
    band.style.opacity = t < 0.08 && i > 0 ? 0 : 1;
  });

  mouth.setAttribute("cx", base.x); mouth.setAttribute("cy", base.y); mouth.setAttribute("r", MOUTHR);
  mast.setAttribute("cx", base.x); mast.setAttribute("cy", base.y);
}
