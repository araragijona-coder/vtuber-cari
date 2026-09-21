import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MORPH_ALIASES = {
  mouthOpen: ["jawOpen", "mouthOpen", "MouthOpen", "viseme_aa"],
  blinkLeft: ["eyeBlinkLeft", "blinkLeft", "Blink_L", "EyeBlink_L"],
  blinkRight: ["eyeBlinkRight", "blinkRight", "Blink_R", "EyeBlink_R"],
  smileLeft: ["mouthSmileLeft", "smileLeft", "Smile_L"],
  smileRight: ["mouthSmileRight", "smileRight", "Smile_R"]
};

export class ThreeAvatarRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    this.camera.position.set(0, 1.45, 5.6);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(2, 3, 4);
    this.scene.add(key);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.avatar = null;
    this.placeholder = this.#createPlaceholder();
    this.placeholderParts = this.placeholder.userData.parts;
    this.placeholderFace = this.placeholder.userData.face;

    this.morphTargets = [];
    this.resizeObserver = new ResizeObserver(() => this.#resize());
    this.resizeObserver.observe(canvas);
    this.#resize();
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    if (this.avatar) this.root.remove(this.avatar);

    this.avatar = gltf.scene;
    this.root.add(this.avatar);
    this.root.remove(this.placeholder);
    this.morphTargets = collectMorphTargets(this.avatar);
    this.#frameObject(this.avatar);
    return this.avatar;
  }

  apply(params) {
    const target = this.avatar || this.placeholder;
    if (this.avatar) {
      target.rotation.y = params.headYaw || 0;
      target.rotation.x = params.headPitch || 0;
      target.rotation.z = params.headRoll || 0;
    } else {
      this.placeholderFace.rotation.y = params.headYaw || 0;
      this.placeholderFace.rotation.x = params.headPitch || 0;
      this.placeholderFace.rotation.z = params.headRoll || 0;
    }

    const mouthOpen = clamp01(params.mouthOpen || 0);
    const blink = clamp01(params.blink || 0);
    const expression = params.expression || "neutral";

    target.userData.cari = params;
    target.userData.expression = expression;

    if (this.avatar) {
      applyMorph(this.morphTargets, "mouthOpen", mouthOpen);
      applyMorph(this.morphTargets, "blinkLeft", blink);
      applyMorph(this.morphTargets, "blinkRight", blink);
      applyMorph(
        this.morphTargets,
        "smileLeft",
        expression === "happy" ? 0.85 : 0
      );
      applyMorph(
        this.morphTargets,
        "smileRight",
        expression === "happy" ? 0.85 : 0
      );
      applyMorph(
        this.morphTargets,
        "frownLeft",
        expression === "sad" ? 0.75 : 0
      );
      applyMorph(
        this.morphTargets,
        "frownRight",
        expression === "sad" ? 0.75 : 0
      );
      applyMorph(
        this.morphTargets,
        "browDownLeft",
        expression === "angry" ? 0.75 : 0
      );
      applyMorph(
        this.morphTargets,
        "browDownRight",
        expression === "angry" ? 0.75 : 0
      );
      applyMorph(
        this.morphTargets,
        "eyeWideLeft",
        expression === "afraid" ? 0.7 : 0
      );
      applyMorph(
        this.morphTargets,
        "eyeWideRight",
        expression === "afraid" ? 0.7 : 0
      );
      return;
    }

    const expressionPose = placeholderExpressionPose(expression);

    const blinkScale = Math.max(0.12, 1 - blink * 0.88);
    const emotionEyeScale = expressionPose.eyeScale;
    this.placeholderParts.leftEye.scale.y = blinkScale * emotionEyeScale;
    this.placeholderParts.rightEye.scale.y = blinkScale * emotionEyeScale;

    if (this.placeholderParts.leftPupil && this.placeholderParts.rightPupil) {
      const gazeX = Number(params.eyeX) || 0;
      const gazeY = Number(params.eyeY) || 0;
      const pupilX = gazeX * 0.026;
      const pupilY = gazeY * 0.020;
      this.placeholderParts.leftPupil.position.x = -0.14 + pupilX;
      this.placeholderParts.rightPupil.position.x = 0.14 + pupilX;
      this.placeholderParts.leftPupil.position.y = 0.03 - pupilY;
      this.placeholderParts.rightPupil.position.y = 0.03 - pupilY;
    }

    this.placeholderParts.mouth.scale.y =
      0.5 + (mouthOpen * expressionPose.mouthScale);
    this.placeholderParts.mouth.scale.x = expressionPose.mouthWidth;
    this.placeholderParts.mouth.rotation.z = expressionPose.mouthRotation;
    this.placeholderParts.mouth.position.y = -0.12 + expressionPose.mouthY;

    if (this.placeholderParts.leftShoulder && this.placeholderParts.rightShoulder) {
      this.placeholderParts.leftShoulder.rotation.z =
        -0.08 - expressionPose.shoulderLift;
      this.placeholderParts.rightShoulder.rotation.z =
        0.08 + expressionPose.shoulderLift;
    }

    if (this.placeholderParts.head) {
      this.placeholderParts.head.position.x = expressionPose.headOffsetX;
      this.placeholderParts.head.position.y = 2.30 + expressionPose.headOffsetY;
      this.placeholderParts.head.rotation.z = expressionPose.headRoll;
    }

    this.placeholderFace.position.z = 0.36 + expressionPose.faceForward;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();

    if (this.avatar) disposeObject(this.avatar);
    disposeObject(this.placeholder);
    this.renderer.dispose();
  }

  #frameObject(object) {
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const height = Math.max(size.y, 0.5);
    const distance =
      (height * 0.58) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));

    this.camera.position.set(center.x, center.y + height * 0.04, center.z + distance);
    this.camera.lookAt(center.x, center.y + height * 0.02, center.z);
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = Math.max(100, distance * 20);
    this.camera.updateProjectionMatrix();
  }

  #resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  #createPlaceholder() {
    // Full-body technical fallback. This is deliberately not the final Cari
    // artwork: the canonical visual design is still undefined. The fallback
    // gives us a complete VTuber silhouette, articulation points and asset
    // mounting locations so tracking/composition can be validated now.
    const group = new THREE.Group();
    group.name = "CariV0Avatar";
    group.position.y = 0.08;

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xb98263,
      roughness: 0.8,
      metalness: 0.0
    });
    const shirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f6f7d,
      roughness: 0.76,
      metalness: 0.0
    });
    const shortsMaterial = new THREE.MeshStandardMaterial({
      color: 0x15171b,
      roughness: 0.72,
      metalness: 0.0
    });
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d432b,
      roughness: 0.74,
      metalness: 0.0
    });
    const innerHairMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a6a46,
      roughness: 0.72,
      metalness: 0.0
    });
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7f4ee,
      roughness: 0.6,
      metalness: 0.0
    });
    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a3826,
      roughness: 0.6,
      metalness: 0.0
    });
    const bandageMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8ddd0,
      roughness: 0.86,
      metalness: 0.0
    });

    const root = new THREE.Group();
    root.name = "root";
    group.add(root);

    const hips = new THREE.Group();
    hips.name = "hips";
    hips.position.y = 0.95;
    root.add(hips);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 0.72, 8, 20),
      shirtMaterial
    );
    torso.name = "torso";
    torso.scale.set(1.15, 1.0, 0.82);
    torso.position.y = 1.42;
    hips.add(torso);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.18, 20),
      skinMaterial
    );
    neck.name = "neck";
    neck.position.y = 1.88;
    hips.add(neck);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.40, 48, 32),
      skinMaterial
    );
    head.name = "head";
    head.scale.set(0.94, 1.07, 0.90);
    head.position.set(0, 2.30, 0);
    hips.add(head);

    const face = new THREE.Group();
    face.name = "face";
    face.position.set(0, 2.30, 0.36);
    hips.add(face);

    const eyeGeometry = new THREE.SphereGeometry(0.055, 20, 12);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
    leftEye.name = "leftEye";
    leftEye.position.set(-0.14, 0.03, 0.02);
    face.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
    rightEye.name = "rightEye";
    rightEye.position.set(0.14, 0.03, 0.02);
    face.add(rightEye);

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.014, 10, 28, Math.PI),
      pupilMaterial
    );
    mouth.name = "mouth";
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.12, 0.02);
    face.add(mouth);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.43, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMaterial
    );
    hair.name = "hair";
    hair.scale.set(1.02, 1.18, 0.98);
    hair.position.set(0, 2.43, -0.035);
    hips.add(hair);

    const innerHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.33, 32, 18, 0, Math.PI * 2, 0.28, Math.PI * 0.38),
      innerHairMaterial
    );
    innerHair.name = "innerHair";
    innerHair.scale.set(1.0, 1.0, 0.72);
    innerHair.position.set(0, 2.31, 0.11);
    face.add(innerHair);

    const ponytail = new THREE.Group();
    ponytail.name = "ponytail";
    ponytail.position.set(0, 2.19, -0.20);
    hips.add(ponytail);

    const ponytailMass = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.42, 6, 14),
      hairMaterial
    );
    ponytailMass.rotation.x = -0.28;
    ponytailMass.rotation.z = 0.08;
    ponytail.add(ponytailMass);

    const ponytailTie = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.018, 10, 18),
      innerHairMaterial
    );
    ponytailTie.rotation.x = Math.PI / 2;
    ponytailTie.position.y = 0.22;
    ponytail.add(ponytailTie);

    const ahoge = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.23, 8),
      hairMaterial
    );
    ahoge.name = "ahoge";
    ahoge.rotation.z = 0.18;
    ahoge.position.set(0, 2.88, 0.0);
    hips.add(ahoge);

    const bandage = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.022, 0.015),
      bandageMaterial
    );
    bandage.name = "noseBandage";
    bandage.rotation.z = -0.14;
    bandage.position.set(0.02, 2.285, 0.405);
    face.add(bandage);

    const pupilGeometry = new THREE.SphereGeometry(0.020, 16, 12);
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.name = "leftPupil";
    leftPupil.position.set(-0.14, 0.03, 0.045);
    face.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.name = "rightPupil";
    rightPupil.position.set(0.14, 0.03, 0.045);
    face.add(rightPupil);

    const shorts = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.30, 0.50),
      shortsMaterial
    );
    shorts.name = "shorts";
    shorts.position.set(0, 1.02, 0.0);
    hips.add(shorts);

    const armGeometry = new THREE.CapsuleGeometry(0.105, 0.48, 8, 16);
    const forearmGeometry = new THREE.CapsuleGeometry(0.09, 0.42, 8, 16);
    const legGeometry = new THREE.CapsuleGeometry(0.13, 0.58, 8, 16);
    const shinGeometry = new THREE.CapsuleGeometry(0.11, 0.56, 8, 16);
    const shoeGeometry = new THREE.SphereGeometry(0.15, 24, 16);

    const armSlots = {
      left: [-0.43, 1.67],
      right: [0.43, 1.67]
    };
    const bodyParts = {
      head,
      leftEye,
      rightEye,
      mouth,
      hair,
      innerHair,
      ponytail,
      ahoge,
      noseBandage: bandage,
      leftPupil,
      rightPupil,
      torso,
      shorts
    };

    for (const [side, [x, y]] of Object.entries(armSlots)) {
      const sign = side === "left" ? -1 : 1;
      const shoulder = new THREE.Group();
      shoulder.name = `${side}Shoulder`;
      shoulder.position.set(x, y, 0);
      shoulder.rotation.z = sign * -0.08;
      hips.add(shoulder);

      const upperArm = new THREE.Mesh(armGeometry, material);
      upperArm.name = `${side}UpperArm`;
      upperArm.position.y = -0.24;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.name = `${side}Elbow`;
      elbow.position.y = -0.48;
      shoulder.add(elbow);

      const forearm = new THREE.Mesh(forearmGeometry, material);
      forearm.name = `${side}Forearm`;
      forearm.position.y = -0.22;
      elbow.add(forearm);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 20, 14),
        material
      );
      hand.name = `${side}Hand`;
      hand.position.y = -0.48;
      elbow.add(hand);

      bodyParts[`${side}Shoulder`] = shoulder;
      bodyParts[`${side}Elbow`] = elbow;
      bodyParts[`${side}Hand`] = hand;
    }

    for (const side of ["left", "right"]) {
      const sign = side === "left" ? -1 : 1;
      const thigh = new THREE.Group();
      thigh.name = `${side}Thigh`;
      thigh.position.set(sign * 0.15, 0.90, 0);
      hips.add(thigh);

      const upperLeg = new THREE.Mesh(legGeometry, material);
      upperLeg.name = `${side}UpperLeg`;
      upperLeg.position.y = -0.30;
      thigh.add(upperLeg);

      const knee = new THREE.Group();
      knee.name = `${side}Knee`;
      knee.position.y = -0.60;
      thigh.add(knee);

      const shin = new THREE.Mesh(shinGeometry, material);
      shin.name = `${side}Shin`;
      shin.position.y = -0.28;
      knee.add(shin);

      const foot = new THREE.Mesh(shoeGeometry, darkMaterial);
      foot.name = `${side}Foot`;
      foot.scale.set(1.25, 0.72, 1.65);
      foot.position.set(0, -0.61, 0.07);
      knee.add(foot);

      bodyParts[`${side}Thigh`] = thigh;
      bodyParts[`${side}Knee`] = knee;
      bodyParts[`${side}Foot`] = foot;
    }

    const anchors = new THREE.Group();
    anchors.name = "assetAnchors";
    const anchorNames = [
      "hair",
      "head",
      "face",
      "neck",
      "chest",
      "waist",
      "leftHand",
      "rightHand",
      "leftShoulder",
      "rightShoulder"
    ];
    for (const name of anchorNames) {
      const anchor = new THREE.Group();
      anchor.name = `anchor:${name}`;
      anchors.add(anchor);
    }
    hips.add(anchors);

    group.userData.placeholder = true;
    group.userData.modelType = "full-body";
    group.userData.face = face;
    group.userData.parts = bodyParts;
    group.userData.anchors = anchors;
    group.userData.note = "Cari V0 procedural avatar: canonical visual invariants + runtime actions; replace meshes later without changing the acting contract.";

    this.root.add(group);
    return group;
  }

}

function collectMorphTargets(root) {
  const targets = [];

  root.traverse(object => {
    if (!object.isMesh || !object.morphTargetDictionary || !object.morphTargetInfluences) {
      return;
    }

    targets.push({
      dictionary: object.morphTargetDictionary,
      influences: object.morphTargetInfluences
    });
  });

  return targets;
}

function applyMorph(targets, kind, value) {
  const aliases = MORPH_ALIASES[kind] || [];
  for (const target of targets) {
    for (const alias of aliases) {
      const index = target.dictionary[alias];
      if (index !== undefined) {
        target.influences[index] = value;
        break;
      }
    }
  }
}

function placeholderExpressionPose(expression) {
  switch (expression) {
    case "happy":
      return {
        eyeScale: 0.72,
        mouthScale: 2.25,
        mouthWidth: 1.18,
        mouthRotation: Math.PI * 0.78,
        mouthY: -0.01,
        shoulderLift: 0.04,
        headOffsetX: 0,
        headOffsetY: 0.02,
        headRoll: 0.02,
        faceForward: 0.01
      };
    case "angry":
      return {
        eyeScale: 0.78,
        mouthScale: 1.25,
        mouthWidth: 0.92,
        mouthRotation: Math.PI * 1.18,
        mouthY: 0.01,
        shoulderLift: 0.02,
        headOffsetX: 0,
        headOffsetY: -0.01,
        headRoll: 0,
        faceForward: 0.018
      };
    case "sad":
      return {
        eyeScale: 0.68,
        mouthScale: 0.95,
        mouthWidth: 0.88,
        mouthRotation: Math.PI * 1.10,
        mouthY: -0.01,
        shoulderLift: -0.06,
        headOffsetX: 0,
        headOffsetY: -0.035,
        headRoll: -0.025,
        faceForward: -0.01
      };
    case "afraid":
      return {
        eyeScale: 1.28,
        mouthScale: 3.2,
        mouthWidth: 1.08,
        mouthRotation: Math.PI,
        mouthY: 0,
        shoulderLift: 0.09,
        headOffsetX: 0,
        headOffsetY: 0.02,
        headRoll: 0.02,
        faceForward: 0.025
      };
    case "embarrassed":
      return {
        eyeScale: 0.50,
        mouthScale: 0.85,
        mouthWidth: 0.84,
        mouthRotation: Math.PI,
        mouthY: 0.01,
        shoulderLift: -0.02,
        headOffsetX: 0.03,
        headOffsetY: -0.01,
        headRoll: 0.05,
        faceForward: -0.005
      };
    case "exhausted":
      return {
        eyeScale: 0.42,
        mouthScale: 0.72,
        mouthWidth: 0.90,
        mouthRotation: Math.PI,
        mouthY: 0,
        shoulderLift: -0.09,
        headOffsetX: 0,
        headOffsetY: -0.06,
        headRoll: -0.04,
        faceForward: -0.015
      };
    case "confused":
      return {
        eyeScale: 1.02,
        mouthScale: 0.95,
        mouthWidth: 0.95,
        mouthRotation: Math.PI,
        mouthY: 0,
        shoulderLift: 0,
        headOffsetX: 0.01,
        headOffsetY: 0.015,
        headRoll: 0.11,
        faceForward: 0.0
      };
    default:
      return {
        eyeScale: 1,
        mouthScale: 2.2,
        mouthWidth: 1,
        mouthRotation: Math.PI,
        mouthY: 0,
        shoulderLift: 0,
        headOffsetX: 0,
        headOffsetY: 0,
        headRoll: 0,
        faceForward: 0
      };
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function disposeObject(object) {
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();

    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        for (const key of [
          "map",
          "normalMap",
          "roughnessMap",
          "metalnessMap",
          "emissiveMap"
        ]) {
          material[key]?.dispose();
        }
        material.dispose();
      }
    }
  });
}
