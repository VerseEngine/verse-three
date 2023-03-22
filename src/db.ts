const openDb = async () => {
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("verse", 1); // TODO: db名
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBRequest).result;
      db.createObjectStore("myavatar");
    };
    req.onsuccess = (e) => {
      resolve((e.target as IDBRequest).result);
    };
    req.onerror = (e) => {
      reject(e);
    };
  });
};

export const storeAvatarData = async (data: ArrayBuffer) => {
  const db = await openDb();
  const tx = db.transaction("myavatar", "readwrite");
  const req = tx.objectStore("myavatar").put(data, "0");
  db.close();
  req.onsuccess = () => {
    // console.log("saved");
  };
  req.onerror = (e) => {
    console.warn(e);
  };
};

export const deleteAvatarData = async () => {
  const db = await openDb();
  const tx = db.transaction("myavatar", "readwrite");
  const req = tx.objectStore("myavatar").delete("0");
  db.close();
  req.onsuccess = () => {
    // console.log("saved");
  };
  req.onerror = (e) => {
    console.warn(e);
  };
};

export const loadAvatarData = async () => {
  const db = await openDb();
  let tx: IDBTransaction;
  try {
    tx = db.transaction("myavatar", "readonly");
  } catch (ex) {
    if (!`${ex}`.includes("not found")) {
      console.warn(ex);
    }
    return null;
  }
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const req = tx.objectStore("myavatar").get("0");
    db.close();
    req.onsuccess = (e) => {
      resolve((e.target as IDBRequest).result);
    };
    req.onerror = (ex) => {
      console.log(ex);
      reject(ex);
    };
  });
};
