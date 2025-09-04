// Static palette-driven background grid experiment
// Usage: add <canvas id="bg-experiment"></canvas> anywhere in the page
// The module only runs if that element exists.

(function(){
  // Prefer site-wide canvas if present; otherwise fall back to page-scoped one
  const siteCanvas = document.getElementById('bg-site');
  const pageCanvas = document.getElementById('bg-experiment');
  const canvas = siteCanvas || pageCanvas;
  if(!canvas) return; // opt-in only
  if (siteCanvas && pageCanvas) { pageCanvas.style.display = 'none'; }

  const palette = [
    '#171c28','#1d2433','#2f3b54','#6679a4','#8695b7','#a2aabc',
    '#d7dce2','#ffcc66','#5ccfe6','#bae67e','#ffae57','#ffd580',
    '#c3a6ff','#ef6b73'
  ];

  // Helpers
  const hexToRgb = (h)=>{
    const n = h.replace('#','');
    const bigint = parseInt(n,16);
    return {r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255};
  };
  const luminance = (c)=>{
    const {r,g,b} = hexToRgb(c);
    // Rec. 709 luma
    return 0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255);
  };
  const sorted = palette.slice().sort((a,b)=>luminance(a)-luminance(b)); // dark -> light

  // Canvas setup (use the same stacking as other bg canvas via CSS class)
  const ctx = canvas.getContext('2d');
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const dpr = Math.min(2, window.devicePixelRatio||1);
  function resize(){
    // If site-wide canvas, size to viewport; else to parent container
    const rect = siteCanvas ? {width: window.innerWidth, height: window.innerHeight}
                            : ((canvas.parentElement || document.body).getBoundingClientRect());
    const w = Math.floor(rect.width || window.innerWidth);
    const h = Math.floor(rect.height || window.innerHeight);
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    draw();
  }

  // Simple deterministic value noise
  function hash(x,y){
    return Math.sin(x*127.1 + y*311.7)*43758.5453;
  }
  function fract(x){ return x - Math.floor(x); }
  function noise2D(x,y){
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const s = fract(hash(xi,   yi  ));
    const t = fract(hash(xi+1, yi  ));
    const u = fract(hash(xi,   yi+1));
    const v = fract(hash(xi+1, yi+1));
    const sx = xf*xf*(3-2*xf);
    const sy = yf*yf*(3-2*yf);
    const a = s + sx*(t-s);
    const b = u + sx*(v-u);
    return a + sy*(b-a);
  }
  function fbm(x,y){
    let value=0, amp=0.5, freq=1.0;
    for(let i=0;i<4;i++){
      value += amp*noise2D(x*freq, y*freq);
      freq*=2.02; amp*=0.5;
    }
    return value;
  }

  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.scale(dpr,dpr);
    // base fill with darkest tone
    ctx.fillStyle = sorted[0];
    ctx.fillRect(0,0,W/dpr,H/dpr);

    const cell = Math.max(6, Math.min(10, Math.floor(window.innerWidth/180))); // responsive cell size
    const radius = Math.floor(cell*0.38);
    const cols = Math.ceil((W/dpr)/cell)+1;
    const rows = Math.ceil((H/dpr)/cell)+1;

    // Bright spots (normalized positions)
    const spots = [
      {x: 0.22, y: 0.88, amp: 1.0, spread: 0.55}, // lower-left bias
      {x: 0.88, y: 0.10, amp: 0.8,  spread: 0.6},  // upper-right bias
      {x: 0.70, y: 0.7, amp: 0.35, spread: 0.5}  // subtle near lower-right edge
    ];

    for(let j=0;j<rows;j++){
      for(let i=0;i<cols;i++){
        const x = i*cell + cell*0.5;
        const y = j*cell + cell*0.5;
        const nx = x/(W/dpr), ny = y/(H/dpr);

        // radial field from spots + fBm noise
        let field = 0.0;
        for(const s of spots){
          const dx = nx - s.x, dy = ny - s.y;
          const r2 = (dx*dx + dy*dy) / (s.spread*s.spread);
          field += s.amp * Math.exp(-3.5*r2);
        }
        field += 0.45 * fbm(nx*3.0, ny*3.0); // organic texture

        // Normalize roughly to [0,1]
        let t = Math.max(0, Math.min(1, (field - 0.15) / 1.4));
        // Bias toward darks to keep content readable
        t = Math.pow(t, 1.6);
        // slight quantization for pleasing step
        t = Math.round(t*12)/12;

        // Pick from dark->light palette
        const idx = Math.min(sorted.length-1, Math.floor(t*(sorted.length-1)));
        const color = sorted[idx];

        // draw dot
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, radius, 0, Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  window.addEventListener('resize', resize, {passive:true});
  resize();
})();
