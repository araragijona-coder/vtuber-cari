import { TrackingProfileController } from "./tracking-profile.js";

export class FaceTrackingBridge {
  constructor(acting, profile = {}) {
    this.acting = acting;
    this.enabled = false;
    this.currentExpression = "neutral";
    this.candidateExpression = "neutral";
    this.candidateFrames = 0;
    this.tracking = new TrackingProfileController(profile);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.tracking.reset();
      return this.status();
    }
    this.tracking.statusValue = "tracking";
    return this.status();
  }

  setProfile(profile = {}) {
    return this.tracking.setProfile(profile);
  }

  getProfile() {
    return this.tracking.getProfile();
  }

  beginCalibration() {
    const result = this.tracking.beginCalibration();
    this.currentExpression = "neutral";
    this.candidateExpression = "neutral";
    this.candidateFrames = 0;
    this.acting.setFace({
      expression: "neutral",
      mouthOpen: 0,
      blink: 0,
      head: { x: 0, y: 0, z: 0 },
      gaze: { x: 0, y: 0 }
    });
    return result;
  }

  calibrationState() {
    return this.tracking.calibrationState();
  }

  finishCalibration() {
    const committed = this.tracking.commitCalibration();
    return {
      committed,
      ...this.tracking.calibrationState()
    };
  }

  resetCalibration() {
    return this.tracking.resetCalibration();
  }

  status() {
    return this.tracking.calibrationState();
  }

  apply(result) {
    if (!this.enabled || !result) {
      return this.tickNoFace();
    }

    const categories = result.faceBlendshapes?.[0]?.categories || [];
    if (categories.length === 0) {
      return this.tickNoFace();
    }

    const shapes = new Map(
      categories.map(item => [
        item.categoryName,
        Number(item.score) || 0
      ])
    );

    const mouthOpen = clamp01(shapes.get("jawOpen") ?? 0);
    const blinkLeft = clamp01(shapes.get("eyeBlinkLeft") ?? 0);
    const blinkRight = clamp01(shapes.get("eyeBlinkRight") ?? 0);
    const blink = (blinkLeft + blinkRight) * 0.5;

    const smile = Math.max(
      shapes.get("mouthSmileLeft") ?? 0,
      shapes.get("mouthSmileRight") ?? 0
    );
    const browDown = Math.max(
      shapes.get("browDownLeft") ?? 0,
      shapes.get("browDownRight") ?? 0
    );
    const frown = Math.max(
      shapes.get("mouthFrownLeft") ?? 0,
      shapes.get("mouthFrownRight") ?? 0
    );
    const eyeWide = Math.max(
      shapes.get("eyeWideLeft") ?? 0,
      shapes.get("eyeWideRight") ?? 0
    );
    const eyeSquint = Math.max(
      shapes.get("eyeSquintLeft") ?? 0,
      shapes.get("eyeSquintRight") ?? 0
    );

    const detectedExpression =
      browDown > 0.45 ? "angry" :
      eyeWide > 0.52 && mouthOpen > 0.35 ? "afraid" :
      smile > 0.45 ? "happy" :
      frown > 0.45 ? "sad" :
      eyeSquint > 0.50 ? "embarrassed" :
      "neutral";

    if (detectedExpression === this.candidateExpression) {
      this.candidateFrames += 1;
    } else {
      this.candidateExpression = detectedExpression;
      this.candidateFrames = 1;
    }

    if (this.candidateFrames >= 3) {
      this.currentExpression = this.candidateExpression;
    }

    const pose = readPose(result.facialTransformationMatrixes?.[0]?.data);
    const gaze = readGaze(shapes);
    const normalized = this.tracking.apply({
      expression: this.currentExpression,
      mouthOpen,
      blink,
      head: pose,
      gaze
    });

    this.acting.setFace({
      expression: this.currentExpression,
      mouthOpen: normalized.mouthOpen,
      blink: normalized.blink,
      head: normalized.head,
      gaze: normalized.gaze
    });

    return {
      ...normalized,
      expression: this.currentExpression,
      calibrated: this.tracking.calibrationState().calibrated
    };
  }

  tickNoFace() {
    if (!this.enabled) return null;
    const normalized = this.tracking.onLost();
    if (!normalized) return null;

    this.acting.setFace({
      expression: this.currentExpression,
      mouthOpen: normalized.mouthOpen,
      blink: normalized.blink,
      head: normalized.head,
      gaze: normalized.gaze
    });

    return {
      ...normalized,
      expression: this.currentExpression,
      calibrated: this.tracking.calibrationState().calibrated
    };
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function readPose(data) {
  if (!data || data.length < 16) {
    return { x: 0, y: 0, z: 0 };
  }

  const m00 = Number(data[0]) || 1;
  const m10 = Number(data[4]) || 0;
  const m11 = Number(data[5]) || 1;
  const m20 = Number(data[8]) || 0;
  const m21 = Number(data[9]) || 0;
  const m22 = Number(data[10]) || 1;

  const yaw = Math.atan2(m20, m22);
  const pitch = Math.atan2(
    -m21,
    Math.sqrt(m20 * m20 + m22 * m22)
  );
  const roll = Math.atan2(m10, m00);

  return {
    x: clampAngle(yaw),
    y: clampAngle(pitch),
    z: clampAngle(roll)
  };
}

function clampAngle(value) {
  return Math.max(-0.8, Math.min(0.8, Number(value) || 0));
}

function readGaze(shapes) {
  const lookLeft = Math.max(
    shapes.get("eyeLookInLeft") ?? 0,
    shapes.get("eyeLookOutRight") ?? 0
  );
  const lookRight = Math.max(
    shapes.get("eyeLookOutLeft") ?? 0,
    shapes.get("eyeLookInRight") ?? 0
  );
  const lookUp = Math.max(
    shapes.get("eyeLookUpLeft") ?? 0,
    shapes.get("eyeLookUpRight") ?? 0
  );
  const lookDown = Math.max(
    shapes.get("eyeLookDownLeft") ?? 0,
    shapes.get("eyeLookDownRight") ?? 0
  );

  return {
    x: clampSigned(lookRight - lookLeft),
    y: clampSigned(lookUp - lookDown)
  };
}

function clampSigned(value) {
  return Math.max(-1, Math.min(1, Number(value) || 0));
}
