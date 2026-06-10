/* Guided-explainer popover: paged panels (X / N), colored emphasis text, a close
   X, prev/next + progress slider, a clickable badge that opens a chapter menu,
   and per-step enter/exit hooks (to highlight chart parts, point a hand, etc.).
   Non-modal: the rest of the app stays interactive underneath. */

export function createTour(steps, opts = {}) {
  let idx = 0;
  let curStep = null;

  const overlay = document.createElement("div");
  overlay.className = "xw-tour-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = `
    <div class="xw-tour" role="dialog" aria-label="Guided tour">
      <button class="xw-tour-x" aria-label="Close">&times;</button>
      <h3 class="xw-tour-title"></h3>
      <div class="xw-tour-body"></div>
      <div class="xw-tour-foot">
        <button class="xw-tour-prev" aria-label="Previous">&lsaquo;</button>
        <input class="xw-tour-progress" type="range" min="1" step="1" />
        <button class="xw-tour-badge" aria-haspopup="true"></button>
        <button class="xw-tour-next" aria-label="Next">&rsaquo;</button>
      </div>
      <div class="xw-tour-menu" hidden></div>
    </div>`;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector(".xw-tour");
  const titleEl = overlay.querySelector(".xw-tour-title");
  const bodyEl = overlay.querySelector(".xw-tour-body");
  const prevB = overlay.querySelector(".xw-tour-prev");
  const nextB = overlay.querySelector(".xw-tour-next");
  const xB = overlay.querySelector(".xw-tour-x");
  const badge = overlay.querySelector(".xw-tour-badge");
  const prog = overlay.querySelector(".xw-tour-progress");
  const menu = overlay.querySelector(".xw-tour-menu");
  prog.max = steps.length;

  // chapter menu
  steps.forEach((s, i) => {
    const item = document.createElement("button");
    item.className = "xw-tour-menu-item";
    item.textContent = `${i + 1}. ${s.title}`;
    item.addEventListener("click", () => { menu.hidden = true; goto(i); });
    menu.appendChild(item);
  });

  // pointer-hand pool
  const hands = [];
  let handCount = 0;
  function getHand(i) {
    while (hands.length <= i) {
      const h = document.createElement("div");
      h.className = "xw-tour-hand";
      h.innerHTML = `<span class="xw-hand-em"></span>`;
      h.style.display = "none";
      overlay.appendChild(h);
      hands.push(h);
    }
    return hands[i];
  }
  function positionHand(hand, el, dir) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    hand.style.display = "";
    const em = { up: "\u{1F446}", down: "\u{1F447}", left: "\u{1F448}", right: "\u{1F449}" }[dir] || "\u{1F446}";
    hand.querySelector(".xw-hand-em").textContent = em;
    let x, y, tx;
    if (dir === "up") { x = r.left + r.width / 2; y = r.bottom + 2; tx = "translate(-50%,0)"; }
    else if (dir === "down") { x = r.left + r.width / 2; y = r.top - 30; tx = "translate(-50%,0)"; }
    else if (dir === "left") { x = r.right + 2; y = r.top + r.height / 2; tx = "translate(0,-50%)"; }
    else { x = r.left - 30; y = r.top + r.height / 2; tx = "translate(0,-50%)"; }
    hand.style.left = x + "px"; hand.style.top = y + "px"; hand.style.transform = tx;
  }

  const ctx = {
    pointAt(el, dir = "up") { positionHand(getHand(handCount++), el, dir); },
    clearPointers() { hands.forEach((h) => (h.style.display = "none")); handCount = 0; },
  };

  let lastD = null, lastBodyHtml = "", isOpen = false;

  function renderChrome() {
    titleEl.textContent = steps[idx].title;
    badge.textContent = `${idx + 1} / ${steps.length}`;
    prog.value = idx + 1;
    prevB.disabled = idx === 0;
    nextB.disabled = idx === steps.length - 1;
    menu.hidden = true;
  }
  // body may be a string or a function of the live derived state (so the copy
  // updates as the user drags the sliders). Re-typeset only when the text changes.
  function renderBody() {
    const s = steps[idx];
    const html = typeof s.body === "function" ? s.body(lastD || {}) : s.body;
    if (html === lastBodyHtml) return;
    lastBodyHtml = html;
    bodyEl.innerHTML = html;
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([bodyEl]).catch(() => {});
  }
  function positionPointers() {
    ctx.clearPointers();
    if (steps[idx].point) steps[idx].point(ctx, lastD || {});
  }

  function goto(i) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    if (curStep && curStep.exit) curStep.exit(ctx);
    idx = i;
    curStep = steps[idx];
    lastBodyHtml = "";
    renderChrome();
    if (curStep.enter) curStep.enter(ctx, lastD || {});   // may setState -> onState refreshes body/pointers
    renderBody();
    positionPointers();
  }

  // called by the app whenever state changes; refreshes the open panel
  function onState(d) {
    lastD = d;
    if (!isOpen) return;
    renderBody();
    positionPointers();
  }

  function open() { isOpen = true; overlay.style.display = ""; goto(0); }
  function close() {
    isOpen = false;
    if (curStep && curStep.exit) curStep.exit(ctx);
    ctx.clearPointers();
    curStep = null;
    overlay.style.display = "none";
    opts.onClose?.();
  }

  prevB.addEventListener("click", () => goto(idx - 1));
  nextB.addEventListener("click", () => goto(idx + 1));
  prog.addEventListener("input", () => goto(+prog.value - 1));
  xB.addEventListener("click", close);
  badge.addEventListener("click", () => { menu.hidden = !menu.hidden; });

  enableDrag(panel, titleEl);
  return { open, close, goto, onState };
}

// drag the panel by its title bar
function enableDrag(panel, handle) {
  handle.style.cursor = "grab";
  handle.addEventListener("pointerdown", (e) => {
    if (e.target !== handle) return;
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    panel.style.left = r.left + "px";
    panel.style.top = r.top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    const move = (ev) => { panel.style.left = ev.clientX - ox + "px"; panel.style.top = ev.clientY - oy + "px"; };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}
