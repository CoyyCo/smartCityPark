import { IDBPDatabase, openDB } from "idb";
const useIdb = async (modelName: string, url: string) => {
  const db = await openDB("Model", 1, {
    upgrade(db) {
      const store = db.createObjectStore("Model", {
        autoIncrement: true,
      });
      store.createIndex("name", "name");
    },
  });
  const tx = db.transaction("Model", "readwrite");
  const idx = tx.store.index("name");
  const modelobj = await idx.get(modelName);
  await tx.done;
  return loaderModel(modelobj, db, modelName, url); //加载模型
};
const loaderModel = async (
  obj: { name: string; model: string },
  db: IDBPDatabase<unknown>,
  modelName: string,
  url: RequestInfo | URL
) => {
  if (obj == undefined) {
    let res = await fetch(url);
    let model = await res.blob();
    //如果没有下载过的话，下载模型
    await db.add("Model", {
      name: modelName,
      model: model,
    });
    return model;
  } else {
    //下载过直接返回模型
    return obj.model;
  }
};
export { useIdb };
