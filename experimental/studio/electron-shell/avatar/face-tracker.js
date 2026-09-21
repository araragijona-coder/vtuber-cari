import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class FaceTracker {
  constructor({
    wasmRoot = new URL("../node_modules/@mediapipe/tasks-vision/wasm", import.meta.url).href,
    modelPath
  } = {}) {
    this.wasmRoot = wasmRoot;
    this.modelPath = modelPath;
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.lastTimestampMs = -1;
    this.lastStatus = "idle";
  }

  async init() {
    if (!this.modelPath) {
      this.lastStatus = "model-missing";
      throw new Error("MediaPipe face model path is required.");
    }

    const vision = await FilesetResolver.forVisionTasks(this.wasmRoot);
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: this.modelPath,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });
    this.lastStatus = "ready";
  }

  detect(video, timestampMs) {
    if (!this.landmarker || video.readyState < 2) {
      this.lastStatus = "not-ready";
      return null;
    }

    const timestamp = Number(timestampMs);
    if (!Number.isFinite(timestamp) || timestamp <= this.lastTimestampMs) {
      // MediaPipe VIDEO requires monotonically increasing timestamps. This is
      // a timing guard, not evidence that the user's face disappeared.
      this.lastStatus = "timestamp-rejected";
      return null;
    }

    if (video.currentTime === this.lastVideoTime) {
      // requestAnimationFrame can run more often than the camera produces new
      // frames. Duplicate frames are simply skipped, not treated as tracking loss.
      this.lastStatus = "duplicate-frame";
      return null;
    }

    this.lastVideoTime = video.currentTime;
    this.lastTimestampMs = timestamp;

    const result = this.landmarker.detectForVideo(video, timestamp);
    const hasFace =
      Boolean(result?.faceLandmarks?.length) ||
      Boolean(result?.faceBlendshapes?.length);

    this.lastStatus = hasFace ? "tracking" : "no-face";
    return result;
  }

  status() {
    return this.lastStatus;
  }

  close() {
    this.landmarker?.close();
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.lastTimestampMs = -1;
    this.lastStatus = "idle";
  }
}
