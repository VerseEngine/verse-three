import type * as THREE from "three";
import { Avatar } from "@verseengine/three-avatar";
import { OtherPerson } from "./other-person";

export interface TickListener {
  /**
   * Processes called periodically.
   *
   * @param deltaTime - THREE.Clock.getDelta()
   *
   * @example
   * ```ts
   * const clock = new THREE.Clock();
   * renderer.setAnimationLoop(() => {
   *   const dt = clock.getDelta();
   *   listener.tick(dt);
   * });
   * ```
   * or
   * ```ts
   * const clock = new THREE.Clock();
   * setInterval(() => {
   *   const dt = clock.getDelta();
   *   listener.tick(dt);
   * }, anything);
   * ```
   */
  tick(deltaTime: number): void;
}

/**
 * Interface that summarizes the environment.
 *
 * @example
 * {@link DefaultEnvAdapter }
 */
export interface EnvAdapter {
  getRenderer(): THREE.WebGLRenderer;
  /**
   * `renderer.xr`
   */
  getXRManager(): THREE.WebXRManager | undefined;
  getScene(): THREE.Scene;
  /**
   * Camera for non-VR.
   */
  getCamera(): THREE.PerspectiveCamera;
  /**
   * Camera for VR.
   * `renderer.xr.getCamera()`
   */
  getXRCamera(): THREE.ArrayCamera | undefined;
  /**
   * head object.
   *
   * @remarks
   * ```
   - Neck and head positioning for each avatar type
   - Head-sync angle acquisition
   - Gui3D display decision
   * ```
   */
  getHead(): THREE.Object3D;
  /**
   * head offset object.
   * @remarks
   * ```
   - Head height adjustment based on height for each avatar type
   - Vertical rotation target
   - Container for VR controller
   * ```
   */
  getHeadOffset(): THREE.Object3D;
  /**
   * Container object of the local player.
   * @remarks
   * ```
   * - Object to which camera, avatar, and XR controller are added
   * - Moving target
   * - Horizontal rotation target
   * ```
   */
  getCameraRig(): THREE.Object3D;
  /**
   * {@link https://threejs.org/docs/#api/en/audio/AudioListener | THREE.AudioListener} placed at the player avatar's ear position
   */
  getAudioListener(): THREE.AudioListener;
  /**
   * Whether in VR mode or not.
   */
  isVR(): boolean;
  /**
   * Some processing and textures for low resources.
   */
  isLowSpecMode(): boolean;

  /**
   * Get a list of ground and obstacle {@link https://threejs.org/docs/?q=Box3#api/en/math/Box3.setFromObject | bounding boxes}.
   */
  getCollisionBoxes(): THREE.Box3[] | undefined;
  /**
   * Get a list of objects that the laser pointer will not penetrate.
   * @remarks
   * For XR Controllers
   */
  getCollisionObjects(): THREE.Object3D[] | undefined;
  /**
   * Get a list of objects that can be the destination of a teleport.
   * @remarks
   * For XR Controllers
   */
  getTeleportTargetObjects(): THREE.Object3D[] | undefined;
  /**
   * Get a list of objects that can interact with a laser pointer (Other than teleport destination).
   * @remarks
   * For XR Controllers
   */
  getInteractableObjects(): THREE.Object3D[] | undefined;

  /**
   * Get the volume of voice chat
   */
  getVoiceVolume(): number;
  /**
   * Set the volume of voice chat
   */
  setVoiceVolume(volume: number): void;
  /**
   * Add an event handler to receive voice chat volume change events.
   */
  addVoiceVolumeChangeListener(f: (volume: number) => void): void;
  /**
   * Remove event handler for receiving voice chat volume change events.
   */
  removeVoiceVolumeChangeListener(f: (volume: number) => void): void;

  /**
   * Execute the process of starting audio playback.
   *
   * @remarks
   * Necessary to hold processing until click time to play audio in Mobile Safari.
   */
  addAudioCreateJob(f: () => boolean): void;
  /**
   * Called when any GUI element is clicked.
   *
   * @remarks
   * To play audio in Mobile Safari, perform what you need to do on click.
   */
  onGuiClick(): void;

  /**
   * Cursor hover event handler. like {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseover_event | mouseover}.
   * @remarks
   * For XR Controllers
   */
  onCursorHover(el: THREE.Object3D): void;
  /**
   * Cursor leave event handler. like {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseleave_event | mouseleave}.
   * @remarks
   * For XR Controllers
   */
  onCursorLeave(el: THREE.Object3D): void;
  /**
   * Select button release event handler. like {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseup_event | mouseup}.
   * @remarks
   * For XR Controllers
   */
  onSelectUp(el: THREE.Object3D, point: THREE.Vector3): void;
  /**
   * Select button press event handler. like {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/mousedown_event | mousedown}.
   * @remarks
   * For XR Controllers
   */
  onSelectDown(el: THREE.Object3D, point: THREE.Vector3): void;

  /**
   * Processes called periodically.
   *
   * @param deltaTime - THREE.Clock.getDelta()
   *
   * @example
   * ```ts
   * const clock = new THREE.Clock();
   * renderer.setAnimationLoop(() => {
   *   const dt = clock.getDelta();
   *   listener.tick(dt);
   * });
   * ```
   * or
   * ```ts
   * const clock = new THREE.Clock();
   * setInterval(() => {
   *   const dt = clock.getDelta();
   *   listener.tick(dt);
   * }, anything);
   * ```
   */
  tick(deltaTime: number): void;
  /**
   * Add a process that is called periodically.
   */
  addTickListener(listener: TickListener): void;
  /**
   * Remove a process that is called periodically.
   */
  removeTickListener(listener: TickListener): void;

  /**
   * Avatar change event handler.
   */
  onAvatarChanged(avatar: Avatar): void;
  /**
   *  Add an event handler to receive avatar change events.
   */
  addAvatarChangedListener(listener: (avatar: Avatar) => void): void;
  /**
   *  Remove an event handler to receive avatar change events.
   */
  removeAvatarChangedListener(listener: (avatar: Avatar) => void): void;

  /**
   * TextData change event handler.
   */
  onTextDataChanged(person: OtherPerson, textData: string): void;
  /**
   *  Add an event handler to receive text data change events.
   */
  addTextDataChangedListener(
    listener: (person: OtherPerson, textData: string) => void
  ): void;
  /**
   *  Remove an event handler to receive text data change events.
   */
  removeTextDataChangedListener(
    listener: (person: OtherPerson, textData: string) => void
  ): void;
}
