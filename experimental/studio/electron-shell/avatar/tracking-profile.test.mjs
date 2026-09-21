import {
  TrackingProfileController,
  normalizeTrackingProfile
} from "./tracking-profile.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const minimumProfile = normalizeTrackingProfile({
  smoothing: 0.5,
  deadzone: 0.05,
  calibrationSamples: 3
});
assert(minimumProfile.calibrationSamples === 10, "minimum calibration samples must be safe");

const tracking = new TrackingProfileController({
  smoothing: 1,
  deadzone: 0,
  calibrationSamples: 10,
  lostGraceFrames: 2,
  lossFadeFrames: 2
});

tracking.statusValue = "tracking";
const raw = {
  head: { x: 0.1, y: -0.05, z: 0.02 },
  gaze: { x: 0.2, y: -0.1 },
  mouthOpen: 0.02,
  blink: 0.05
};
tracking.beginCalibration();
for (let i = 0; i < 10; i += 1) {
  tracking.addCalibrationSample(raw);
}
assert(tracking.calibrationState().calibrated === true, "calibration should commit");

const result = tracking.apply({
  head: { x: 0.3, y: 0.05, z: 0.02 },
  gaze: { x: 0.4, y: 0.1 },
  mouthOpen: 0.6,
  blink: 0.4
});
assert(result.head.x > 0.19 && result.head.x < 0.21, "head calibration failed");
assert(result.gaze.x > 0.19 && result.gaze.x < 0.21, "gaze calibration failed");
assert(result.mouthOpen > 0.49 && result.mouthOpen < 0.51, "mouth gain baseline failed");

tracking.onLost();
tracking.onLost();
const faded = tracking.onLost();
assert(faded.status === "lost", "lost state missing");
assert(faded.head.x < result.head.x, "lost tracking should fade movement");

console.log("Tracking profile smoke: PASS");
