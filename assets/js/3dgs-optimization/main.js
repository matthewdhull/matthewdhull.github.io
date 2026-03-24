(function () {
  const W = 320;
  const H = 320;
  const N = W * H;

  const refCanvas = document.getElementById("opt-ref-canvas");
  const predCanvas = document.getElementById("opt-pred-canvas");
  const errCanvas = document.getElementById("opt-error-canvas");
  if (!refCanvas || !predCanvas || !errCanvas) return;

  const refCtx = refCanvas.getContext("2d");
  const predCtx = predCanvas.getContext("2d");
  const errCtx = errCanvas.getContext("2d");

  const stepBtn = document.getElementById("opt-step");
  const play10Btn = document.getElementById("opt-play10");
  const playPauseBtn = document.getElementById("opt-playpause");
  const resetBtn = document.getElementById("opt-reset");
  const lrInput = document.getElementById("opt-lr");
  const lrValue = document.getElementById("opt-lr-value");
  const iterEl = document.getElementById("opt-iter");
  const lossEl = document.getElementById("opt-loss");

  const gradEls = {
    mux: document.getElementById("opt-grad-mux"),
    sx: document.getElementById("opt-grad-sx"),
    sy: document.getElementById("opt-grad-sy"),
    theta: document.getElementById("opt-grad-theta"),
    alpha: document.getElementById("opt-grad-alpha"),
  };
  const gradRows = Array.from(document.querySelectorAll(".gso-grad-table tr[data-param]"));
  let activeParam = "";
  let isPlaying = false;
  let rafId = 0;

  function drawPredictionOverlay(ctx, params) {
    const c = Math.cos(params.theta);
    const s = Math.sin(params.theta);
    const ux = c;
    const uy = s;
    const vx = -s;
    const vy = c;
    const cx = params.mux;
    const cy = params.muy;
    const lenU = params.sx * 1.25;
    const lenV = params.sy * 1.25;

    const u1x = cx - ux * lenU;
    const u1y = cy - uy * lenU;
    const u2x = cx + ux * lenU;
    const u2y = cy + uy * lenU;
    const v1x = cx - vx * lenV;
    const v1y = cy - vy * lenV;
    const v2x = cx + vx * lenV;
    const v2y = cy + vy * lenV;

    const alphaU = activeParam === "sx" ? 1 : 0.74;
    const alphaV = activeParam === "sy" ? 1 : 0.74;
    const alphaC = activeParam === "mu" ? 1 : 0.9;

    ctx.save();
    ctx.lineCap = "round";

    function drawArrowLine(x1, y1, x2, y2, color, width) {
      const hx = x2 - x1;
      const hy = y2 - y1;
      const len = Math.hypot(hx, hy) || 1;
      const uxN = hx / len;
      const uyN = hy / len;
      const headL = 7;
      const headW = 5;

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      function headAt(px, py, dir) {
        const tx = uxN * dir;
        const ty = uyN * dir;
        const bx = px - tx * headL;
        const by = py - ty * headL;
        const nx = -ty;
        const ny = tx;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(bx + nx * headW * 0.5, by + ny * headW * 0.5);
        ctx.lineTo(bx - nx * headW * 0.5, by - ny * headW * 0.5);
        ctx.closePath();
        ctx.fill();
      }

      headAt(x2, y2, 1);
      headAt(x1, y1, -1);
    }

    drawArrowLine(u1x, u1y, u2x, u2y, `rgba(2,136,209,${alphaU})`, activeParam === "sx" ? 3.0 : 2.05);
    drawArrowLine(v1x, v1y, v2x, v2y, `rgba(227,93,47,${alphaV})`, activeParam === "sy" ? 3.0 : 2.05);

    ctx.fillStyle = `rgba(239,108,0,${alphaC})`;
    ctx.beginPath();
    ctx.arc(cx, cy, activeParam === "mu" ? 4.4 : 3.6, 0, Math.PI * 2);
    ctx.fill();

    const arcRadius = Math.max(params.sx, params.sy) * 0.72;
    // Place theta arc explicitly in the lower-left quadrant for visibility.
    const thetaArcStart = Math.PI * 0.62;
    const thetaArcEnd = Math.PI * 0.98;
    const thetaAnchor = {
      x: cx + Math.cos((thetaArcStart + thetaArcEnd) * 0.5) * arcRadius,
      y: cy + Math.sin((thetaArcStart + thetaArcEnd) * 0.5) * arcRadius,
    };
    const alphaAnchor = {
      // Push alpha anchor into the lower-right quadrant for better separation.
      x: cx + params.sx * 0.92,
      y: cy + params.sy * 0.82,
    };

    ctx.strokeStyle = activeParam === "theta" ? "rgba(106,27,154,0.95)" : "rgba(106,27,154,0.75)";
    ctx.lineWidth = activeParam === "theta" ? 2.6 : 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, arcRadius, thetaArcStart, thetaArcEnd);
    ctx.stroke();
    {
      const ex = cx + Math.cos(thetaArcEnd) * arcRadius;
      const ey = cy + Math.sin(thetaArcEnd) * arcRadius;
      // Tangent of circle at arc end for proper arrow-head alignment.
      const tx = -Math.sin(thetaArcEnd);
      const ty = Math.cos(thetaArcEnd);
      const nx = -ty;
      const ny = tx;
      const headLen = 7.5;
      const headW = 5.6;
      const bx = ex - tx * headLen;
      const by = ey - ty * headLen;
      ctx.fillStyle = activeParam === "theta" ? "rgba(106,27,154,0.95)" : "rgba(106,27,154,0.8)";
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(bx + nx * headW * 0.5, by + ny * headW * 0.5);
      ctx.lineTo(bx - nx * headW * 0.5, by - ny * headW * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    if (activeParam === "alpha") {
      ctx.strokeStyle = "rgba(46,125,50,0.92)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, params.sx * 1.35, params.sy * 1.35, params.theta, 0, Math.PI * 2);
      ctx.stroke();
    }

    function parseLabel(label) {
      const segments = [];
      for (let i = 0; i < label.length; i += 1) {
        const ch = label[i];
        if (ch === "_" && i > 0 && i + 1 < label.length) {
          const next = label[i + 1];
          segments.push({ text: next, subscript: true });
          i += 1;
        } else {
          segments.push({ text: ch, subscript: false });
        }
      }
      return segments;
    }

    function drawLabelText(label, x, y, color) {
      const mainFont = "italic 17px Georgia, serif";
      const subFont = "italic 12px Georgia, serif";
      const segments = parseLabel(label);
      let totalWidth = 0;

      segments.forEach((segment) => {
        ctx.font = segment.subscript ? subFont : mainFont;
        totalWidth += ctx.measureText(segment.text).width;
      });

      let cursorX = x - totalWidth * 0.5;
      segments.forEach((segment) => {
        ctx.font = segment.subscript ? subFont : mainFont;
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const segWidth = ctx.measureText(segment.text).width;
        const segY = segment.subscript ? y + 4 : y + 0.5;
        ctx.fillText(segment.text, cursorX, segY);
        cursorX += segWidth;
      });
    }

    function measureLabelWidth(label) {
      const mainFont = "italic 17px Georgia, serif";
      const subFont = "italic 12px Georgia, serif";
      return parseLabel(label).reduce((width, segment) => {
        ctx.font = segment.subscript ? subFont : mainFont;
        return width + ctx.measureText(segment.text).width;
      }, 0);
    }

    function drawCallout(label, lx, ly, ax, ay, color, isActive, attachTop) {
      const padX = 9;
      const padY = 5;
      const tw = measureLabelWidth(label);
      const bw = tw + padX * 2;
      const bh = 28;
      const bx = lx - bw / 2;
      const by = ly - bh / 2;

      ctx.strokeStyle = isActive ? "rgba(37,58,87,0.95)" : "rgba(84,110,141,0.48)";
      ctx.lineWidth = isActive ? 1.6 : 1.15;
      const nodeY = attachTop ? by : by + bh;
      ctx.beginPath();
      ctx.moveTo(lx, nodeY);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      ctx.fillStyle = "rgba(247,250,255,0.9)";
      ctx.strokeStyle = "rgba(170,190,216,0.82)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 2);
      ctx.fill();
      ctx.stroke();

      drawLabelText(label, lx, ly, color);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lx, nodeY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const xLeft = W * 0.25;
    const xMu = W * 0.455;
    const xDeltaY = W * 0.675;
    const xDeltaX = W * 0.84;
    const yTop = H * 0.075;
    const yBottom = H * 0.93;
    drawCallout("μ_x, μ_y", xMu, yTop, cx, cy, "#ef6c00", activeParam === "mu", false);
    // Order and anchors chosen to keep connector lines from crossing.
    drawCallout("δ_y", xDeltaY, yTop, v2x, v2y, "#e35d2f", activeParam === "sy", false);
    drawCallout("δ_x", xDeltaX, yTop, u2x, u2y, "#0288d1", activeParam === "sx", false);
    drawCallout("θ", xLeft, yBottom, thetaAnchor.x, thetaAnchor.y, "#6a1b9a", activeParam === "theta", true);
    drawCallout("α", W * 0.39, yBottom, alphaAnchor.x, alphaAnchor.y, "#2e7d32", activeParam === "alpha", true);

    ctx.restore();
  }

  const PURPLE = [94 / 255, 73 / 255, 235 / 255];
  const BG = [0.96, 0.97, 0.99];

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function makeReferenceGaussian(width, height) {
    const arr = new Float32Array(width * height * 3);
    const scalar = new Float32Array(width * height);
    const cx = width * 0.42;
    const cy = height * 0.52;
    const sx = Math.min(width, height) * 0.12;
    const sy = Math.min(width, height) * 0.12;
    const alpha = 0.95;
    const invsx2 = 1 / (sx * sx);
    const invsy2 = 1 / (sy * sy);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 3;
        const idp = y * width + x;
        const dx = x - cx;
        const dy = y - cy;
        const g = Math.exp(-0.5 * (dx * dx * invsx2 + dy * dy * invsy2));
        const t = alpha * g;
        scalar[idp] = t;
        arr[idx] = BG[0] * (1 - t) + PURPLE[0] * t;
        arr[idx + 1] = BG[1] * (1 - t) + PURPLE[1] * t;
        arr[idx + 2] = BG[2] * (1 - t) + PURPLE[2] * t;
      }
    }
    return { rgb: arr, scalar };
  }

  function drawFloatImage(ctx, arr, width, height) {
    const img = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i += 1) {
      const j = i * 4;
      const k = i * 3;
      img.data[j] = Math.round(clamp(arr[k], 0, 1) * 255);
      img.data[j + 1] = Math.round(clamp(arr[k + 1], 0, 1) * 255);
      img.data[j + 2] = Math.round(clamp(arr[k + 2], 0, 1) * 255);
      img.data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  const refPack = makeReferenceGaussian(W, H);
  const ref = refPack.rgb;
  const refScalar = refPack.scalar;
  drawFloatImage(refCtx, ref, W, H);
  const refCenter = { x: W * 0.42, y: H * 0.52 };

  const initState = {
    mux: W * 0.70,
    muy: H * 0.30,
    sx: 26.0,
    sy: 20.0,
    theta: 0.4,
    alpha: 0.72,
  };
  const state = { ...initState };
  let iter = 0;

  function renderSingle(params) {
    const out = new Float32Array(W * H * 3);
    const predScalar = new Float32Array(W * H);
    const c = Math.cos(params.theta);
    const s = Math.sin(params.theta);
    const invsx2 = 1 / (params.sx * params.sx);
    const invsy2 = 1 / (params.sy * params.sy);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const idp = y * W + x;
        const idx = idp * 3;
        const dx = x - params.mux;
        const dy = y - params.muy;
        const xr = c * dx + s * dy;
        const yr = -s * dx + c * dy;
        const q = xr * xr * invsx2 + yr * yr * invsy2;
        const g = Math.exp(-0.5 * q);
        const a = params.alpha * g;
        predScalar[idp] = a;
        out[idx] = BG[0] * (1 - a) + PURPLE[0] * a;
        out[idx + 1] = BG[1] * (1 - a) + PURPLE[1] * a;
        out[idx + 2] = BG[2] * (1 - a) + PURPLE[2] * a;
      }
    }
    return { rgb: out, scalar: predScalar };
  }

  function computeLossAndGrad(params, predScalar) {
    const c = Math.cos(params.theta);
    const s = Math.sin(params.theta);
    const sx = Math.max(2.0, params.sx);
    const sy = Math.max(2.0, params.sy);
    const invsx2 = 1 / (sx * sx);
    const invsy2 = 1 / (sy * sy);
    const sx3 = sx * sx * sx;
    const sy3 = sy * sy * sy;

    let loss = 0;
    let gmux = 0;
    let gmuy = 0;
    let gsx = 0;
    let gsy = 0;
    let gth = 0;
    let ga = 0;
    const errOut = new Float32Array(W * H * 3);

    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const idp = y * W + x;
        const idx = idp * 3;
        const dx = x - params.mux;
        const dy = y - params.muy;
        const xr = c * dx + s * dy;
        const yr = -s * dx + c * dy;
        const q = xr * xr * invsx2 + yr * yr * invsy2;
        const g = Math.exp(-0.5 * q);

        const predVal = predScalar[idp];
        const refVal = refScalar[idp];
        const e = predVal - refVal;
        loss += e * e;
        const absE = Math.min(1, Math.abs(e) * 2.2);
        errOut[idx] = absE;
        errOut[idx + 1] = absE;
        errOut[idx + 2] = absE * 0.15;

        const dAdMux = params.alpha * g * ((xr * c) * invsx2 - (yr * s) * invsy2);
        const dAdMuy = params.alpha * g * ((xr * s) * invsx2 + (yr * c) * invsy2);
        const dAdSx = params.alpha * g * (xr * xr / sx3);
        const dAdSy = params.alpha * g * (yr * yr / sy3);
        const dAdTheta = params.alpha * g * xr * yr * (invsy2 - invsx2);
        const dAdAlpha = g;

        gmux += e * dAdMux;
        gmuy += e * dAdMuy;
        gsx += e * dAdSx;
        gsy += e * dAdSy;
        gth += e * dAdTheta;
        ga += e * dAdAlpha;
      }
    }
    const scale = 2 / N;
    return {
      loss: loss / N,
      grads: {
        mux: gmux * scale,
        muy: gmuy * scale,
        sx: gsx * scale,
        sy: gsy * scale,
        theta: gth * scale,
        alpha: ga * scale,
      },
      err: errOut,
    };
  }

  function showStats(loss, grads) {
    iterEl.textContent = String(iter);
    lossEl.textContent = loss.toFixed(6);
    if (gradEls.mux) gradEls.mux.textContent = `${grads.mux.toFixed(6)}, ${grads.muy.toFixed(6)}`;
    if (gradEls.sx) gradEls.sx.textContent = grads.sx.toFixed(6);
    if (gradEls.sy) gradEls.sy.textContent = grads.sy.toFixed(6);
    if (gradEls.theta) gradEls.theta.textContent = grads.theta.toFixed(6);
    if (gradEls.alpha) gradEls.alpha.textContent = grads.alpha.toFixed(6);
  }

  function stepSingle() {
    const pred = renderSingle(state);
    const out = computeLossAndGrad(state, pred.scalar);
    const lr = parseFloat(lrInput.value);
    const centerReg = 0.006;
    const gMux = out.grads.mux + centerReg * (state.mux - refCenter.x);
    const gMuy = out.grads.muy + centerReg * (state.muy - refCenter.y);
    const gSx = out.grads.sx;
    const gSy = out.grads.sy;
    const gTheta = out.grads.theta;
    const gAlpha = out.grads.alpha;

    state.mux -= lr * 420.0 * gMux;
    state.muy -= lr * 420.0 * gMuy;
    state.sx = clamp(state.sx - lr * 320.0 * gSx, 4.0, 120);
    state.sy = clamp(state.sy - lr * 320.0 * gSy, 4.0, 120);
    state.theta -= lr * 80.0 * gTheta;
    state.alpha = clamp(state.alpha - lr * 28.0 * gAlpha, 0.02, 1.35);
    iter += 1;

    const pred2 = renderSingle(state);
    const out2 = computeLossAndGrad(state, pred2.scalar);
    drawFloatImage(predCtx, pred2.rgb, W, H);
    drawPredictionOverlay(predCtx, state);
    drawFloatImage(errCtx, out2.err, W, H);
    showStats(out2.loss, out2.grads);
  }

  function resetSingle() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    isPlaying = false;
    if (playPauseBtn) playPauseBtn.textContent = "Play";
    Object.assign(state, initState);
    iter = 0;
    const pred = renderSingle(state);
    const out = computeLossAndGrad(state, pred.scalar);
    drawFloatImage(predCtx, pred.rgb, W, H);
    drawPredictionOverlay(predCtx, state);
    drawFloatImage(errCtx, out.err, W, H);
    showStats(out.loss, out.grads);
  }

  lrInput.addEventListener("input", () => {
    lrValue.textContent = parseFloat(lrInput.value).toFixed(2);
  });
  stepBtn.addEventListener("click", stepSingle);
  play10Btn.addEventListener("click", () => {
    for (let k = 0; k < 10; k += 1) stepSingle();
  });
  if (playPauseBtn) {
    const tick = () => {
      if (!isPlaying) return;
      for (let i = 0; i < 4; i += 1) stepSingle();
      rafId = window.requestAnimationFrame(tick);
    };
    playPauseBtn.addEventListener("click", () => {
      isPlaying = !isPlaying;
      playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
      if (isPlaying) {
        rafId = window.requestAnimationFrame(tick);
      } else if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    });
  }
  resetBtn.addEventListener("click", resetSingle);

  gradRows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      activeParam = row.dataset.param || "";
      gradRows.forEach((r) => r.classList.remove("gso-active-row"));
      row.classList.add("gso-active-row");
      const pred = renderSingle(state);
      drawFloatImage(predCtx, pred.rgb, W, H);
      drawPredictionOverlay(predCtx, state);
    });
    row.addEventListener("mouseleave", () => {
      activeParam = "";
      row.classList.remove("gso-active-row");
      const pred = renderSingle(state);
      drawFloatImage(predCtx, pred.rgb, W, H);
      drawPredictionOverlay(predCtx, state);
    });
  });

  // Multi demo
  const mRef = document.getElementById("opt-multi-ref-canvas");
  const mPred = document.getElementById("opt-multi-pred-canvas");
  const mStep = document.getElementById("opt-multi-step");
  const mPlay10 = document.getElementById("opt-multi-play10");
  const mReset = document.getElementById("opt-multi-reset");
  const mLoss = document.getElementById("opt-multi-loss");

  function makeRefMulti(width, height) {
    const arr = new Float32Array(width * height * 3);
    const cx = width * 0.5;
    const cy = height * 0.52;
    const r = Math.min(width, height) * 0.3;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 3;
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const t = clamp(1 - d / r, 0, 1);
        arr[idx] = BG[0] * (1 - t) + PURPLE[0] * t;
        arr[idx + 1] = BG[1] * (1 - t) + PURPLE[1] * t;
        arr[idx + 2] = BG[2] * (1 - t) + PURPLE[2] * t;
      }
    }
    return arr;
  }

  if (mRef && mPred && mStep && mPlay10 && mReset && mLoss) {
    const MW = mRef.width;
    const MH = mRef.height;
    const mRefCtx = mRef.getContext("2d");
    const mPredCtx = mPred.getContext("2d");
    const refMulti = makeRefMulti(MW, MH);
    drawFloatImage(mRefCtx, refMulti, MW, MH);

    const points = [];
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      points.push({
        mux: MW * 0.5 + Math.cos(a) * 48,
        muy: MH * 0.52 + Math.sin(a) * 36,
        sx: 10,
        sy: 10,
        theta: 0,
        alpha: 0.32,
      });
    }
    const initPoints = points.map((p) => ({ ...p }));
    let mIter = 0;

    function renderMulti(arrPts) {
      const out = new Float32Array(MW * MH * 3);
      for (let y = 0; y < MH; y += 1) {
        for (let x = 0; x < MW; x += 1) {
          let aSum = 0;
          for (let k = 0; k < arrPts.length; k += 1) {
            const p = arrPts[k];
            const c = Math.cos(p.theta);
            const s = Math.sin(p.theta);
            const dx = x - p.mux;
            const dy = y - p.muy;
            const xr = c * dx + s * dy;
            const yr = -s * dx + c * dy;
            const g = Math.exp(-0.5 * ((xr * xr) / (p.sx * p.sx) + (yr * yr) / (p.sy * p.sy)));
            aSum += p.alpha * g;
          }
          const a = clamp(aSum, 0, 1);
          const idx = (y * MW + x) * 3;
          out[idx] = BG[0] * (1 - a) + PURPLE[0] * a;
          out[idx + 1] = BG[1] * (1 - a) + PURPLE[1] * a;
          out[idx + 2] = BG[2] * (1 - a) + PURPLE[2] * a;
        }
      }
      return out;
    }

    function stepMulti() {
      if (mIter >= 60) return;
      const pred = renderMulti(points);
      let loss = 0;
      const grads = points.map(() => ({ mux: 0, muy: 0, sx: 0, sy: 0, theta: 0, alpha: 0 }));

      for (let y = 0; y < MH; y += 1) {
        for (let x = 0; x < MW; x += 1) {
          const idx = (y * MW + x) * 3;
          const e0 = pred[idx] - refMulti[idx];
          const e1 = pred[idx + 1] - refMulti[idx + 1];
          const e2 = pred[idx + 2] - refMulti[idx + 2];
          loss += e0 * e0 + e1 * e1 + e2 * e2;
          const w = e0 * (PURPLE[0] - BG[0]) + e1 * (PURPLE[1] - BG[1]) + e2 * (PURPLE[2] - BG[2]);

          for (let k = 0; k < points.length; k += 1) {
            const p = points[k];
            const c = Math.cos(p.theta);
            const s = Math.sin(p.theta);
            const dx = x - p.mux;
            const dy = y - p.muy;
            const sx = Math.max(2.0, p.sx);
            const sy = Math.max(2.0, p.sy);
            const invsx2 = 1 / (sx * sx);
            const invsy2 = 1 / (sy * sy);
            const xr = c * dx + s * dy;
            const yr = -s * dx + c * dy;
            const g = Math.exp(-0.5 * (xr * xr * invsx2 + yr * yr * invsy2));

            grads[k].mux += w * p.alpha * g * ((xr * c) * invsx2 - (yr * s) * invsy2);
            grads[k].muy += w * p.alpha * g * ((xr * s) * invsx2 + (yr * c) * invsy2);
            grads[k].sx += w * p.alpha * g * (xr * xr / (sx * sx * sx));
            grads[k].sy += w * p.alpha * g * (yr * yr / (sy * sy * sy));
            grads[k].theta += w * p.alpha * g * xr * yr * (invsy2 - invsx2);
            grads[k].alpha += w * g;
          }
        }
      }
      const lr = 0.06;
      const scale = 2 / (MW * MH * 3);
      for (let k = 0; k < points.length; k += 1) {
        points[k].mux -= lr * grads[k].mux * scale;
        points[k].muy -= lr * grads[k].muy * scale;
        points[k].sx = clamp(points[k].sx - lr * grads[k].sx * scale, 2.0, 40);
        points[k].sy = clamp(points[k].sy - lr * grads[k].sy * scale, 2.0, 40);
        points[k].theta -= lr * grads[k].theta * scale;
        points[k].alpha = clamp(points[k].alpha - lr * grads[k].alpha * scale, 0.01, 0.6);
      }
      mIter += 1;
      const p2 = renderMulti(points);
      drawFloatImage(mPredCtx, p2, MW, MH);
      mLoss.textContent = (loss / (MW * MH * 3)).toFixed(6);
    }

    function resetMulti() {
      for (let i = 0; i < points.length; i += 1) Object.assign(points[i], initPoints[i]);
      mIter = 0;
      const p = renderMulti(points);
      drawFloatImage(mPredCtx, p, MW, MH);
      let l = 0;
      for (let i = 0; i < p.length; i += 1) {
        const e = p[i] - refMulti[i];
        l += e * e;
      }
      mLoss.textContent = (l / (MW * MH * 3)).toFixed(6);
    }

    mStep.addEventListener("click", stepMulti);
    mPlay10.addEventListener("click", () => {
      for (let k = 0; k < 10; k += 1) stepMulti();
    });
    mReset.addEventListener("click", resetMulti);
    resetMulti();
  }

  resetSingle();
})();
