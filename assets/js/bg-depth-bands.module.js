// Experimental: layered 2D canvas with per-band blur to suggest depth
// Enable with ?experiment=1 or ?bg=depth
(function(){
  const siteCanvas = document.getElementById('bg-site');
  const pageCanvas = document.getElementById('bg-experiment');
  const canvas = siteCanvas || pageCanvas;
  if(!canvas) return;
  if (siteCanvas && pageCanvas) pageCanvas.style.display = 'none';

  const palette = [
    '#171c28','#1d2433','#2f3b54','#6679a4','#8695b7','#a2aabc',
    '#d7dce2','#ffcc66','#5ccfe6','#bae67e','#ffae57','#ffd580',
    '#c3a6ff','#ef6b73'
  ];
  const hexToRgb = (h)=>{ const n=h.replace('#',''); const b=parseInt(n,16); return {r:(b>>16)&255,g:(b>>8)&255,b:b&255}; };
  const luminance = (c)=>{ const {r,g,b}=hexToRgb(c); return 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255); };
  const sorted = palette.slice().sort((a,b)=>luminance(a)-luminance(b));

  const ctx = canvas.getContext('2d');
  canvas.style.width='100%'; canvas.style.height='100%';
  const dpr = Math.min(2, window.devicePixelRatio||1);

  function resize(){
    const rect = siteCanvas ? {width: window.innerWidth, height: window.innerHeight}
                            : ((canvas.parentElement||document.body).getBoundingClientRect());
    const w = Math.floor(rect.width||window.innerWidth);
    const h = Math.floor(rect.height||window.innerHeight);
    canvas.width = Math.floor(w*dpr); canvas.height = Math.floor(h*dpr);
    draw(w,h);
  }

  // fBm noise helpers
  const hash=(x,y)=>Math.sin(x*127.1+y*311.7)*43758.5453;
  const fract=(x)=>x-Math.floor(x);
  function noise2D(x,y){ const xi=Math.floor(x), yi=Math.floor(y); const xf=x-xi, yf=y-yi; const s=fract(hash(xi,yi)), t=fract(hash(xi+1,yi)); const u=fract(hash(xi,yi+1)), v=fract(hash(xi+1,yi+1)); const sx=xf*xf*(3-2*xf), sy=yf*yf*(3-2*yf); const a=s+sx*(t-s), b=u+sx*(v-u); return a+sy*(b-a); }
  const fbm=(x,y)=>{ let val=0,amp=.5,f=1; for(let i=0;i<4;i++){ val+=amp*noise2D(x*f,y*f); f*=2.02; amp*=.5;} return val; };

  function draw(viewW, viewH){
    const W = canvas.width, H = canvas.height; ctx.save(); ctx.scale(dpr,dpr);
    ctx.fillStyle = sorted[0]; ctx.fillRect(0,0,viewW,viewH);
    const minDim = Math.max(1, Math.min(viewW, viewH));
    const cell = Math.max(6, Math.min(10, Math.floor(minDim/180)));
    const radius = Math.floor(cell*0.38);
    const cols = Math.ceil(viewW / cell);
    const rows = Math.ceil(viewH / cell);
    const bands = 8;

    // Create per-band offscreen layers
    const layers = Array.from({length: bands}, () => {
      const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.scale(dpr,dpr); return {c,g};
    });

    const spots=[ {x:.22,y:.95,amp:1.0,spread:.55}, {x:.88,y:.10,amp:.8,spread:.6}, {x:.70,y:.7,amp:.35,spread:.5} ];
    const spotsWorld = spots.map((s)=>({
      x: s.x * viewW,
      y: s.y * viewH,
      amp: s.amp,
      spread: s.spread * minDim
    }));

    for(let j=0;j<rows;j++){
      for(let i=0;i<cols;i++){
        const x=i*cell+cell*0.5, y=j*cell+cell*0.5;
        let field=0;
        for(const s of spotsWorld){
          const dx=(x-s.x)/minDim;
          const dy=(y-s.y)/minDim;
          const r2=(dx*dx+dy*dy)/(s.spread/minDim*s.spread/minDim);
          field+=s.amp*Math.exp(-3.5*r2);
        }
        field += 0.45*fbm((x/minDim)*3, (y/minDim)*3);
        let t=Math.max(0,Math.min(1,(field-0.15)/1.4)); t=Math.pow(t,1.6);
        const color=sorted[Math.min(sorted.length-1,Math.floor(t*(sorted.length-1)))];
        const bi=Math.max(0, Math.min(bands-1, Math.floor(t*bands))); // band index
        const g=layers[bi].g;
        g.beginPath(); g.fillStyle=color; g.arc(x,y,radius,0,Math.PI*2); g.fill();
      }
    }

    // Composite far -> near with per-band blur and subtle far shading
    const blurMax = 4.5; // px at the farthest band
    for(let bi=0; bi<bands; bi++){
      const far = 1 - (bi/(bands-1)); // 1=far, 0=near
      const blur = blurMax * Math.pow(far, 1.15);
      ctx.filter = blur>0 ? `blur(${blur}px)` : 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(layers[bi].c, 0, 0, viewW, viewH);

      // far band shading to push it back slightly
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.08 * far;
      ctx.filter = 'none';
      ctx.fillStyle = '#000';
      ctx.fillRect(0,0,viewW,viewH);

      // tiny soft shadow for separation (no offset to avoid drift)
      const sblur = blur * 0.35;
      ctx.globalAlpha = 0.18 * far;      
      ctx.filter = sblur>0 ? `blur(${sblur}px)` : 'none';
      ctx.drawImage(layers[bi].c, 0, 0, viewW, viewH);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.filter='none'; ctx.restore();
  }

  window.addEventListener('resize', resize, {passive:true});
  resize();
})();
