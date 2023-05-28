import * as THREE from 'three';
const initScene = async () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    4000
  );
  camera.position.set(-95, 100, 250);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  const canvas = renderer.domElement;
  document.body.appendChild(canvas);
  // const axesHelper = new THREE.AxesHelper(200);
  // scene.add(axesHelper);
  return {
    scene,
    camera,
    renderer,
    canvas,
  };
};
export default initScene
