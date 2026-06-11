/* Tiny shared reactive store. Both the chart and the runway scene subscribe,
   so a control change updates everything from one source of truth. */

export const state = {
  runwayHeading: 20,  // magnetic heading of the "low" runway end, degrees
  windDir: 40,        // direction wind is coming FROM, degrees
  windSpeed: 15,      // steady wind, knots
  gust: 15,           // peak gust, knots (== windSpeed means no gust)
  gustLock: true,     // when true the gust tracks the steady wind (no gust factor)
};

const subs = new Set();

export function subscribe(fn) {
  subs.add(fn);
  fn(state);
  return () => subs.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  subs.forEach((fn) => fn(state));
}

/* ---- wind / runway geometry helpers (shared) ---- */

// Smallest signed difference a-b wrapped to [-180, 180].
export function angleDelta(a, b) {
  let d = ((a - b) % 360 + 540) % 360 - 180;
  return d;
}

// Which runway end is "active" (most into-wind) for a given heading + wind dir,
// and the wind angle off that runway's nose. Returns { heading, off, tailwind }.
//   off       = acute angle (0..90) used to read the chart
//   tailwind  = true when the wind is actually behind you (>90 off nose)
export function activeRunway(runwayHeading, windDir) {
  const ends = [runwayHeading, (runwayHeading + 180) % 360];
  // pick the end whose nose is closest to the wind (smallest |delta|)
  let best = ends[0];
  let bestAbs = Math.abs(angleDelta(windDir, ends[0]));
  for (const e of ends) {
    const a = Math.abs(angleDelta(windDir, e));
    if (a < bestAbs) { bestAbs = a; best = e; }
  }
  const off = bestAbs;            // 0..180 (will be <=90 for the chosen end)
  return { heading: best, off: Math.min(off, 90), tailwind: off > 90 };
}

// Format a heading (deg) as a runway number string, e.g. 20 -> "02", 0 -> "36".
export function runwayNumber(headingDeg) {
  let n = Math.round(headingDeg / 10);
  if (n === 0) n = 36;
  if (n > 36) n -= 36;
  return String(n).padStart(2, "0");
}

// "02/20" style label for a runway whose low end is headingDeg.
export function runwayPair(headingDeg) {
  const lo = runwayNumber(headingDeg);
  const hi = runwayNumber((headingDeg + 180) % 360);
  // conventionally the lower number is listed first
  return Number(lo) <= Number(hi) ? `${lo}/${hi}` : `${hi}/${lo}`;
}
