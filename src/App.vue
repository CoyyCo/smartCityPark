<template></template>
<script setup lang="ts">
import * as THREE from 'three';
import { Scene, Camera, WebGLRenderer, AnimationClip, Vector3 } from 'three';
import { onMounted } from 'vue';
import { GUI } from "dat.gui";
import { useIdb } from './hooks/useIndexdbStore';
import initScene from './hooks/useScene';
import initOrbitControls from './hooks/useOrbitControls'
import initLight from './hooks/useLight'
import initGlbLoader from './hooks/useGlbLoader'
import InitRaycaster from './hooks/useRaycaster'
import initPostprocessing from './hooks/usePostprocessing'
import {walk,initStraightLine} from './hooks/useModelRun';
//计算加载时间
let start: number, end: number;
start = window.performance.now()
let mixer: THREE.AnimationMixer; //动画混合器对象
const gui = new GUI();
var points:any[];//机器人运动轨迹锚点数组
let s: any = null //全局缓存sprite
//帧率控制
const clock = new THREE.Clock()
const FPS = 30;
const singleFrameTime = (1 / FPS)
let timeStamp = 0;
const loadModel = async (scene: Scene) => {
  let loader = initGlbLoader()
  let res = await useIdb('park', "bak.glb")//远程或者indexedDB数据库种加载模型
  const glb = await loader.loadAsync(URL.createObjectURL(res as Blob))
  const model = glb.scene
  model.position.set(0, 0, 0)
  model.scale.set(3, 3, 3)
  scene.add(model)
}
//加载人物模型
const initPersonModel = async (scene: Scene) => {
  const res = await useIdb('robot', 'RobotExpressive.glb')
  let loader = initGlbLoader()
  let glb = await loader.loadAsync(URL.createObjectURL(res as Blob))
  let model = glb.scene
  model.position.set(-95, 0, 150)
  model.scale.set(3, 3, 3)
  model.rotateY(Math.PI)
  //获取动画数据
  let animations: AnimationClip[] = glb.animations
  // console.log(animations[10]) //第11个动画是wolking
  mixer = new THREE.AnimationMixer(model)
  let action = mixer.clipAction(animations[10])
  action.play()
  scene.add(model)
  return { model, action }
}
const update = (renderer: WebGLRenderer, scene: Scene, camera: Camera, controls: any, composer: any, model: THREE.Group) => {
  requestAnimationFrame(() => update(renderer, scene, camera, controls, composer, model))
  const delta = clock.getDelta() //获取上一次请求渲染的时间
  timeStamp += delta;
  if (timeStamp >= singleFrameTime) { //控制在30帧
    controls.update()
    renderer.render(scene, camera)
    composer.render()
    walk(points, model)
    if (mixer) mixer.update(delta)
    timeStamp %= singleFrameTime
  }
}
const run = async () => {
  var { scene, camera, renderer, canvas } = await initScene()
  initLight(scene, gui)
  const { outlinePass, composer } = initPostprocessing(renderer, scene, camera) //后期处理，给物体添加轮廓线
  s = InitRaycaster(camera, scene, outlinePass, s)
  const controls = initOrbitControls(camera, canvas)
  loadModel(scene)
  const { model } = await initPersonModel(scene)
  points = initStraightLine()
  update(renderer, scene, camera, controls, composer, model)
}

onMounted(() => {
  run()
  end = window.performance.now()
  console.log(`程序执行了${end - start} 毫秒`)
})
</script>
<style scoped lang="scss"></style>
