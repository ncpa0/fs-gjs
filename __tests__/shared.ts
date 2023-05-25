import { match } from "@reactgjs/gest";
import Fs, { FsError, SyncFs } from "../src";

export const encode = (str: string) => new TextEncoder().encode(str);

export const compareBytes = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};

export const matchFsError = (message: any) => {
  return match.allOf(
    {
      message,
      stack: match.type("string"),
    },
    match.instanceOf(FsError)
  );
};

export const matchMessageContaining = (...str: string[]) => {
  return match.allOf(...str.map((r) => match.stringContaining(r)));
};

export const lns = (link: string, target: string, cwd?: string) => {
  if (_CI_) {
    return new SyncFs({ cwd }).makeLink(link, target);
  } else {
    return new Fs({ cwd }).makeLink(link, target);
  }
};
