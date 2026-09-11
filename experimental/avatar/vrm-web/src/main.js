import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

const status = document.querySelector('#status');
const modelInput = document.querySelector('#model');
const animationInput = document.querySelector('#animation');
const playAnimationButton = document.querySelector('#play-animation');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0.067, 0.075, 0.10);

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
const CAMERA_PRESETS = {
  full_body: { position: new THREE.Vector3(0, 1.15, 5.2), target: new THREE.Vector3(0, 1.0, 0) },
  three_quarter: { position: new THREE.Vector3(1.7, 1.35, 4.6), target: new THREE.Vector3(0, 1.15, 0) },
  bust: { position: new THREE.Vector3(0, 1.55, 3.0), target: new THREE.Vector3(0, 1.45, 0) },
};
let activeCameraPreset = 'full_body';
camera.position.copy(CAMERA_PRESETS.full_body.position);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const keyLight = new THREE.DirectionalLight(0xffffff, Math.PI * 1.2);
keyLight.position.set(1, 2, 3);
scene.add(keyLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const vrmLoader = new GLTFLoader();
vrmLoader.crossOrigin = 'anonymous';
vrmLoader.register((parser) => new VRMLoaderPlugin(parser));

const vrmaLoader = new GLTFLoader();
vrmaLoader.crossOrigin = 'anonymous';
vrmaLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

let currentVrm = null;
let currentMixer = null;
let currentAnimation = null;
let currentModelUrl = null;
let currentAnimationUrl = null;
const clock = new THREE.Clock();
const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);

let fpsSampleTime = 0;
let fpsFrames = 0;
let fps = 0;
let blinkTimer = 2.5;
let blinkPhase = null;

function setStatus(message) {
  status.textContent = message;
}

function disposeObject(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
}

function stopAnimation() {
  if (!currentMixer) return;
  currentMixer.stopAllAction();
  currentMixer.uncacheRoot(currentVrm?.scene);
  currentMixer = null;
}

function removeCurrentModel() {
  stopAnimation();
  if (!currentVrm) return;
  scene.remove(currentVrm.scene);
  disposeObject(currentVrm.scene);
  currentVrm = null;
  playAnimationButton.disabled = true;
}

function setCameraPreset(name) {
  const preset = CAMERA_PRESETS[name];
  if (!preset) return;
  activeCameraPreset = name;
  camera.position.copy(preset.position);
  lookAtTarget.position.copy(preset.target);
  setStatus(`Cámara ${name} · esperando VRM`);
}

function updateBlink(delta) {
  if (!currentVrm?.expressionManager) return;

  const manager = currentVrm.expressionManager;
  if (blinkPhase === null) {
    blinkTimer -= delta;
    if (blinkTimer > 0) return;
    blinkPhase = 0;
  }

  blinkPhase += delta;
  const duration = 0.16;
  const half = duration / 2;
  let weight;
  if (blinkPhase < half) {
    weight = blinkPhase / half;
  } else if (blinkPhase < duration) {
    weight = 1 - ((blinkPhase - half) / half);
  } else {
    weight = 0;
    blinkPhase = null;
    blinkTimer = 2.0 + Math.random() * 4.0;
  }
  manager.setValue('blink', weight);
}

async function loadVrm(url) {
  setStatus('Cargando VRM…');
  removeCurrentModel();

  try {
    const gltf = await vrmLoader.loadAsync(url, (event) => {
      if (event.total > 0) {
        setStatus(`Cargando VRM… ${Math.round((event.loaded / event.total) * 100)}%`);
      }
    });

    const vrm = gltf.userData.vrm;
    if (!vrm) throw new Error('El archivo no contiene un avatar VRM reconocible.');

    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.combineMorphs(vrm);
    vrm.scene.traverse((object) => { object.frustumCulled = false; });

    scene.add(vrm.scene);
    currentVrm = vrm;
    vrm.lookAt.target = lookAtTarget;
    blinkTimer = 2.5;
    blinkPhase = null;
    playAnimationButton.disabled = !currentAnimation;
    setStatus(`VRM cargado · ${activeCameraPreset} · ${Math.round(fps)} FPS`);
  } catch (error) {
    setStatus(`Error VRM: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadVrma(url) {
  setStatus('Cargando VRMA…');
  try {
    const gltf = await vrmaLoader.loadAsync(url);
    const animations = gltf.userData.vrmAnimations;
    if (!animations?.length) throw new Error('El archivo no contiene una animación VRMA reconocible.');
    currentAnimation = animations[0];
    playAnimationButton.disabled = !currentVrm;
    setStatus(`VRMA cargada · ${Math.round(currentAnimation.duration ?? 0)}s`);
  } catch (error) {
    currentAnimation = null;
    playAnimationButton.disabled = true;
    setStatus(`Error VRMA: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function playVrma() {
  if (!currentVrm || !currentAnimation) return;
  stopAnimation();
  const clip = createVRMAnimationClip(currentAnimation, currentVrm);
  currentMixer = new THREE.AnimationMixer(currentVrm.scene);
  currentMixer.clipAction(clip).reset().play();
  setStatus(`VRMA reproduciendo · ${activeCameraPreset}`);
}

modelInput.addEventListener('change', () => {
  const file = modelInput.files?.[0];
  if (!file) return;
  if (currentModelUrl) URL.revokeObjectURL(currentModelUrl);
  currentModelUrl = URL.createObjectURL(file);
  void loadVrm(currentModelUrl);
});

animationInput.addEventListener('change', () => {
  const file = animationInput.files?.[0];
  if (!file) return;
  if (currentAnimationUrl) URL.revokeObjectURL(currentAnimationUrl);
  currentAnimationUrl = URL.createObjectURL(file);
  void loadVrma(currentAnimationUrl);
});

playAnimationButton.addEventListener('click', playVrma);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('pointermove', (event) => {
  lookAtTarget.position.x = 4 * ((event.clientX / window.innerWidth) - 0.5);
  lookAtTarget.position.y = 2.5 * (0.5 - (event.clientY / window.innerHeight));
});

window.addEventListener('keydown', (event) => {
  const presets = { '1': 'full_body', '2': 'three_quarter', '3': 'bust' };
  const preset = presets[event.key];
  if (preset) setCameraPreset(preset);
});

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  fpsFrames += 1;
  fpsSampleTime += delta;
  if (fpsSampleTime >= 0.5) {
    fps = fpsFrames / fpsSampleTime;
    fpsFrames = 0;
    fpsSampleTime = 0;
    if (currentVrm) setStatus(`VRM cargado · ${activeCameraPreset} · ${Math.round(fps)} FPS`);
  }

  if (currentMixer) currentMixer.update(delta);
  updateBlink(delta);
  if (currentVrm) currentVrm.update(delta);
  renderer.render(scene, camera);
}

setCameraPreset('full_body');
animate();
