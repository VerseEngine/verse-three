import * as THREE from "three";
import type { GuiHandlers } from "@verseengine/verse-three-ui";
import type * as VerseCore from "@verseengine/verse-core";
import type { Player } from "./player";
import type { EnvAdapter } from "./env-adapter";
import { addMirrorHUD } from "@verseengine/three-avatar";
import { isIOS } from "./util";
import { Texts } from "./text";

export type AppGuiHandlers = GuiHandlers & {
  addModifiedListener: (f: () => void) => void;
};

export function createGuiHandlers(
  verse: VerseCore.Verse,
  adapter: EnvAdapter,
  player: Player,
  maxAvatarFileSize: number,
  setBgmVolume?: (volume: number) => void
): AppGuiHandlers {
  let mirror: (THREE.Object3D & { dispose(): void }) | undefined;
  const listeners: Array<() => void> = [];
  const onModified = () => listeners.forEach((f) => f());
  const texts = new Texts();

  let bgmVolume = 0;
  setBgmVolume?.(bgmVolume);

  const handlers = {
    addModifiedListener: (f: () => void) => {
      listeners.push(f);
    },
    isMicOn: () => !!verse.isMicOn(),
    micOff: async () => {
      adapter.onGuiClick();
      verse.micOff();
      onModified();
    },
    micOn: async () => {
      adapter.onGuiClick();
      try {
        await verse.micOn();
      } catch (ex) {
        console.log(ex);
        return;
      }
      onModified();
    },
    getBgmVolume: () => {
      return bgmVolume;
    },
    setBgmVolume: async (volume: number) => {
      adapter.onGuiClick();
      bgmVolume = volume;
      setBgmVolume?.(bgmVolume);
      onModified();
    },
    getVoiceVolume: () => {
      return adapter.getVoiceVolume();
    },
    setVoiceVolume: async (volume: number) => {
      adapter.onGuiClick();
      if (volume === 0) {
        if (verse.isSpeakerOn()) {
          verse.speakerOff();
        }
      } else {
        if (!verse.isSpeakerOn()) {
          // Mobile Safari will not play audio in MediaStreamSource
          // unless the microphone is turned on once or background music, etc. is played
          if (isIOS()) {
            if (!verse.isMicOn()) {
              try {
                await verse.micOn();
              } catch (ex) {
                if (!`${ex}`.includes("NotAllowedError")) {
                  console.error(ex);
                  return;
                }
                alert(texts.get("ios_voice_access_hint"));
                return;
              }
              if (!verse.isMicOn()) {
                return;
              }
              verse.micOff();
            }
          }
          verse.speakerOn();
        }
      }
      adapter.setVoiceVolume(volume);
      onModified();
    },
    isMirrorOn: () => !!mirror,
    mirrorOff: async () => {
      adapter.onGuiClick();
      if (mirror) {
        mirror.dispose();
        mirror.removeFromParent();
        mirror = undefined;
      }
      onModified();
    },
    mirrorOn: async () => {
      adapter.onGuiClick();
      if (!player.avatar) {
        return;
      }
      mirror = addMirrorHUD(player.avatar, adapter.getCameraRig(), {
        xr: adapter.getXRManager(),
      });
      onModified();
    },
    setAvatarURL: async (url: string, fileData: ArrayBuffer) => {
      if (fileData.byteLength > maxAvatarFileSize && maxAvatarFileSize > 0) {
        throw new Error(
          texts
            .get("file_size_exceeded")
            .replace("{}", formatBytes(maxAvatarFileSize))
        );
      }
      await player.setAvatarURL(url, fileData);
    },
    setAvatarData: async (fileData: ArrayBuffer) => {
      if (fileData.byteLength > maxAvatarFileSize && maxAvatarFileSize > 0) {
        throw new Error(
          texts
            .get("file_size_exceeded")
            .replace("{}", formatBytes(maxAvatarFileSize))
        );
      }
      await player?.setAvatarData(fileData);
    },
  };

  return handlers;
}

function formatBytes(n: number) {
  if (n > 1024 * 1024 && n % (1024 * 1024) === 0) {
    return `${n / (1024 * 1024)}MB`;
  }
  if (n > 1024 && n % 1024 === 0) {
    return `${n / 1024}KB`;
  }
  return `${n}B`;
}
