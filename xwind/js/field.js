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

    // soft dark halo so the light arrows read on the light grass AND dark pavement
    ctx.shadowColor = "rgba(30, 45, 30, 0.55)";
    ctx.shadowBlur = 2.5;

    for (const p of particles) {
      p.x += flow.x * v * dt;
      p.y += flow.y * v * dt;
      p.life -= dt * 0.25;
      // recycle when out of circle or life ended
      const dx = p.x - cx, dy = p.y - cy;
      if (p.life <= 0 || dx * dx + dy * dy > R * R) {
        Object.assign(p, reentry());
      }
      // fade near the circular edge
      const edge = 1 - Math.sqrt(dx * dx + dy * dy) / R;
      const alpha = Math.max(0, Math.min(1, p.life)) * Math.min(1, edge * 3) * 0.95;
      if (alpha <= 0.02) continue;

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.4;
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
    const r = R * (0.6 + Math.random() * 0.4);
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, life: 0.6 + Math.random() * 0.6 };
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener("resize", resize);
  resize();
  start();

  return { setWind, resize, start, stop };
}
