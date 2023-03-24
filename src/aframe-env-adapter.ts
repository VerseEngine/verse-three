import type { Scene, Entity, DetailEvent } from "aframe";
import type * as threeTypes from "three";
declare const THREE: typeof threeTypes;
import { DefaultEnvAdapter } from "./default-env-adapter";
import type { EnvAdapter } from "./env-adapter";

/**
 * {@link EnvAdapter} implementation for {@link https://aframe.io/ | AFrame}.
 */
export class AFrameEnvAdapter extends DefaultEnvAdapter implements EnvAdapter {
  constructor(
    scene: Scene,
    headOffset: THREE.Object3D,
    cameraRig: THREE.Object3D,
    getCollisionBoxes: () => THREE.Box3[] | undefined,
    getCollisionObjects: () => THREE.Object3D[] | undefined,
    getTeleportTargetObjects: () => THREE.Object3D[] | undefined,
    options?: {
      getInteractableObjects?: () => THREE.Object3D[] | undefined;
      onCursorHover?: (el: THREE.Object3D) => void;
      onCursorLeave?: (el: THREE.Object3D) => void;
      onSelectUp?: (el: THREE.Object3D, point: THREE.Vector3) => void;
      onSelectDown?: (el: THREE.Object3D, point: THREE.Vector3) => void;
      isLowSpecMode?: boolean;
    }
  ) {
    super(
      scene.renderer,
      scene.object3D,
      scene.camera as THREE.PerspectiveCamera,
      headOffset,
      cameraRig,
      getCollisionBoxes,
      getCollisionObjects,
      getTeleportTargetObjects,
      {
        ...(options || {}),
        getAudioListener: (() => {
          let audioListener: THREE.AudioListener | undefined;
          return () => {
            if (!audioListener) {
              audioListener = initAudioListener(scene);
            }
            return audioListener;
          };
        })(),
      }
    );
  }
  /** {@inheritDoc EnvAdapter.getHead} */
  getHead(): THREE.Object3D {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.getCamera().parent!;
  }
}

function initAudioListener(_scene: Scene): THREE.AudioListener {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scene = _scene as Scene & {
    audioListener?: THREE.AudioListener;
  };
  const audioListener = scene.audioListener || new THREE.AudioListener();
  scene.audioListener = audioListener;

  const setupForCamera = (camera: THREE.Object3D) => {
    if (
      !camera.children.find(
        (v: THREE.Object3D) => v instanceof THREE.AudioListener
      )
    ) {
      camera.add(audioListener);
    }
  };
  if (scene.camera) {
    setupForCamera(scene.camera);
  } else {
    scene.addEventListener("camera-set-active", function (_e: Event) {
      const e = _e as DetailEvent<{ cameraEl: Entity }>;
      setupForCamera(e.detail.cameraEl.getObject3D("camera"));
    });
  }
  return audioListener;
}
