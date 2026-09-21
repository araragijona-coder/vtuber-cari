export class FaceTrackingBridge {
  constructor(acting) {
    this.acting = acting;
    this.enabled = false;
    this.currentExpression = "neutral";
    this.candidateExpression = "neutral";
    this.candidateFrames = 0;
    this.smoothHead = { x: 0, y: 0, z: 0 };
    this.smoothGaze = { x: 0, y: 0 };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  apply(result) {
    if (!this.enabled || !result) return null;

    const shapes = new Map(
      (result.faceBlendshapes?.[0]?.categories || []).map(item => [
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

    const expression = this.currentExpression;

    const pose = readPose(result.facialTransformationMatrixes?.[0]?.data);
    this.smoothHead = smoothVector(this.smoothHead, pose, 0.35);

    const gaze = readGaze(shapes);
    this.smoothGaze = smoothVector2(this.smoothGaze, gaze, 0.30);

    this.acting.setFace({
      expression,
      mouthOpen,
      blink,
      head: this.smoothHead,
      gaze: this.smoothGaze
    });

    return {
      expression,
      mouthOpen,
      blink,
      head: this.smoothHead,
      gaze: this.smoothGaze
    };
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function readPose(data) {
  if (!data || data.length < 16) {
    return { x: 0, y: 0, z: 0 };
  }

  const m00 = Number(data[0]) || 1;
  const m01 = Number(data[1]) || 0;
  const m02 = Number(data[2]) || 0;
  const m10 = Number(data[4]) || 0;
  const m11 = Number(data[5]) || 1;
  const m12 = Number(data[6]) || 0;
  const m20 = Number(data[8]) || 0;
  const m21 = Number(data[9]) || 0;
  const m22 = Number(data[10]) || 1;

  const yaw = Math.atan2(m20, m22);
  const pitch = Math.atan2(-m21, Math.sqrt(m20 * m20 + m22 * m22));
  const roll = Math.atan2(m10, m00);

  return {
    x: clampAngle(yaw),
    y: clampAngle(pitch),
    z: clampAngle(roll)
  };
}

function clampAngle(value) {
  return Math.max(-0.8, Math.min(0.8, value));
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

function smoothVector(previous, next, factor) {
  return {
    x: previous.x + (next.x - previous.x) * factor,
    y: previous.y + (next.y - previous.y) * factor,
    z: previous.z + (next.z - previous.z) * factor
  };
}

function smoothVector2(previous, next, factor) {
  return {
    x: previous.x + (next.x - previous.x) * factor,
    y: previous.y + (next.y - previous.y) * factor
  };
}
