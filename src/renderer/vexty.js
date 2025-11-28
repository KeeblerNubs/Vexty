const svgNS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);

const loadedFonts = new Set();
function ensureGoogleFontLoaded(family) {
  if (loadedFonts.has(family)) return;
  const friendly = family.replace(/ /g, "+");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=" + friendly + ":wght@400;700&display=swap";
  document.head.appendChild(link);
  loadedFonts.add(family);
}

const state = {
  layoutMode: "word",
  instances: [],
  selectedId: null,
  anim: { playing: false, startTime: null },
  animMode: "wave"
};

const textInput = $("text-input");
const fontSelect = $("font-select");
const fontSizeInput = $("font-size-input");
const modeWordBtn = $("mode-word");
const modeLettersBtn = $("mode-letters");
const btnGenerate = $("btn-generate");
const btnDuplicate = $("btn-duplicate");
const btnClear = $("btn-clear");
const posXRange = $("pos-x-range");
const posYRange = $("pos-y-range");
const scaleRange = $("scale-range");
const rotateRange = $("rotate-range");
const letterSpacingRange = $("letter-spacing-range");
const animDurationInput = $("anim-duration");
const animFpsInput = $("anim-fps");
const animSpeedInput = $("anim-speed");
const animAmpInput = $("anim-amp");
const animModeSelect = $("anim-mode");
const btnAnimToggle = $("btn-anim-toggle");
const btnExportGif = $("btn-export-gif");
const btnExportMp4 = $("btn-export-mp4");
const btnPresetSave = $("btn-preset-save");
const btnPresetLoad = $("btn-preset-load");
const presetJsonArea = $("preset-json");

const instancesRoot = $("instances-root");
const selectedLabel = $("selected-label");
const selectedIndicator = $("selected-indicator");
const instanceCountLabel = $("instance-count");
const svgCanvas = $("vexty-canvas");
const statusLabel = $("status-label");

function createInstanceId() {
  return "inst-" + Math.random().toString(36).slice(2, 9);
}
function currentSelectedInstance() {
  return state.instances.find((i) => i.id === state.selectedId) || null;
}
function updateInstanceCount() {
  instanceCountLabel.textContent = String(state.instances.length);
}
function setSelected(id) {
  state.selectedId = id;
  if (!id) {
    selectedLabel.textContent = "none";
    selectedIndicator.style.opacity = 0.25;
  } else {
    selectedLabel.textContent = id;
    selectedIndicator.style.opacity = 1;
  }
  Array.from(instancesRoot.children).forEach((g) => {
    if (g.getAttribute("data-id") === id) {
      g.style.filter = "url(#softGlow)";
    } else {
      g.style.filter = "";
    }
  });
  const inst = currentSelectedInstance();
  if (inst) {
    posXRange.value = inst.tx;
    posYRange.value = inst.ty;
    scaleRange.value = inst.scale;
    rotateRange.value = inst.rotation;
    letterSpacingRange.value = inst.letterSpacing;
  }
}
function clearCanvas() {
  state.instances = [];
  instancesRoot.innerHTML = "";
  setSelected(null);
  updateInstanceCount();
}
function buildInstanceFromControls() {
  const text = textInput.value || "";
  if (!text.length) return null;
  const fontFamily = fontSelect.value;
  const baseSize = parseFloat(fontSizeInput.value) || 80;
  const mode = state.layoutMode;
  ensureGoogleFontLoaded(fontFamily);

  const instId = createInstanceId();
  const g = document.createElementNS(svgNS, "g");
  g.setAttribute("data-id", instId);
  g.style.cursor = "pointer";

  const centerX = 1920 / 2;
  const centerY = 1080 / 2;

  const letters = [];
  if (mode === "word") {
    const textEl = document.createElementNS(svgNS, "text");
    textEl.setAttribute("x", centerX);
    textEl.setAttribute("y", centerY);
    textEl.setAttribute("fill", "#f5f5ff");
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("dominant-baseline", "middle");
    textEl.setAttribute("font-family", fontFamily);
    textEl.setAttribute("font-size", baseSize);
    textEl.textContent = text;
    g.appendChild(textEl);
    letters.push({ char: text, index: 0 });
  } else {
    const startX = centerX - (text.length * baseSize * 0.3);
    let cursorX = startX;
    const y = centerY;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const textEl = document.createElementNS(svgNS, "text");
      textEl.setAttribute("x", cursorX);
      textEl.setAttribute("y", y);
      textEl.setAttribute("fill", "#f5f5ff");
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("dominant-baseline", "middle");
      textEl.setAttribute("font-family", fontFamily);
      textEl.setAttribute("font-size", baseSize);
      textEl.textContent = ch === " " ? "·" : ch;
      g.appendChild(textEl);
      letters.push({ char: ch, index: i });
      const advance = (ch === " " ? 0.6 : 0.8) * baseSize;
      cursorX += advance;
    }
    g.setAttribute("transform", "translate(" + centerX + "," + centerY + ")");
  }

  const instance = {
    id: instId,
    type: mode,
    elements: letters,
    tx: 0,
    ty: 0,
    scale: 1,
    rotation: 0,
    letterSpacing: 0,
    baseFontSize: baseSize,
    fontFamily
  };

  g.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setSelected(instId);
  });

  instancesRoot.appendChild(g);
  state.instances.push(instance);
  updateInstanceCount();
  setSelected(instId);
  syncInstanceTransformToSvg(instance);
  return instance;
}
function syncInstanceTransformToSvg(instance) {
  const g = Array.from(instancesRoot.children).find(
    (node) => node.getAttribute("data-id") === instance.id
  );
  if (!g) return;
  const centerX = 1920 / 2;
  const centerY = 1080 / 2;
  const tx = instance.tx;
  const ty = instance.ty;
  const sc = instance.scale;
  const rot = instance.rotation;
  g.setAttribute(
    "transform",
    "translate(" + (centerX + tx) + "," + (centerY + ty) + ") rotate(" + rot + ") scale(" + sc + ")"
  );
  if (instance.type === "letters") {
    const spacing = instance.letterSpacing;
    const fontSize = instance.baseFontSize;
    let cursorX = 0;
    const children = Array.from(g.children);
    for (let i = 0; i < children.length; i++) {
      const ch = instance.elements[i]?.char || "";
      const textEl = children[i];
      const advance = (ch === " " ? 0.6 : 0.8) * fontSize;
      textEl.setAttribute("x", cursorX);
      textEl.setAttribute("y", 0);
      cursorX += advance + spacing;
    }
  } else {
    const textEl = g.querySelector("text");
    if (textEl) {
      textEl.setAttribute("font-size", instance.baseFontSize);
      textEl.setAttribute("font-family", instance.fontFamily);
      textEl.setAttribute("x", 0);
      textEl.setAttribute("y", 0);
    }
  }
}
function duplicateSelectedInstance() {
  const inst = currentSelectedInstance();
  if (!inst) return;
  const newId = createInstanceId();
  const newInstance = JSON.parse(JSON.stringify(inst));
  newInstance.id = newId;
  newInstance.tx += 40;
  newInstance.ty += 40;
  state.instances.push(newInstance);
  const oldG = Array.from(instancesRoot.children).find(
    (g) => g.getAttribute("data-id") === inst.id
  );
  if (!oldG) return;
  const newG = oldG.cloneNode(true);
  newG.setAttribute("data-id", newId);
  newG.style.filter = "";
  newG.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setSelected(newId);
  });
  instancesRoot.appendChild(newG);
  updateInstanceCount();
  syncInstanceTransformToSvg(newInstance);
  setSelected(newId);
}
function updateTransformFromSliders() {
  const inst = currentSelectedInstance();
  if (!inst) return;
  inst.tx = parseFloat(posXRange.value);
  inst.ty = parseFloat(posYRange.value);
  inst.scale = parseFloat(scaleRange.value);
  inst.rotation = parseFloat(rotateRange.value);
  inst.letterSpacing = parseFloat(letterSpacingRange.value);
  syncInstanceTransformToSvg(inst);
}

posXRange.addEventListener("input", updateTransformFromSliders);
posYRange.addEventListener("input", updateTransformFromSliders);
scaleRange.addEventListener("input", updateTransformFromSliders);
rotateRange.addEventListener("input", updateTransformFromSliders);
letterSpacingRange.addEventListener("input", updateTransformFromSliders);

function setLayoutMode(mode) {
  state.layoutMode = mode;
  if (mode === "word") {
    modeWordBtn.classList.add("active");
    modeLettersBtn.classList.remove("active");
  } else {
    modeLettersBtn.classList.add("active");
    modeWordBtn.classList.remove("active");
  }
}
modeWordBtn.addEventListener("click", () => setLayoutMode("word"));
modeLettersBtn.addEventListener("click", () => setLayoutMode("letters"));

svgCanvas.addEventListener("click", (ev) => {
  if (ev.target === svgCanvas || ev.target === instancesRoot) setSelected(null);
});
btnGenerate.addEventListener("click", () => buildInstanceFromControls());
btnDuplicate.addEventListener("click", () => duplicateSelectedInstance());
btnClear.addEventListener("click", () => clearCanvas());

animModeSelect.addEventListener("change", () => {
  state.animMode = animModeSelect.value;
  statusLabel.textContent = "Animation mode: " + state.animMode;
});

function applyAnimationToInstance(inst, idx, tNorm, tSeconds) {
  const mode = state.animMode;
  const speed = parseFloat(animSpeedInput.value) || 1;
  const amp = parseFloat(animAmpInput.value) || 30;

  const baseTx = inst.tx || 0;
  const baseTy = inst.ty || 0;
  const baseRot = inst.rotation || 0;
  const baseScale = inst.scale || 1;

  let tx = baseTx;
  let ty = baseTy;
  let rot = baseRot;
  let sc = baseScale;

  const phase = tSeconds * speed + idx * 0.35;
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);

  switch (mode) {
    case "wave":
      ty += s * amp;
      rot += s * (amp * 0.6);
      sc += s * 0.2;
      break;
    case "pulse":
      sc += s * 0.3;
      break;
    case "scatter":
      tx += Math.sin(phase * 1.3) * amp;
      ty += Math.cos(phase * 1.7) * amp;
      rot += s * (amp * 1.2);
      break;
    case "ripple": {
      const centerIndex = state.instances.length / 2;
      const dist = Math.abs(idx - centerIndex);
      const delay = dist * 0.2;
      const local = Math.max(0, tSeconds * speed - delay);
      const ripple = Math.sin(local * Math.PI * 2);
      sc += ripple * 0.25;
      rot += ripple * (amp * 0.5);
      break;
    }
    case "spin":
      rot += tSeconds * speed * 360;
      break;
    case "float":
      tx += Math.sin(phase * 0.7) * (amp * 0.3);
      ty += Math.cos(phase * 0.9) * (amp * 0.3);
      rot += s * 10;
      break;
    case "noise":
      tx += s * amp;
      ty += c * amp;
      break;
    case "sweep": {
      const sweep = tNorm * state.instances.length;
      const diff = idx - sweep;
      const influence = Math.max(0, 1 - Math.abs(diff));
      sc += influence * 0.5;
      rot += influence * amp;
      break;
    }
    case "glitch": {
      const jitterBase = (Math.sin((idx + tSeconds * speed * 10) * 17.13) * 0.5 + 0.5) * amp;
      const jx = (Math.random() - 0.5) * jitterBase;
      const jy = (Math.random() - 0.5) * jitterBase;
      const jr = (Math.random() - 0.5) * amp * 2;
      tx += jx;
      ty += jy;
      rot += jr;
      break;
    }
    case "vhs": {
      const linePhase = tSeconds * speed * 2 + idx * 0.15;
      ty += Math.sin(linePhase * Math.PI * 4) * (amp * 0.2);
      tx += Math.sin(tSeconds * speed * 0.5 + idx * 0.4) * 6;
      rot += Math.sin(linePhase) * 4;
      break;
    }
    case "chromatic": {
      sc += s * 0.15;
      tx += Math.sin(phase * 1.5) * (amp * 0.15);
      ty += Math.cos(phase * 1.1) * (amp * 0.15);
      break;
    }
    case "distort": {
      const dp = phase * 2.7;
      tx += Math.sin(dp * 1.3) * amp * 0.6;
      ty += Math.cos(dp * 1.7) * amp * 0.6;
      rot += Math.sin(dp * 0.8) * amp * 0.7;
      sc += Math.sin(dp * 0.5) * 0.3;
      break;
    }
  }

  inst._animTx = tx;
  inst._animTy = ty;
  inst._animRot = rot;
  inst._animScale = sc;
}

function renderAnimatedFrame(tSeconds, duration) {
  const centerX = 1920 / 2;
  const centerY = 1080 / 2;
  const tNorm = (tSeconds % duration) / duration;
  state.instances.forEach((inst, idx) => {
    applyAnimationToInstance(inst, idx, tNorm, tSeconds);
    const g = Array.from(instancesRoot.children).find(
      (g) => g.getAttribute("data-id") === inst.id
    );
    if (!g) return;
    const tx = inst._animTx ?? inst.tx;
    const ty = inst._animTy ?? inst.ty;
    const sc = inst._animScale ?? inst.scale;
    const rot = inst._animRot ?? inst.rotation;
    g.setAttribute(
      "transform",
      "translate(" + (centerX + tx) + "," + (centerY + ty) + ") rotate(" + rot + ") scale(" + sc + ")"
    );
  });
}

function animationLoop(timestamp) {
  if (!state.anim.playing) return;
  if (!state.anim.startTime) state.anim.startTime = timestamp;
  const elapsed = (timestamp - state.anim.startTime) / 1000;
  const duration = Math.max(0.1, parseFloat(animDurationInput.value) || 4);
  renderAnimatedFrame(elapsed, duration);
  const fps = Math.min(60, Math.max(1, parseFloat(animFpsInput.value) || 30));
  const frameDuration = 1000 / fps;
  window.setTimeout(() => {
    window.requestAnimationFrame(animationLoop);
  }, frameDuration);
}

btnAnimToggle.addEventListener("click", () => {
  state.anim.playing = !state.anim.playing;
  if (state.anim.playing) {
    state.anim.startTime = null;
    btnAnimToggle.textContent = "Stop animation";
    statusLabel.textContent = "Animation playing (" + state.animMode + ")";
    window.requestAnimationFrame(animationLoop);
  } else {
    btnAnimToggle.textContent = "Play animation";
    statusLabel.textContent = "Animation stopped";
    state.instances.forEach((inst) => syncInstanceTransformToSvg(inst));
  }
});

function exportPreset() {
  const preset = {
    text: textInput.value,
    layoutMode: state.layoutMode,
    fontFamily: fontSelect.value,
    baseFontSize: parseFloat(fontSizeInput.value) || 80,
    animMode: state.animMode,
    instances: state.instances
  };
  presetJsonArea.value = JSON.stringify(preset, null, 2);
  statusLabel.textContent = "Preset saved.";
}

function importPreset() {
  try {
    const json = presetJsonArea.value;
    if (!json.trim()) return;
    const preset = JSON.parse(json);
    clearCanvas();
    textInput.value = preset.text || "";
    setLayoutMode(preset.layoutMode === "letters" ? "letters" : "word");
    fontSelect.value = preset.fontFamily || fontSelect.value;
    fontSizeInput.value = preset.baseFontSize || fontSizeInput.value;
    ensureGoogleFontLoaded(fontSelect.value);
    state.animMode = preset.animMode || "wave";
    animModeSelect.value = state.animMode;

    preset.instances.forEach((instData) => {
      const instId = instData.id || createInstanceId();
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("data-id", instId);
      g.style.cursor = "pointer";

      const fontFamily = instData.fontFamily || preset.fontFamily;
      const baseSize = instData.baseFontSize || preset.baseFontSize || 80;
      const type = instData.type || preset.layoutMode || "word";
      const text = preset.text || "vEXTY";

      if (type === "word") {
        const textEl = document.createElementNS(svgNS, "text");
        textEl.setAttribute("x", 0);
        textEl.setAttribute("y", 0);
        textEl.setAttribute("fill", "#f5f5ff");
        textEl.setAttribute("text-anchor", "middle");
        textEl.setAttribute("dominant-baseline", "middle");
        textEl.setAttribute("font-family", fontFamily);
        textEl.setAttribute("font-size", baseSize);
        textEl.textContent = text;
        g.appendChild(textEl);
      } else {
        let cursorX = 0;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          const textEl = document.createElementNS(svgNS, "text");
          textEl.setAttribute("x", cursorX);
          textEl.setAttribute("y", 0);
          textEl.setAttribute("fill", "#f5f5ff");
          textEl.setAttribute("text-anchor", "middle");
          textEl.setAttribute("dominant-baseline", "middle");
          textEl.setAttribute("font-family", fontFamily);
          textEl.setAttribute("font-size", baseSize);
          textEl.textContent = ch === " " ? "·" : ch;
          g.appendChild(textEl);
          const advance = (ch === " " ? 0.6 : 0.8) * baseSize;
          cursorX += advance + (instData.letterSpacing || 0);
        }
      }

      instancesRoot.appendChild(g);
      const instance = {
        id: instId,
        type,
        elements: instData.elements || [],
        tx: instData.tx || 0,
        ty: instData.ty || 0,
        scale: instData.scale || 1,
        rotation: instData.rotation || 0,
        letterSpacing: instData.letterSpacing || 0,
        baseFontSize: baseSize,
        fontFamily
      };

      g.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelected(instId);
      });

      state.instances.push(instance);
      syncInstanceTransformToSvg(instance);
    });

    updateInstanceCount();
    if (state.instances[0]) setSelected(state.instances[0].id);
    statusLabel.textContent = "Preset loaded.";
  } catch (err) {
    alert("Preset JSON is invalid.");
    console.error(err);
    statusLabel.textContent = "Preset load failed.";
  }
}
btnPresetSave.addEventListener("click", exportPreset);
btnPresetLoad.addEventListener("click", importPreset);

function svgToPngDataURL(width, height) {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer();
    const clone = svgCanvas.cloneNode(true);
    Array.from(clone.querySelectorAll("[data-id]")).forEach((node) => {
      node.removeAttribute("data-selected");
      node.style.filter = "";
    });
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataURL = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      resolve(dataURL);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

btnExportGif.addEventListener("click", async () => {
  try {
    if (state.instances.length === 0) {
      alert("Create at least one instance before exporting GIF.");
      return;
    }
    const duration = Math.max(0.5, parseFloat(animDurationInput.value) || 4);
    const fps = Math.min(60, Math.max(1, parseFloat(animFpsInput.value) || 24));
    const totalFrames = Math.floor(duration * fps);
    statusLabel.textContent = "Rendering frames for GIF...";
    btnExportGif.disabled = true;
    btnExportMp4.disabled = true;
    btnAnimToggle.disabled = true;
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
      const tSeconds = (i / totalFrames) * duration;
      renderAnimatedFrame(tSeconds, duration);
      const dataUrl = await svgToPngDataURL(960, 540);
      frames.push(dataUrl);
      statusLabel.textContent = `GIF frame ${i + 1}/${totalFrames}...`;
      await new Promise((r) => setTimeout(r, 0));
    }
    statusLabel.textContent = "Encoding GIF via ffmpeg...";
    const outPath = await window.suite.exportGIF(frames, fps);
    statusLabel.textContent = outPath ? "GIF exported to: " + outPath : "GIF export canceled.";
  } catch (e) {
    console.error(e);
    statusLabel.textContent = "GIF export failed.";
  } finally {
    btnExportGif.disabled = false;
    btnExportMp4.disabled = false;
    btnAnimToggle.disabled = false;
  }
});

btnExportMp4.addEventListener("click", async () => {
  try {
    if (state.instances.length === 0) {
      alert("Create at least one instance before exporting MP4.");
      return;
    }
    const duration = Math.max(0.5, parseFloat(animDurationInput.value) || 4);
    const fps = Math.min(60, Math.max(1, parseFloat(animFpsInput.value) || 24));
    const totalFrames = Math.floor(duration * fps);
    statusLabel.textContent = "Rendering frames for MP4...";
    btnExportGif.disabled = true;
    btnExportMp4.disabled = true;
    btnAnimToggle.disabled = true;
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
      const tSeconds = (i / totalFrames) * duration;
      renderAnimatedFrame(tSeconds, duration);
      const dataUrl = await svgToPngDataURL(1280, 720);
      frames.push(dataUrl);
      statusLabel.textContent = `MP4 frame ${i + 1}/${totalFrames}...`;
      await new Promise((r) => setTimeout(r, 0));
    }
    statusLabel.textContent = "Encoding MP4 via ffmpeg...";
    const outPath = await window.suite.exportMP4(frames, fps);
    statusLabel.textContent = outPath ? "MP4 exported to: " + outPath : "MP4 export canceled.";
  } catch (e) {
    console.error(e);
    statusLabel.textContent = "MP4 export failed.";
  } finally {
    btnExportGif.disabled = false;
    btnExportMp4.disabled = false;
    btnAnimToggle.disabled = false;
  }
});

ensureGoogleFontLoaded(fontSelect.value);
buildInstanceFromControls();
statusLabel.textContent = "Ready.";
