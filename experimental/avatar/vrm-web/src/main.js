import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const status = document.querySelector('#status');
const modelInput = document.querySelector('#model');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0.067, 0.075, 0.10);

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
camera.position.set(0, 1.15, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const keyLight = new THREE.DirectionalLight(0xffffff, Math.PI * 1.2);
keyLight.position.set(1, 2, 3);
scene.add(keyLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const loader = new GLTFLoader();
loader.crossOrigin = 'anonymous';
loader.register((parser) => new VRMLoaderPlugin(parser));

let currentVrm = null;
let currentUrl = null;
const clock = new THREE.Clock();
const lookAtTarget = new THREE.Object3D();
scene.add(lookAtTarget);

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

function removeCurrentModel() {
  if (!currentVrm) return;
  scene.remove(currentVrm.scene);
  disposeObject(currentVrm.scene);
  currentVrm = null;
}

async function loadVrm(url) {
  setStatus('Cargando VRM…');
  removeCurrentModel();

  try {
    const gltf = await loader.loadAsync(url, (event) => {
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
    setStatus('VRM cargado · renderer experimental activo');
  } catch (error) {
    setStatus(`Error VRM: ${error instanceof Error ? error.message : String(error)}`);
  }
}

modelInput.addEventListener('change', () => {
  const file = modelInput.files?.[0];
  if (!file) return;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(file);
  void loadVrm(currentUrl);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('pointermove', (event) => {
  lookAtTarget.position.x = 4 * ((event.clientX / window.innerWidth) - 0.5);
  lookAtTarget.position.y = 2.5 * (0.5 - (event.clientY / window.innerHeight));
});

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (currentVrm) currentVrm.update(delta);
  renderer.render(scene, camera);
}

animate();
