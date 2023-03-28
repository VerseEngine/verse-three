// @ts-ignore
import InterpolationBuffer from "buffered-interpolation";
import * as THREE from "three";
// buffered-interpolation depends on global THREE.
if (!window.THREE) {
  window.THREE = THREE;
}

import { Avatar, Lipsync, createAvatar } from "@verseengine/three-avatar";
import { isEqualsVector3 } from "./util";
import type { EnvAdapter } from "./env-adapter";
import * as VerseCore from "@verseengine/verse-core";
import * as Serializer from "./avatar-serializer";

const SYNC_BONES_DATA_TIMEOUT_SEC = 3;
const DEFAULT_MOVE_INTERVAL_SEC = 1 / 30; // 30fps
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpVec = new THREE.Vector3();

export interface OtherPersonOptions {
  /**
   * Processing frequency of buffered-interpolation. Default is 1 / 30 (30fps).
   */
  moveIntervalSec?: number;
}

/**
 * Implementation of `@verseengine/verser-core#OtherPerson`.
 */
export class OtherPerson implements VerseCore.OtherPerson {
  // @ts-ignore
  private _avatar: Avatar;
  private _audioEl?: HTMLAudioElement;
  private _audio?: THREE.PositionalAudio;
  private _sessionId: string;

  private _bi: InterpolationBuffer;
  // @ts-ignore
  private _biSyncBones: InterpolationBuffer[];

  private _prevPosition?: THREE.Vector3;
  private _prevAngle?: number;
  private _object3D: THREE.Object3D;
  private _disposed: boolean;
  private _adapter: EnvAdapter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _lipSync: any;
  private _enableMove: boolean;
  private _syncBoneDataLastReceived?: number;
  private _isSyncReady = false;
  private _iid?: number;
  private _onVoiceVolumeChanged: (volume: number) => void;
  private _ms?: MediaStream;
  private _textData?: string;
  private _elapsedTime = 0;
  private _moveIntervalSec = 0;
  private _moveSec = 0;
  private _isMoved = false;

  constructor(
    sessionId: string,
    avatarData: Uint8Array,
    adapter: EnvAdapter,
    options?: OtherPersonOptions
  ) {
    this._adapter = adapter;
    this._object3D = new THREE.Object3D();
    this._sessionId = sessionId;
    this._setAvatarData(avatarData);

    this._moveIntervalSec =
      options?.moveIntervalSec || options?.moveIntervalSec === 0
        ? options.moveIntervalSec
        : DEFAULT_MOVE_INTERVAL_SEC;

    this._disposed = false;
    this._bi = new InterpolationBuffer(InterpolationBuffer.MODE_LERP, 0.5);
    this._enableMove = true;

    const weakThis = new WeakRef(this);
    this._onVoiceVolumeChanged = (volume: number) => {
      const audio = weakThis.deref()?._audio;
      if (!audio) {
        return;
      }
      console.log("set volume", volume);
      audio.setVolume(volume);
    };
    this._adapter.addVoiceVolumeChangeListener(this._onVoiceVolumeChanged);
  }
  get object3D() {
    return this._object3D;
  }
  setPosition(pos_x: number, pos_y: number, pos_z: number, angle: number) {
    this._object3D.position.set(pos_x, pos_y, pos_z);
    this._object3D.rotateY(angle);
    this.moveTo(pos_x, pos_y, pos_z, angle);
  }
  /**
   * Implementation of `@verseengine/verser-core#OtherPerson.moveTo`
   */
  moveTo(pos_x: number, pos_y: number, pos_z: number, angle: number) {
    try {
      tmpVec.set(pos_x, pos_y, pos_z);
      if (!isEqualsVector3(this._prevPosition, tmpVec)) {
        this._bi.setPosition(tmpVec);
        if (!this._prevPosition) {
          this._prevPosition = new THREE.Vector3();
        }
        this._prevPosition.copy(tmpVec);
      }
      if (this._prevAngle !== angle) {
        const q = tmpQuat.setFromEuler(tmpEuler.set(0, angle, 0, "XYZ"));
        this._bi.setQuaternion(q);
        this._prevAngle = angle;
      }
      if (!this._isMoved && this._avatar) {
        this._isMoved = true;
        this._onFirstMoveTo();
      }
    } catch (ex) {
      console.warn("unexpected error", "OtherPerson.moveTo", ex);
    }
  }
  private _onFirstMoveTo() {
    const avatar = this._avatar;
    this._object3D.add(this._avatar.object3D);
    setTimeout(() => {
      if (this._avatar === avatar) {
        this._avatar.object3D.visible = true;
      }
    }, 1000);
  }
  /**
   * Implementation of `@verseengine/verser-core#OtherPerson.setTextData`
   */
  setTextData(textData: string) {
    this._textData = textData;
    this._adapter.onTextDataChanged(this, textData);
  }
  getTextData() {
    return this._textData;
  }
  /**
   * Implementation of `@verseengine/verser-core#OtherPerson.changeAvatar`
   */
  changeAvatar(avatarData: Uint8Array) {
    try {
      this._setAvatarData(new Uint8Array(avatarData));
    } catch (ex) {
      console.warn("unexpected error", "OtherPerson.changeAvatar", ex);
    }
  }
  private _setAvatarData(avatarData: Uint8Array) {
    this._avatar?.dispose();
    (async () => {
      const isLowSpecMode = this._adapter.isLowSpecMode();
      const avatar = await createAvatar(
        avatarData,
        this._adapter.getRenderer(),
        false,
        {
          isLowSpecMode,
          animationIntervalSec: isLowSpecMode ? 1 / 30 : 1 / 60,
        }
      );
      avatar.object3D.visible = false;
      avatar.object3D.name = "otherPerson";
      this._avatar = avatar;
      this._isMoved = false;
      this._avatar.playClip("idle");
      this._updateMouthPosition();
      this._biSyncBones = this._avatar.syncTargetBones.map(
        (_) => new InterpolationBuffer(InterpolationBuffer.MODE_LERP, 0.3)
      );
    })();
  }
  /**
   * Processes called periodically.
   *
   * @param deltaTime - THREE.Clock.getDelta()
   */
  tick(deltaTime: number) {
    if (this._disposed) {
      return;
    }
    this._elapsedTime += deltaTime;
    this._avatar?.tick(deltaTime);

    this._moveSec += deltaTime;
    if (this._moveSec >= this._moveIntervalSec) {
      this._move(this._moveSec);
      this._moveSec = 0;
    }

    if (this._avatar && this._lipSync) {
      this._avatar.lipSync(
        ...(this._lipSync.update() as [number, number, number])
      );
    }

    if (
      this._syncBoneDataLastReceived &&
      this._elapsedTime - this._syncBoneDataLastReceived >
        SYNC_BONES_DATA_TIMEOUT_SEC
    ) {
      this._avatar.setIKMode(false);
      delete this._syncBoneDataLastReceived;
      this._isSyncReady = false;
    }
  }
  private _move(dt: number) {
    const dtMs = dt * 1000;
    if (this._enableMove) {
      const object3D = this.object3D;
      this._bi.update(dtMs);
      const p = this._bi.getPosition();
      object3D.position.copy(p);
      const q = this._bi.getQuaternion();
      object3D.quaternion.copy(q);
    }
    if (this._avatar) {
      if (this._isSyncReady) {
        const bones = this._avatar.syncTargetBones;
        const n = this._biSyncBones.length;
        for (let i = 0; i < n; i++) {
          const bi = this._biSyncBones[i];
          bi.update(dtMs);
          bones[i].quaternion.copy(bi.getQuaternion());
        }
      }
    }
  }

  /**
   * Implementation of `@verseengine/verser-core#OtherPerson.dispose`
   */
  dispose() {
    try {
      if (this._iid) {
        clearInterval(this._iid);
        delete this._iid;
      }
      this._disposed = true;
      this._ms = undefined;
      this._avatar?.dispose();
      try {
        this._audio?.disconnect();
      } catch (ex) {
        console.log(ex);
      }
      this._object3D.removeFromParent();
      this._adapter.removeVoiceVolumeChangeListener(this._onVoiceVolumeChanged);
      this._adapter.removeTickListener(this);
    } catch (ex) {
      console.warn("unexpected error", "OtherPerson.dispose", ex);
    }
  }

  onSyncBonesData(data?: number[]) {
    if (!this._avatar) {
      return;
    }
    if (!data) {
      if (this._avatar.isIKMode) {
        this._avatar.setIKMode(false);
      }
      return;
    }
    this._syncBoneDataLastReceived = this._elapsedTime;
    if (!this._avatar.isIKMode) {
      (async () => {
        await this._avatar.setIKMode(true);
        this._isSyncReady = true;
        this._setSyncBonesData(data);
      })();
    } else if (this._isSyncReady) {
      this._setSyncBonesData(data);
    }
  }
  private _setSyncBonesData(data: number[]) {
    const n = this._biSyncBones.length;
    if (data.length !== n * 4) {
      console.warn("bad sync bones data");
      return;
    }
    let idx = 0;
    for (let i = 0; i < n; i++) {
      tmpQuat.fromArray(data, idx);
      idx += 4;
      this._biSyncBones[i].setQuaternion(tmpQuat);
    }
  }
  /**
   * Implementation of `@verseengine/verser-core#OtherPerson.onVoiceMediaStream`
   */
  onVoiceMediaStream(ms: MediaStream) {
    console.log("[voice] on voice media stream");
    this._ms = ms;
    this._adapter.addAudioCreateJob(() => {
      if (this._disposed || this._ms !== ms) {
        return false;
      }
      if (!this._audio) {
        console.log("[voice] setup voice", this._sessionId);
        this._audio = new THREE.PositionalAudio(
          this._adapter.getAudioListener()
        );
        this._object3D.add(this._audio);
        this._audio.setMaxDistance(50);
        this._audio.setRefDistance(2);
        this._audio.setRolloffFactor(1);
        this._audio.gain.gain.value = this._adapter.getVoiceVolume();
        this._updateMouthPosition();
      }

      // In Chrome, you have to add it to Audio Element to get sound.
      // https://stackoverflow.com/questions/55703316/audio-from-rtcpeerconnection-is-not-audible-after-processing-in-audiocontext
      this._audioEl = new Audio();
      this._audioEl.setAttribute("autoplay", "autoplay");
      this._audioEl.setAttribute("playsinline", "playsinline");
      this._audioEl.srcObject = ms;
      this._audioEl.muted = true;

      this._audio?.setMediaStreamSource(ms);
      console.log("[voice] set voice stream", this._sessionId);

      // @ts-ignore
      this._lipSync = new Lipsync(
        THREE.AudioContext.getContext() as AudioContext,
        ms,
        0.7
      );
      return true;
    });
  }
  /**
   * Implementation of `@verseengine/verser-core#OtherPerson.onDetailStream`
   */
  onDetailStream(data: Uint8Array) {
    try {
      Serializer.deserializeTo(data, this);
    } catch (ex) {
      console.warn("unexpected error", "OtherPerson.onDetailStream", ex);
    }
  }
  _updateMouthPosition() {
    const audio = this._audio;
    const avatar = this._avatar;
    if (!audio || !avatar) {
      return;
    }
    const h = avatar.getHeadHeight();
    audio.position.set(0, h, 0);
  }
}
/**
 * Implementation of `@verseengine/verser-core#OtherPersonFactory`.
 */
export class OtherPersonFactory implements VerseCore.OtherPersonFactory {
  private _parent: THREE.Object3D;
  private _adapter: EnvAdapter;
  constructor(parent: THREE.Object3D, adapter: EnvAdapter) {
    this._parent = parent;
    this._adapter = adapter;
  }
  /**
   * Implementation of `@verseengine/verser-core#OtherPersonFactory.create`
   */
  create(
    sessionId: string,
    avatarData: Uint8Array,
    pos_x: number,
    pos_y: number,
    pos_z: number,
    angle: number
  ): OtherPerson {
    const p = new OtherPerson(
      sessionId,
      new Uint8Array(avatarData),
      this._adapter
    );
    p.setPosition(pos_x, pos_y, pos_z, angle);
    this._parent.add(p.object3D);
    this._adapter.addTickListener(p);

    return p;
  }
}
