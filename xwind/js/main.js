import { state, setState, subscribe, angleDelta, runwayPair } from "./state.js";
import { createChart } from "./chart.js";
import { createRunway } from "./runway.js";
import { createField } from "./field.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chart = createChart(document.getElementById("xw-chart"));
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

elHeading.addEventListener("input", (e) => setState({ runwayHeading: +e.target.value }));
elWindDir.addEventListener("input", (e) => setState({ windDir: +e.target.value }));
elWindSpd.addEventListener("input", (e) => setState({ windSpeed: +e.target.value }));

// kick off the chart's self-drawing intro
chart.play({ reduced });
