import { encode, decode } from "@msgpack/msgpack";
import { Player } from "./player";
import { OtherPerson } from "./other-person";

type SerializeData = {
  hasBoneData: boolean;
  bones?: number[];
};

export function serializeFrom(player: Player, isEmpty?: boolean): Uint8Array {
  const data: SerializeData = {
    hasBoneData: !isEmpty,
  };
  if (data.hasBoneData) {
    data.bones = player.avatar.getSyncBonesData();
  }
  return encode(data);
}

export function deserializeTo(data: Uint8Array, op: OtherPerson) {
  const obj = decode(data) as SerializeData;
  if (obj.hasBoneData && obj.bones) {
    op.onSyncBonesData(obj.bones);
  } else {
    op.onSyncBonesData();
  }
}
