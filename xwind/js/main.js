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
  // the chart is always read at the ACUTE angle between wind and runway; a
  // tailwind simply reflects past 90° and relabels the vertical axis.
  const off = tailwind ? 180 - raw : raw;
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

  caption.innerHTML = `RWY ${runwayPair(st.runwayHeading)} &middot; wind ${fmt3(st.windDir)}/${String(st.windSpeed).padStart(2, "0")}`;

  const hw = d.windSpeed * Math.cos((d.rawOff * Math.PI) / 180);  // signed: <0 = tailwind
  const xw = d.windSpeed * Math.sin((d.rawOff * Math.PI) / 180);
  // headwinds are expressed off the nose, tailwinds off the tail (180 - off-nose)
  const angTxt = d.tailwind
    ? `<b>${180 - d.rawOff}°</b> off the tail`
    : `<b>${d.rawOff}°</b> off the nose`;
  const along = d.tailwind
    ? `<b>Tailwind ${(-hw).toFixed(0)} kt</b>`
    : `<span class="hw">Headwind ${hw.toFixed(0)} kt</span>`;
  readout.innerHTML =
    `<b>RWY ${runwayNum(d.runwayHeading)}</b> &middot; wind ${angTxt}<br>` +
    `${along} &middot; <b>Crosswind ${xw.toFixed(0)} kt</b>`;
});

function runwayNum(h) {
  let n = Math.round(h / 10); if (n === 0) n = 36; if (n > 36) n -= 36;
  return String(n).padStart(2, "0");
}

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

// ---------------- Guided tour (explainer panels) ----------------
const TOUR = { runwayHeading: 20, windDir: 40, windSpeed: 15 };  // canonical scenario
const tour = createTour([
  {
    title: "What is a crosswind component graph?",
    body:
      `<p>This graph splits a wind into the part acting <span class="em-hw">down the runway</span> ` +
      `(the headwind) and the part pushing you <span class="em-xw">sideways</span> (the crosswind).</p>` +
      `<p>Pick a runway and a wind, then read both components straight off the chart.</p>`,
    enter() { setState(TOUR); },
  },
  {
    title: "Wind direction & runway heading",
    body:
      `<p>Right now the wind is <span class="em">040/15</span> — from 040° at 15&nbsp;knots ` +
      `(see the readout below the runway).</p>` +
      `<p>The runway is <span class="em">02</span> (020°), so the wind is ` +
      `<span class="em-shade">20° off the nose</span> — the angle marked on the graph.</p>`,
    enter(ctx) { setState(TOUR); ctx.pointAt(caption, "up"); ctx.pointAt(chart.els.chips[2], "down"); },
  },
  {
    title: "Wind velocity",
    body:
      `<p>The curved <span class="em-shade">arcs</span> are lines of constant wind speed — ` +
      `10, 20, 30, 40&nbsp;knots.</p>` +
      `<p>The <span class="em-shade">shaded wedge</span> marks the <b>current</b> speed (15&nbsp;kt).</p>`,
    enter() { setState(TOUR); chart.tour.flashArcs(); chart.tour.wedge(true); },
    exit() { chart.tour.stopArcs(); chart.tour.wedge(false); },
  },
  {
    title: "Crosswind & headwind components",
    body:
      `<p>Trace straight <span class="em-xw">down</span> to the crosswind axis and straight ` +
      `<span class="em-hw">across</span> to the headwind axis.</p>` +
      `<p>Those two readings are your <span class="em-xw">crosswind</span> and ` +
      `<span class="em-hw">headwind</span> components.</p>`,
    enter(ctx) {
      setState(TOUR);
      chart.tour.components(true);
      ctx.pointAt(chart.els.xwDot, "down");
      ctx.pointAt(chart.els.hwDot, "left");
    },
    exit() { chart.tour.components(false); },
  },
  {
    title: "Crosswind limits",
    body:
      `<p>Your airplane has a <span class="em-xw">maximum demonstrated crosswind</span> — about ` +
      `<b>15 kt</b> for a typical trainer.</p>` +
      `<p>It's the <span class="em-xw">crosswind component</span> that matters, not the total wind. ` +
      `Stay left of the limit line — this wind puts you <b>over</b> it (≈19 kt).</p>`,
    enter() { setState({ runwayHeading: 20, windDir: 80, windSpeed: 22 }); chart.tour.limit(15); },
    exit() { chart.tour.limit(0); },
  },
  {
    title: "Picking the best runway",
    body:
      `<p>For a given wind, the runway most <span class="em">aligned</span> with it gives the most ` +
      `<span class="em-hw">headwind</span> and least <span class="em-xw">crosswind</span>.</p>` +
      `<p>Wind <span class="em">040/15</span>: <span class="em">RWY 02</span> → ~14 kt headwind, ~5 kt ` +
      `crosswind. The reciprocal <span class="em">RWY 20</span> would be a 14 kt <b>tailwind</b>. ` +
      `Spin the runway to compare.</p>`,
    enter(ctx) { setState(TOUR); ctx.pointAt(elHeading, "down"); },
  },
  {
    title: "Tailwinds count too",
    body:
      `<p>A paper chart only covers headwinds — it doesn't actually flip. When the wind is ` +
      `<span class="em-xw">behind you</span> (more than 90° off the nose), you read it at the ` +
      `<span class="em-shade">acute angle</span> and treat that result as a <span class="em-xw">tailwind</span>.</p>` +
      `<p>We relabel the axis red and negative here just to make that reading obvious — same chart, ` +
      `read differently. This wind is 40° <b>off the tail</b>: about a 12 kt tailwind, 10 kt crosswind.</p>`,
    enter(ctx) { setState({ runwayHeading: 20, windDir: 160, windSpeed: 15 }); ctx.pointAt(chart.els.axisTitle, "left"); },
  },
  {
    title: "The clock rule of thumb",
    body:
      `<p>Estimate crosswind without the chart — it's a fraction of the wind by angle off the nose:</p>` +
      `<p style="text-align:center"><b>15°≈¼ &nbsp;·&nbsp; 30°≈½ &nbsp;·&nbsp; 45°≈¾ &nbsp;·&nbsp; 60°≈⅞ &nbsp;·&nbsp; 90°=all</b></p>` +
      `<p>At <span class="em-shade">30° off</span>, crosswind ≈ <b>½ × 20 = 10 kt</b> — matches the chart.</p>`,
    enter() { setState({ runwayHeading: 0, windDir: 30, windSpeed: 20 }); },
  },
  {
    title: "Pythagoras explains how wind components split",
    body:
      `<p>Let's use runway 36, with winds <span class="em">045/20</span>, perfectly diagonal to the runway. ` +
      `It's tempting to call it <b>10 kt headwind, 10 kt crosswind</b> — just split it in half, right? <b>No.</b></p>` +
      `<p>It's about <span class="em-hw">14</span> and <span class="em-xw">14</span>. The wind speed \\(V\\) is the ` +
      `<span class="em-hyp">hypotenuse</span> of a right triangle: \\(V=\\sqrt{\\text{HW}^2+\\text{XW}^2}\\). ` +
      `Two 10s only make a 14 kt wind (\\(\\sqrt{10^2+10^2}\\approx14\\)) — to total 20 at 45°, each leg must be ~14 ` +
      `(\\(\\sqrt{14^2+14^2}\\approx20\\)).</p>` +
      `<p>Straightforward application of Pythagorean, directly from the chart.</p>`,
    enter(ctx) {
      setState({ runwayHeading: 0, windDir: 45, windSpeed: 20 });
      chart.tour.components(true);
      chart.tour.hypotenuse(true);
      ctx.pointAt(chart.els.dot, "right");
    },
    exit() { chart.tour.components(false); chart.tour.hypotenuse(false); },
  },
  {
    title: "Directly calculate the headwind & crosswind components",
    body:
      `<p>Each leg comes straight from trig on that triangle:</p>` +
      `<p style="text-align:center"><span class="em-hw">\\(\\text{Headwind}=V\\cos\\theta\\)</span><br>` +
      `<span class="em-xw">\\(\\text{Crosswind}=V\\sin\\theta\\)</span></p>` +
      `<p>Runway 36, <span class="em">050/20</span> (\\(\\theta=50^\\circ\\)): ` +
      `<span class="em-hw">\\(20\\cos 50^\\circ\\approx13\\text{ kt}\\)</span>, ` +
      `<span class="em-xw">\\(20\\sin 50^\\circ\\approx15\\text{ kt}\\)</span>. ` +
      `The chart just reads these off for you.</p>`,
    enter(ctx) {
      setState({ runwayHeading: 0, windDir: 50, windSpeed: 20 });
      chart.tour.components(true);
      ctx.pointAt(chart.els.hwDot, "left");
      ctx.pointAt(chart.els.xwDot, "down");
    },
    exit() { chart.tour.components(false); },
  },
]);
document.getElementById("xw-tour-btn").addEventListener("click", () => tour.open());

// kick off the chart's self-drawing intro
chart.play({ reduced });
