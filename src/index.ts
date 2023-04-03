/**
 * VerseEngine implementation for three.js
 *
 * @example
 * see: {@link start}
 * @packageDocumentation
 */
export type { EnvAdapter } from "./env-adapter";
export {
  DefaultEnvAdapter,
  DefaultEnvAdapterOptions,
} from "./default-env-adapter";
export {
  AFrameEnvAdapter,
  AFrameEnvAdapterOptions,
} from "./aframe-env-adapter";
export { isLowSpecDevice } from "@verseengine/three-avatar";
export type { AppGuiHandlers } from "./gui-handlers";
export type { Player } from "./player";
export type { OtherPerson } from "./other-person";

import * as THREE from "three";
import type { EnvAdapter } from "./env-adapter";
import verseInit, * as VerseCore from "@verseengine/verse-core";
import { PlayerController } from "./player-controller";
import {
  preLoadAnimationData,
  registerSyncAvatarHeadAndCamera,
  AvatarAnimationDataSource,
} from "@verseengine/three-avatar";
import { PlayerManager } from "./player-manager";
import { OtherPersonFactory } from "./other-person";
import {
  register as registerUI,
  Gui2DElement,
  Gui3D,
  Gui3DVisibleSwitcher,
  PresetAvatar,
} from "@verseengine/verse-three-ui";
import { createGuiHandlers, AppGuiHandlers } from "./gui-handlers";
import type { Player } from "./player";
import { isIOS } from "./util";

registerUI();

export type VerseStartResult = {
  guiHandlers: AppGuiHandlers;
  verse: VerseCore.Verse;
  player: Player;
  playerController: PlayerController;
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
  tick: (deltaTime: number) => void;
};

/**
 * see: {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia | MediaDevices.getUserMedia}, {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings | MediaTrackSettings },{@link https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints | Capabilities, constraints, and settings}
 */
const DEFAULT_VOICE_MEDIA_TRACK_SETTINGS = {
  channelCount: 1,
  // echoCancellation: true,
  // echoCancellationType: "system",
};

/**
 * see: {@link start}
 */
export interface StartOptions {
  /**
   * Preset avatars selectable in GUI.
   */
  presetAvatars?: PresetAvatar[];
  /**
   * Maximum number of people to display. Default is 10.
   * @remarks
   * It only limits the number of displays; the number of users that can exist in the same space is unlimited regardless of this value.
   */
  maxNumberOfPeople?: number;
  /**
   * Maximum size of avatar file. Default is 1024 * 1024 * 32 (32MB).
   */
  maxAvatarFileSize?: number;
  /**
   * Maximum number of parallel file transfers. Default is 1 (send = 1 and receive = 1).
   */
  maxNumberOfParallelFileTransfers?: number;
  /**
   * BGM volume setting function.
   * If not specified, the BGM volume setting UI is not displayed.
   */
  setBgmVolume?: (volume: number) => void;
  /**
   * true if the BGM is loaded from a different domain.
   * For crossorigin's source, there is no way to adjust volume in iOS Safari. (GainNode is not available in Mac Safari, but can be changed with Audio.volume)
   */
  isCrossOriginBGM?: boolean;
  /**
   * Setting up a microphone for voice chat.
   *
   * @remarks
   * When calling {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia | navigator.mediaDevices.getUserMedia}, set the parameter to the `audio` property.
   *
   * see: {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia |
   * MediaDevices.getUserMedia}, {@link
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getSupportedConstraints | MediaDevices.getSupportedConstraints}, {@link
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings | MediaTrackSettings },
   * {@link
   * https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints
   * | Capabilities, constraints, and settings}
   *
   * @example
   * ```ts
   * {
   *   voiceMediaTrackSettings: {
   *     channelCount: 1
   *   }
   * }
   * ```
   *
   * ```ts
   * {
   *   voiceMediaTrackSettings: true
   * }
   * ```
   *
   * ```ts
   * {
   *   voiceMediaTrackSettings: {
   *     channelCount: 1,
   *     echoCancellation: false
   *   }
   * }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  voiceMediaTrackSettings?: any;
}

/**
 * Start connecting to the network.
 *
 * @param adapter -
 * @param otherPeopleContainer - Parent object when adding Other players to Scene.
 * @param wasmPath - URL of verse_core_bg.wasm (included in verse-core).
 * @param entranceServerURL -
 * @param defaultAvatarURL - URL of the default avatar (used when not explicitly set).
 * @param avatarAnimationDataSource - URL of the avatar's animation data.
 * @param iceServers - URL of ICE servers to be passed to the constructor of {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection | RTCPeerConnection}
 *
 * @example
 * ```ts
import * as VerseThree from "verse-three";

...

const ANIMATION_MAP = {
  idle: "./asset/animation/idle.fbx",
  walk: "./asset/animation/walk.fbx",
};
const ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "stun:stun1.l.google.com:19302",
  },
];
const PRESET_AVATARS = [
  {
    thumbnailURL: "./asset/avatar/0.png",
    avatarURL: "./asset/avatar/0.vrm",
  },
  {
    thumbnailURL: "./asset/avatar/1.png",
    avatarURL: "./asset/avatar/1.vrm",
  },
  ...
];

const adapter = new VerseThree.DefaultEnvAdapter(
  renderer,
  scene,
  camera,
  cameraContainer,
  playerObj,
  () => collisionBoxes,
  () => collisionObjects,
  () => teleportTargetObjects,
  {
    isLowSpecMode: VerseThree.isLowSpecDevice(),
    getInteractableObjects: () => interactableObjects,
    onSelectDown: (_el, _point) => {},
  }
);

VerseThree.start(
  adapter,
  scene,
  "./assets/verse_core_bg.wasm",
  "https://entrance.verseengine.cloud",
  "asset/avatar/0.vrm",
  ANIMATION_MAP,
  ICE_SERVERS,
  {
    setBgmVolume: createSetBgmVolume(),
    isCrossOriginBGM,
    presetAvatars: PRESET_AVATARS,
  }
).then((res) => {
  console.log("verse ready");
});

...
   
 * ```
 */
export async function start(
  adapter: EnvAdapter,
  otherPeopleContainer: THREE.Object3D,
  wasmPath: string,
  entranceServerURL: string,
  defaultAvatarURL: string,
  avatarAnimationDataSource: AvatarAnimationDataSource,
  iceServers: RTCIceServer[],
  options?: StartOptions
): Promise<VerseStartResult> {
  const isVoiceDisabled = !navigator.mediaDevices;
  const gui2d = document.createElement("gui-2d") as HTMLElement as Gui2DElement;
  if (!options?.setBgmVolume) {
    gui2d.setAttribute("bgm-disabled", "bgm-disabled");
  } else {
    gui2d.setAttribute(
      "bgm-type",
      options?.isCrossOriginBGM && isIOS() ? "toggle" : "slider"
    );
  }
  if (isVoiceDisabled) {
    console.warn(
      "HTTPS is required for voice communication (https:// or localhost)"
    );
    gui2d.setAttribute("mic-disabled", "mic-disabled");
    gui2d.setAttribute("voice-disabled", "voice-disabled");
  }
  gui2d.style.zIndex = "100";
  document.body.appendChild(gui2d);
  gui2d?.showLoading();

  await verseInit(wasmPath);
  await preLoadAnimationData(avatarAnimationDataSource);
  const res = await _start(
    gui2d,
    isVoiceDisabled,
    adapter,
    otherPeopleContainer,
    entranceServerURL,
    defaultAvatarURL,
    iceServers,
    options
  );

  gui2d?.ready();
  // @ts-ignore
  return res;
}
async function _start(
  gui2d: Gui2DElement,
  isVoiceDisabled: boolean,
  adapter: EnvAdapter,
  otherPeopleContainer: THREE.Object3D,
  entranceServerURL: string,
  defaultAvatarURL: string,
  iceServers?: RTCIceServer[],
  options?: StartOptions
): Promise<VerseStartResult> {
  let gui3d: Gui3D;

  const orig = adapter;
  const interactableObjects: THREE.Object3D[] = [];
  const getInteractableObjectsOverride = () => {
    interactableObjects.length = 0;
    const res = orig.getInteractableObjects();
    if (res) {
      interactableObjects.push(...res);
    }
    if (gui3d) {
      interactableObjects.push(...gui3d.clickableObjects);
    }
    return interactableObjects;
  };
  adapter = new Proxy(orig, {
    get: function (target, prop, _receiver) {
      if (prop === "getInteractableObjects") {
        return getInteractableObjectsOverride;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (target as any)[prop];
    },
  }) as EnvAdapter;

  const playerController = new PlayerController(adapter);
  const playerMgr = new PlayerManager(adapter, defaultAvatarURL);
  const player = await playerMgr.createPlayer(
    playerController.xrController?.handHolder
  );
  adapter.addTickListener(player);
  adapter.getCameraRig().add(player.object3D);
  const verse = VerseCore.Verse.new(
    entranceServerURL,
    player,
    new OtherPersonFactory(otherPeopleContainer, adapter),
    {
      maxNumberOfPeople: options?.maxNumberOfPeople,
      maxAvatarFileSize: options?.maxAvatarFileSize,
      maxNumberOfParallelFileTransfers:
        options?.maxNumberOfParallelFileTransfers,
      rtcConfiguration: {
        iceServers,
      } as RTCConfiguration,
      logLevel: "info",
    }
  );

  verse.setMicAudioConstraints(
    options?.voiceMediaTrackSettings || DEFAULT_VOICE_MEDIA_TRACK_SETTINGS
  );
  await verse.start();

  const guiHandlers = createGuiHandlers(
    verse,
    adapter,
    player,
    verse.maxAvatarFileSize,
    options?.setBgmVolume
  );
  gui2d.setPresetAvatars(options?.presetAvatars);
  gui2d.setGuiHandlers(guiHandlers);
  gui2d.setOnVolumeControlOpen(() => {
    adapter.onGuiClick();
    guiHandlers.setVoiceVolume(guiHandlers.getVoiceVolume());
  });
  guiHandlers.addModifiedListener(() => gui2d.updateStates());

  const xr = adapter.getXRManager();
  if (xr) {
    registerSyncAvatarHeadAndCamera(
      xr,
      adapter.getCamera(),
      adapter.getHead(),
      adapter.getHeadOffset(),
      () => player.avatar,
      {
        onVR: () => {
          player.setupVR();
          playerController.isVR = true;
        },
        onNonVR: () => {
          player.setupNonVR();
          playerController.isVR = false;
        },
      }
    );

    gui3d = setupGui3D(
      adapter,
      guiHandlers,
      !options?.setBgmVolume,
      isVoiceDisabled
    );
  } else {
    player.setupNonVR();
    playerController.isVR = false;
  }

  return {
    guiHandlers,
    verse,
    player,
    playerController,
    tick: adapter.tick.bind(adapter),
  };
}
function setupGui3D(
  adapter: EnvAdapter,
  guiHandlers: AppGuiHandlers,
  isBgmDisabled: boolean,
  isVoiceDisabled: boolean
): Gui3D {
  const xr = adapter.getXRManager();
  if (!xr) {
    throw new Error("WebXRManager is undefined");
  }
  const menu = new Gui3D({
    isBgmDisabled,
    ...(isVoiceDisabled
      ? {
          isVoiceDisabled: true,
          isMicDisabled: true,
        }
      : {}),
  });
  adapter.getCameraRig().add(menu.object3D);
  menu.setGuiHandlers(guiHandlers);
  guiHandlers.addModifiedListener(() => menu.updateStates());
  const switcher = new Gui3DVisibleSwitcher(
    xr,
    menu.object3D,
    adapter.getHead()
  );
  adapter.addTickListener(switcher);
  return menu;
}
