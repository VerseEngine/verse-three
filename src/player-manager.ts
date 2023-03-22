import { Player } from "./player";
import type { EnvAdapter } from "./env-adapter";
import { loadAvatarData, storeAvatarData, deleteAvatarData } from "./db";
import type { HandHolder } from "@verseengine/three-xr-controller";

export class PlayerManager {
  private _player?: Player;
  private _adapter: EnvAdapter;
  private _defaultAvatarURL: string;

  constructor(adapter: EnvAdapter, defaultAvatarURL: string) {
    this._adapter = adapter;
    this._defaultAvatarURL = defaultAvatarURL;
  }
  async createPlayer(handHolder?: HandHolder): Promise<Player> {
    const avatarData = await loadAvatarData();

    let avatarURL: string | undefined;
    if (!avatarURL) {
      avatarURL = localStorage.avatarURL;
    }
    if (!avatarURL && !avatarData) {
      avatarURL = this._defaultAvatarURL;
    }

    let player;
    try {
      player = await Player.create(
        avatarURL,
        avatarData,
        this._adapter,
        this._onAvatarChanged.bind(this),
        handHolder
      );
    } catch (ex) {
      console.warn("failed create player", ex);
      player = await Player.create(
        this._defaultAvatarURL,
        undefined,
        this._adapter,
        this._onAvatarChanged.bind(this),
        handHolder
      );
    }

    this._player = player;
    return player;
  }
  async _onAvatarChanged(player: Player, avatarData: ArrayBuffer) {
    const avatarURL = player.avatarURL;
    if (avatarURL) {
      localStorage.avatarURL = new URL(avatarURL, location.href).toString();
      deleteAvatarData();
    } else {
      delete localStorage.avatarURL;
      storeAvatarData(avatarData);
    }
    this._adapter.onAvatarChanged(player.avatar);
  }
}
