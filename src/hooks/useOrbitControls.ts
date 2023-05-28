import { Camera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const initOrbitControls = (camera: Camera, canvas: HTMLCanvasElement) => {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = false;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = 1.5;
  controls.enableZoom = true;
  return controls;
};
export default initOrbitControls;