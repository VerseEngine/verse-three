export { isIOS, isTouchDevice } from "@verseengine/three-avatar";

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export function isEqualsArray<T>(v0: T[], v1: T[]) {
  if (!v0 && !v1) {
    return true;
  }
  if ((v0 && !v1) || (!v0 && v1)) {
    return false;
  }
  if (v0.length !== v1.length) {
    return false;
  }
  return v0.every((el, i) => el === v1[i]);
}

export function isEqualsVector3(
  v0: Vector3 | undefined,
  v1: Vector3 | undefined
) {
  if (!v0) {
    if (!v1) {
      return true;
    }
    return false;
  } else if (!v1) {
    return false;
  }
  return v0.x === v1.x && v0.y === v1.y && v0.z === v1.z;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpError extends Error {
  isHttpError: boolean;
  httpStatus: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(status: number, ...params: any[]) {
    super(...params);
    this.name = "HttpError";
    this.isHttpError = true;
    this.httpStatus = status;
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetry?: number
): Promise<Response> {
  let retry = 0;
  for (;;) {
    if (retry !== 0) {
      await sleep(Math.min(500 * retry, 5000));
    }
    const res = await fetch(input, init);
    if (!res.ok) {
      if (500 <= res.status) {
        if (!maxRetry || retry < maxRetry) {
          retry++;
          continue;
        }
      }
      throw new HttpError(res.status);
    }
    return res;
  }
}
