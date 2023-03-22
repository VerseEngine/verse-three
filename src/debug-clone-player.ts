import * as THREE from "three";
import { Player } from "./player";
import { OtherPersonFactory } from "./other-person";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debugVerse: any;
  }
}

export async function debugClonePlayer(
  player: Player,
  opf: OtherPersonFactory
) {
  console.log("start player clone");

  const pos = player.getPosition();
  const angle = player.getAngle();
  const cp = opf.create(
    "clone-player",
    player.getAvatar().data,
    pos.x,
    pos.y,
    pos.z,
    angle
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cp as any)._enableMove = false;

  const tmpq = new THREE.Quaternion();
  const tmpe = new THREE.Euler();
  const tick = () => {
    cp.object3D.position.copy(player.object3D.position);
    player.object3D.getWorldQuaternion(tmpq);
    tmpe.setFromQuaternion(tmpq);
    cp.object3D.rotation.set(0, tmpe.y - 180 * (Math.PI / 180), 0);

    cp.object3D.translateZ(1.5);
  };
  setInterval(() => {
    tick();
  }, 300);
  setInterval(() => {
    if (!window.debugVerse.disableSync) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((player as any)._avatar) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cp.onSyncBonesData((player as any)._avatar.getSyncBonesData());
      }
    }
  }, 1000);
  window.debugVerse = {
    clonePlayer: cp,
    ...window.debugVerse,
  };
}
