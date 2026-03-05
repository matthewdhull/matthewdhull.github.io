import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('ellipsoid-3d-canvas');
const scaleX = document.getElementById('ellipsoid-scale-x');
const scaleY = document.getElementById('ellipsoid-scale-y');
const scaleZ = document.getElementById('ellipsoid-scale-z');
const rotZ = document.getElementById('ellipsoid-rot-z');
const scaleXValue = document.getElementById('ellipsoid-scale-x-value');
const scaleYValue = document.getElementById('ellipsoid-scale-y-value');
const scaleZValue = document.getElementById('ellipsoid-scale-z-value');
const rotZValue = document.getElementById('ellipsoid-rot-z-value');

if (!container || !scaleX || !scaleY || !scaleZ || !rotZ) {
  console.warn('Ellipsoid controls not found; skipping 3D setup.');
} else {
  initEllipsoid();
}

function initEllipsoid() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fffdf8');

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(3, 2.2, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.minDistance = 2.5;
  controls.maxDistance = 7;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(4, 4, 3);
  scene.add(keyLight);

  const grid = new THREE.GridHelper(6, 12, 0xd8cbb9, 0xe8e0d6);
  grid.position.y = -1.4;
  scene.add(grid);

  const geometry = new THREE.SphereGeometry(1, 64, 48);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd9643a,
    roughness: 0.35,
    metalness: 0.05
  });
  const ellipsoid = new THREE.Mesh(geometry, material);
  scene.add(ellipsoid);

  function updateEllipsoid() {
    const sx = parseFloat(scaleX.value);
    const sy = parseFloat(scaleY.value);
    const sz = parseFloat(scaleZ.value);
    const rot = THREE.MathUtils.degToRad(parseFloat(rotZ.value));

    ellipsoid.scale.set(sx, sy, sz);
    ellipsoid.rotation.set(0, 0, rot);

    scaleXValue.textContent = sx.toFixed(2);
    scaleYValue.textContent = sy.toFixed(2);
    scaleZValue.textContent = sz.toFixed(2);
    rotZValue.textContent = Math.round(parseFloat(rotZ.value)) + '°';
  }

  function resize() {
    const size = Math.max(320, container.clientWidth || 0);
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(() => {
    resize();
  });
  ro.observe(container);

  [scaleX, scaleY, scaleZ, rotZ].forEach((input) => {
    input.addEventListener('input', updateEllipsoid);
  });

  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  updateEllipsoid();
  resize();
  animate();
}
