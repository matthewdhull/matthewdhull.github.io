<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Three.js Background with Varying Dot Size</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }
      
      canvas {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1; /* Keep the canvas in the background */
      }

      /* Style for the overlay text */
      .overlay-text {
        position: absolute;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 60px; /* Adjust the font size as needed */
        font-family: Arial, sans-serif;
        font-weight: bold;
        z-index: 1; /* Make sure text stays in front */
        text-align: center;
      }

      /* Style for the overlay intro */
      .overlay-intro {
        position: absolute;
        top: 37%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 25px; /* Adjust the font size as needed */
        font-family: Arial, sans-serif;
        z-index: 1; /* Make sure text stays in front */
        text-align: left;
      }
    </style>
  </head>
  <body>
    <!-- Regular HTML text overlay -->
    <!-- <div class="overlay-text">Matthew Hull</div>
    <div class="overlay-intro">Hi, I am a second year Machine Learning PhD student at Georgia Tech, advised by Polo Chau. My current research is in Adversarial Machine Learning using differentiable rendering. I am lead teaching assistant for the CSE 6242 - Data and Visual Analytics course offering at Georgia Tech as part of the Master’s of Science in Analytics and Master’s of Science in Computer Science programs. -->

    I have been a pilot for 20+ years and I am currently a Captain on the Boeing 767 aircraft for FedEx Express, based in the Bay Area of California.</div>

    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> -->
    <script type="importmap">
      {
        "imports": {
          "three": "./three/build/three.module.js",
          "three/addons/": "./three/examples/jsm/"
        }
      }
    </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script type="module">
      // import * as THREE from 'three';
			import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
			import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
			import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
			import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';      // Three.js scene setup
      
      const scene = new THREE.Scene();
      const aspect = window.innerWidth / window.innerHeight;
      const frustumSize = 7;
      const camera = new THREE.OrthographicCamera(
        (frustumSize * aspect) / -2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
      );
      
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      // Set camera position
      camera.position.z = 5;

      // Grid settings
      const rows = 400;
      const cols = 400;
      const baseDotSize = 0.025; // Base size for the dots
      const spacing = 0.055;

      // Top-left corner as the center for larger dots
      // const centerX = -rows / 2 * spacing;  // Align centerX to top-left corner
      // const centerY = cols / 2 * spacing;   // Align centerY to top-left corner
      const maxDotSize = 0.1;     // Max size of dots in the center region
      const falloffRadius = 4.5;    // Distance at which the dot size falls off to the base size

      // Predefined colors for gradient stops
      const colorA = new THREE.Color(127 / 255, 63 / 255, 98 / 255); 
      const colorB = new THREE.Color(213 / 255, 91 / 255, 73 / 255);
      const colorC = new THREE.Color(231 / 255, 132 / 255, 58 / 255);
      const colorD = new THREE.Color(234 / 255, 226 / 255, 118 / 255); 

      // Quantization step settings
      const steps = 5; // Number of quantized steps
      const quantizeFactor = 1 / steps;

      // Noise probability settings
      const noiseChance = 0.35; // Probability of shifting to neighboring color step

      // Metaballs data
      const metaballs = [
        { x: 4, y: 4, radius: 20 },
        { x: -2, y: 4, radius: 40 },
        { x: 7, y: 4, radius: 55 },
        { x: -4, y: -4, radius: 50 },
        { x: 2, y: -4, radius: 50 },
        { x: -2, y: -2, radius: 50 },
      ];

      // Function to calculate the metaball field value
      function metaballField(x, y) {
        let value = 0;
        for (let i = 0; i < metaballs.length; i++) {
          const metaball = metaballs[i];
          const dx = x - metaball.x;
          const dy = y - metaball.y;
          const distSquared = dx * dx + dy * dy;
          value += (metaball.radius * metaball.radius) / (distSquared + 1); 
        }
        value += Math.random() * 5; 
        return value;
      }

      // Helper function to apply quantization and noise
      function applyNoiseStep(normalizedDist) {
        const random = Math.random();
        if (random < noiseChance) {
          const shiftDirection = Math.random() < 0.5 ? -1 : 1;
          normalizedDist += quantizeFactor * shiftDirection;
          normalizedDist = Math.max(0, Math.min(1, normalizedDist)); // Clamp between 0 and 1
        }
        return normalizedDist;
      }

      // Generate a color based on metaball influence
      function getColor(x, y) {
        let metaballInfluence = metaballField(x, y);
        metaballInfluence += (Math.random() - 0.5) * 0.4 * metaballInfluence;

        let normalizedDist = metaballInfluence / 2000;
        normalizedDist = Math.floor(normalizedDist / quantizeFactor) * quantizeFactor;
        normalizedDist = applyNoiseStep(normalizedDist);

        if (normalizedDist < 0.33) {
          return colorA.clone().lerp(colorB, normalizedDist * 3);
        } else if (normalizedDist < 0.66) {
          return colorB.clone().lerp(colorC, (normalizedDist - 0.33) * 3);
        } else {
          return colorC.clone().lerp(colorD, (normalizedDist - 0.66) * 3);
        }
      }


      // Create the dot grid
      for (let i = -rows / 2; i < rows / 2; i++) {
        for (let j = -cols / 2; j < cols / 2; j++) {
          const color = getColor(i * spacing, j * spacing);
          const dotSize = baseDotSize 
          const geometry = new THREE.CircleGeometry(dotSize, 32); 
          const material = new THREE.MeshBasicMaterial({ color });
          const dot = new THREE.Mesh(geometry, material);
          dot.position.set(i * spacing, j * spacing, 0);
          scene.add(dot);
        }
      }

      const postprocessing = {};
			function initPostprocessing() {

        const renderPass = new RenderPass( scene, camera );

        const bokehPass = new BokehPass( scene, camera, {
          focus: 1.0,
          aperture: 0.025,
          maxblur: 0.01
        } );

        const outputPass = new OutputPass();

        const composer = new EffectComposer( renderer );

        composer.addPass( renderPass );
        composer.addPass( bokehPass );
        composer.addPass( outputPass );

        postprocessing.composer = composer;
        postprocessing.bokeh = bokehPass;

      }

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }

      initPostprocessing();

      animate();

      // Handle window resizing
      window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
    </script>
  </body>
</html>