/* Ambient wind vector field: little light arrows drifting downwind, clipped to a
   circle around the runway. Flow speed scales with wind magnitude. (Phase 1 is
   2D canvas; phase 3 may move this to a WebGL particle system.) */

export function createField(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0;
  let particles = [];
  let flow = { x: 0, y: 0 };
  let speed = 0;      // knots
  let raf = 0, last = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2;
    R = Math.min(W, H) * 0.47;
    seed();
  }

  function seed() {
    const n = 110;
    particles = [];
    for (let i = 0; i < n; i++) particles.push(rand());
  }
  function rand() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * R;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, life: Math.random() };
  }

  function setWind(windDir, windSpeed) {
    const a = ((windDir + 180) * Math.PI) / 180;   // blow-toward bearing
    flow = { x: Math.sin(a), y: -Math.cos(a) };
    speed = windSpeed;
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    ctx.clearRect(0, 0, W, H);

    const v = (8 + speed * 4.2);                    // px/s drift
    const arrow = speed > 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // faint halo so arrows stay crisp over both the grass and the dark pavement
    ctx.shadowColor = "rgba(25, 40, 25, 0.35)";
    ctx.shadowBlur = 1.5;

    for (const p of particles) {
      p.x += flow.x * v * dt;
      p.y += flow.y * v * dt;
      const dx = p.x - cx, dy = p.y - cy;
      const rr = Math.sqrt(dx * dx + dy * dy);
      // recycle ONLY at the circular crop — no premature mid-field death
      if (rr > R) { Object.assign(p, reentry()); continue; }
      // fade only within a thin margin of the crop edge; full strength across the disc
      const edge = 1 - rr / R;
      const alpha = Math.min(1, edge * 5) * 0.92;
      if (alpha <= 0.02) continue;

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.6;
      if (arrow) {
        const len = 7 + speed * 0.25;
        const tx = p.x + flow.x * len, ty = p.y + flow.y * len;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(tx, ty);
        // arrowhead
        const px = -flow.y, py = flow.x;
        ctx.moveTo(tx, ty); ctx.lineTo(tx - flow.x * 4 + px * 2.4, ty - flow.y * 4 + py * 2.4);
        ctx.moveTo(tx, ty); ctx.lineTo(tx - flow.x * 4 - px * 2.4, ty - flow.y * 4 - py * 2.4);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // re-enter from the upwind edge so flow looks continuous
  function reentry() {
    const a = (Math.random() - 0.5) * Math.PI;       // spread across upwind arc
    const perpAng = Math.atan2(flow.y, flow.x) + Math.PI; // upwind direction
    const ang = perpAng + a;
    // spawn near the upwind crop edge so arrows fade IN and drift fully across
    const r = R * (0.8 + Math.random() * 0.2);
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener("resize", resize);
  resize();
  start();

  return { setWind, resize, start, stop };
}
