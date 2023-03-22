import * as VerseThree from "@verseengine/verse-three";
import { createBGMController, isCrossOriginBGM } from "./world";

const VERSE_WASM_URL = "../dist/verse_core_bg.982d6594540c209c.wasm";
const ENTRANCE_SERVER_URL = "https://entrance.verseengine.cloud";
const ANIMATION_MAP = {
  idle: "./asset/animation/idle.fbx",
  walk: "./asset/animation/walk.fbx",
};
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
export const PRESET_AVATARS = [
  ...[...Array(3).keys()].map((i) => `f${i}`),
  ...[...Array(3).keys()].map((i) => `m${i}`),
].map((n) => ({
  thumbnailURL: `./asset/avatar/${n}.png`,
  avatarURL: `./asset/avatar/${n}.vrm`,
}));
const DEFAULT_AVATAR_URL =
  PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)].avatarURL;

export const setupVerse = async (
  scene,
  renderer,
  camera,
  cameraContainer,
  player,
  collisionBoxes,
  collisionObjects,
  interactableObjects,
  teleportTargetObjects,
  bgmURL
) => {
  const adapter = new VerseThree.DefaultEnvAdapter(
    renderer,
    scene,
    camera,
    cameraContainer,
    player,
    () => collisionBoxes,
    () => collisionObjects,
    () => teleportTargetObjects,
    {
      isLowSpecMode: VerseThree.isLowSpecDevice(),
      getInteractableObjects: () => interactableObjects,
      onSelectDown: (el, _point) => {
        // assert(interactableObjects.includes(el) === true)
      },
    }
  );

  const res = await VerseThree.start(
    adapter,
    scene,
    VERSE_WASM_URL,
    ENTRANCE_SERVER_URL,
    DEFAULT_AVATAR_URL,
    ANIMATION_MAP,
    ICE_SERVERS,
    {
      maxNumberOfPeople: adapter.isLowSpecMode() ? 8 : 16,
      maxNumberOfParallelFileTransfers: adapter.isLowSpecMode() ? 2 : 4,
      setBgmVolume: createBGMController(bgmURL),
      isCrossOriginBGM: isCrossOriginBGM(bgmURL),
      presetAvatars: PRESET_AVATARS,
    }
  );
  console.log("verse ready");
  return res.tick;
};
