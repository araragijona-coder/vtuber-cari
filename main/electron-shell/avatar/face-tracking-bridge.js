export class FaceTrackingBridge {
  constructor(acting) {
    this.acting = acting;
    this.enabled = false;
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

    const expression =
      smile > 0.45 ? "happy" :
      browDown > 0.45 ? "angry" :
      "neutral";

    const pose = readPose(result.facialTransformationMatrixes?.[0]?.data);

    this.acting.set({
      expression,
      mouthOpen,
      blink,
      head: pose
    });

    return { expression, mouthOpen, blink, head: pose };
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
