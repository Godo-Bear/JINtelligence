/* Scratch pad: a drawing area for working things out, with pen colours, thickness, eraser, undo and clear.
   - Practice and tests get a plain scratch pad (just for you).
   - The AI Tutor's scratch pad also has "Send my working to the AI", which attaches your working as a picture.
   Draws with mouse, finger or pen. The drawing is kept until you clear it or leave the page. Used from app.js. */
const SCRATCH_COLOURS = ["#1b1b1b", "#1f5fd1", "#d12f2f", "#1c8a3e"];
let scratchSeq = 0;

function scratchPadHTML({ ai = false, open = false } = {}) {
  const id = `sp${++scratchSeq}`;
  return `
    <details class="scratch" data-scratch="${id}"${open ? " open" : ""}>
      <summary>✏️ Scratch pad <span class="muted small">${ai ? "· show your working and the AI can check it" : "· work things out here"}</span></summary>
      <div class="scratch-tools" role="toolbar" aria-label="Scratch pad tools">
        ${SCRATCH_COLOURS.map((c, i) => `<button type="button" class="sp-colour${i === 0 ? " on" : ""}" data-sp-colour="${c}" style="background:${c}" aria-label="Pen colour ${i + 1}"></button>`).join("")}
        <span class="sp-sep"></span>
        <button type="button" class="sp-size" data-sp-size="2" aria-label="Thin pen">S</button>
        <button type="button" class="sp-size on" data-sp-size="4" aria-label="Medium pen">M</button>
        <button type="button" class="sp-size" data-sp-size="8" aria-label="Thick pen">L</button>
        <span class="sp-sep"></span>
        <button type="button" class="btn ghost sm" data-sp-eraser aria-pressed="false">🧽 Eraser</button>
        <button type="button" class="btn ghost sm" data-sp-undo>↶ Undo</button>
        <button type="button" class="btn ghost sm" data-sp-clear>Clear</button>
      </div>
      <canvas class="scratch-canvas" width="1000" height="560" aria-label="Scratch pad drawing area"></canvas>
      ${ai ? `<div class="row" style="gap:8px; margin-top:8px;"><button type="button" class="btn sm" data-sp-send>📤 Send my working to the AI</button><span class="muted small">It's attached to your next message so the AI can check it.</span></div>` : ""}
    </details>`;
}

// Turns on drawing for every scratch pad inside `root`. onSend(dataUrl) is called for the AI pad's send button.
function wireScratchPad(root, { onSend } = {}) {
  $$("[data-scratch]", root).forEach((box) => {
    if (box.dataset.wired) return;
    box.dataset.wired = "1";
    const canvas = $("canvas", box), ctx = canvas.getContext("2d");
    const strokes = [];   // each: { colour, size, erase, points: [[x, y], …] }
    let colour = SCRATCH_COLOURS[0], size = 4, erase = false, drawing = null;
    const paper = () => { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); };
    const paint = (s) => {
      ctx.strokeStyle = s.erase ? "#ffffff" : s.colour; ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = s.erase ? s.size * 4 : s.size; ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (s.points.length === 1) { ctx.beginPath(); ctx.arc(s.points[0][0], s.points[0][1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.beginPath(); s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    };
    const redraw = () => { paper(); strokes.forEach(paint); };
    const at = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height]; };
    redraw();

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault(); canvas.setPointerCapture?.(e.pointerId);
      drawing = { colour, size, erase, points: [at(e)] }; strokes.push(drawing); paint(drawing);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing) return; e.preventDefault();
      drawing.points.push(at(e)); redraw();
    });
    const end = () => { drawing = null; };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end); canvas.addEventListener("pointerleave", end);

    const mark = (sel, on) => $$(sel, box).forEach((b) => b.classList.toggle("on", b === on));
    $$("[data-sp-colour]", box).forEach((b) => b.addEventListener("click", () => {
      colour = b.dataset.spColour; erase = false;
      const er = $("[data-sp-eraser]", box); er.setAttribute("aria-pressed", "false"); er.classList.remove("on");
      mark("[data-sp-colour]", b);
    }));
    $$("[data-sp-size]", box).forEach((b) => b.addEventListener("click", () => { size = +b.dataset.spSize; mark("[data-sp-size]", b); }));
    $("[data-sp-eraser]", box).addEventListener("click", (e) => {
      erase = !erase; e.currentTarget.setAttribute("aria-pressed", String(erase)); e.currentTarget.classList.toggle("on", erase);
    });
    $("[data-sp-undo]", box).addEventListener("click", () => { strokes.pop(); redraw(); });
    $("[data-sp-clear]", box).addEventListener("click", () => { strokes.length = 0; redraw(); });
    $("[data-sp-send]", box)?.addEventListener("click", () => {
      if (!strokes.length) return toast("Draw your working first, then send it.");
      onSend?.(canvas.toDataURL("image/png"));
    });
  });
}
