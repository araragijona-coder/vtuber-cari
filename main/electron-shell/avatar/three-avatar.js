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
    this.camera = new THREE.PerspectiveCamera(25, 1, 0.01, 100);
    this.camera.position.set(0, 1.35, 3.2);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(2, 3, 4);
    this.scene.add(key);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.avatar = null;
    this.placeholder = this.#createPlaceholder();
    this.placeholderParts = {
      head: this.placeholder.children[0],
      leftEye: this.placeholder.children[1],
      rightEye: this.placeholder.children[2],
      mouth: this.placeholder.children[3]
    };

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
    return this.avatar;
  }

  apply(params) {
    const target = this.avatar || this.placeholder;
    target.rotation.y = params.headYaw || 0;
    target.rotation.x = params.headPitch || 0;
    target.rotation.z = params.headRoll || 0;

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
      return;
    }

    const eyesScale = Math.max(0.12, 1 - blink * 0.88);
    this.placeholderParts.leftEye.scale.y = eyesScale;
    this.placeholderParts.rightEye.scale.y = eyesScale;
    this.placeholderParts.mouth.scale.y = 0.5 + mouthOpen * 2.2;
    this.placeholderParts.mouth.rotation.z =
      expression === "happy" ? Math.PI * 0.82 :
      expression === "angry" ? Math.PI * 1.18 :
      Math.PI;
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

  #resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  #createPlaceholder() {
    const group = new THREE.Group();
    group.position.y = 0.8;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 48, 32),
      new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.0 })
    );
    head.scale.set(0.92, 1.08, 0.9);
    group.add(head);

    const eyeGeometry = new THREE.SphereGeometry(0.09, 20, 12);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111318 });

    for (const x of [-0.25, 0.25]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(x, 0.05, 0.66);
      group.add(eye);
    }

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.025, 12, 32, Math.PI),
      eyeMaterial
    );
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.2, 0.66);
    group.add(mouth);

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
