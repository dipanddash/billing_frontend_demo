const { spawn } = require("child_process");
const http = require("http");

const DEV_URL = "http://localhost:8080";
let viteProcess;
let electronProcess;

function waitForServer(url, timeoutMs = 120000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Timed out waiting for Vite server."));
          return;
        }
        setTimeout(check, 700);
      });
    };
    check();
  });
}

function shutdown() {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill();
  }
}

async function main() {
  console.log("[electron:dev] Starting Vite server...");
  viteProcess = spawn("npm", ["run", "dev", "--", "--host", "localhost", "--port", "8080"], {
    stdio: "inherit",
    shell: true,
  });

  viteProcess.on("exit", (code) => {
    if (code !== 0) process.exit(code || 1);
  });

  await waitForServer(DEV_URL);
  console.log("[electron:dev] Vite is ready at", DEV_URL);

  const electronEnv = { ...process.env, ELECTRON_START_URL: DEV_URL };
  delete electronEnv.ELECTRON_RUN_AS_NODE;

  electronProcess = spawn(
    "npx",
    ["electron", "electron/main.cjs"],
    {
      stdio: "inherit",
      shell: true,
      env: electronEnv,
    }
  );

  electronProcess.on("exit", (code) => {
    shutdown();
    process.exit(code || 0);
  });

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  shutdown();
  process.exit(1);
});
