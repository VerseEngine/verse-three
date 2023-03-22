import * as THREE from "three";
import type { EnvAdapter, TickListener } from "./env-adapter";
import { isIOS } from "./util";
import { Avatar } from "@verseengine/three-avatar";

/**
 * Default implementation of {@link EnvAdapter}.
 */
export class DefaultEnvAdapter implements EnvAdapter {
  private _renderer: THREE.WebGLRenderer;
  private _xr?: THREE.WebXRManager;
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _headOffset: THREE.Object3D;
  private _cameraRig: THREE.Object3D;
  private _getAudioListener: () => THREE.AudioListener;
  private _audioCreateJobs: Array<() => boolean> = [];
  private _isAudioInitialized = false;
  private _isLowSpecMode: boolean;
  private _getCollisionBoxes: () => THREE.Box3[] | undefined;
  private _getCollisionObjects: () => THREE.Object3D[] | undefined;
  private _getTeleportTargetObjects: () => THREE.Object3D[] | undefined;
  private _getInteractableObjects: () => THREE.Object3D[] | undefined;
  private _voiceVolume = 0;
  private _voiceVolumeChangedListeners: Array<(volume: number) => void> = [];
  private _tickListeners: TickListener[] = [];
  private _onCursorHover?: (el: THREE.Object3D) => void;
  private _onCursorLeave?: (el: THREE.Object3D) => void;
  private _onSelectUp?: (el: THREE.Object3D, point: THREE.Vector3) => void;
  private _onSelectDown?: (el: THREE.Object3D, point: THREE.Vector3) => void;
  private _avatarChangedListeners: Array<(avatar: Avatar) => void> = [];

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    headOffset: THREE.Object3D,
    cameraRig: THREE.Object3D,
    getCollisionBoxes: () => THREE.Box3[] | undefined,
    getCollisionObjects: () => THREE.Object3D[] | undefined,
    getTeleportTargetObjects: () => THREE.Object3D[] | undefined,
    options?: {
      isLowSpecMode?: boolean;
      getAudioListener?: () => THREE.AudioListener;
      getInteractableObjects?: () => THREE.Object3D[] | undefined;
      onCursorHover?: (el: THREE.Object3D) => void;
      onCursorLeave?: (el: THREE.Object3D) => void;
      onSelectUp?: (el: THREE.Object3D, point: THREE.Vector3) => void;
      onSelectDown?: (el: THREE.Object3D, point: THREE.Vector3) => void;
    }
  ) {
    this._renderer = renderer;
    // AFrame library sets non-WebXRManager instances in renderer.xr.
    if (navigator.xr && renderer.xr) {
      this._xr = renderer.xr;
    }
    this._scene = scene;
    this._camera = camera;
    this._headOffset = headOffset;
    this._cameraRig = cameraRig;
    this._isLowSpecMode = !!options?.isLowSpecMode;

    if (options?.getAudioListener) {
      this._getAudioListener = options?.getAudioListener;
    } else {
      let audioListener: THREE.AudioListener | undefined;
      this._getAudioListener = () => {
        if (!audioListener) {
          audioListener = camera.children.find(
            (v: THREE.Object3D) => v instanceof THREE.AudioListener
          ) as THREE.AudioListener | undefined;
          if (!audioListener) {
            audioListener = new THREE.AudioListener();
            camera.add(audioListener);
          }
        }
        return audioListener;
      };
    }
    this._getCollisionBoxes = getCollisionBoxes;
    this._getCollisionObjects = getCollisionObjects;
    this._getTeleportTargetObjects = getTeleportTargetObjects;
    if (options?.getInteractableObjects) {
      this._getInteractableObjects = options?.getInteractableObjects;
    } else {
      this._getInteractableObjects = () => undefined;
    }
    this._onCursorHover = options?.onCursorHover;
    this._onCursorLeave = options?.onCursorLeave;
    this._onSelectUp = options?.onSelectUp;
    this._onSelectDown = options?.onSelectDown;
  }
  /** {@inheritDoc EnvAdapter.getRenderer} */
  getRenderer(): THREE.WebGLRenderer {
    return this._renderer;
  }
  /** {@inheritDoc EnvAdapter.getXRManager} */
  getXRManager(): THREE.WebXRManager | undefined {
    return this._xr;
  }
  /** {@inheritDoc EnvAdapter.getScene} */
  getScene(): THREE.Scene {
    return this._scene;
  }
  /** {@inheritDoc EnvAdapter.getCamera} */
  getCamera(): THREE.PerspectiveCamera {
    return this._camera;
  }
  /** {@inheritDoc EnvAdapter.getXRCamera} */
  getXRCamera(): THREE.ArrayCamera | undefined {
    return this._xr?.getCamera();
  }
  /** {@inheritDoc EnvAdapter.getHead} */
  getHead(): THREE.Object3D {
    return this._camera;
  }
  /** {@inheritDoc EnvAdapter.getHeadOffset} */
  getHeadOffset(): THREE.Object3D {
    return this._headOffset;
  }
  /** {@inheritDoc EnvAdapter.getCameraRig} */
  getCameraRig(): THREE.Object3D {
    return this._cameraRig;
  }
  /** {@inheritDoc EnvAdapter.getAudioListener} */
  getAudioListener(): THREE.AudioListener {
    return this._getAudioListener();
  }
  /** {@inheritDoc EnvAdapter.isVR} */
  isVR(): boolean {
    return !!this._xr?.isPresenting;
  }
  /** {@inheritDoc EnvAdapter.isLowSpecMode} */
  isLowSpecMode(): boolean {
    return this._isLowSpecMode;
  }
  /** {@inheritDoc EnvAdapter.getCollisionBoxes} */
  getCollisionBoxes(): THREE.Box3[] | undefined {
    return this._getCollisionBoxes();
  }
  /** {@inheritDoc EnvAdapter.getCollisionObjects} */
  getCollisionObjects(): THREE.Object3D[] | undefined {
    return this._getCollisionObjects();
  }
  /** {@inheritDoc EnvAdapter.getTeleportTargetObjects} */
  getTeleportTargetObjects(): THREE.Object3D[] | undefined {
    return this._getTeleportTargetObjects();
  }
  /** {@inheritDoc EnvAdapter.getInteractableObjects} */
  getInteractableObjects(): THREE.Object3D[] | undefined {
    return this._getInteractableObjects();
  }

  /** {@inheritDoc EnvAdapter.getVoiceVolume} */
  getVoiceVolume(): number {
    return this._voiceVolume;
  }
  /** {@inheritDoc EnvAdapter.setVoiceVolume} */
  setVoiceVolume(volume: number): void {
    this._voiceVolume = volume;
    this._voiceVolumeChangedListeners.forEach((f) => {
      try {
        f(volume);
      } catch (ex) {
        console.error(ex);
      }
    });
  }
  /** {@inheritDoc EnvAdapter.addVoiceVolumeChangeListener} */
  addVoiceVolumeChangeListener(f: (volume: number) => void): void {
    this._voiceVolumeChangedListeners.push(f);
  }
  /** {@inheritDoc EnvAdapter.removeVoiceVolumeChangeListener} */
  removeVoiceVolumeChangeListener(f: (volume: number) => void): void {
    this._voiceVolumeChangedListeners =
      this._voiceVolumeChangedListeners.filter((v) => v !== f);
  }
  /** {@inheritDoc EnvAdapter.addAudioCreateJob} */
  addAudioCreateJob(f: () => boolean): void {
    if (!isIOS() || this._isAudioInitialized) {
      f();
      return;
    }
    this._audioCreateJobs.push(f);
  }
  /** {@inheritDoc EnvAdapter.onGuiClick} */
  onGuiClick() {
    initAudio();
    this._audioCreateJobs.forEach((f) => {
      // In Mobile Safari, if you do not set the timing of the tap, it will not play.
      if (f()) {
        this._isAudioInitialized = true;
      }
    });
    this._audioCreateJobs = [];
  }

  /** {@inheritDoc EnvAdapter.onCursorHover} */
  onCursorHover(el: THREE.Object3D) {
    this._onCursorHover?.(el);
  }
  /** {@inheritDoc EnvAdapter.onCursorLeave} */
  onCursorLeave(el: THREE.Object3D) {
    this._onCursorLeave?.(el);
  }
  /** {@inheritDoc EnvAdapter.onSelectDown} */
  onSelectDown(el: THREE.Object3D, point: THREE.Vector3) {
    this._onSelectDown?.(el, point);
  }
  /** {@inheritDoc EnvAdapter.onSelectUp} */
  onSelectUp(el: THREE.Object3D, point: THREE.Vector3) {
    this._onSelectUp?.(el, point);
  }
  /** {@inheritDoc EnvAdapter.tick} */
  tick(deltaTime: number): void {
    for (const l of this._tickListeners) {
      l.tick(deltaTime);
    }
  }
  /** {@inheritDoc EnvAdapter.addTickListener} */
  addTickListener(listener: TickListener): void {
    this._tickListeners.push(listener);
  }
  /** {@inheritDoc EnvAdapter.removeTickListener} */
  removeTickListener(listener: TickListener): void {
    this._tickListeners = this._tickListeners.filter((v) => v != listener);
  }
  /** {@inheritDoc EnvAdapter.onAvatarChanged} */
  onAvatarChanged(avatar: Avatar): void {
    for (const l of this._avatarChangedListeners) {
      l(avatar);
    }
  }
  /** {@inheritDoc EnvAdapter.addAvatarChangedListener} */
  addAvatarChangedListener(listener: (avatar: Avatar) => void): void {
    this._avatarChangedListeners.push(listener);
  }
  /** {@inheritDoc EnvAdapter.removeAvatarChangedListener} */
  removeAvatarChangedListener(listener: (avatar: Avatar) => void): void {
    this._avatarChangedListeners = this._avatarChangedListeners.filter(
      (v) => v != listener
    );
  }
}
let _isAudioInitialized = false;
function initAudio() {
  if (_isAudioInitialized) {
    return;
  }
  console.log("init audio");
  _isAudioInitialized = true;
  const ctx = THREE.AudioContext.getContext();
  const emptySource = ctx.createBufferSource();
  emptySource.start();
  emptySource.stop();
}
