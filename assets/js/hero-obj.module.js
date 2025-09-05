import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

(function(){
  const container = document.getElementById('hero-3d');
  if(!container) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio||1)));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100); camera.position.set(0, 0, 2.8);

  const group = new THREE.Group(); scene.add(group);
  
  // Small on-screen logger overlay
  container.style.position = 'relative';
  // Show status badge only when tuning (?tune=1)
  const tuning = new URLSearchParams(window.location.search).get('tune') === '1';
  let log = function(){};
  if (tuning) {
    const logEl = document.createElement('div');
    logEl.id = 'three-log';
    logEl.style.cssText = 'position:absolute;left:6px;bottom:6px;font:11px/1.3 system-ui,sans-serif;padding:4px 6px;border-radius:6px;background:rgba(0,0,0,0.35);color:#fff;pointer-events:none;max-width:220px;white-space:pre-wrap;';
    container.appendChild(logEl);
    log = (m)=>{ try{ logEl.textContent = m; }catch(e){} };
    log('init…');
  }

  // Only load GLB loader dynamically when needed to avoid ESM bare import errors
  async function loadGLB(group, base, log){
    try {
      // jsDelivr path relies on the import map above to resolve the 'three' bare specifier
      const mod = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js');
      const GLTFLoader = mod.GLTFLoader || mod.default;
      const loader = new GLTFLoader();
      log('loading GLB…');
      loader.load(base + '/files/french_press.glb', (gltf)=>{
        const root = gltf.scene || gltf.scenes?.[0];
        if (!root) { log('GLB had no scene'); return; }
        let added = 0;
        root.traverse((child)=>{
          if(child.isMesh && child.geometry){
            const geo = new THREE.WireframeGeometry(child.geometry);
            const mat = new THREE.LineBasicMaterial({ color: new THREE.Color('#6679a4'), transparent:true, opacity:0.9 });
            const wire = new THREE.LineSegments(geo, mat);
            wire.applyMatrix4(child.matrixWorld);
            group.add(wire);
            added++;
          }
        });
        log('GLB loaded ('+added+' parts)');
        fitAndRender();
      }, undefined, (e)=>{ log('GLB load failed'); console.error(e); fitFallback(true); });
    } catch (e) {
      console.error('Dynamic GLTFLoader import failed', e); log('loader import failed'); fitFallback(true);
    }
  }

  function sameOriginBase(base){
    if(!base) return '';
    try {
      var u = new URL(base, window.location.href);
      // return path only to avoid localhost/127 mismatches
      return u.pathname.replace(/\/$/, '');
    } catch(e){ return ''; }
  }
  const base = sameOriginBase(window.__BASE_PATH__);
  const USE_CUBE_FIRST = false; // debug path: show cube; set false to try GLB
  const OFFSET = { x: 0.15, y: -0.1725 }; // default framing nudge
  const state = { offX: 0.115, offY: -0.065, offZ: 0.59, pitch: 0.06981317007977318, yaw: 0.9250245035569946, roll: 0.0 };
  const tuningMode = (new URLSearchParams(window.location.search).get('tune') === '1');
  const ANIMATE = !tuningMode; // disable animation while tuning
  let fitCenter = new THREE.Vector3(0,0,0);
  let fitDistance = 1.0;

  function fitAndRender(){
    fitCameraToGroup(1.15, OFFSET); // a bit of padding
    render();
    if (ANIMATE) startLoop();
  }
  
  function fitCameraToGroup(padding, offset){
    const box = new THREE.Box3().setFromObject(group);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return; // nothing yet
    const size = new THREE.Vector3(); box.getSize(size);
    if (size.x === 0 && size.y === 0 && size.z === 0) return; // degenerate
    fitCenter = new THREE.Vector3(); box.getCenter(fitCenter);
    // compute camera distance to fit both height and width
    const maxSize = Math.max(size.x, Math.max(size.y, size.z));
    const fitHeightDistance = (maxSize/2) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    fitDistance = Math.max(fitHeightDistance, fitWidthDistance) * (padding || 1.0);
    const dx = (offset && offset.x) || 0; const dy = (offset && offset.y) || 0;
    camera.position.set(fitCenter.x + dx, fitCenter.y + dy, fitCenter.z + fitDistance + state.offZ);
    camera.near = Math.max(0.001, fitDistance / 100);
    camera.far = fitDistance * 100;
    camera.lookAt(fitCenter.x + dx, fitCenter.y + dy, fitCenter.z);
    camera.updateProjectionMatrix();
  }
  function fitFallback(doFit){
    const geo = new THREE.TorusKnotGeometry(0.7, 0.25, 80, 16);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(getAccent()), transparent:true, opacity:0.65 });
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), mat);
    group.add(wire);
    if (doFit) { fitAndRender(); } else { render(); }
  }

  if (USE_CUBE_FIRST) {
    log('rendering debug cube…');
    const geo = new THREE.BoxGeometry(1.2,1.2,1.2);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(getAccent()), wireframe:true, transparent:true, opacity:0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    fitAndRender();
  } else {
    loadGLB(group, base, log);
  }

  function getAccent(){ const v = getComputedStyle(document.documentElement).getPropertyValue('--mh-3d'); return (v && v.trim()) || '#6679a4'; }

  function resize(){
    const w = container.clientWidth||300; const h = container.clientHeight||300; 
    renderer.setSize(w,h,false); 
    camera.aspect=w/h; 
    camera.updateProjectionMatrix();
    // refit after aspect change
    fitCameraToGroup(1.15, OFFSET);
    render();
  }
  new (window.ResizeObserver || function(cb){ window.addEventListener('resize', cb); return {observe(){}, disconnect(){}}; })(resize).observe(container); resize();

  function render(){ renderer.render(scene, camera); }

  function applyView(){
    const dx = OFFSET.x + state.offX;
    const dy = OFFSET.y + state.offY;
    camera.position.set(fitCenter.x + dx, fitCenter.y + dy, fitCenter.z + fitDistance + state.offZ);
    camera.lookAt(fitCenter.x + dx, fitCenter.y + dy, fitCenter.z);
    group.rotation.set(state.pitch, state.yaw, state.roll);
    render();
  }

  // Tuning UI (call addTuningUI() only when tuningMode is true)
  function addTuningUI(){
    const panel = document.createElement('div');
    // Let the panel sit outside the right edge of the avatar; ensure not clipped
    container.style.overflow = 'visible';
    panel.style.cssText = 'position:absolute;left:calc(100% + 8px);top:0;background:rgba(0,0,0,0.45);color:#fff;padding:8px 10px;border-radius:8px;font:12px/1.2 system-ui,sans-serif;width:220px;z-index:3;backdrop-filter:blur(4px)';
    panel.innerHTML = `
      <div style="margin:2px 0 6px;font-weight:600">3D Tuning</div>
      <div>posX <input id="tx" type="range" min="-0.5" max="0.5" step="0.005" value="0"/></div>
      <div>posY <input id="ty" type="range" min="-0.5" max="0.5" step="0.005" value="0"/></div>
      <div>posZ <input id="tz" type="range" min="-4.0" max="1.0" step="0.01" value="0"/></div>
      <div>pitch <input id="rx" type="range" min="-30" max="30" step="0.5" value="0"/></div>
      <div>yaw <input id="ry" type="range" min="-180" max="180" step="0.5" value="0"/></div>
      <div>roll <input id="rz" type="range" min="-30" max="30" step="0.5" value="0"/></div>
      <button id="logvals" style="margin-top:6px;width:100%;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;">Log values</button>
    `;
    container.appendChild(panel);
    // On small screens, keep panel inside
    function placePanel(){
      if (window.innerWidth < 820) {
        panel.style.left = '6px';
        panel.style.top = '6px';
        panel.style.width = '190px';
      } else {
        panel.style.left = 'calc(100% + 8px)';
        panel.style.top = '0';
        panel.style.width = '220px';
      }
    }
    window.addEventListener('resize', placePanel);
    placePanel();
    const q = (id)=>panel.querySelector('#'+id);
    const d2r=(d)=>d*Math.PI/180;
    const onInput=()=>{
      state.offX=parseFloat(q('tx').value);
      state.offY=parseFloat(q('ty').value);
      state.offZ=parseFloat(q('tz').value);
      state.pitch=d2r(parseFloat(q('rx').value));
      state.yaw=d2r(parseFloat(q('ry').value));
      state.roll=d2r(parseFloat(q('rz').value));
      applyView();
    };
    ['tx','ty','tz','rx','ry','rz'].forEach(id=> q(id).addEventListener('input', onInput));
    q('logvals').addEventListener('click', ()=>{
      console.log('3D tuning values:', state);
      log('Values logged');
    });
  }
  if (new URLSearchParams(window.location.search).get('tune') === '1') {
    addTuningUI();
  }

  // Only show tuning UI when ?tune=1 is present
  if (!tuningMode) {
    // no tuning overlay; keep avatar container clean
  }

  // Simple animation loop: slow yaw rotation around base yaw (when not tuning)
  function startLoop(){
    let last = 0; let acc = 0;
    const step = () => {
      const now = performance.now();
      if (now - last > 33) { acc += 0.003; last = now; group.rotation.set(state.pitch, state.yaw + acc, state.roll); render(); }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  new MutationObserver(()=>{ group.traverse((c)=>{ if(c.material && c.material.isLineBasicMaterial){ try{ c.material.color = new THREE.Color(getAccent()); }catch(e){} } }); }).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
})();
