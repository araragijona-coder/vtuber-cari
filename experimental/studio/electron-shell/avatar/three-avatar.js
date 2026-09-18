import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class ThreeAvatarRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth || 640, canvas.clientHeight || 720, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(25, 1, 0.01, 100);
    this.camera.position.set(0, 1.4, 3.0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.avatar = null;
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    if (this.avatar) this.root.remove(this.avatar);
    this.avatar = gltf.scene;
    this.root.add(this.avatar);
    return this.avatar;
  }

  apply(params) {
    if (!this.avatar) return;
    this.avatar.rotation.y = params.headYaw || 0;
    this.avatar.rotation.x = params.headPitch || 0;
    this.avatar.rotation.z = params.headRoll || 0;
    this.avatar.userData.cari = params;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
