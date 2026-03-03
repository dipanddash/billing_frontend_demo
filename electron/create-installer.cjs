const path = require("path");
const { createWindowsInstaller } = require("electron-winstaller");

async function buildInstaller() {
  const rootDir = path.resolve(__dirname, "..");
  const appDirectory = path.join(rootDir, "release", "Dip & Dash Billing-win32-x64");
  const outputDirectory = path.join(rootDir, "release", "installer");

  await createWindowsInstaller({
    appDirectory,
    outputDirectory,
    authors: "Dip & Dash",
    description: "Dip & Dash Billing Desktop App",
    exe: "Dip & Dash Billing.exe",
    setupExe: "DipAndDashBillingSetup.exe",
    noMsi: true,
    title: "Dip & Dash Billing",
    name: "dipanddashbilling",
  });

  // eslint-disable-next-line no-console
  console.log("Installer created in:", outputDirectory);
}

buildInstaller().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to create installer:", error);
  process.exit(1);
});
