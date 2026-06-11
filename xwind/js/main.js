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
  // locked gust always equals the steady wind (no stale gust factor can survive,
  // regardless of which control changed the wind speed)
  const locked = st.gustLock !== false;
  const gustSpeed = locked ? st.windSpeed : Math.max(st.gust ?? st.windSpeed, st.windSpeed);
  const hasGust = !locked && gustSpeed > st.windSpeed + 0.5;
  return { ...st, off, rawOff: raw, tailwind, gustSpeed, hasGust };
}

const elHeading = document.getElementById("ctl-heading");
const elWindDir = document.getElementById("ctl-winddir");
const elWindSpd = document.getElementById("ctl-windspd");
const elWindGust = document.getElementById("ctl-windgust");
const vHeading = document.getElementById("val-heading");
const vWindDir = document.getElementById("val-winddir");
const vWindSpd = document.getElementById("val-windspd");
const vWindGust = document.getElementById("val-windgust");
const caption = document.getElementById("xw-runway-caption");
const readout = document.getElementById("xw-readout");

function fmt3(n) { return String(((n % 360) + 360) % 360).padStart(3, "0"); }
function pad2(n) { return String(n).padStart(2, "0"); }
function runwayNum(h) {
  let n = Math.round(h / 10); if (n === 0) n = 36; if (n > 36) n -= 36;
  return String(n).padStart(2, "0");
}
// live headwind/crosswind components (steady and gust) for the derived state
function comps(d) {
  const rad = ((d.rawOff || 0) * Math.PI) / 180;
  const hwSigned = (d.windSpeed || 0) * Math.cos(rad);
  const xw = (d.windSpeed || 0) * Math.sin(rad);
  const gs = d.gustSpeed ?? d.windSpeed ?? 0;
  return {
    hwSigned, hw: Math.abs(hwSigned), xw, hwR: Math.round(Math.abs(hwSigned)), xwR: Math.round(xw),
    gustHwR: Math.round(Math.abs(gs * Math.cos(rad))), gustXwR: Math.round(gs * Math.sin(rad)),
    hasGust: !!d.hasGust,
  };
}

// ---- gust lock (state.gustLock): the gust tracks the steady wind unless the
// user unlocks it, so no stale gust factor can survive a wind-speed change ----
const elGustLock = document.getElementById("xw-gust-lock");
elGustLock.addEventListener("click", () => {
  const locked = state.gustLock !== false;
  // unlocking starts the gust at the steady wind (no jump); locking just re-pins
  setState(locked ? { gustLock: false, gust: state.windSpeed } : { gustLock: true });
});

// apply a tour scenario; gust pinned to steady unless the scenario sets a real gust
function setScenario(o) {
  const wantGust = o.gust != null && o.gust > o.windSpeed;
  setState({ ...o, gustLock: !wantGust, gust: o.gust ?? o.windSpeed });
}

// side-on (profile) windsock for the tour: the inflated length grows with the
// wind (≈full by 15 kt) and holds horizontal; the rest droops down, so a light
// wind hangs and a strong wind streams straight out. Flutters when gusty.
function windsockProfileSVG(speed, gust, withArrow) {
  const VW = 240, VH = 170, Mx = 42, My = 40, GROUND = 158, L = 116, mouthR = 14, tipR = 3, N = 30, BANDS = 5;
  const inflated = Math.max(0, Math.min(1, speed / 15));
  const seg = L / N, pts = [];
  let x = Mx, y = My;
  for (let i = 0; i <= N; i++) {
    pts.push([x, y]);
    const t = (i + 0.5) / N;
    // piecewise: the inflated part is ~straight, then a CREASE, then the rest
    // hangs straight. Lighter wind -> steeper hang (3 kt folds past vertical).
    const hang = Math.min(1.62, (1 - inflated) * 2.0);  // hang angle past the crease (≤~vertical)
    // crease wide enough that the bend radius stays > tube radius (no inner-edge pinch)
    const cr = Math.min(1, Math.max(0, t - inflated) / 0.24);
    let ang = hang * (cr * cr * (3 - 2 * cr));           // smoothstep crease, then hold
    if (gust && t > 0.35) ang += Math.sin(t * 26 + 1) * 0.17;               // flutter the outer half
    x += Math.cos(ang) * seg;
    y = Math.min(GROUND - 3, y + Math.sin(ang) * seg);
  }
  // per-point normals + tapering radius
  const nm = [], rad = [];
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const dl = Math.hypot(dx, dy) || 1;
    nm.push([-dy / dl, dx / dl]);
    rad.push(mouthR + (tipR - mouthR) * (i / N));
  }
  const top = (i) => `${pts[i][0] + nm[i][0] * rad[i]} ${pts[i][1] + nm[i][1] * rad[i]}`;
  const bot = (i) => `${pts[i][0] - nm[i][0] * rad[i]} ${pts[i][1] - nm[i][1] * rad[i]}`;
  // 5 smooth bands (one path each -> clean colour breaks, few visible joints)
  let bands = "";
  for (let bd = 0; bd < BANDS; bd++) {
    const i0 = Math.round((bd * N) / BANDS), i1 = Math.round(((bd + 1) * N) / BANDS);
    let d = `M ${top(i0)}`;
    for (let i = i0 + 1; i <= i1; i++) d += ` L ${top(i)}`;
    for (let i = i1; i >= i0; i--) d += ` L ${bot(i)}`;
    d += " Z";
    bands += `<path d="${d}" fill="${bd % 2 ? "#fdfdfd" : "#ff6a13"}" stroke="#c44e0a" stroke-width="0.6" stroke-linejoin="round"/>`;
  }
  // mouth hoop (open rim) + rigging lines to the pole
  const hoop = `<ellipse cx="${Mx}" cy="${My}" rx="3.5" ry="${mouthR}" fill="none" stroke="#c44e0a" stroke-width="1.5"/>` +
    `<g stroke="#c44e0a" stroke-width="0.8" opacity="0.85">` +
    `<line x1="${Mx}" y1="${My}" x2="${pts[0][0] + nm[0][0] * mouthR}" y2="${pts[0][1] + nm[0][1] * mouthR}"/>` +
    `<line x1="${Mx}" y1="${My}" x2="${pts[0][0] - nm[0][0] * mouthR}" y2="${pts[0][1] - nm[0][1] * mouthR}"/></g>`;
  const arrow = withArrow
    ? `<g stroke="var(--text-dim)" stroke-width="2" fill="var(--text-dim)">` +
      `<line x1="${Mx + 6}" y1="20" x2="${Mx + 54}" y2="20"/>` +
      `<polygon points="${Mx + 54},20 ${Mx + 46},16 ${Mx + 46},24"/></g>` +
      `<text x="${Mx + 58}" y="24" font-size="11" fill="var(--text-dim)">wind</text>`
    : "";
  return `<svg viewBox="0 0 ${VW} ${VH}" style="display:block;width:100%;height:150px">` +
    `<line x1="0" y1="${GROUND}" x2="${VW}" y2="${GROUND}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="2 3"/>` +
    `<line x1="${Mx}" y1="${GROUND}" x2="${Mx}" y2="${My - 4}" stroke="var(--text-dim)" stroke-width="3"/>` +
    arrow + bands + hoop + `</svg>`;
}

// auto sub-player: ramps the wind through speeds (and a gust) so the socks respond
let wsTimer = 0, wsIdx = 0;
const WS_STEPS = [
  { windSpeed: 3 }, { windSpeed: 6 }, { windSpeed: 9 }, { windSpeed: 12 }, { windSpeed: 15 },
  { windSpeed: 13, gust: 24 },   // gusty -> flutter
];
function startWindsockPlayer() {
  stopWindsockPlayer();
  wsIdx = 0;
  const tick = () => {
    const s = WS_STEPS[wsIdx % WS_STEPS.length];
    const gusty = s.gust > s.windSpeed;
    setState({ runwayHeading: 0, windDir: 270, windSpeed: s.windSpeed, gust: s.gust ?? s.windSpeed, gustLock: !gusty });
    wsIdx++;
    wsTimer = setTimeout(tick, gusty ? 4600 : 2400);   // linger on the gust so the flutter reads
  };
  tick();
}
function stopWindsockPlayer() { clearTimeout(wsTimer); wsTimer = 0; }

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
    enter() { setScenario(TOUR); },
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
    enter() { setScenario(TOUR); },
    point(ctx) { ctx.pointAt(caption, "up"); ctx.pointAt(chart.els.dot, "left"); },
  },
  {
    title: "Wind velocity",
    body: (d) =>
      `<p>The curved <span class="em-shade">arcs</span> are lines of constant wind speed — ` +
      `10, 20, 30, 40&nbsp;knots.</p>` +
      `<p>The <span class="em-shade">shaded wedge</span> marks the <b>current</b> speed ` +
      `(<b>${d.windSpeed}&nbsp;kt</b>).</p>`,
    enter() { setScenario(TOUR); chart.tour.flashArcs(); chart.tour.wedge(true); },
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
    enter() { setScenario(TOUR); chart.tour.components(true); },
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
        `Your crosswind is <b>${c.xwR} kt</b> — ` +
        `${over ? `<b style="color:#d6336c">over the limit</b>. <b>Drag the wind speed down</b> until it's within limits.`
                : `within limits.`}</p>`;
    },
    enter() { setScenario({ runwayHeading: 20, windDir: 80, windSpeed: 22 }); chart.tour.limit(15); },
    point(ctx) { ctx.pointAt(elWindSpd, "down"); },
    exit() { chart.tour.limit(0); },
  },
  {
    title: "Gusts — mind the peak",
    body: (d) => {
      const c = comps(d);
      const verdict = c.gustXwR > 15
        ? `the gust hits <b>${c.gustXwR} kt</b> — <b style="color:#d6336c">over the 15 kt limit</b>, ` +
          `even though the steady ${c.xwR} kt is ${c.xwR > 15 ? "also over" : "fine"}.`
        : `both stay within the 15 kt limit (gust ${c.gustXwR} kt).`;
      return `<p>A gust report like <span class="em">${fmt3(d.windDir)}/${pad2(d.windSpeed)}G${pad2(d.gustSpeed)}</span> ` +
        `gives a <b>peak</b>. Check your <span class="em-xw">crosswind limit against the gust</span>, not the steady wind.</p>` +
        `<p>Here, ${verdict} The gust control is normally <b>locked</b> to the steady wind — ` +
        `tap the <b>🔓</b> to set your own peak.</p>`;
    },
    enter() { setScenario({ runwayHeading: 20, windDir: 70, windSpeed: 12, gust: 22 }); chart.tour.limit(15); },
    point(ctx) { ctx.pointAt(chart.els.gustDot, "left"); },
    exit() { chart.tour.limit(0); },
  },
  {
    title: "With a gust, every component is a range",
    body: (d) => {
      const c = comps(d);
      return `<p>The wind lives in a band between steady and peak, so each component becomes a <b>range</b> ` +
        `instead of a single number.</p>` +
        `<p>Here: <span class="em-xw">crosswind ${c.xwR}–${c.gustXwR} kt</span>, ` +
        `<span class="em-hw">headwind ${c.hwR}–${c.gustHwR} kt</span>.</p>`;
    },
    enter() { setScenario({ runwayHeading: 20, windDir: 40, windSpeed: 15, gust: 25 }); },
    point(ctx) { ctx.pointAt(chart.els.gustDot, "left"); },
  },
  {
    title: "Picking the best runway",
    body: (d) => {
      const c = comps(d);
      const along = d.tailwind ? `a <b>${c.hwR} kt tailwind</b>` : `~${c.hwR} kt headwind`;
      return `<p>For a given wind, the runway most <span class="em">aligned</span> with it gives the most ` +
        `<span class="em-hw">headwind</span> and least <span class="em-xw">crosswind</span>.</p>` +
        `<p>On <span class="em">RWY ${runwayNum(d.runwayHeading)}</span> you have ${along} and ` +
        `<span class="em-xw">~${c.xwR} kt crosswind</span>. Adjust the runway heading slider to observe them trade off.</p>`;
    },
    enter() { setScenario(TOUR); },
    point(ctx) { ctx.pointAt(elHeading, "down"); },
  },
  {
    title: "Tailwinds count too",
    body: (d) => {
      const c = comps(d);
      const lead =
        `<p>The chart works for tailwinds too. When the wind is <span class="em-xw">behind you</span> ` +
        `(more than 90° off the nose), read it at the <span class="em-shade">acute angle</span> between ` +
        `the wind and the runway — then flip the vertical reading: that headwind is now a ` +
        `<span class="em-xw">tailwind</span> (shown here on the red, negative scale).</p>`;
      if (d.tailwind) {
        return lead + `<p>Right now the wind is ${180 - d.rawOff}° <b>off the tail</b>: about a ` +
          `<b>${c.hwR} kt tailwind</b> and ${c.xwR} kt crosswind.</p>`;
      }
      return lead + `<p>Right now the wind is ahead of you (a headwind). <b>Drag the wind direction ` +
        `past 90° off the nose</b> to send it behind you and watch the axis flip to red.</p>`;
    },
    enter() { setScenario({ runwayHeading: 20, windDir: 160, windSpeed: 15 }); },
    point(ctx, d) { if (d.tailwind) ctx.pointAt(chart.els.axisTitle, "left"); },
  },
  {
    title: "The clock rule of thumb",
    body: (d) => {
      const c = comps(d);
      const intro = `<p>Estimate crosswind without the chart — it's a fraction of the wind by angle off the nose:</p>` +
        `<p style="text-align:center"><b>15°≈¼ &nbsp;·&nbsp; 30°≈½ &nbsp;·&nbsp; 45°≈¾ &nbsp;·&nbsp; 60°≈⅞ &nbsp;·&nbsp; 90°=all</b></p>`;
      // straight down the runway -> no crosswind at all
      if (d.off === 0) {
        return intro + `<p>At <span class="em-shade">0° off</span> the wind is straight down the ` +
          `runway — <b>no crosswind at all</b>.</p>`;
      }
      // nearly aligned -> barely any crosswind
      if (d.off < 8) {
        return intro + `<p>At <span class="em-shade">${d.off}° off</span> the wind is almost straight ` +
          `down the runway — <b>barely any crosswind</b> (the chart shows ${c.xwR} kt).</p>`;
      }
      const rules = [[15, "¼", 0.25], [30, "½", 0.5], [45, "¾", 0.75], [60, "⅞", 0.875], [90, "all", 1]];
      let best = rules[0];
      for (const r of rules) if (Math.abs(d.off - r[0]) < Math.abs(d.off - best[0])) best = r;
      const est = Math.round(d.windSpeed * best[2]);
      const formula = best[1] === "all" ? `${d.windSpeed}` : `${best[1]} × ${d.windSpeed}`;
      return intro +
        `<p>At <span class="em-shade">${d.off}° off</span> (≈${best[0]}°), crosswind ≈ <b>${formula} ≈ ${est} kt</b> ` +
        `— the chart shows ${c.xwR}.</p>`;
    },
    enter() { setScenario({ runwayHeading: 0, windDir: 30, windSpeed: 20 }); },
  },
  {
    title: "Pythagoras explains how wind components split",
    // tied to the exactly-diagonal example, so kept static
    body:
      `<p>Let's use runway 36, with winds <span class="em">045/20</span>, perfectly diagonal to the runway. ` +
      `It's tempting to call it <b>10 kt headwind, 10 kt crosswind</b> — just split it in half, right? <b>No.</b></p>` +
      `<p>It's about <span class="em-hw">14</span> and <span class="em-xw">14</span>. The wind speed \\(V\\) is the ` +
      `<span class="em-hyp">hypotenuse</span> of a right triangle: \\(V=\\sqrt{\\text{HW}^2+\\text{XW}^2}\\). ` +
      `To total 20 at 45°, each leg must be ~14 (\\(\\sqrt{14^2+14^2}\\approx20\\)).</p>` +
      `<p>Recall that \\(a^2+b^2=c^2\\), so \\(c=\\sqrt{a^2+b^2}\\).</p>`,
    enter() {
      setScenario({ runwayHeading: 0, windDir: 45, windSpeed: 20 });
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
      setScenario({ runwayHeading: 0, windDir: 50, windSpeed: 20 });
      chart.tour.components(true);
    },
    point(ctx) { ctx.pointAt(chart.els.hwDot, "left"); ctx.pointAt(chart.els.xwDot, "down"); },
    exit() { chart.tour.components(false); },
  },
  {
    title: "Reading a windsock",
    body: (d) =>
      `<p>A windsock tells you three things at a glance:</p>` +
      `<p><span class="em-hw">Direction</span> — the wide (mouth) end faces into the wind, where it's ` +
      `coming <b>from</b>; the narrow end points where it's blowing <b>to</b>.<br>` +
      `<span class="em-shade">Speed</span> — the more it lifts toward horizontal, the stronger the wind.<br>` +
      `<span class="em-xw">Gustiness</span> — fluttering or sudden swings mean the wind is variable or gusty.</p>` +
      windsockProfileSVG(d.windSpeed, d.hasGust, true),
    enter() { setScenario({ runwayHeading: 0, windDir: 270, windSpeed: 9 }); },
  },
  {
    title: "Extension shows the wind speed",
    body: (d) => {
      const note = d.hasGust ? `<b>Gusting</b> — watch it flutter and surge.` : `Wind <b>${d.windSpeed} kt</b>.`;
      return `<p>The further a windsock lifts toward horizontal, the stronger the wind — roughly ` +
        `fully extended by about <b>15&nbsp;kt</b>.</p>` +
        windsockProfileSVG(d.windSpeed, d.hasGust, false) +
        `<p style="margin:0.4rem 0 0;min-height:1.3em">${note}</p>`;
    },
    enter() { setScenario({ runwayHeading: 0, windDir: 270, windSpeed: 3 }); startWindsockPlayer(); },
    exit() { stopWindsockPlayer(); },
  },
]);
document.getElementById("xw-tour-btn").addEventListener("click", () => tour.open());

// theme toggle (light <-> dark); no persistence
const themeBtn = document.getElementById("xw-theme-toggle");
themeBtn.addEventListener("click", () => {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = dark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  themeBtn.innerHTML = dark ? "&#9790;" : "&#9728;";   // moon offers dark, sun offers light
  field.setTheme(next === "dark");
});

subscribe((st) => {
  const d = derive(st);

  chart.updateHighlight(d);
  runway.update(d);
  field.setWind(d.windDir, d.windSpeed, d.gustSpeed);
  socks3d.setState({ runwayHeading: d.runwayHeading, windDir: d.windDir, windSpeed: d.windSpeed, gust: d.gustSpeed });

  vHeading.textContent = fmt3(st.runwayHeading) + "°";
  vWindDir.textContent = fmt3(st.windDir) + "°";
  vWindSpd.textContent = st.windSpeed + " kt";
  vWindGust.textContent = d.hasGust ? d.gustSpeed + " kt" : "—";

  // keep the slider thumbs in sync when state changes from chart interactions
  if (+elHeading.value !== st.runwayHeading) elHeading.value = st.runwayHeading;
  if (+elWindDir.value !== st.windDir) elWindDir.value = st.windDir;
  if (+elWindSpd.value !== st.windSpeed) elWindSpd.value = st.windSpeed;
  if (+elWindGust.value !== d.gustSpeed) elWindGust.value = d.gustSpeed;

  // reflect the gust lock state in the control
  const locked = st.gustLock !== false;
  elWindGust.disabled = locked;
  elGustLock.innerHTML = locked ? "&#128274;" : "&#128275;";   // 🔒 / 🔓
  elGustLock.title = locked ? "Unlock to set a gust" : "Lock gust to the steady wind";
  elWindGust.closest(".xw-control").classList.toggle("locked", locked);

  const gustTxt = d.hasGust ? `G${pad2(d.gustSpeed)}` : "";
  caption.innerHTML = `RWY ${runwayPair(st.runwayHeading)} &middot; wind ${fmt3(st.windDir)}/${pad2(st.windSpeed)}${gustTxt}`;

  const c = comps(d);
  const angTxt = d.tailwind ? `<b>${180 - d.rawOff}°</b> off the tail` : `<b>${d.rawOff}°</b> off the nose`;
  const hwTxt = c.hasGust ? `${c.hwR}–${c.gustHwR}` : `${c.hwR}`;
  const xwTxt = c.hasGust ? `${c.xwR}–${c.gustXwR}` : `${c.xwR}`;
  const along = d.tailwind
    ? `<b>Tailwind ${hwTxt} kt</b>`
    : `<span class="hw">Headwind ${hwTxt} kt</span>`;
  readout.innerHTML =
    `<b>RWY ${runwayNum(d.runwayHeading)}</b> &middot; wind ${angTxt}<br>` +
    `${along} &middot; <b>Crosswind ${xwTxt} kt</b>`;

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
makeTicks(elWindGust, { max: 40, minorStep: 5, majors: [0, 10, 20, 30, 40] });

elHeading.addEventListener("input", (e) => setState({ runwayHeading: +e.target.value }));
elWindDir.addEventListener("input", (e) => setState({ windDir: +e.target.value }));
elWindSpd.addEventListener("input", (e) => setState({ windSpeed: +e.target.value }));
elWindGust.addEventListener("input", (e) => {
  if (state.gustLock === false) setState({ gust: Math.max(+e.target.value, state.windSpeed) });
});

// kick off the chart's self-drawing intro, then open the guided tour on load
chart.play({ reduced });
tour.open();
