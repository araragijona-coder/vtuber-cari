const { execFile } = require("node:child_process");

const WINDOWS_PROCESS_NAMES = ["obs64.exe", "obs32.exe", "obs.exe"];
let cache = { at: 0, result: { supported: process.platform === "win32", running: false, processName: null, processes: [] } };

function parseTasklistCsv(stdout) {
  return String(stdout || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      if (!line.startsWith('"')) return [];
      const fields = line.split('","').map(value => value.replace(/^"|"$/g, ""));
      if (!fields[0] || fields[0].startsWith("INFO:")) return [];
      return [{ processName: fields[0], pid: Number(fields[1]) || null }];
    });
}

async function detectObsProcess({ ttlMs = 2000 } = {}) {
  const now = Date.now();
  if (now - cache.at < ttlMs) return cache.result;
  if (process.platform !== "win32") {
    cache = { at: now, result: { supported: false, running: false, processName: null, processes: [] } };
    return cache.result;
  }
  const processes = [];
  for (const name of WINDOWS_PROCESS_NAMES) {
    try {
      const stdout = await new Promise((resolve, reject) => {
        execFile("tasklist.exe", ["/FI", "IMAGENAME eq " + name, "/FO", "CSV", "/NH"], {
          windowsHide: true, timeout: 1500, maxBuffer: 64 * 1024
        }, (error, output) => error ? reject(error) : resolve(output));
      });
      processes.push(...parseTasklistCsv(stdout));
    } catch {}
  }
  const unique = [...new Map(processes.filter(item => item.pid).map(item => [item.pid, item])).values()];
  cache = { at: now, result: { supported: true, running: unique.length > 0, processName: unique[0]?.processName || null, processes: unique } };
  return cache.result;
}

module.exports = { detectObsProcess, WINDOWS_PROCESS_NAMES };
