import * as THREE from "three";
import { TouchController } from "@verseengine/three-touch-controller";
import { MoveController } from "@verseengine/three-move-controller";
import { DefaultXrControllerSet } from "@verseengine/three-xr-controller";
import { SimpleBoundingBoxCollider } from "@verseengine/three-avatar";
import type { EnvAdapter } from "./env-adapter";
import { isTouchDevice } from "./util";

export type CouldBeClickableObject = THREE.Object3D & {
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
};

export class PlayerController {
  /** {@link https://github.com/VerseEngine/three-touch-controller/blob/main/docs/three-touch-controller.touchcontroller.md | TouchController } */
  touchController: TouchController;
  /** {@link https://github.com/VerseEngine/three-move-controller/blob/main/docs/three-move-controller.movecontroller.md | MoveController} */
  moveController: MoveController;
  /** {@link DefaultXrControllerSet | https://github.com/VerseEngine/three-xr-controller/blob/main/docs/three-xr-controller.defaultxrcontrollerset.md } */
  xrController: DefaultXrControllerSet;
  private _isVRMode = false;
  private _adapter: EnvAdapter;
  private _clock: THREE.Clock;
  private _bc: SimpleBoundingBoxCollider;

  constructor(adapter: EnvAdapter) {
    this._clock = new THREE.Clock();
    this._adapter = adapter;

    this._bc = new SimpleBoundingBoxCollider(
      adapter.getCameraRig(),
      adapter.getCollisionBoxes.bind(adapter)
    );
    adapter.addAvatarChangedListener((avatar) => {
      this._bc.setup(avatar);
    });
    const moveTo = this._bc.moveTo.bind(this._bc);

    this.touchController = new TouchController(adapter.getCameraRig(), {
      moveTo,
    });
    this.moveController = new MoveController(
      adapter.getCameraRig(),
      adapter.getCameraRig(),
      adapter.getHeadOffset(),
      {
        moveTo,
        minVerticalRotation: 1.2,
        maxVerticalRotation: 2.2,
      }
    );
    const getClickableObject = (
      _el: THREE.Object3D
    ): CouldBeClickableObject | undefined => {
      let el: THREE.Object3D | null = _el;
      const m = (adapter.getInteractableObjects() || []).reduce((m, o) => {
        m.set(o, true);
        return m;
      }, new Map());
      do {
        if (m.has(el)) {
          return el as CouldBeClickableObject;
        }
      } while ((el = el.parent));
    };

    this.xrController = new DefaultXrControllerSet(
      adapter.getRenderer(),
      adapter.getCamera(),
      adapter.getScene(),
      adapter.getHeadOffset(),
      adapter.getCameraRig(),
      adapter.getCameraRig(),
      {
        getCollisionObjects: adapter.getCollisionObjects.bind(adapter),
        getInteractableObjects: adapter.getInteractableObjects.bind(adapter),
        getTeleportTargetObjects:
          adapter.getTeleportTargetObjects.bind(adapter),
        onSelectUp: (el: THREE.Object3D, point: THREE.Vector3) => {
          adapter.onSelectUp?.(el, point);
        },
        onSelectDown: (el: THREE.Object3D, point: THREE.Vector3) => {
          getClickableObject(el)?.onClick?.();
          adapter.onSelectDown(el, point);
        },
        onCursorHover: (el) => {
          getClickableObject(el)?.onHover?.();
          adapter.onCursorHover(el);
        },
        onCursorLeave: (el) => {
          getClickableObject(el)?.onLeave?.();
          adapter.onCursorLeave(el);
        },
      }
    );

    this.isVR = adapter.isVR();
  }
  get isVR() {
    return this._isVRMode;
  }
  set isVR(v: boolean) {
    this._isVRMode = !!v;
    if (v) {
      this.touchController.enabled = false;
      this.moveController.enabled = false;
      if (!this.xrController) {
        return;
      }
      this.xrController.setNonVRMode(false);
      const f = () => {
        this._adapter.getXRManager()?.getSession()?.requestAnimationFrame(f);
        const dt = this._clock.getDelta();
        this.xrController.tick(dt);
      };
      f();
    } else {
      this.touchController.enabled = isTouchDevice();
      this.moveController.enabled = !this.touchController.enabled;
      this.xrController.setNonVRMode(true);
      const f = () => {
        requestAnimationFrame(f);
        const dt = this._clock.getDelta();
        this.touchController.tick(dt);
        this.moveController.tick(dt);
        this.xrController.tick(dt);
      };
      f();
    }
  }
}
