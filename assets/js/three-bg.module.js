import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

(function(){
  const canvas = document.getElementById('three-bg');
  if(!canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 3);

  const count = Math.min(900, Math.floor(window.innerWidth * 0.8));
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  // Particle colors chosen randomly from theme palette
  const palette = [
    '#171c28','#1d2433','#2f3b54','#6679a4','#8695b7','#a2aabc',
    '#d7dce2','#ffcc66','#5ccfe6','#bae67e','#ffae57','#ffd580',
    '#c3a6ff','#ef6b73'
  ];
  const colors = new Float32Array(count * 3);
  for(let i=0;i<count;i++){
    positions[3*i+0] = (Math.random()*2-1)*2.2;
    positions[3*i+1] = (Math.random()*2-1)*1.8;
    positions[3*i+2] = (Math.random()-0.5)*0.3;
    speeds[i] = 0.0007 + Math.random()*0.0018;
    const c = new THREE.Color(palette[(Math.random()*palette.length)|0]);
    colors[3*i+0] = c.r; colors[3*i+1] = c.g; colors[3*i+2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Small hex texture to ensure round-ish particles and better performance
  function makeHexTexture(sides = 6, size = 64){
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = size;
    const ctx = cvs.getContext('2d');
    const cx = size/2, cy = size/2, r = size*0.45;
    ctx.clearRect(0,0,size,size);
    ctx.beginPath();
    for(let i=0;i<sides;i++){
      const a = (Math.PI*2*i)/sides - Math.PI/2;
      const x = cx + Math.cos(a)*r;
      const y = cy + Math.sin(a)*r;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();
    const tex = new THREE.CanvasTexture(cvs);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
    return tex;
  }

  const sprite = makeHexTexture(24, 64);
  // size: 0.022,
  let material = new THREE.PointsMaterial({
    size: 0.05,
    map: sprite,
    transparent: true,
    opacity: 0.99,
    depthWrite: false,
    sizeAttenuation: true,
    vertexColors: true
  });
  const points = new THREE.Points(geo, material); scene.add(points);

  function resize(){
    const w = canvas.clientWidth || window.innerWidth; const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  new (window.ResizeObserver || function(cb){ window.addEventListener('resize', cb); return {observe(){}, disconnect(){}}; })(resize).observe(canvas.parentElement||document.body);
  resize();

  let last = 0;
  function animate(t){
    if(t - last < 33){ requestAnimationFrame(animate); return; }
    last = t;
    const p = geo.attributes.position.array; for(let i=0;i<count;i++){ let idx=3*i+1; let y=p[idx]; y+=speeds[i]; if(y>1.9) y=-1.9; p[idx]=y; }
    geo.attributes.position.needsUpdate = true; renderer.render(scene, camera); requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // No theme mutation needed now since each particle has its own color
})();
