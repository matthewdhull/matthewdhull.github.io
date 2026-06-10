/* Cloth-simulated windsocks (three.js), rendered as a transparent WebGL layer
   over the top-down runway scene. Each sock is a verlet centerline rope (gravity
   + wind + flutter), pinned at the mouth, extruded into a tapered orange/white
   banded tube. Physics gives the behaviour for free: it hangs limp when calm and
   streams downwind, lifting toward horizontal, as the wind builds. */

import * as THREE from "three";

// runway geometry — must match runway.js so socks sit abeam the numbers
const HALF_LEN = 150, HALF_W = 24;
const M = 10;          // centerline segments
const K = 8;           // tube cross-section segments
const SEG = 5.0;       // rest length per segment (total sock ≈ 50)
const MOUTHR = 7.5, TIPR = 3.0;
const POLEH = 32;

const TWO_PI = Math.PI * 2;
const bvec = (deg) => { const a = (deg * Math.PI) / 180; return { x: Math.sin(a), y: -Math.cos(a) }; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createWindsocks(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    console.warn("Windsocks: WebGL unavailable — skipping 3D socks.", e);
    return { setState() {}, resize() {} };   // no-op so the rest of the app runs
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 2000);
  cam.position.set(0, 500, 0);
  cam.up.set(0, 0, -1);          // world +Z -> screen down (matches SVG +y)
  cam.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const dl = new THREE.DirectionalLight(0xffffff, 0.9);
  dl.position.set(-90, 280, -70);
  scene.add(dl);

  const socks = [makeSock(scene), makeSock(scene)];
  let st = { runwayHeading: 20, windDir: 40, windSpeed: 15 };
  let t = 0, last = 0, raf = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(r.width, r.height, false);
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    t += 1 / 60; last = ts;
    const dirs = [st.runwayHeading, (st.runwayHeading + 180) % 360];
    const flow = bvec((st.windDir + 180) % 360);
    socks.forEach((sock, i) => {
      const B = dirs[i];
      const num = bvec((B + 180) % 360), right = bvec((B + 90) % 360);
      const bx = num.x * (HALF_LEN - 40) + right.x * (HALF_W + 58);
      const bz = num.y * (HALF_LEN - 40) + right.y * (HALF_W + 58);
      updateSock(sock, bx, bz, flow, st.windSpeed, t);
    });
    renderer.render(scene, cam);
  }

  window.addEventListener("resize", resize);
  resize();
  raf = requestAnimationFrame(frame);

  return { setState: (s) => { st = s; }, resize };
}

function makeSock(scene) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.5, POLEH, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b6b7a, roughness: 0.85 })
  );
  scene.add(pole);

  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(MOUTHR, 1.1, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xc44e0a, roughness: 0.6 })
  );
  scene.add(hoop);

  const vCount = (M + 1) * K;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
  const col = new Float32Array(vCount * 3);
  const orange = new THREE.Color(0xff6a13), white = new THREE.Color(0xfdfdfd);
  for (let i = 0; i <= M; i++) {
    const c = Math.floor(i / 2) % 2 === 0 ? orange : white;
    for (let k = 0; k < K; k++) { const o = (i * K + k) * 3; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const idx = [];
  for (let i = 0; i < M; i++) for (let k = 0; k < K; k++) {
    const a = i * K + k, b = i * K + ((k + 1) % K), c = (i + 1) * K + k, d = (i + 1) * K + ((k + 1) % K);
    idx.push(a, c, b, b, c, d);
  }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
  }));
  mesh.frustumCulled = false;   // geometry is rewritten each frame; don't cull on a stale bounds
  scene.add(mesh);

  const pts = [], prev = [];
  for (let i = 0; i <= M; i++) { pts.push(new THREE.Vector3()); prev.push(new THREE.Vector3()); }
  return { pole, hoop, mesh, geo, pts, prev, inited: false };
}

const _t = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0), _X = new THREE.Vector3(1, 0, 0), _z = new THREE.Vector3(0, 0, 1);

const DT2 = (1 / 60) * (1 / 60);

function updateSock(sock, bx, bz, flow, speed, t) {
  const { pts, prev } = sock;
  if (!sock.inited) {
    for (let i = 0; i <= M; i++) { pts[i].set(bx, POLEH - i * 0.6, bz); prev[i].copy(pts[i]); }
    sock.inited = true;
  }
  // pin the mouth at the pole top
  pts[0].set(bx, POLEH, bz); prev[0].copy(pts[0]);

  const g = 16;                                 // gravity accel
  const windAcc = Math.min(speed, 40) * 1.5;    // wind accel (ratio sets the lift angle)
  const dwx = flow.x, dwz = flow.y;             // downwind (horizontal)

  for (let i = 1; i <= M; i++) {
    const p = pts[i], pr = prev[i];
    const vx = clamp(p.x - pr.x, -2, 2), vy = clamp(p.y - pr.y, -2, 2), vz = clamp(p.z - pr.z, -2, 2);
    pr.copy(p);
    p.x += vx * 0.97 + dwx * windAcc * DT2;
    p.y += vy * 0.97 - g * DT2;
    p.z += vz * 0.97 + dwz * windAcc * DT2;
    if (p.y < 0.6) p.y = 0.6;
  }
  // distance constraints (mouth pinned)
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 1; i <= M; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.hypot(dx, dy, dz) || 1e-3;
      const diff = (d - SEG) / d;
      if (i - 1 === 0) { b.x -= dx * diff; b.y -= dy * diff; b.z -= dz * diff; }
      else {
        const hx = dx * 0.5 * diff, hy = dy * 0.5 * diff, hz = dz * 0.5 * diff;
        a.x += hx; a.y += hy; a.z += hz; b.x -= hx; b.y -= hy; b.z -= hz;
      }
      if (b.y < 0.6) b.y = 0.6;
    }
  }

  // build the tube around the centerline, adding a procedural flutter wave
  const px = -flow.y, pz = flow.x;              // horizontal perpendicular
  const amp = Math.min(speed, 40) * 0.14;
  const pos = sock.geo.attributes.position.array;
  for (let i = 0; i <= M; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(M, i + 1)];
    _t.subVectors(b, a); if (_t.lengthSq() < 1e-6) _t.set(0, -1, 0); _t.normalize();
    const ref = Math.abs(_t.y) < 0.9 ? _UP : _X;
    _u.crossVectors(_t, ref).normalize();
    _v.crossVectors(_t, _u).normalize();
    const r = MOUTHR + (TIPR - MOUTHR) * (i / M);
    const f = i / M;
    const wave = Math.sin(t * 8 + i * 0.9) * amp * f;
    const cx = pts[i].x + px * wave;
    const cy = pts[i].y + Math.sin(t * 6 + i * 0.7) * amp * 0.5 * f;
    const cz = pts[i].z + pz * wave;
    for (let k = 0; k < K; k++) {
      const ang = (k / K) * TWO_PI, ca = Math.cos(ang), sa = Math.sin(ang);
      const o = (i * K + k) * 3;
      pos[o] = cx + (ca * _u.x + sa * _v.x) * r;
      pos[o + 1] = cy + (ca * _u.y + sa * _v.y) * r;
      pos[o + 2] = cz + (ca * _u.z + sa * _v.z) * r;
    }
  }
  sock.geo.attributes.position.needsUpdate = true;
  sock.geo.computeVertexNormals();

  // pole + hoop
  sock.pole.position.set(bx, POLEH / 2, bz);
  sock.hoop.position.set(bx, POLEH, bz);
  _t.subVectors(pts[1], pts[0]); if (_t.lengthSq() < 1e-6) _t.set(0, -1, 0); _t.normalize();
  sock.hoop.quaternion.setFromUnitVectors(_z, _t);
}
