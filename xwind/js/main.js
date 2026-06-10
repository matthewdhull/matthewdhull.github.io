import { state, setState, subscribe, angleDelta, runwayPair } from "./state.js";
import { createChart } from "./chart.js";
import { createRunway } from "./runway.js";
import { createField } from "./field.js";
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
]);
document.getElementById("xw-tour-btn").addEventListener("click", () => tour.open());

// kick off the chart's self-drawing intro
chart.play({ reduced });
