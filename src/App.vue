<template></template>
<script setup lang="ts">
import * as THREE from 'three';
import { Scene, Camera, WebGLRenderer, AnimationClip, Vector3 } from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { onMounted } from 'vue';
import { GUI } from "dat.gui";
import { useIdb } from './hooks/useIndexdbStore';
//计算加载时间
let start: number, end: number;
start = window.performance.now()
let mixer: THREE.AnimationMixer; //动画混合器对象
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
  camera.position.set(-95, 100, 250);
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
const initGlbLoader = () => {
  let loader = new GLTFLoader()
  let dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath("/draco/")
  loader.setDRACOLoader(dracoLoader)
  return loader;
}
const loadModel = async (scene: Scene) => {
  let loader = initGlbLoader()
  let res = await useIdb('park', "bak.glb")//远程或者indexedDB数据库种加载模型
  const glb = await loader.loadAsync(URL.createObjectURL(res as Blob))
  const model = glb.scene
  model.position.set(0, 0, 0)
  model.scale.set(3, 3, 3)
  scene.add(model)
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
  initStraightLine(scene)
  // walk(points)
  return { model, action }
}
//初始化轨迹曲线，使人物模型围绕轨迹运动
let anchor: Array<any> = [], VecAB: Vector3, distance: any, initdistance = 0, fragment: any, nextXYZ: THREE.Vector3, points: any[], i = 1;
const initStraightLine = (scene: Scene) => {
  points = [   //锚点数组
    new THREE.Vector3(-95, 0, 150),
    new THREE.Vector3(-95, 0, 100),
    new THREE.Vector3(-40, 0, 100),
    new THREE.Vector3(-40, 0, 50)
  ];

  // let lineMaterial = new THREE.LineBasicMaterial({
  //   color: '#fff'
  // })
  // let lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
  // let line = new THREE.Line(lineGeometry, lineMaterial)
  // scene.add(line)
  anchor.push(points[0]) //当前运动所在直线的两个锚点
  anchor.push(points[1])
}
const walk = (points: any, model: THREE.Group,) => {
  //控制运动
  distance = anchor[0].distanceTo(anchor[1]);//锚点距离
  initdistance += 0.3
  if (distance > initdistance) {
    VecAB = anchor[1].clone().sub(anchor[0]) as THREE.Vector3//锚点向量
    fragment = VecAB.clone().divideScalar(distance).multiplyScalar(initdistance)
    nextXYZ = anchor[0].clone().add(fragment)
    model.position.copy(nextXYZ)
  } else { //需要转向了
    if (points.length - 1 > i) { //i指向第二个锚点points的当前的位置
      //计算旋转方向
      i++
      const nextanchor = points[i].clone().sub(anchor[1]) //下一个锚点向量
      const angle = VecAB.angleTo(nextanchor)
      const cp = new Vector3().crossVectors(VecAB, nextanchor) //叉乘判断是顺时针还是逆时针旋转
      if (cp.y > 0) { //逆时针旋转
        model.rotateY(angle)
      } else { //顺时针旋转
        model.rotateY(-angle)
      }
      //继续运动
      anchor.shift() //去除第一个
      anchor.push(points[i])
      initdistance = 0
    } else { //往返运动
      points.reverse();
      anchor = []
      anchor.push(points[0]) //当前运动所在直线的两个锚点
      anchor.push(points[1])
      model.rotateY(Math.PI)
      console.log(Math.PI)
      initdistance = 0
      i = 1
    }
  }
  return { nextXYZ }
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
  const { scene, camera, renderer, canvas } = await initScene()
  initLight(scene)
  const { outlinePass, composer } = initPostprocessing(renderer, scene, camera) //后期处理，给物体添加轮廓线
  InitRaycaster(camera, scene, outlinePass)
  const controls = initOrbitControls(camera, canvas)
  loadModel(scene)
  const { model } = await initPersonModel(scene)
  update(renderer, scene, camera, controls, composer, model)
}

onMounted(() => {
  run()
  end = window.performance.now()
  console.log(`程序执行了${end - start} 毫秒`)
})
</script>
<style scoped lang="scss"></style>
