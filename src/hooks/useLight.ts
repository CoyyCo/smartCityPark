import { GUI } from "dat.gui";
import{ Scene } from "three";
import * as THREE from 'three';
const initLight = (scene: Scene,gui:GUI) => {
  const light = new THREE.AmbientLight(0xffffff, 1); // soft white light
  gui.add(light, "intensity", 0, 1, 0.01); //光照强度控制
  scene.add(light);
};
export default initLight;
