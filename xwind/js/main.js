import { state, setState, subscribe, angleDelta, runwayPair } from "./state.js";
import { createChart } from "./chart.js";
import { createRunway } from "./runway.js";
import { createField } from "./field.js";
import { createWindsocks } from "./windsock3d.js";
import { createTour } from "./tour.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chart = createChart(document.getElementById("xw-chart"), {
  // click an angle label -> set the wind that many degrees off the runway heading
  onSetAngle: (a) => setState({ windDir: (((state.runwayHeading + a) % 360) + 360) % 360 }),
  // drag a component handle -> set the wind speed (angle held fixed)
  onSetSpeed: (v) => setState({ windSpeed: Math.max(0, Math.min(40, v)) }),
  // free-drag the intersection dot -> set angle (wind dir) and speed at once
  onSetVector: (angle, speed) => setState({
    windDir: (((state.runwayHeading + angle) % 360) + 360) % 360,
    windSpeed: Math.max(0, Math.min(40, speed)),
  }),
});
const runway = createRunway(document.getElementById("xw-runway"));
const field = createField(document.getElementById("xw-field"));
const socks3d = createWindsocks(document.getElementById("xw-socks3d"));

// The INTENDED runway is the slider heading (shown by the airplane). Everything
// is computed relative to it — so a wind behind you reads as a tailwind rather
// than silently flipping to the favourable reciprocal.
function derive(st) {
  const raw = Math.abs(angleDelta(st.windDir, st.runwayHeading)); // 0..180 off the nose
  const tailwind = raw > 90;
  const off = tailwind ? 180 - raw : raw;       // chart is always read at the acute angle
  return { ...st, off, rawOff: raw, tailwind };
}

const elHeading = document.getElementById("ctl-heading");
const elWindDir = document.getElementById("ctl-winddir");
const elWindSpd = document.getElementById("ctl-windspd");
const vHeading = document.getElementById("val-heading");
const vWindDir = document.getElementById("val-winddir");
const vWindSpd = document.getElementById("val-windspd");
const caption = document.getElementById("xw-runway-caption");
const readout = document.getElementById("xw-readout");

function fmt3(n) { return String(((n % 360) + 360) % 360).padStart(3, "0"); }
function pad2(n) { return String(n).padStart(2, "0"); }
function runwayNum(h) {
  let n = Math.round(h / 10); if (n === 0) n = 36; if (n > 36) n -= 36;
  return String(n).padStart(2, "0");
}
// live headwind/crosswind components for the current derived state
function comps(d) {
  const hwSigned = (d.windSpeed || 0) * Math.cos(((d.rawOff || 0) * Math.PI) / 180);
  const xw = (d.windSpeed || 0) * Math.sin(((d.rawOff || 0) * Math.PI) / 180);
  return { hwSigned, hw: Math.abs(hwSigned), xw, hwR: Math.round(Math.abs(hwSigned)), xwR: Math.round(xw) };
}

// ---------------- Guided tour (explainer panels) ----------------
// Each panel starts from a preset scenario (enter) but its copy is a function of
// the live state, so it updates as the user drags the sliders.
const TOUR = { runwayHeading: 20, windDir: 40, windSpeed: 15 };
const tour = createTour([
  {
    title: "What is a crosswind component graph?",
    body: () =>
      `<p>This graph splits a wind into the part acting <span class="em-hw">down the runway</span> ` +
      `(the headwind) and the part pushing you <span class="em-xw">sideways</span> (the crosswind).</p>` +
      `<p>Pick a runway and a wind, then read both components straight off the chart.</p>`,
    enter() { setState(TOUR); },
  },
  {
    title: "Wind direction & runway heading",
    body: (d) => {
      const offTxt = d.tailwind ? `${180 - d.rawOff}° off the tail` : `${d.rawOff}° off the nose`;
      return `<p>Right now the wind is <span class="em">${fmt3(d.windDir)}/${pad2(d.windSpeed)}</span> — ` +
        `from ${fmt3(d.windDir)}° at ${d.windSpeed}&nbsp;knots (see the readout below the runway).</p>` +
        `<p>The runway is <span class="em">${runwayNum(d.runwayHeading)}</span> (${fmt3(d.runwayHeading)}°), ` +
        `so the wind is <span class="em-shade">${offTxt}</span> — the angle marked on the graph.</p>`;
    },
    enter() { setState(TOUR); },
    point(ctx) { ctx.pointAt(caption, "up"); ctx.pointAt(chart.els.ray, "down"); },
  },
  {
    title: "Wind velocity",
    body: (d) =>
      `<p>The curved <span class="em-shade">arcs</span> are lines of constant wind speed — ` +
      `10, 20, 30, 40&nbsp;knots.</p>` +
      `<p>The <span class="em-shade">shaded wedge</span> marks the <b>current</b> speed ` +
      `(<b>${d.windSpeed}&nbsp;kt</b>).</p>`,
    enter() { setState(TOUR); chart.tour.flashArcs(); chart.tour.wedge(true); },
    exit() { chart.tour.stopArcs(); chart.tour.wedge(false); },
  },
  {
    title: "Crosswind & headwind components",
    body: (d) => {
      const c = comps(d);
      const along = d.tailwind ? `tailwind ${c.hwR} kt` : `headwind ${c.hwR} kt`;
      return `<p>Trace straight <span class="em-xw">down</span> to the crosswind axis and straight ` +
        `<span class="em-hw">across</span> to the headwind axis.</p>` +
        `<p>Right now: <span class="em-xw">crosswind ${c.xwR} kt</span> and ` +
        `<span class="em-hw">${along}</span>.</p>`;
    },
    enter() { setState(TOUR); chart.tour.components(true); },
    point(ctx) { ctx.pointAt(chart.els.xwDot, "down"); ctx.pointAt(chart.els.hwDot, "left"); },
    exit() { chart.tour.components(false); },
  },
  {
    title: "Crosswind limits",
    body: (d) => {
      const c = comps(d);
      const over = c.xw > 15;
      return `<p>Your airplane has a <span class="em-xw">maximum demonstrated crosswind</span> — about ` +
        `<b>15 kt</b> for a typical trainer.</p>` +
        `<p>It's the <span class="em-xw">crosswind component</span> that matters, not the total wind. ` +
        `Right now your crosswind is <b>${c.xwR} kt</b> — ` +
        `${over ? `<b style="color:#d6336c">over the limit</b>` : `within limits`}.</p>`;
    },
    enter() { setState({ runwayHeading: 20, windDir: 80, windSpeed: 22 }); chart.tour.limit(15); },
    exit() { chart.tour.limit(0); },
  },
  {
    title: "Picking the best runway",
    body: (d) => {
      const c = comps(d);
      const along = d.tailwind ? `a <b>${c.hwR} kt tailwind</b>` : `~${c.hwR} kt headwind`;
      return `<p>For a given wind, the runway most <span class="em">aligned</span> with it gives the most ` +
        `<span class="em-hw">headwind</span> and least <span class="em-xw">crosswind</span>.</p>` +
        `<p>On <span class="em">RWY ${runwayNum(d.runwayHeading)}</span> you have ${along} and ` +
        `<span class="em-xw">~${c.xwR} kt crosswind</span>. Spin the runway and watch them trade off.</p>`;
    },
    enter() { setState(TOUR); },
    point(ctx) { ctx.pointAt(elHeading, "down"); },
  },
  {
    title: "Tailwinds count too",
    body: (d) => {
      const c = comps(d);
      const lead =
        `<p>A paper chart only covers headwinds — it doesn't actually flip. When the wind is ` +
        `<span class="em-xw">behind you</span> (more than 90° off the nose), you read it at the ` +
        `<span class="em-shade">acute angle</span> and treat that result as a <span class="em-xw">tailwind</span>.</p>`;
      if (d.tailwind) {
        return lead + `<p>Right now the wind is ${180 - d.rawOff}° <b>off the tail</b>: about a ` +
          `<b>${c.hwR} kt tailwind</b> and ${c.xwR} kt crosswind — note the red, negative axis.</p>`;
      }
      return lead + `<p>Right now the wind is ahead of you (a headwind). <b>Drag the wind direction ` +
        `past 90° off the nose</b> to send it behind you and watch the axis flip to red.</p>`;
    },
    enter() { setState({ runwayHeading: 20, windDir: 160, windSpeed: 15 }); },
    point(ctx, d) { if (d.tailwind) ctx.pointAt(chart.els.axisTitle, "left"); },
  },
  {
    title: "The clock rule of thumb",
    body: (d) => {
      const c = comps(d);
      const rules = [[15, "¼", 0.25], [30, "½", 0.5], [45, "¾", 0.75], [60, "⅞", 0.875], [90, "all", 1]];
      let best = rules[0];
      for (const r of rules) if (Math.abs(d.off - r[0]) < Math.abs(d.off - best[0])) best = r;
      const est = Math.round(d.windSpeed * best[2]);
      const formula = best[1] === "all" ? `${d.windSpeed}` : `${best[1]} × ${d.windSpeed}`;
      return `<p>Estimate crosswind without the chart — it's a fraction of the wind by angle off the nose:</p>` +
        `<p style="text-align:center"><b>15°≈¼ &nbsp;·&nbsp; 30°≈½ &nbsp;·&nbsp; 45°≈¾ &nbsp;·&nbsp; 60°≈⅞ &nbsp;·&nbsp; 90°=all</b></p>` +
        `<p>At <span class="em-shade">${d.off}° off</span> (≈${best[0]}°), crosswind ≈ <b>${formula} ≈ ${est} kt</b> ` +
        `— the chart shows ${c.xwR}.</p>`;
    },
    enter() { setState({ runwayHeading: 0, windDir: 30, windSpeed: 20 }); },
  },
  {
    title: "Pythagoras explains how wind components split",
    body: (d) => {
      const c = comps(d);
      const sum = Math.round(Math.sqrt(c.hwR * c.hwR + c.xwR * c.xwR));
      return `<p>It's tempting to think a wind splits evenly between its headwind and crosswind — but it ` +
        `doesn't, because the wind is the <span class="em-hyp">hypotenuse</span> of a right triangle.</p>` +
        `<p>Winds <span class="em">${fmt3(d.windDir)}/${pad2(d.windSpeed)}</span> → ` +
        `<span class="em-hw">headwind ${c.hwR}</span>, <span class="em-xw">crosswind ${c.xwR}</span>. ` +
        `Check: \\(\\sqrt{${c.hwR}^2+${c.xwR}^2}=${sum}\\) ≈ the wind speed \\(V\\). Each leg is bigger than half.</p>` +
        `<p>Straightforward application of Pythagorean, directly from the chart.</p>`;
    },
    enter() {
      setState({ runwayHeading: 0, windDir: 45, windSpeed: 20 });
      chart.tour.components(true);
      chart.tour.hypotenuse(true);
    },
    point(ctx) { ctx.pointAt(chart.els.dot, "right"); },
    exit() { chart.tour.components(false); chart.tour.hypotenuse(false); },
  },
  {
    title: "Directly calculate the headwind & crosswind components",
    body: (d) => {
      const c = comps(d);
      return `<p>Each leg comes straight from trig on that triangle:</p>` +
        `<p style="text-align:center"><span class="em-hw">\\(\\text{Headwind}=V\\cos\\theta\\)</span><br>` +
        `<span class="em-xw">\\(\\text{Crosswind}=V\\sin\\theta\\)</span></p>` +
        `<p>Runway ${runwayNum(d.runwayHeading)}, <span class="em">${fmt3(d.windDir)}/${pad2(d.windSpeed)}</span> ` +
        `(\\(\\theta=${d.off}^\\circ\\)): ` +
        `<span class="em-hw">\\(${d.windSpeed}\\cos ${d.off}^\\circ\\approx${c.hwR}\\text{ kt}\\)</span>, ` +
        `<span class="em-xw">\\(${d.windSpeed}\\sin ${d.off}^\\circ\\approx${c.xwR}\\text{ kt}\\)</span>.</p>`;
    },
    enter() {
      setState({ runwayHeading: 0, windDir: 50, windSpeed: 20 });
      chart.tour.components(true);
    },
    point(ctx) { ctx.pointAt(chart.els.hwDot, "left"); ctx.pointAt(chart.els.xwDot, "down"); },
    exit() { chart.tour.components(false); },
  },
]);
document.getElementById("xw-tour-btn").addEventListener("click", () => tour.open());

subscribe((st) => {
  const d = derive(st);

  chart.updateHighlight(d);
  runway.update(d);
  field.setWind(d.windDir, d.windSpeed);
  socks3d.setState({ runwayHeading: d.runwayHeading, windDir: d.windDir, windSpeed: d.windSpeed });

  vHeading.textContent = fmt3(st.runwayHeading) + "°";
  vWindDir.textContent = fmt3(st.windDir) + "°";
  vWindSpd.textContent = st.windSpeed + " kt";

  // keep the slider thumbs in sync when state changes from chart interactions
  if (+elHeading.value !== st.runwayHeading) elHeading.value = st.runwayHeading;
  if (+elWindDir.value !== st.windDir) elWindDir.value = st.windDir;
  if (+elWindSpd.value !== st.windSpeed) elWindSpd.value = st.windSpeed;

  caption.innerHTML = `RWY ${runwayPair(st.runwayHeading)} &middot; wind ${fmt3(st.windDir)}/${pad2(st.windSpeed)}`;

  const c = comps(d);
  const angTxt = d.tailwind ? `<b>${180 - d.rawOff}°</b> off the tail` : `<b>${d.rawOff}°</b> off the nose`;
  const along = d.tailwind
    ? `<b>Tailwind ${c.hwR} kt</b>`
    : `<span class="hw">Headwind ${c.hwR} kt</span>`;
  readout.innerHTML =
    `<b>RWY ${runwayNum(d.runwayHeading)}</b> &middot; wind ${angTxt}<br>` +
    `${along} &middot; <b>Crosswind ${c.xwR} kt</b>`;

  tour.onState(d);   // refresh the open explainer panel with the live numbers
});

// tick strips under each slider (minor marks + labelled majors)
function makeTicks(input, { max, minorStep, majors }) {
  const wrap = document.createElement("div");
  wrap.className = "xw-ticks";
  for (let v = 0; v <= max; v += minorStep) {
    const major = majors.includes(v);
    const t = document.createElement("div");
    t.className = "xw-tick" + (major ? " major" : "");
    t.style.left = (v / max) * 100 + "%";
    const mark = document.createElement("div");
    mark.className = "xw-mark";
    t.appendChild(mark);
    if (major) {
      const lbl = document.createElement("div");
      lbl.className = "xw-lbl";
      lbl.textContent = v;
      t.appendChild(lbl);
    }
    wrap.appendChild(t);
  }
  input.insertAdjacentElement("afterend", wrap);
}
makeTicks(elHeading, { max: 360, minorStep: 30, majors: [0, 90, 180, 270, 360] });
makeTicks(elWindDir, { max: 360, minorStep: 30, majors: [0, 90, 180, 270, 360] });
makeTicks(elWindSpd, { max: 40, minorStep: 5, majors: [0, 10, 20, 30, 40] });

elHeading.addEventListener("input", (e) => setState({ runwayHeading: +e.target.value }));
elWindDir.addEventListener("input", (e) => setState({ windDir: +e.target.value }));
elWindSpd.addEventListener("input", (e) => setState({ windSpeed: +e.target.value }));

// kick off the chart's self-drawing intro
chart.play({ reduced });
