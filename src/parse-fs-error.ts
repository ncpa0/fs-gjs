import Gio from "gi://Gio?version=2.0";
import { FsError } from "./errors";

declare class GioIOError {
  message?: string;
  stack?: string;
}

export const parseFsError = (name: string, err: any): FsError => {
  if (err instanceof Error) {
    if (!FsError.isFsError(err)) {
      err = FsError.from(err);
    }
    err.addMessagePrefix(`'${name}' has failed`);

    return err;
  } else if (typeof err === "object") {
    if (err instanceof (Gio.IOErrorEnum as any as typeof GioIOError)) {
      const msg = err.message;
      const stack = err.stack;

      err = new FsError(msg ?? "");
      err.stack = stack;

      err.addMessagePrefix(`'${name}' has failed`);

      return err;
    } else if (err.stack) {
      const stack = err.stack;
      err = new FsError(
        `'${name}' has failed due to an error.\n` + String(err)
      );
      err.stack = stack;

      return err;
    }
  }
  return new FsError(
    `'${name}' has failed due to an unknown error.\n` + String(err)
  );
};
