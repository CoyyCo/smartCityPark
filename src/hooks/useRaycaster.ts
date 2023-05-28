import { Camera, Scene } from "three";
import * as THREE from "three";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
const InitRaycaster = (
  camera: Camera,
  scene: Scene,
  outlinePass: OutlinePass,
  s: any
) => {
  window.addEventListener("click", (e) => {
    //初始化射线
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      //找到最上层的type="mesh"的父节点
      while (obj.type == "Mesh") {
        obj = obj.parent as THREE.Object3D<THREE.Event>;
      }
      outlinePass.selectedObjects = [];
      outlinePass.selectedObjects = [obj];
      //显示精灵贴图
      if (s) scene.remove(s); //删除上一个
      const x = new THREE.Box3().setFromObject(obj);
      s = addSprite(scene, obj.name, x.max);
      return s;
    }
  });
};
//给模型添加动态精灵文字---start
//1 使用canvas绘制一段文字
const initcanvas = (name: string) => {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d") as any;
  c.width = 300;
  c.height = 100;
  ctx.font = "30px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("name: " + name, 0, 30);
  return c;
};
//2.将canvas作为材质传给spritematerial
const initSpriteMaterial = (canvas: HTMLCanvasElement, vec3: THREE.Vector3) => {
  const map = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: map,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(20, 20, 1);
  sprite.position.set(vec3.x, vec3.y + 20, vec3.z);
  return sprite;
};
//3 整合
const addSprite = (scene: Scene, name: string, vec3: THREE.Vector3) => {
  const c = initcanvas(name);
  const sprite = initSpriteMaterial(c, vec3);
  scene.add(sprite);
  return sprite;
};
//---end
export default InitRaycaster;
