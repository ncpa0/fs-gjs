import { FsError } from "./errors";

export const parseFsError = (name: string, err: any): FsError => {
  if (err instanceof Error) {
    if (FsError.isFsError(err)) {
      err.setOriginFunctionName(name);
    } else {
      err = FsError.from(err).setOriginFunctionName(name);
    }

    return err;
  } else if (typeof err === "object") {
    const msg = err.message as string | undefined;
    const stack = err.stack as string | undefined;

    const fsError = new FsError(msg ?? "Unknown Error");
    fsError.setOriginFunctionName(name);

    if (stack) {
      fsError.stack = stack;
    }

    return fsError;
  }

  return new FsError(
    "Unknown Error (" + String(err) + ")",
  ).setOriginFunctionName(name);
};
