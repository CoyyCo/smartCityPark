import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { WebGLRenderer, Scene, Camera } from "three";
import * as THREE from 'three';
const initPostprocessing = (
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera
) => {
  const composer = new EffectComposer(renderer);
  const renderpass = new RenderPass(scene, camera);
  composer.addPass(renderpass);
  const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 2; //包围线浓度
  outlinePass.edgeGlow = 2; //边缘线范围
  outlinePass.edgeThickness = 2; //边缘线浓度
  outlinePass.pulsePeriod = 1; //包围线闪烁频率
  outlinePass.visibleEdgeColor.set("white"); //包围线颜色
  outlinePass.hiddenEdgeColor.set("white"); //被遮挡的边界线颜色
  composer.addPass(outlinePass);
  const effectFXAA = new ShaderPass(FXAAShader);
  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );
  effectFXAA.renderToScreen = true;
  composer.addPass(effectFXAA);
  return { outlinePass, composer };
};
export default initPostprocessing;
