const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { createFFmpeg } = require("@ffmpeg/ffmpeg");

let ffmpeg = null;

async function ensureFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
  }
  return ffmpeg;
}

function createLauncherWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 540,
    backgroundColor: "#05060a",
    title: "vEXTY + FLAKE Suite",
    icon: path.join(__dirname, "../../resources/FLAKE_Anubis_FullSuite.ico"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "../renderer/launcher.html"));
}

function createVextyWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    backgroundColor: "#000000",
    title: "vEXTY",
    icon: path.join(__dirname, "../../resources/FLAKE_Anubis_FullSuite.ico"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "../renderer/vexty.html"));
}

function createFlakeWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    backgroundColor: "#000000",
    title: "FLAKE",
    icon: path.join(__dirname, "../../resources/FLAKE_Anubis_FullSuite.ico"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "../renderer/flake.html"));
}

app.whenReady().then(createLauncherWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("suite:openVexty", () => {
  createVextyWindow();
});

ipcMain.handle("suite:openFlake", () => {
  createFlakeWindow();
});

ipcMain.handle("export:gif", async (_, { frames, fps }) => {
  const folder = dialog.showOpenDialogSync({
    properties: ["openDirectory"]
  });
  if (!folder) return null;
  const outDir = folder[0];

  const ff = await ensureFFmpeg();

  for (let i = 0; i < frames.length; i++) {
    const base64 = frames[i].replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(base64, "base64");
    ff.FS("writeFile", `f_${String(i).padStart(4, "0")}.png`, buf);
  }

  const outputName = "vexty_animation.gif";

  await ff.run(
    "-framerate", String(fps),
    "-i", "f_%04d.png",
    "-vf",
    `fps=${fps},scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    outputName
  );

  const data = ff.FS("readFile", outputName);
  const outPath = path.join(outDir, outputName);
  fs.writeFileSync(outPath, data);

  for (let i = 0; i < frames.length; i++) {
    ff.FS("unlink", `f_${String(i).padStart(4, "0")}.png`);
  }
  ff.FS("unlink", outputName);

  return outPath;
});

ipcMain.handle("export:mp4", async (_, { frames, fps }) => {
  const folder = dialog.showOpenDialogSync({
    properties: ["openDirectory"]
  });
  if (!folder) return null;
  const outDir = folder[0];

  const ff = await ensureFFmpeg();

  for (let i = 0; i < frames.length; i++) {
    const base64 = frames[i].replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(base64, "base64");
    ff.FS("writeFile", `f_${String(i).padStart(4, "0")}.png`, buf);
  }

  const outputName = "vexty_animation.mp4";

  await ff.run(
    "-framerate", String(fps),
    "-i", "f_%04d.png",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputName
  );

  const data = ff.FS("readFile", outputName);
  const outPath = path.join(outDir, outputName);
  fs.writeFileSync(outPath, data);

  for (let i = 0; i < frames.length; i++) {
    ff.FS("unlink", `f_${String(i).padStart(4, "0")}.png`);
  }
  ff.FS("unlink", outputName);

  return outPath;
});
