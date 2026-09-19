export class StudioController {
  constructor(nativeApi) {
    this.native = nativeApi;
  }

  async start() {
    return this.native.start();
  }

  async stop() {
    return this.native.stop();
  }

  status() {
    return this.native.status();
  }

  send(type, payload = {}) {
    return this.native.send({ type, ...payload });
  }

  captureStart(source = "window") {
    return this.send("capture.start", { source });
  }

  captureStop() {
    return this.send("capture.stop");
  }

  audioStart() {
    return this.send("audio.start");
  }

  audioStop() {
    return this.send("audio.stop");
  }

  outputStart(profile = "local-record") {
    return this.send("output.start", { profile });
  }

  outputStop() {
    return this.send("output.stop");
  }
}
