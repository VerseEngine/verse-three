import * as THREE from "three";

export function createWorldObjects(
  scene,
  _collisionObjects,
  teleportTargetObjects
) {
  {
    const o = createBridge();
    o.rotateY(180 * (Math.PI / 180));
    o.position.set(2, 0, -1.5);

    scene.add(o);
    teleportTargetObjects.push(o);
    o.matrixAutoUpdate = false;
    o.matrixWorldAutoUpdate = false;
    o.updateMatrix();
    o.updateMatrixWorld();
  }
  /* {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 3, 1, 1),
      new THREE.MeshLambertMaterial({
        color: 0x5e5e5e,
        side: THREE.DoubleSide,
      })
    );
    wall.name = "wall-r";
    wall.position.set(-2, 0.5, 0);
    wall.rotation.y = Math.PI / 2;
    scene.add(wall);
    collisionObjects.push(wall);
  } */
}

function createBridge() {
  const res = new THREE.Group();
  res.name = "bridge";
  const material = new THREE.MeshStandardMaterial({ color: 0xffd479 });

  let y = 0;
  let z = 0;
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.2), material);
    m.position.set(0, y, z);
    y += 0.2;
    z += 0.2;
    res.add(m);
  }
  z -= 0.1;
  {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 5), material);
    m.position.set(0, y, z + 2.5);
    res.add(m);
    z += 5;
  }
  y -= 0.2;
  z += 0.1;
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.2), material);
    m.position.set(0, y, z);
    y -= 0.2;
    z += 0.2;
    res.add(m);
  }

  return res;
}

export function isCrossOriginBGM(bgmURL) {
  return !bgmURL.startsWith(location.origin) && !bgmURL.match(/^\.{0,2}\//);
}

const isSafari = (() => {
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    ua.includes("safari") && !ua.includes("chrome") && !ua.includes("edge")
  );
})();

export function createBGMController(bgmURL) {
  let isBGMInitialized = false;
  let gain;
  const media = new Audio(bgmURL);
  media.loop = true;
  media.crossOrigin = "anonymous";
  media.setAttribute("preload", "auto");

  return (value) => {
    value = value ** 3 * 0.3;
    if (!isBGMInitialized) {
      if (!value) {
        return;
      }
      isBGMInitialized = true;
      const ctx = THREE.AudioContext.getContext();
      if (isCrossOriginBGM(bgmURL) && isSafari) {
        media.volume = value;
      } else {
        const src = ctx.createMediaElementSource(media);
        gain = ctx.createGain();
        gain.gain.value = value;
        src.connect(gain);
        gain.connect(ctx.destination);
      }
      media.play();
      return;
    }
    if (value && media.paused) {
      media.play();
    }
    if (gain) {
      gain.gain.setTargetAtTime(
        value,
        THREE.AudioContext.getContext().currentTime,
        0.01
      );
    } else {
      media.volume = value;
      media.muted = !value;
    }
  };
}
