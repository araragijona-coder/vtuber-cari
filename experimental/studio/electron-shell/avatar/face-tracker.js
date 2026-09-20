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
  }

  async init() {
    if (!this.modelPath) {
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
  }

  detect(video, timestampMs) {
    if (!this.landmarker || video.readyState < 2) return null;

    const timestamp = Number(timestampMs);
    if (!Number.isFinite(timestamp) || timestamp <= this.lastTimestampMs) {
      return null;
    }
    if (video.currentTime === this.lastVideoTime) return null;

    this.lastVideoTime = video.currentTime;
    this.lastTimestampMs = timestamp;
    return this.landmarker.detectForVideo(video, timestamp);
  }

  close() {
    this.landmarker?.close();
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.lastTimestampMs = -1;
  }
}
