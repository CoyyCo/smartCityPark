import { Vector3 } from "three";
import * as THREE from 'three';
//初始化轨迹曲线，使人物模型围绕轨迹运动
let anchor: Array<any> = [],
  VecAB: Vector3,
  distance: any,
  initdistance = 0,
  fragment: any,
  nextXYZ: THREE.Vector3,
  points: any[],
  i = 1;
const initStraightLine = () => {
  points = [
    //锚点数组
    new THREE.Vector3(-95, 0, 150),
    new THREE.Vector3(-95, 0, 100),
    new THREE.Vector3(-40, 0, 100),
    new THREE.Vector3(-40, 0, 50),
  ];
  anchor.push(points[0]); //当前运动所在直线的两个锚点
  anchor.push(points[1]);
  return points
};
const walk = (points: any, model: THREE.Group) => {
  //控制运动
  distance = anchor[0].distanceTo(anchor[1]); //锚点距离
  initdistance += 0.3;
  if (distance > initdistance) {
    VecAB = anchor[1].clone().sub(anchor[0]) as THREE.Vector3; //锚点向量
    fragment = VecAB.clone()
      .divideScalar(distance)
      .multiplyScalar(initdistance);
    nextXYZ = anchor[0].clone().add(fragment);
    model.position.copy(nextXYZ);
  } else {
    //需要转向了
    if (points.length - 1 > i) {
      //i指向第二个锚点points的当前的位置
      //计算旋转方向
      i++;
      const nextanchor = points[i].clone().sub(anchor[1]); //下一个锚点向量
      const angle = VecAB.angleTo(nextanchor);
      const cp = new Vector3().crossVectors(VecAB, nextanchor); //叉乘判断是顺时针还是逆时针旋转
      if (cp.y > 0) {
        //逆时针旋转
        model.rotateY(angle);
      } else {
        //顺时针旋转
        model.rotateY(-angle);
      }
      //继续运动
      anchor.shift(); //去除第一个
      anchor.push(points[i]);
      initdistance = 0;
    } else {
      //往返运动
      points.reverse();
      anchor = [];
      anchor.push(points[0]); //当前运动所在直线的两个锚点
      anchor.push(points[1]);
      model.rotateY(Math.PI);
      console.log(Math.PI);
      initdistance = 0;
      i = 1;
    }
  }
  return { nextXYZ };
};

export {walk,initStraightLine};