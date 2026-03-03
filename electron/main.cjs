const { app, BrowserWindow } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const START_URL = process.env.ELECTRON_START_URL || "http://localhost:8080";

function getAppUrl() {
  if (process.env.ELECTRON_START_URL) return process.env.ELECTRON_START_URL;
  if (!app.isPackaged) return START_URL;
  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  return pathToFileURL(indexPath).toString();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(getAppUrl());
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
