const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");

class NativeEngine extends EventEmitter {
  constructor({ executableResolver, responseTimeoutMs = 5000 } = {}) {
    super();
    this.executableResolver = executableResolver;
    this.responseTimeoutMs = responseTimeoutMs;
    this.child = null;
    this.stdoutBuffer = "";
    this.stderrBuffer = "";
    this.pending = new Map();
  }

  get running() {
    return Boolean(this.child);
  }

  get pid() {
    return this.child?.pid ?? null;
  }

  start() {
    if (this.child) return { running: true, pid: this.child.pid };

    const executable = this.executableResolver();
    if (!executable || !fs.existsSync(executable)) {
      return {
        running: false,
        error: "Cari native engine not found. Set CARI_NATIVE_EXECUTABLE or package cari-studio-native.exe."
      };
    }

    this.stdoutBuffer = "";
    this.stderrBuffer = "";

    const child = spawn(executable, [], {
      cwd: path.dirname(executable),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    this.child = child;

    this.#attachStdout(child.stdout);
    this.#attachStderr(child.stderr);

    child.once("error", error => {
      this.emit("error", error);
      this.#rejectPending(error);
      this.child = null;
    });

    child.once("exit", (code, signal) => {
      this.emit("exit", { code, signal });
      this.#rejectPending(new Error(`Native engine exited (code=${code ?? "null"}, signal=${signal ?? "null"})`));
      if (this.child === child) this.child = null;
    });

    return { running: true, pid: child.pid };
  }

  async send(command, { timeoutMs = this.responseTimeoutMs } = {}) {
    if (!this.child?.stdin?.writable) {
      return { ok: false, error: "native engine is not running" };
    }

    const id = command.id || crypto.randomUUID();
    const payload = { ...command, id };

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, id, error: `native command timed out: ${payload.type}` });
      }, timeoutMs);

      this.pending.set(id, {
        resolve: value => {
          clearTimeout(timeout);
          resolve(value);
        }
      });

      try {
        this.child.stdin.write(JSON.stringify(payload) + "\n");
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        resolve({ ok: false, id, error: error.message });
      }
    });
  }

  async stop() {
    if (!this.child) return { ok: true };

    const child = this.child;
    try {
      await this.send({ type: "output.stop" }, { timeoutMs: 1000 });
    } catch {
      // The native process may already be shutting down.
    }

    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }

    this.child = null;
    return { ok: true };
  }

  #attachStdout(stream) {
    stream.setEncoding("utf8");
    stream.on("data", chunk => {
      this.stdoutBuffer += chunk;
      this.#drainLines("stdout");
    });
  }

  #attachStderr(stream) {
    stream.setEncoding("utf8");
    stream.on("data", chunk => {
      this.stderrBuffer += chunk;
      this.#drainLines("stderr");
    });
  }

  #drainLines(channel) {
    const property = channel === "stdout" ? "stdoutBuffer" : "stderrBuffer";
    let buffer = this[property];

    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);

      if (channel === "stderr") {
        if (line) this.emit("log", line);
        continue;
      }

      if (!line) continue;

      try {
        const message = JSON.parse(line);
        if (message.id && this.pending.has(message.id)) {
          const pending = this.pending.get(message.id);
          this.pending.delete(message.id);
          pending.resolve(message);
        }
        this.emit("message", message);
      } catch {
        this.emit("log", line);
      }
    }

    this[property] = buffer;
  }

  #rejectPending(error) {
    for (const [id, pending] of this.pending) {
      pending.resolve({ ok: false, id, error: error.message });
    }
    this.pending.clear();
  }
}

module.exports = { NativeEngine };
