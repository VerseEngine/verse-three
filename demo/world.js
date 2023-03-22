import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import * as Ornament from "./ornament";

import {
  Evaluator,
  Operation,
  OperationGroup,
  SUBTRACTION,
} from "three-bvh-csg";

class Tmps {
  constructor() {
    this.vec0 = new THREE.Vector3();
  }
}
const _tmps = new Tmps();

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

export async function createWorldObjects(scene, renderer, camera, player) {
  const ticks = [];

  const font = await loadFont(
    "./asset/fonts/droid/droid_sans_regular.typeface.json"
  );

  /* {
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(0, 10, 0).normalize();
    light.name = "brightRoomLight";
    scene.add(light);
  }
  {
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(0, 10, 0).normalize();
    light.name = "darkRoomLight";
    scene.add(light);
  }
 */

  const specialRooms = {
    entry: (disposables, _color) => {
      return Ornament.createTextObject(
        "Endless Labyrinth",
        font,
        disposables,
        0x9575cd
      );
    },
    light: [Ornament.createObject0, Ornament.createObject4],
    dark: [
      Ornament.createObject1,
      Ornament.createObject2,
      Ornament.createObject3,
      Ornament.createObject4,
    ],
  };

  const rooms = new Rooms(specialRooms);
  ticks.push((dt) => {
    rooms.tick(dt, player);
  });

  const activateRoom = (room) => {
    const tick = room.extra?.tick;
    const light = room.extra?.light;
    if (tick) {
      ticks.push(room.extra.tick);
    }
    if (light) {
      light.visible = true;
    }
  };
  rooms.addOnCreateRoomListener((room) => {
    rooms.jobs.push(() => {
      if (room.special) {
        room.extra = room.special(room.disposables, room.accentColor);
        if (room.isDark) {
          const light = new THREE.PointLight(
            room.accentColor,
            2.5,
            room.width / 2
          );
          light.position.set(0, room.height / 2, 0);
          room.add(light);
          room.disposables.push(light);
        }
      }
      if (room.extra) {
        room.add(room.extra.object);
      }
      activateRoom(room);
    });
  });
  /* rooms.addOnEnterRoomListener((room) => {
  });
  rooms.addOnLeaveRoomListener((room) => {
    const tick = room.extra?.tick;
    if (tick) {
      removeFromArray(ticks, tick);
    }
  }); */
  rooms.addOnDisposeRoomListener((room) => {
    const tick = room.extra?.tick;
    if (tick) {
      removeFromArray(ticks, tick);
    }
  });

  /* {
    const [x, z] = rooms.getPositionByIndex(-1, 10);
    player.position.set(x, 0, z + 4);
  } */

  const { x, z } = player.getWorldPosition(_tmps.vec0);
  await rooms.init(x, z);

  if (false) {
    const transformControls = new TransformControls(
      camera,
      renderer.domElement
    );
    transformControls.attach(rooms.children[0].children[2]);
    scene.add(transformControls);
    transformControls.enabled = true;
  }

  scene.add(rooms);
  rooms.updateMatrix();
  rooms.updateMatrixWorld();
  return {
    rooms,
    tick: (dt) => {
      ticks.forEach((f) => f(dt));
    },
  };
}

async function loadTexture(url) {
  return await new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (res) => {
        resolve(res);
      },
      undefined,
      reject
    );
  });
}

async function loadFont(url) {
  return await new Promise((resolve, reject) => {
    new FontLoader().load(
      url,
      (res) => {
        resolve(res);
      },
      undefined,
      reject
    );
  });
}

const DOOR_POSITIONS = [
  "doorPosNorth",
  "doorPosWest",
  "doorPosSouth",
  "doorPosEast",
];
const DOOR_POS = Object.freeze({
  NONE: null,
  // LEFT: -1,
  CENTER: 0,
  // RIGHT: 1,
});

function getOtherSideOfTheDoorName(n) {
  switch (n) {
    case "doorPosNorth":
      return "doorPosSouth";
    case "doorPosSouth":
      return "doorPosNorth";
    case "doorPosWest":
      return "doorPosEast";
    case "doorPosEast":
      return "doorPosWest";
    default:
      throw new Error(`invalid door: ${n}`);
  }
}
function getOtherSideOfTheDoorIndex(n, x, z) {
  switch (n) {
    case "doorPosNorth":
      return { x, z: z - 1 };
    case "doorPosSouth":
      return { x, z: z + 1 };
    case "doorPosWest":
      return { x: x - 1, z };
    case "doorPosEast":
      return { x: x + 1, z };
    default:
      throw new Error(`invalid door: ${n}`);
  }
}

class Rooms extends THREE.Object3D {
  constructor(specialRooms) {
    super();
    this.name = "rooms";
    this._roomWidth = 10;
    this._roomHeight = 6;
    this._wallDepth = 0.2;
    this._wallTexture = null;
    this._doorWidth = 1.5;
    this._doorHeight = 2;
    this._disposables = [];
    this._cornerRadius = 0.5;
    this.collisionNeedsUpdate = false;
    this._intervalSec = 1 / 2;
    this._sec = 0;
    this._specialRooms = specialRooms;
    this._centerX = 0;
    this._centerZ = 0;
    this._onCreateRoomListeners = [];
    this._onDisposeRoomListeners = [];
    this._onEnterRoomListeners = [];
    this._onLeaveRoomListeners = [];
    this.jobs = [];

    this._activeRange = [];
    {
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          this._activeRange.push([x, z]);
        }
      }
      this._activeRange.push([-2, 0]);
      this._activeRange.push([2, 0]);
      this._activeRange.push([0, -2]);
      this._activeRange.push([0, 2]);
    }

    this._roomDefines = new Map();

    this._groundGeometry = new THREE.PlaneGeometry(
      this._roomWidth + this._wallDepth,
      this._roomWidth + this._wallDepth,
      1,
      1
    );
    const doorUpperGeometry = new THREE.CylinderGeometry(
      this._doorWidth / 2,
      this._doorWidth / 2,
      this._wallDepth,
      50
    );
    const doorLowerGeometry = new THREE.BoxGeometry(
      this._doorWidth,
      this._doorHeight,
      this._wallDepth
    );
    this._groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x5e5e5e,
    });

    let roomGeometry;
    {
      const roomOutsideGeometry = new THREE.BoxGeometry(
        this._roomWidth + this._wallDepth,
        this._roomHeight + 0.001,
        this._roomWidth + this._wallDepth
      );
      const roomInsideGeometryA = new THREE.BoxGeometry(
        this._roomWidth - this._cornerRadius * 2,
        this._roomHeight,
        this._roomWidth
      );
      const roomInsideGeometryB = new THREE.BoxGeometry(
        this._roomWidth,
        this._roomHeight,
        this._roomWidth - this._cornerRadius * 2
      );
      const cornerGeometry = new THREE.CylinderGeometry(
        this._cornerRadius,
        this._cornerRadius,
        this._roomHeight,
        50
      );

      const root = new Operation(roomOutsideGeometry);
      {
        const insideGroup = new OperationGroup();

        const boxA = new Operation(roomInsideGeometryA);
        boxA.operation = SUBTRACTION;
        insideGroup.add(boxA);
        const boxB = new Operation(roomInsideGeometryB);
        boxB.operation = SUBTRACTION;
        insideGroup.add(boxB);

        {
          const corner = new Operation(cornerGeometry);
          corner.operation = SUBTRACTION;
          corner.position.set(
            this._roomWidth / 2 - this._cornerRadius,
            0,
            (this._roomWidth / 2 - this._cornerRadius) * -1
          );
          insideGroup.add(corner);
        }
        {
          const corner = new Operation(cornerGeometry);
          corner.operation = SUBTRACTION;
          corner.position.set(
            this._roomWidth / 2 - this._cornerRadius,
            0,
            this._roomWidth / 2 - this._cornerRadius
          );
          insideGroup.add(corner);
        }
        {
          const corner = new Operation(cornerGeometry);
          corner.operation = SUBTRACTION;
          corner.position.set(
            (this._roomWidth / 2 - this._cornerRadius) * -1,
            0,
            this._roomWidth / 2 - this._cornerRadius
          );
          insideGroup.add(corner);
        }
        {
          const corner = new Operation(cornerGeometry);
          corner.operation = SUBTRACTION;
          corner.position.set(
            (this._roomWidth / 2 - this._cornerRadius) * -1,
            0,
            (this._roomWidth / 2 - this._cornerRadius) * -1
          );
          insideGroup.add(corner);
        }
        root.add(insideGroup);
      }
      const csgEvaluator = new Evaluator();
      csgEvaluator.attributes = ["position", "normal"];
      csgEvaluator.useGroups = false;
      roomGeometry = csgEvaluator.evaluateHierarchy(root).geometry;

      roomOutsideGeometry.dispose();
      roomInsideGeometryA.dispose();
      roomInsideGeometryB.dispose();
      cornerGeometry.dispose();
    }

    const createDoor = () => {
      const hole = new Operation(doorUpperGeometry);
      hole.operation = SUBTRACTION;
      hole.rotateX(Math.PI / 2);
      hole.position.y = this._roomHeight / -2 + this._doorHeight;

      const hole1 = new Operation(doorLowerGeometry);
      hole1.operation = SUBTRACTION;
      hole1.position.y = this._roomHeight / -2 + this._doorHeight / 2;

      const doorGroup = new OperationGroup();
      doorGroup.add(hole1, hole); // If the order is reversed, dust may be visible at the seams.
      return doorGroup;
    };
    this._allDoorPatterns = {};
    for (const doorPosNorth of [DOOR_POS.NONE, DOOR_POS.CENTER]) {
      for (const doorPosWest of [DOOR_POS.NONE, DOOR_POS.CENTER]) {
        for (const doorPosSouth of [DOOR_POS.NONE, DOOR_POS.CENTER]) {
          for (const doorPosEast of [DOOR_POS.NONE, DOOR_POS.CENTER]) {
            const root = new Operation(roomGeometry);
            root.position.y = -0.001;

            if (doorPosNorth !== DOOR_POS.NONE) {
              const door = createDoor();
              door.position.set(
                (doorPosNorth * this._roomWidth) / 3,
                0,
                this._roomWidth / -2
              );
              root.add(door);
            }
            if (doorPosWest !== DOOR_POS.NONE) {
              const door = createDoor();
              door.rotation.y = THREE.MathUtils.degToRad(90);
              door.position.set(
                this._roomWidth / -2,
                0,
                (doorPosWest * this._roomWidth) / -3
              );
              root.add(door);
            }
            if (doorPosEast !== DOOR_POS.NONE) {
              const door = createDoor();
              door.rotation.y = THREE.MathUtils.degToRad(90);
              door.position.set(
                this._roomWidth / 2,
                0,
                (doorPosEast * this._roomWidth) / 3
              );
              root.add(door);
            }
            if (doorPosSouth !== DOOR_POS.NONE) {
              const door = createDoor();
              door.position.set(
                (doorPosSouth * this._roomWidth) / -3,
                0,
                this._roomWidth / 2
              );
              root.add(door);
            }

            const csgEvaluator = new Evaluator();
            csgEvaluator.attributes = ["position", "normal"];
            csgEvaluator.useGroups = false;
            const g = csgEvaluator.evaluateHierarchy(root).geometry;
            this._disposables.push(g);
            this._allDoorPatterns[
              `${doorPosNorth}:${doorPosWest}:${doorPosEast}:${doorPosSouth}`
            ] = g;
          }
        }
      }
    }
    roomGeometry.dispose();
    doorUpperGeometry.dispose();
    doorLowerGeometry.dispose();

    this._disposables.push(
      this._roomGeometry,
      this._groundGeometry,
      this._groundMaterial
    );
    /* this.matrixAutoUpdate = false;
    this.matrixWorldAutoUpdate = false; */
  }
  async init(x, z) {
    this._centerX = this._posToIndex(x);
    this._centerZ = this._posToIndex(z);

    this._wallTexture = await loadTexture(
      "./asset/matcaps/matcap-porcelain-white/matcap-porcelain-white.jpg"
    );
    this._disposables.push(this._wallTexture);

    this._generate();
    this._onChangeCenter(this._centerX, this._centerZ);
  }
  tick(dt, player) {
    {
      const job = this.jobs.pop();
      if (job) {
        job();
      }
    }

    this._sec += dt;
    if (this._sec < this._intervalSec) {
      return;
    }
    this._sec = 0;

    const { x, z } = player.getWorldPosition(_tmps.vec0);
    const xIndex = this._posToIndex(x);
    const zIndex = this._posToIndex(z);
    if (this._centerX !== xIndex || this._centerZ !== zIndex) {
      this._onChangeCenter(xIndex, zIndex, this._centerX, this._centerZ);
    }
  }
  dispose() {
    this._disposables.forEach((o) => o.dispose());
  }
  updateCollision(collisionObjects, teleportTargetObjects, collisionBoxes) {
    for (const room of this.children) {
      if (!room.isRoom) {
        continue;
      }
      collisionObjects.push(...room.collisionObjects);
      teleportTargetObjects.push(...room.teleportTargetObjects);
      collisionBoxes.push(...room.collisionBoxes);
    }
    this.collisionNeedsUpdate = false;
  }
  addOnCreateRoomListener(l) {
    this._onCreateRoomListeners.push(l);
  }
  removeOnCreateRoomListener(l) {
    removeFromArray(this._onCreateRoomListeners, l);
  }
  addOnDisposeRoomListener(l) {
    this._onDisposeRoomListeners.push(l);
  }
  removeOnDisposeRoomListener(l) {
    removeFromArray(this._onDisposeRoomListeners, l);
  }
  addOnEnterRoomListener(l) {
    this._onEnterRoomListeners.push(l);
  }
  removeOnEnterRoomListener(l) {
    removeFromArray(this._onEnterRoomListeners, l);
  }
  addOnLeaveRoomListener(l) {
    this._onLeaveRoomListeners.push(l);
  }
  removeOnLeaveRoomListener(l) {
    removeFromArray(this._onLeaveRoomListeners, l);
  }
  _generate() {
    // Share a random number seed to provide the same space for everyone.
    // In the future, share a variable random number seed.
    const nonSecurePseudoRandom = ((seed) => {
      let v = seed;
      return () => {
        v = (v * 16807) % 2147483647;
        return v;
      };
    })(123456789);

    function shuffleArray(ar) {
      const dist = ar.map((v) => v);
      for (let i = dist.length; 1 < i; i--) {
        const k = nonSecurePseudoRandom() % i;
        [dist[k], dist[i - 1]] = [dist[i - 1], dist[k]];
      }
      return dist;
    }

    const numOfRooms = 100000;

    let queue = [];
    queue.push({
      x: 0,
      z: 0,
      special: this._specialRooms.entry,
      doorPositions: {
        doorPosNorth: DOOR_POS.CENTER,
        doorPosWest: DOOR_POS.CENTER,
        doorPosSouth: DOOR_POS.NONE,
        doorPosEast: DOOR_POS.CENTER,
      },
    });
    this._roomDefines.set(`0:0`, queue[0]);

    let def;
    while ((def = queue.shift())) {
      if (!def) {
        break;
      }
      const { x, z } = def;

      const dps = def.doorPositions;
      let newDoors = 0;
      for (const n of shuffleArray(DOOR_POSITIONS)) {
        if (dps[n] !== undefined) {
          continue;
        }
        const otherXZ = getOtherSideOfTheDoorIndex(n, x, z);
        const otherDef = this._roomDefines.get(`${otherXZ.x}:${otherXZ.z}`);
        const otherN = getOtherSideOfTheDoorName(n);
        if (otherDef) {
          const p = otherDef.doorPositions[otherN];
          if (p !== undefined) {
            if (p == DOOR_POS.NONE) {
              dps[n] = DOOR_POS.NONE;
            } else {
              dps[n] = p * -1;
            }
            continue;
          }
        }
        {
          if (
            !this._activeRange.find(
              ([x1, z1]) =>
                this._roomDefines.get(`${x + x1}:${z + z1}`)?.special
            )
          ) {
            const n0 = this._specialRooms.light.length || 0;
            const n1 = this._specialRooms.dark.length || 0;
            const i = nonSecurePseudoRandom() % (n0 + n1);
            if (i < n0) {
              def.special = this._specialRooms.light[i];
            } else if (n1) {
              def.special = this._specialRooms.dark[i - n0];
              def.isDark = true;
            }
          }
        }
        if (numOfRooms <= this._roomDefines.size + queue.length + newDoors) {
          dps[n] = DOOR_POS.NONE;
        } else {
          if (nonSecurePseudoRandom() % 100 < 5) {
            dps[n] = DOOR_POS.NONE;
            continue;
          }

          let revNeighborX, revNeighborZ;
          if (n === "doorPosNorth") {
            revNeighborX = x;
            revNeighborZ = z + 1;
          } else if (n === "doorPosWest") {
            revNeighborX = x + 1;
            revNeighborZ = z;
          } else if (n === "doorPosEast") {
            revNeighborX = x - 1;
            revNeighborZ = z;
          } else {
            revNeighborX = x;
            revNeighborZ = z - 1;
          }
          const p = dps[otherN];
          let vals = Object.values(DOOR_POS).filter((v) => v !== DOOR_POS.NONE);
          if (
            p !== undefined &&
            p !== DOOR_POS.NONE &&
            p ===
              this._roomDefines.get(`${revNeighborX}:${revNeighborZ}`)
                ?.doorPositions[otherN]
          ) {
            vals = vals.filter((v) => v !== p);
          }
          if (vals.length === 0) {
            dps[n] = DOOR_POS.NONE;
            continue;
          }
          dps[n] = vals[nonSecurePseudoRandom() % vals.length];
          newDoors++;
        }
      }
      for (const n of DOOR_POSITIONS) {
        if (dps[n] === DOOR_POS.NONE) {
          continue;
        }
        const otherXZ = getOtherSideOfTheDoorIndex(n, x, z);
        if (this._roomDefines.get(`${otherXZ.x}:${otherXZ.z}`)) {
          continue;
        }

        queue.push({
          x: otherXZ.x,
          z: otherXZ.z,
          doorPositions: { [getOtherSideOfTheDoorName(n)]: dps[n] * -1 },
        });
        this._roomDefines.set(
          `${otherXZ.x}:${otherXZ.z}`,
          queue[queue.length - 1]
        );
      }
    }
    console.log("rooms", this._roomDefines.size);
  }
  _onChangeCenter(newX, newZ, oldX, oldZ) {
    this._centerX = newX;
    this._centerZ = newZ;

    let oldCenter;
    let newCenter;
    let deletes = [];
    let alives = {};
    for (const room of this.children) {
      if (!room.isRoom) {
        continue;
      }
      if (room.xIndex === oldX && room.zIndex === oldZ) {
        oldCenter = room;
      }
      if (
        this._activeRange.find(
          ([x, z]) => room.xIndex === x + newX && room.zIndex === z + newZ
        )
      ) {
        alives[`${room.xIndex}:${room.zIndex}`] = room;
      } else {
        deletes.push(room);
      }
    }

    for (let [x, z] of this._activeRange) {
      x += newX;
      z += newZ;
      let room = alives[`${x}:${z}`];
      let def;
      if (!room) {
        def = this._roomDefines.get(`${x}:${z}`);
      }
      if (x === newX && z === newZ) {
        if (def) {
          room = this._addRoom(
            def.x,
            def.z,
            def.doorPositions,
            def.special,
            def.isDark
          );
        }
        newCenter = room;
      } else {
        if (!def) {
          continue;
        }
        this.jobs.push(() => {
          room = this._addRoom(
            def.x,
            def.z,
            def.doorPositions,
            def.special,
            def.isDark
          );
        });
      }
    }

    if (oldCenter) {
      this._onLeaveRoom(oldCenter);
    }
    for (const room of deletes) {
      this.jobs.push(() => {
        room.dispose();
        this.remove(room);
        this._onDisposeRoom(room);
      });
    }
    if (newCenter) {
      this._onEnterRoom(newCenter);
    }
  }
  _onCreateRoom(room) {
    // console.log("Create", room.xIndex, room.zIndex);
    this._onCreateRoomListeners.forEach((f) => f(room));
  }
  _onDisposeRoom(room) {
    // console.log("Dispose", room.xIndex, room.zIndex);
    this._onDisposeRoomListeners.forEach((f) => f(room));
  }
  _onEnterRoom(room) {
    console.log("Enter", room.xIndex, room.zIndex);
    room.isEnter = true;
    this._onEnterRoomListeners.forEach((f) => f(room));
  }
  _onLeaveRoom(room) {
    // console.log("Leave", room.xIndex, room.zIndex);
    room.isEnter = false;
    this._onLeaveRoomListeners.forEach((f) => f(room));
  }
  _addRoom(
    xIndex,
    zIndex,
    { doorPosNorth, doorPosWest, doorPosSouth, doorPosEast },
    special,
    isDark,
    noGround
  ) {
    const color = new THREE.Color();
    const accentColor = new THREE.Color();
    const h = (0.5 + Math.sin(xIndex * 0.7 + zIndex * 0.3) / 2) % 1;
    if (isDark) {
      color.setHSL(h, 0.3, 0.01);
      accentColor.setHSL(h, 1, 0.7);
    } else {
      color.setHSL(h, 1, 0.9);
      accentColor.setHSL((h + 0.5) % 1, 1, 0.9);
    }

    const room = new Room(
      this._roomWidth,
      this._roomHeight,
      this._allDoorPatterns,
      this._wallDepth,
      this._wallTexture,
      color,
      accentColor,
      this._doorWidth,
      this._doorHeight,
      { doorPosNorth, doorPosWest, doorPosSouth, doorPosEast },
      this._groundGeometry,
      !noGround ? this._groundMaterial : undefined,
      isDark
    );
    room.name = `r${xIndex}-${zIndex}`;
    room.xIndex = xIndex;
    room.zIndex = zIndex;
    room.position.set(this._indexToPos(xIndex), 0, this._indexToPos(zIndex));
    room.special = special;
    this.add(room);

    /* room.matrixAutoUpdate = false;
    room.matrixWorldAutoUpdate = false; */
    room.updateMatrix();
    room.updateMatrixWorld();
    this.updateMatrix();
    this.updateMatrixWorld();
    this.collisionNeedsUpdate = true;

    this._onCreateRoom(room);

    return room;
  }
  _posToIndex(v) {
    const w = this._roomWidth + this._wallDepth;
    if (v > 0) {
      return Math.floor((v + w / 2) / w);
    } else {
      return Math.ceil((v - w / 2) / w);
    }
  }
  _indexToPos(v) {
    return (this._roomWidth + this._wallDepth) * v;
  }
  getPositionByIndex(xIndex, zIndex) {
    return [this._indexToPos(xIndex), this._indexToPos(zIndex)];
  }
}
class Room extends THREE.Object3D {
  constructor(
    width,
    height,
    allDoorPatterns,
    wallDepth,
    wallTexture,
    wallColor,
    accentColor,
    doorWidth,
    doorHeight,
    { doorPosNorth, doorPosWest, doorPosSouth, doorPosEast },
    groundGeometry,
    groundMaterial,
    isDark
  ) {
    super();
    this.isRoom = true;
    this.isDark = true;
    const disposables = [];
    this.disposables = disposables;
    this._collisionBoxes = [...Array(2 * 4 + 1).keys()].map(
      (_) => new THREE.Box3()
    );
    this._teleportTargetObjects = [];
    this._collisionObjects = [];
    this.accentColor = accentColor;

    this._hasGround = true;
    this._width = width;
    this._height = height;
    this._wallDepth = wallDepth;
    this._doorWidth = doorWidth;
    this._doorHeight = doorHeight;
    this._doorPositions = {
      doorPosNorth,
      doorPosWest,
      doorPosSouth,
      doorPosEast,
    };

    const wallMaterial = new THREE.MeshMatcapMaterial({
      matcap: wallTexture,
      side: THREE.DoubleSide,
      color: wallColor,
    });
    disposables.push(wallMaterial);

    if (groundGeometry && groundMaterial) {
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = Math.PI / -2;
      this.add(ground);
      this._teleportTargetObjects.push(ground);
    } else {
      this._hasGround = false;
    }

    const res = new THREE.Mesh(
      allDoorPatterns[
        `${doorPosNorth}:${doorPosWest}:${doorPosEast}:${doorPosSouth}`
      ],
      wallMaterial
    );

    // const res = new THREE.Mesh(roomGeometry, wallMaterial);
    /* res.castShadow = true;
    res.receiveShadow = true; */
    res.position.y = height / 2;

    this.add(res);
    this._collisionObjects.push(res);

    if (!isDark) {
      const light = new THREE.PointLight(0xffffff, 1.5, width / 2, 1);
      light.position.set(0, height / 2, 0);
      this.add(light);
    }
  }
  dispose() {
    this.disposables.forEach((o) => o.dispose());
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  get collisionObjects() {
    return this._collisionObjects;
  }
  get teleportTargetObjects() {
    return this._teleportTargetObjects;
  }
  get collisionBoxes() {
    const width = this._width;
    const height = this._height;
    const wallDepth = this._wallDepth;
    const doorWidth = this._doorWidth;
    const { doorPosNorth, doorPosWest, doorPosSouth, doorPosEast } =
      this._doorPositions;
    let i = 0;
    if (doorPosNorth === DOOR_POS.NONE) {
      this._collisionBoxes[i].min.set(width / -2, 0, width / -2 - wallDepth);
      this._collisionBoxes[i].max.set(width / 2, height, width / -2);
      i++;
    } else {
      this._collisionBoxes[i].min.set(width / -2, 0, width / -2 - wallDepth);
      this._collisionBoxes[i].max.set(
        width / -2 + (width / 2 + (doorPosNorth * width) / 3) - doorWidth / 2,
        height,
        width / -2
      );
      i++;
      this._collisionBoxes[i].min.set(
        this._collisionBoxes[i - 1].max.x + doorWidth,
        0,
        width / -2 - wallDepth
      );
      this._collisionBoxes[i].max.set(width / 2, height, width / -2);
      i++;
    }
    if (doorPosWest === DOOR_POS.NONE) {
      this._collisionBoxes[i].min.set(width / -2 - wallDepth, 0, width / -2);
      this._collisionBoxes[i].max.set(width / -2, height, width / 2);
      i++;
    } else {
      this._collisionBoxes[i].min.set(
        width / -2 - wallDepth,
        0,
        width / 2 + (width / 2 + (doorPosWest * width) / 3 - doorWidth / 2) * -1
      );
      this._collisionBoxes[i].max.set(width / -2, height, width / 2);
      i++;

      this._collisionBoxes[i].min.set(width / -2 - wallDepth, 0, width / -2);
      this._collisionBoxes[i].max.set(
        width / -2,
        height,
        this._collisionBoxes[i - 1].min.z - doorWidth
      );
      i++;
    }
    if (doorPosEast === DOOR_POS.NONE) {
      this._collisionBoxes[i].min.set(width / 2, 0, width / -2);
      this._collisionBoxes[i].max.set(width / 2 + wallDepth, height, width / 2);
      i++;
    } else {
      this._collisionBoxes[i].min.set(width / 2, 0, width / -2);
      this._collisionBoxes[i].max.set(
        width / 2 + wallDepth,
        height,
        width / 2 +
          (width / 2 + (doorPosEast * width * -1) / 3 + doorWidth / 2) * -1
      );
      i++;

      this._collisionBoxes[i].min.set(
        width / 2,
        0,
        this._collisionBoxes[i - 1].max.z + doorWidth
      );
      this._collisionBoxes[i].max.set(width / 2 + wallDepth, height, width / 2);
      i++;
    }
    if (doorPosSouth === DOOR_POS.NONE) {
      this._collisionBoxes[i].min.set(width / -2, 0, width / 2);
      this._collisionBoxes[i].max.set(width / 2, height, width / 2 + wallDepth);
      i++;
    } else {
      this._collisionBoxes[i].min.set(width / -2, 0, width / 2);
      this._collisionBoxes[i].max.set(
        width / -2 + (width / 2 + (doorPosSouth * width) / -3) - doorWidth / 2,
        height,
        width / 2 + wallDepth
      );
      i++;
      this._collisionBoxes[i].min.set(
        this._collisionBoxes[i - 1].max.x + doorWidth,
        0,
        width / 2
      );
      this._collisionBoxes[i].max.set(width / 2, height, width / 2 + wallDepth);
      i++;
    }

    if (this._hasGround) {
      this._collisionBoxes[i].min.set(
        (width + wallDepth) / -2,
        0,
        (width + wallDepth) / -2
      );
      this._collisionBoxes[i].max.set(
        (width + wallDepth) / 2,
        0,
        (width + wallDepth) / 2
      );
      i++;
    }

    this._collisionBoxes.length = i;
    const roomPos = this.getWorldPosition(_tmps.vec0);
    this._collisionBoxes.forEach((o) => {
      o.min.add(roomPos);
      o.max.add(roomPos);
    });
    return this._collisionBoxes;
  }
}

function removeFromArray(ar, o) {
  const i = ar.indexOf(o);
  if (i >= 0) {
    ar.splice(i, 1);
  }
}
