type TEXTS_T = typeof DEFAULT_TEXTS;
export type TEXTS_KEY = keyof typeof DEFAULT_TEXTS;

export class Texts {
  _data: TEXTS_T;

  constructor(lang?: string | null) {
    this._data = getTexts(lang);
  }
  getRaw(key: TEXTS_KEY): string {
    return this._data[key] || "";
  }
  get(key: TEXTS_KEY): string {
    return escapeText(this._data[key] || "");
  }
  getAttr(key: TEXTS_KEY): string {
    return escapeText(this._data[key] || "");
  }
}

export const escapeText = (s: string) => {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
};

export function getTexts(lang?: string | null): TEXTS_T {
  if (!lang) {
    lang = window.navigator.language;
  }
  const ar = lang.split(/[-_]/);
  lang = ar[0];
  const res = TEXTS[lang];
  if (res) {
    return res;
  }

  return TEXTS.default;
}

const DEFAULT_TEXTS = {
  ios_voice_access_hint:
    "On iOS, you must allow access to the microphone for voice playback.",
  file_size_exceeded: "File size exceeded. \n(Maximum size: {})",
};

export const TEXTS: { [key: string]: TEXTS_T } = {
  default: DEFAULT_TEXTS,
  ja: {
    ios_voice_access_hint:
      "iOSでは、ボイス再生のためにマイクへのアクセスを許可する必要があります",
    file_size_exceeded: "ファイルサイズがオーバーしました. \n(最大サイズ: {})",
  },
  zh: {
    ios_voice_access_hint: "在iOS系统中，必须允许对麦克风的访问以进行音频播放",
    file_size_exceeded: "文件大小超过了。\n(最大尺寸：{})",
  },
};
