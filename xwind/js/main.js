import { state, setState, subscribe, activeRunway, runwayPair } from "./state.js";
import { createChart } from "./chart.js";
import { createRunway } from "./runway.js";
import { createField } from "./field.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chart = createChart(document.getElementById("xw-chart"));
const runway = createRunway(document.getElementById("xw-runway"));
const field = createField(document.getElementById("xw-field"));

// derive the chart angle + active end and push to subscribers
function derive(st) {
  const act = activeRunway(st.runwayHeading, st.windDir);
  return { ...st, off: act.off, activeHeading: act.heading, tailwind: act.tailwind };
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

  const hw = d.windSpeed * Math.cos((d.off * Math.PI) / 180);
  const xw = d.windSpeed * Math.sin((d.off * Math.PI) / 180);
  readout.innerHTML =
    `Active <b>RWY ${runwayNum(d.activeHeading)}</b> &middot; wind <b>${d.off}°</b> off the nose<br>` +
    `<span class="hw">Headwind ${hw.toFixed(0)} kt</span> &middot; <b>Crosswind ${xw.toFixed(0)} kt</b>` +
    (d.tailwind ? ` &middot; <em>tailwind!</em>` : "");
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
