const DEFAULTS = Object.freeze({
  headGain: 1.0,
  gazeGain: 1.0,
  mouthGain: 1.25,
  blinkGain: 1.15,
  smoothing: 0.32,
  deadzone: 0.035,
  lostGraceFrames: 8,
  lossFadeFrames: 12,
  calibrationSamples: 30
});

export function normalizeTrackingProfile(partial = {}) {
  const source = partial || {};
  return {
    headGain: clamp(Number(source.headGain ?? DEFAULTS.headGain), 0.5, 2.0),
    gazeGain: clamp(Number(source.gazeGain ?? DEFAULTS.gazeGain), 0.5, 2.0),
    mouthGain: clamp(Number(source.mouthGain ?? DEFAULTS.mouthGain), 0.6, 2.5),
    blinkGain: clamp(Number(source.blinkGain ?? DEFAULTS.blinkGain), 0.6, 2.5),
    smoothing: clamp(Number(source.smoothing ?? DEFAULTS.smoothing), 0.08, 0.75),
    deadzone: clamp(Number(source.deadzone ?? DEFAULTS.deadzone), 0, 0.15),
    lostGraceFrames: Math.round(clamp(Number(source.lostGraceFrames ?? DEFAULTS.lostGraceFrames), 0, 30)),
    lossFadeFrames: Math.round(clamp(Number(source.lossFadeFrames ?? DEFAULTS.lossFadeFrames), 1, 60)),
    calibrationSamples: Math.round(clamp(Number(source.calibrationSamples ?? DEFAULTS.calibrationSamples), 10, 120))
  };
}

export class TrackingProfileController {
  constructor(profile = {}) {
    this.profile = normalizeTrackingProfile(profile);
    this.baseline = null;
    this.smoothed = null;
    this.lostFrames = 0;
    this.statusValue = "off";
    this.calibration = null;
  }

  setProfile(profile = {}) {
    this.profile = normalizeTrackingProfile({ ...this.profile, ...(profile || {}) });
    return this.profile;
  }

  getProfile() {
    return { ...this.profile };
  }

  reset() {
    this.baseline = null;
    this.smoothed = null;
    this.lostFrames = 0;
    this.statusValue = "off";
    this.calibration = null;
  }

  beginCalibration() {
    this.calibration = {
      samples: [],
      target: this.profile.calibrationSamples
    };
    this.statusValue = "calibrating";
    this.lostFrames = 0;
    return this.calibrationState();
  }

  addCalibrationSample(raw) {
    if (!this.calibration || !raw) return this.calibrationState();

    this.calibration.samples.push(copyRaw(raw));
    if (this.calibration.samples.length >= this.calibration.target) {
      this.commitCalibration();
    }
    return this.calibrationState();
  }

  commitCalibration() {
    if (!this.calibration || this.calibration.samples.length === 0) {
      return false;
    }

    const samples = this.calibration.samples;
    const sum = samples.reduce(
      (acc, item) => ({
        head: {
          x: acc.head.x + item.head.x,
          y: acc.head.y + item.head.y,
          z: acc.head.z + item.head.z
        },
        gaze: {
          x: acc.gaze.x + item.gaze.x,
          y: acc.gaze.y + item.gaze.y
        },
        mouthOpen: acc.mouthOpen + item.mouthOpen,
        blink: acc.blink + item.blink
      }),
      {
        head: { x: 0, y: 0, z: 0 },
        gaze: { x: 0, y: 0 },
        mouthOpen: 0,
        blink: 0
      }
    );

    const count = samples.length;
    this.baseline = {
      head: {
        x: sum.head.x / count,
        y: sum.head.y / count,
        z: sum.head.z / count
      },
      gaze: {
        x: sum.gaze.x / count,
        y: sum.gaze.y / count
      },
      mouthOpen: sum.mouthOpen / count,
      blink: sum.blink / count
    };

    this.smoothed = {
      head: { ...this.baseline.head },
      gaze: { ...this.baseline.gaze },
      mouthOpen: 0,
      blink: 0
    };
    this.calibration = null;
    this.statusValue = "tracking";
    return true;
  }

  resetCalibration() {
    this.baseline = null;
    this.smoothed = null;
    this.statusValue = "tracking";
    return this.calibrationState();
  }

  calibrationState() {
    return {
      active: Boolean(this.calibration),
      samples: this.calibration?.samples.length || 0,
      target: this.calibration?.target || this.profile.calibrationSamples,
      calibrated: Boolean(this.baseline),
      status: this.statusValue
    };
  }

  apply(raw) {
    if (!raw) return this.onLost();

    if (this.calibration) {
      this.addCalibrationSample(raw);
    }

    const baseline = this.baseline || {
      head: { x: 0, y: 0, z: 0 },
      gaze: { x: 0, y: 0 },
      mouthOpen: 0,
      blink: 0
    };

    const target = {
      head: {
        x: signedDeadzone((raw.head.x - baseline.head.x) * this.profile.headGain, this.profile.deadzone),
        y: signedDeadzone((raw.head.y - baseline.head.y) * this.profile.headGain, this.profile.deadzone),
        z: signedDeadzone((raw.head.z - baseline.head.z) * this.profile.headGain, this.profile.deadzone)
      },
      gaze: {
        x: signedDeadzone((raw.gaze.x - baseline.gaze.x) * this.profile.gazeGain, this.profile.deadzone),
        y: signedDeadzone((raw.gaze.y - baseline.gaze.y) * this.profile.gazeGain, this.profile.deadzone)
      },
      mouthOpen: clamp01((raw.mouthOpen - baseline.mouthOpen) * this.profile.mouthGain),
      blink: clamp01(raw.blink * this.profile.blinkGain)
    };

    if (!this.smoothed) {
      this.smoothed = {
        head: { ...target.head },
        gaze: { ...target.gaze },
        mouthOpen: target.mouthOpen,
        blink: target.blink
      };
    } else {
      const factor = this.profile.smoothing;
      this.smoothed = {
        head: smooth3(this.smoothed.head, target.head, factor),
        gaze: smooth2(this.smoothed.gaze, target.gaze, factor),
        mouthOpen: lerp(this.smoothed.mouthOpen, target.mouthOpen, factor),
        blink: lerp(this.smoothed.blink, target.blink, factor)
      };
    }

    this.lostFrames = 0;
    this.statusValue = this.calibration ? "calibrating" : "tracking";
    return this.output();
  }

  onLost() {
    if (this.statusValue === "off") return null;

    this.lostFrames += 1;
    if (!this.smoothed) {
      this.statusValue = "lost";
      return {
        ...zeroOutput(),
        status: this.statusValue,
        lostFrames: this.lostFrames
      };
    }

    if (this.lostFrames <= this.profile.lostGraceFrames) {
      this.statusValue = this.calibration ? "calibrating-lost" : "lost-grace";
      return this.output();
    }

    const fade = clamp(
      (this.lostFrames - this.profile.lostGraceFrames) /
        this.profile.lossFadeFrames,
      0,
      1
    );
    const retain = 1 - fade;
    this.smoothed = {
      head: scale3(this.smoothed.head, retain),
      gaze: scale2(this.smoothed.gaze, retain),
      mouthOpen: this.smoothed.mouthOpen * retain,
      blink: this.smoothed.blink * retain
    };
    this.statusValue = "lost";
    return this.output();
  }

  output() {
    return {
      head: {
        x: clampSigned(this.smoothed.head.x),
        y: clampSigned(this.smoothed.head.y),
        z: clampSigned(this.smoothed.head.z)
      },
      gaze: {
        x: clampSigned(this.smoothed.gaze.x),
        y: clampSigned(this.smoothed.gaze.y)
      },
      mouthOpen: clamp01(this.smoothed.mouthOpen),
      blink: clamp01(this.smoothed.blink),
      status: this.statusValue,
      lostFrames: this.lostFrames
    };
  }
}

function copyRaw(raw) {
  return {
    head: {
      x: Number(raw.head?.x) || 0,
      y: Number(raw.head?.y) || 0,
      z: Number(raw.head?.z) || 0
    },
    gaze: {
      x: Number(raw.gaze?.x) || 0,
      y: Number(raw.gaze?.y) || 0
    },
    mouthOpen: clamp01(raw.mouthOpen),
    blink: clamp01(raw.blink)
  };
}

function zeroOutput() {
  return {
    head: { x: 0, y: 0, z: 0 },
    gaze: { x: 0, y: 0 },
    mouthOpen: 0,
    blink: 0,
    lostFrames: 0
  };
}

function smooth3(a, b, factor) {
  return {
    x: lerp(a.x, b.x, factor),
    y: lerp(a.y, b.y, factor),
    z: lerp(a.z, b.z, factor)
  };
}

function smooth2(a, b, factor) {
  return {
    x: lerp(a.x, b.x, factor),
    y: lerp(a.y, b.y, factor)
  };
}

function scale3(value, factor) {
  return { x: value.x * factor, y: value.y * factor, z: value.z * factor };
}

function scale2(value, factor) {
  return { x: value.x * factor, y: value.y * factor };
}

function signedDeadzone(value, deadzone) {
  const number = Number(value) || 0;
  const magnitude = Math.abs(number);
  if (magnitude <= deadzone) return 0;
  const sign = number < 0 ? -1 : 1;
  const normalized = (magnitude - deadzone) / (1 - deadzone);
  return clampSigned(normalized * sign);
}

function clampSigned(value) {
  return clamp(Number(value) || 0, -1, 1);
}

function clamp01(value) {
  return clamp(Number(value) || 0, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, factor) {
  return a + (b - a) * factor;
}
