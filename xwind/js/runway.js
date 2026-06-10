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
  // windsocks are rendered by the three.js cloth layer (windsock3d.js)

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
  // main wing — straight constant-chord 'Hershey bar', set forward, rounded tips
  add("rect", { x: -19, y: -5, width: 38, height: 7, rx: 2.2 });
  // horizontal stabilizer — also a straight rectangular bar, rounded tips
  add("rect", { x: -9, y: 10.5, width: 18, height: 4.2, rx: 1.8 });
  // fuselage — rounded nose/cowl, tapered tail
  add("path", { d: "M 0 -15.5 C 2.7 -14.5 3.2 -10 3.1 -6 C 3 -1 2.6 9 2.1 12.5 C 1.9 14.8 1 16 0 16.3 C -1 16 -1.9 14.8 -2.1 12.5 C -2.6 9 -3 -1 -3.1 -6 C -3.2 -10 -2.7 -14.5 0 -15.5 Z" });
  // vertical fin at the tail
  add("path", { d: "M 0 9 L 1.5 14.5 L 0 16.5 L -1.5 14.5 Z" });
  // propeller + spinner at the nose
  add("rect", { x: -6.5, y: -16.6, width: 13, height: 1.8, rx: 0.9 });
  add("circle", { cx: 0, cy: -15.2, r: 1.7 });
  return { g };
}

