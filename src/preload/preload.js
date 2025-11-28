const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("suite", {
  openVexty: () => ipcRenderer.invoke("suite:openVexty"),
  openFlake: () => ipcRenderer.invoke("suite:openFlake"),
  exportGIF: (frames, fps) => ipcRenderer.invoke("export:gif", { frames, fps }),
  exportMP4: (frames, fps) => ipcRenderer.invoke("export:mp4", { frames, fps })
});
