<template></template>
<script setup lang="ts">
import * as THREE from 'three';
import { Scene, Camera, WebGLRenderer } from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { onMounted } from 'vue';
// import modelfile from './assets/model/bak.glb?url'
import { GUI } from "dat.gui";
import {useIdb} from './hooks/useIndexdbStore';
//计算加载时间
let start: number,end:number;
start = window.performance.now()

const gui = new GUI();
let s: any = null //全局缓存sprite
//帧率控制
const clock = new THREE.Clock()
const FPS = 30;
const singleFrameTime = (1 / FPS)
let timeStamp = 0;
const initScene = async () => {
  const scene = new THREE.Scene()
  // scene.background =await new THREE.TextureLoader().loadAsync(sky)
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
  camera.position.set(0, 100, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  const canvas = renderer.domElement
  document.body.appendChild(canvas)
  // const axesHelper = new THREE.AxesHelper(200);
  // scene.add(axesHelper);
  return {
    scene, camera, renderer, canvas
  }
}
const initOrbitControls = (camera: Camera, canvas: HTMLCanvasElement) => {
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true;
  controls.dampingFactor = 0.25
  controls.enableZoom = false
  controls.minPolarAngle = 0
  controls.maxPolarAngle = 1.5
  controls.enableZoom = true
  return controls
}
const initLight = (scene: Scene) => {
  const light = new THREE.AmbientLight(0xffffff, 1); // soft white light
  gui.add(light, "intensity", 0, 1, 0.01) //光照强度控制
  scene.add(light);
  // const pointLight = new THREE.PointLight(0xffffff, 1, 0);
  // pointLight.position.set(500, 500, 500);
  // scene.add(pointLight);
  // const sphereSize = 20;
  // const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);//点光源模拟器
  // scene.add(pointLightHelper);
}
const loadModel = async (scene: Scene) => {
  let loader = new GLTFLoader()
  let dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath("/draco/")
  loader.setDRACOLoader(dracoLoader)
  let res = await useIdb('park')//远程或者indexdb数据库种加载模型
  const glb = await loader.loadAsync(URL.createObjectURL(res as Blob))
  const model = glb.scene
  model.position.set(0, 0, 0)
  model.scale.set(3, 3, 3)
  scene.add(model)
}

const update = (renderer: WebGLRenderer, scene: Scene, camera: Camera, controls: any, composer: any) => {
  requestAnimationFrame(() => update(renderer, scene, camera, controls, composer))
  const delta = clock.getDelta() //获取上一次请求渲染的时间
  timeStamp += delta;
  if (timeStamp >= singleFrameTime) { //控制在30帧
    controls.update()
    renderer.render(scene, camera)
    composer.render()
    timeStamp %= singleFrameTime
  }
}
const InitRaycaster = (camera: Camera, scene: Scene, outlinePass: OutlinePass) => {
  window.addEventListener("click", (e) => {
    //初始化射线
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children, true)
    if (intersects.length > 0) {
      let obj = intersects[0].object
      //找到最上层的type="mesh"的父节点
      while (obj.type == "Mesh") {
        obj = obj.parent as THREE.Object3D<THREE.Event>
      }
      outlinePass.selectedObjects = []
      outlinePass.selectedObjects = [obj]
      //显示精灵贴图
      if (s)
        scene.remove(s) //删除上一个
      const x = new THREE.Box3().setFromObject(obj)
      s = addSprite(scene, obj.name, x.max)
    }
  })
}
const initPostprocessing = (renderer: WebGLRenderer, scene: Scene, camera: Camera) => {
  const composer = new EffectComposer(renderer)
  const renderpass = new RenderPass(scene, camera)
  composer.addPass(renderpass)
  const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera)
  outlinePass.edgeStrength = 2; //包围线浓度
  outlinePass.edgeGlow = 2; //边缘线范围
  outlinePass.edgeThickness = 2; //边缘线浓度
  outlinePass.pulsePeriod = 1; //包围线闪烁频率
  outlinePass.visibleEdgeColor.set('white'); //包围线颜色
  outlinePass.hiddenEdgeColor.set('white'); //被遮挡的边界线颜色
  composer.addPass(outlinePass)
  const effectFXAA = new ShaderPass(FXAAShader);
  effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  effectFXAA.renderToScreen = true;
  composer.addPass(effectFXAA);
  return { outlinePass, composer }
}
//给模型添加动态精灵文字---start
//1 使用canvas绘制一段文字
const initcanvas = (name: string) => {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d') as any;
  c.width = 300;
  c.height = 100;
  ctx.font = "30px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("name: " + name, 0, 30);
  return c
}
//2.将canvas作为材质传给spritematerial
const initSpriteMaterial = (canvas: HTMLCanvasElement, vec3: THREE.Vector3) => {
  const map = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: map,
    transparent: true,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(20, 20)
  sprite.position.set(vec3.x, vec3.y + 20, vec3.z)
  return sprite
}
//3 整合
const addSprite = (scene: Scene, name: string, vec3: THREE.Vector3) => {
  const c = initcanvas(name);
  const sprite = initSpriteMaterial(c, vec3)
  scene.add(sprite)
  return sprite
}
//---end
const run = async () => {
  const { scene, camera, renderer, canvas } = await initScene()
  initLight(scene)
  const { outlinePass, composer } = initPostprocessing(renderer, scene, camera) //后期处理，给物体添加轮廓线
  InitRaycaster(camera, scene, outlinePass)
  const controls = initOrbitControls(camera, canvas)
  update(renderer, scene, camera, controls, composer)
  loadModel(scene)
}

onMounted(() => {
  run()
  end = window.performance.now()
  console.log(`程序执行了${end-start} 毫秒`)
})
</script>
<style scoped lang="scss"></style>
