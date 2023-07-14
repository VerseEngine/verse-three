import * as THREE from "three";

import { fetchWithRetry } from "./util";
import {
  Avatar,
  AvatarIK,
  createAvatarIK,
  createAvatar,
} from "@verseengine/three-avatar";
import type { EnvAdapter } from "./env-adapter";
import * as VerseCore from "@verseengine/verse-core";
import * as Serializer from "./avatar-serializer";
import { sleep } from "./util";
import type { HandHolder } from "@verseengine/three-xr-controller";

const fetchAvatarData = async (url: string) => {
  const resp = await fetchWithRetry(url);
  return await resp.arrayBuffer();
};

/**
 * Implementation of {@link https://github.com/VerseEngine/verse-core/blob/main/docs/verse-core.player.md | @verseengine/verse-core#Player}.
 */
export class Player implements VerseCore.Player {
  private _object3D: THREE.Object3D;
  // @ts-ignore: Because it is set up with an asynchronous factory method
  private _avatarData: Uint8Array;
  // @ts-ignore: Because it is set up with an asynchronous factory method
  private _avatarURL?: string;
  // @ts-ignore: Because it is set up with an asynchronous factory method
  private _avatar: Avatar;
  private _avatarChanged: Date | null;
  private _isLoaded = false;
  private _avatarIK?: AvatarIK;
  private _adapter: EnvAdapter;
  private _onAvatarChanged: (p: Player, avatarData: ArrayBuffer) => void;
  private _handHolder?: HandHolder;
  private _textData?: string;
  private _textDataChanged: Date | null;

  private _sessionID = "";
  private _verse: VerseCore.Verse | null = null;

  static async create(
    url: string | undefined | null,
    data: ArrayBuffer | undefined | null,
    adapter: EnvAdapter,
    onAvatarChanged: (p: Player, avatarData: ArrayBuffer) => void,
    handHolder?: HandHolder,
  ) {
    const res = new Player(adapter, onAvatarChanged, handHolder);
    if (url) {
      data ||= await fetchAvatarData(url);
      await res.setAvatarURL(url, data);
    } else if (data) {
      await res.setAvatarData(data);
    } else {
      throw new Error("avatar url and data is null");
    }
    return res;
  }
  constructor(
    adapter: EnvAdapter,
    onAvatarChanged: (p: Player, avatarData: ArrayBuffer) => void,
    handHolder?: HandHolder,
  ) {
    this._avatarChanged = null;
    this._onAvatarChanged = onAvatarChanged;
    this._textDataChanged = null;
    this._adapter = adapter;
    this._handHolder = handHolder;
    this._object3D = new THREE.Object3D();
  }
  /**
   * Uniquely identifying ID.  The same user will have a different ID each time they connect.
   *
   * The session ID is the public key for ED25519.
   * Verse holds the private key for the session ID internally
   *
   * The session ID (public key) of the other person can be obtained when {@link OtherPerson.sessionID} is called
   */
  get sessionID() {
    return this._sessionID;
  }
  get object3D() {
    return this._object3D;
  }
  get avatarURL() {
    return this._avatarURL;
  }
  get avatar(): Avatar {
    return this._avatar;
  }

  /**
   * Create a data signature with the private key of the session ID.
   *
   * @example
   * ```ts
   * const { player } = await VerseThree.start(...);
   * ...
   * const data = ...;
   * const signature = player.sign(data);
   * await fetch('...',
   *   headers: {
   *	    'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     'sessionID': player.sessionID,
   *     signature,
   *     data
   *   })
   * });
   *
   * ...
   * const valid = otherPerson.verify(signature, data);
   * // or
   * const valid = VerseThree.verify(otherPerson.sessionID, signature, data);
   * if(!valid) { throw new Error('invalid data'); }
   * ```
   */
  sign(data: Uint8Array): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._verse!.sign(data);
  }
  /**
   * Create a data signature with the private key of the session ID.
   *
   * @example
   * ```ts
   * const { player } = await VerseThree.start(...);
   * ...
   * const data = ...;
   * const signature = player.signString(data);
   * await fetch('...',
   *   headers: {
   *	    'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     'sessionID': player.sessionID,
   *     signature,
   *     data
   *   })
   * });
   *
   * ...
   * const valid = otherPerson.verifyString(signature, data);
   * // or
   * const valid = VerseThree.verifyString(otherPerson.sessionID, signature, data);
   * if(!valid) { throw new Error('invalid data'); }
   * ```
   */
  signString(data: string): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._verse!.signString(data);
  }

  _internalSetup(verse: VerseCore.Verse) {
    this._sessionID = verse.getSessionID();
    this._verse = verse;
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.getPosition`
   */
  getPosition() {
    return this._adapter.getCameraRig().position;
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.getAngle`
   */
  getAngle() {
    return this._adapter.getCameraRig().rotation.y;
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.getTextData`
   */
  getTextData() {
    return this._textData;
  }
  setTextData(textData: string) {
    this._textData = textData;
    this._textDataChanged = new Date();
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.getTextDataChanged`
   */
  getTextDataChanged() {
    return this._textDataChanged;
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.getAvatar`
   */
  getAvatar() {
    return {
      data: this._avatarData,
    };
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.getAvatarChanged`
   */
  getAvatarChanged() {
    return this._avatarChanged;
  }
  /**
   * Implementation of `@verseengine/verse-core#Player.onRequestDetailStream`
   */
  onRequestDetailStream(factory: VerseCore.DetailInputStreamFactory) {
    (async () => {
      const ds = await factory.create();
      for (;;) {
        if (this._avatar.isIKMode) {
          ds.send(Serializer.serializeFrom(this));
          await sleep(300);
        } else {
          ds.send(Serializer.serializeFrom(this, true));
          await sleep(5000);
        }
      }
    })();
  }

  async setAvatarURL(url: string, fileData: ArrayBuffer) {
    this._avatarURL = url;
    await this._setAvatarData(fileData);
  }
  async setAvatarData(fileData: ArrayBuffer) {
    delete this._avatarURL;
    await this._setAvatarData(fileData);
  }
  async setupVR() {
    await this._avatar.setIKMode(true);
    // this._setupIK();
    this._setFirstPersonMode();
  }
  async setupNonVR() {
    if (this._avatarIK) {
      this._avatarIK.dispose();
      delete this._avatarIK;
    }
    await this._avatar.setIKMode(false);
    this._setFirstPersonMode();
  }
  private async _setAvatarData(avatarData: ArrayBuffer) {
    this._avatar?.dispose();

    this._avatarData = new Uint8Array(avatarData);
    this._avatar = await createAvatar(
      this._avatarData,
      this._adapter.getRenderer(),
      false,
      {
        isInvisibleFirstPerson: true,
        isLowSpecMode: this._adapter.isLowSpecMode(),
      },
    );
    this._setFirstPersonMode();

    this.object3D.add(this._avatar.object3D);

    this._adapter
      .getHead()
      .position.copy(
        new THREE.Vector3(0, this._avatar.getHeadHeight(), 0).add(
          this._avatar.headBoneOffset,
        ),
      );

    if (!this._isLoaded) {
      this._isLoaded = true;
    } else {
      this._avatarChanged = new Date();
    }
    if (this._onAvatarChanged) {
      this._onAvatarChanged(this, avatarData);
    }
  }

  /**
   * Processes called periodically.
   *
   * @param deltaTime - THREE.Clock.getDelta()
   */
  tick(deltaTime: number) {
    this._avatar.headSync(this._adapter.getHead().rotation);

    this._avatar.tick(deltaTime);
    this._avatarIK?.tick(deltaTime);
  }
  private _setFirstPersonMode() {
    this._avatar.setFirstPersonMode(
      [this._adapter.getCamera(), this._adapter.getXRCamera()].filter(
        (v) => !!v,
      ) as THREE.Camera[],
    );
  }
  private _setupIK() {
    if (this._avatarIK) {
      this._avatarIK.dispose();
    }
    if (!this._handHolder) {
      throw new Error("handHolder is null");
    }
    const handHolder: HandHolder = this._handHolder;
    this._avatarIK = createAvatarIK(this._avatar, {
      right: () => handHolder.rightHand,
      left: () => handHolder.leftHand,
    });
  }
}
