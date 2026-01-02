// Experimental 3D-depth dotted background using Three.js + Bokeh DOF
// Enable via query: ?experiment=1 or ?bg=depth
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

(function(){
  const siteCanvas = document.getElementById('bg-site');
  const pageCanvas = document.getElementById('bg-experiment');
  const canvas = siteCanvas || pageCanvas;
  if (!canvas) return;
  if (siteCanvas && pageCanvas) pageCanvas.style.display = 'none';

  const palette = [
    '#171c28','#1d2433','#2f3b54','#6679a4','#8695b7','#a2aabc',
    '#d7dce2','#ffcc66','#5ccfe6','#bae67e','#ffae57','#ffd580',
    '#c3a6ff','#ef6b73'
  ];

  const hexToRgb = (h)=>{ const n=h.replace('#',''); const b=parseInt(n,16); return {r:(b>>16)&255,g:(b>>8)&255,b:b&255}; };
  const luminance = (c)=>{ const {r,g,b}=hexToRgb(c); return 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255); };
  const sorted = palette.slice().sort((a,b)=>luminance(a)-luminance(b));

  const dpr = Math.min(2, window.devicePixelRatio||1);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true, powerPreference:'low-power' });
  renderer.setPixelRatio(dpr);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(0,0,2.2);

  // hex sprite for round points
  function makeSprite(sides=24, size=64){
    const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d');
    const r=size*0.45, cx=size/2, cy=size/2; ctx.beginPath();
    for(let i=0;i<sides;i++){ const a=i/sides*2*Math.PI - Math.PI/2; const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.fillStyle='#fff'; ctx.fill();
    const tex=new THREE.CanvasTexture(c); tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter; return tex;
  }
  const sprite = makeSprite(24, 64);

  // Grid parameters tied to viewport
  let points, geo, material;
  function build(){
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const minDim = Math.max(1, Math.min(w, h));
    // Match density of 2D canvas version
    const cell = Math.max(6, Math.min(10, Math.floor(minDim/180)));
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    const count = cols*rows;
    const positions = new Float32Array(count*3);
    const colors = new Float32Array(count*3);

    // fBm helpers
    const hash=(x,y)=>Math.sin(x*127.1+y*311.7)*43758.5453;
    const fract=(x)=>x-Math.floor(x);
    function noise2D(x,y){ const xi=Math.floor(x),yi=Math.floor(y); const xf=x-xi,yf=y-yi; const s=fract(hash(xi,yi)),t=fract(hash(xi+1,yi)); const u=fract(hash(xi,yi+1)),v=fract(hash(xi+1,yi+1)); const sx=xf*xf*(3-2*xf), sy=yf*yf*(3-2*yf); const a=s+sx*(t-s), b=u+sx*(v-u); return a+sy*(b-a);} 
    const fbm=(x,y)=>{ let val=0,amp=.5,f=1; for(let i=0;i<4;i++){ val+=amp*noise2D(x*f,y*f); f*=2.02; amp*=.5;} return val; };

    // bright spots (normalized)
    const spots=[ {x:.22,y:.95,amp:1.0,spread:.55}, {x:.88,y:.10,amp:.8,spread:.6}, {x:.70,y:.7,amp:.35,spread:.5} ];
    const spotsWorld = spots.map((s)=>({
      x: (s.x-0.5) * w,
      y: (0.5-s.y) * h,
      amp: s.amp,
      spread: s.spread * minDim
    }));

    // map to world plane; use min dimension to keep circles round
    let idx=0;
    for(let j=0;j<rows;j++){
      const ny = j/(rows-1); // 0..1
      for(let i=0;i<cols;i++){
        const nx = i/(cols-1);
        const wx = (nx-0.5) * w;
        const wy = (0.5-ny) * h;
        // field
        let field=0;
        for(const s of spotsWorld){
          const dx=(wx-s.x)/minDim;
          const dy=(wy-s.y)/minDim;
          const r2=(dx*dx+dy*dy)/(s.spread*s.spread);
          field+=s.amp*Math.exp(-3.5*r2);
        }
        field += 0.45*fbm((wx/minDim)*3, (wy/minDim)*3);
        let t = Math.max(0, Math.min(1, (field-0.15)/1.4)); t=Math.pow(t,1.6); // 0..1 (continuous)
        const bands = 8; const tb = Math.round(t*bands)/bands; // banded for depth only

        // position: spread across view; z based on brightness (near=bright)
        const x = wx;
        const y = wy;
        const z = 0.22*(1.0 - tb); // darker => farther (use banded depth)
        positions[idx*3+0]=x; positions[idx*3+1]=y; positions[idx*3+2]=z;

        // color from sorted palette
        const c = new THREE.Color(sorted[Math.min(sorted.length-1, Math.floor(t*(sorted.length-1)))]);
        colors[idx*3+0]=c.r; colors[idx*3+1]=c.g; colors[idx*3+2]=c.b;
        idx++;
      }
    }

    if (points) { scene.remove(points); geo.dispose(); material.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
    // Fixed on-screen size and proper depth writing to avoid tiling artifacts
    const sizePx = Math.max(2, Math.floor(cell*0.76));
    material = new THREE.PointsMaterial({ size: sizePx, map: sprite, transparent:true, depthWrite:true, opacity:.95, sizeAttenuation:false, vertexColors:true });
    points = new THREE.Points(geo, material); scene.add(points);
  }

  // Composer with DOF
  let composer; let BokehPass, RenderPass, OutputPass;
  async function setupPost(){
    const m1 = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js');
    const m2 = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/RenderPass.js');
    const m3 = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/BokehPass.js');
    const m4 = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/OutputPass.js');
    const EffectComposer = m1.EffectComposer; RenderPass = m2.RenderPass; BokehPass = m3.BokehPass; OutputPass = m4.OutputPass;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new BokehPass(scene, camera, { focus: 1.9, aperture: 0.012, maxblur: 0.001 }));
    composer.addPass(new OutputPass());
  }

  function resize(){
    const w = canvas.clientWidth || window.innerWidth; const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w,h,false);
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    build();
    if (composer) composer.setSize(w, h);
    render();
  }

  function render(){ if (composer) composer.render(); else renderer.render(scene, camera); }

  setupPost().then(()=>{ resize(); });
  new (window.ResizeObserver || function(cb){ window.addEventListener('resize', cb); return {observe(){},disconnect(){}}; })(resize).observe(canvas);
})();
