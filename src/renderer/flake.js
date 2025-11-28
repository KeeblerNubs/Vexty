const canvas = document.getElementById("flake-canvas");
const ctx = canvas.getContext("2d");

const colsInput = document.getElementById("grid-cols");
const rowsInput = document.getElementById("grid-rows");
const shapeTypeSelect = document.getElementById("shape-type");
const densityInput = document.getElementById("density");
const noiseAmpInput = document.getElementById("noise-amp");
const noiseSpeedInput = document.getElementById("noise-speed");
const animateSelect = document.getElementById("animate");
const btnReroll = document.getElementById("btn-flake-reroll");
const btnExportPng = document.getElementById("btn-export-png");
const statusLabel = document.getElementById("flake-status");
const metaLabel = document.getElementById("flake-meta");

let seed = Math.random() * 10000;
let lastTime = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

function rnd(n) {
  const x = Math.sin(n * 9283.133 + seed * 0.137) * 43758.5453;
  return x - Math.floor(x);
}

function drawShape(type, x, y, size, phase) {
  const r = size * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(phase * 6.283) * 0.25);
  ctx.beginPath();
  if (type === "circle") {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (type === "square") {
    ctx.rect(-r, -r, r * 2, r * 2);
  } else if (type === "triangle") {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, r);
    ctx.lineTo(-r, r);
    ctx.closePath();
  } else if (type === "hex") {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function render(time) {
  if (!canvas.width || !canvas.height) resizeCanvas();

  const t = time * 0.001;
  const cols = parseInt(colsInput.value, 10) || 24;
  const rows = parseInt(rowsInput.value, 10) || 14;
  const density = parseFloat(densityInput.value) || 0.85;
  const noiseAmp = parseFloat(noiseAmpInput.value) || 24;
  const noiseSpeed = parseFloat(noiseSpeedInput.value) || 1.2;
  const animate = animateSelect.value === "on";
  const shapeMode = shapeTypeSelect.value;

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = "#050314";
  ctx.fillRect(0, 0, w, h);

  const cellW = w / cols;
  const cellH = h / rows;
  const baseSize = Math.min(cellW, cellH) * 0.7;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const r = rnd(idx);
      if (r > density) continue;

      const cx = (x + 0.5) * cellW;
      const cy = (y + 0.5) * cellH;

      const noisePhase = t * noiseSpeed + r * 10;
      const offsetX = Math.sin(noisePhase * 1.3) * noiseAmp;
      const offsetY = Math.cos(noisePhase * 1.7) * noiseAmp;

      const finalX = cx + (animate ? offsetX : 0);
      const finalY = cy + (animate ? offsetY : 0);

      const sizeJitter = 0.6 + r * 0.8;
      const size = baseSize * sizeJitter;

      const hue = 260 + r * 40;
      const sat = 60 + r * 30;
      const light = 45 + Math.sin(noisePhase * 2.0) * 15;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;

      let type = shapeMode;
      if (shapeMode === "mix") {
        const mod = Math.floor(r * 5) % 4;
        type = ["circle", "square", "triangle", "hex"][mod];
      }

      drawShape(type, finalX, finalY, size, noisePhase);
    }
  }

  metaLabel.textContent = `${cols}×${rows} · density ${density.toFixed(2)}`;
  if (animate) requestAnimationFrame(render);
}

animateSelect.addEventListener("change", () => {
  if (animateSelect.value === "on") {
    statusLabel.textContent = "Looping.";
    requestAnimationFrame(render);
  } else {
    statusLabel.textContent = "Still.";
  }
});
[colsInput, rowsInput, shapeTypeSelect, densityInput, noiseAmpInput, noiseSpeedInput].forEach((el) => {
  el.addEventListener("input", () => {
    statusLabel.textContent = "Updated parameters.";
    requestAnimationFrame(render);
  });
});
btnReroll.addEventListener("click", () => {
  seed = Math.random() * 10000;
  statusLabel.textContent = "Seed rerolled.";
  requestAnimationFrame(render);
});
btnExportPng.addEventListener("click", () => {
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "flake_pattern.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  statusLabel.textContent = "PNG exported.";
});

resizeCanvas();
requestAnimationFrame(render);
statusLabel.textContent = "Ready.";
