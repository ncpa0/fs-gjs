import Gio from "gi://Gio?version=2.0";
import { FsError } from "./errors";
import { parseFsError } from "./parse-fs-error";

type PromiseApi<T> = {
  /**
   * Resolves this promise with the given value.
   */
  resolve: (value: T) => void;
  /**
   * Rejects this promise with the given reason.
   */
  reject: (reason?: any) => void;
  /**
   * Creates a callback function, if that function ever throws, this
   * promise will reject with the thrown error.
   */
  asyncCallback: <F extends (...args: any[]) => any>(
    callback: F,
  ) => F;
  /**
   * If this operation was aborted this will throw an error, stopping
   * the execution of next operations.
   */
  breakpoint: () => void;
  /**
   * Gio cancellable object which can be passed to Gio async
   * functions.
   */
  cancellable: Gio.Cancellable | null;
};

class AbortFsError extends FsError {
  constructor(public reason: any) {
    super("Operation was Aborted.");
    this.name = "AbortFsError";
  }
}

class BreakPointError extends FsError {
  static isBreakPointError(err: any): err is BreakPointError {
    return (
      !!err &&
      typeof err === "object" &&
      err instanceof BreakPointError
    );
  }

  constructor(public msg: any) {
    super("Breakpoint was reached after operation was aborted.");
    this.name = "BreakPointError";
  }
}

export const promise = <T = void>(
  name: string,
  abortSignal: AbortSignal | undefined | null,
  callback: (api: PromiseApi<T>) => any,
) => {
  let cancellable: Gio.Cancellable | null = null;

  if (abortSignal) {
    cancellable = Gio.Cancellable.new();
  }

  return new Promise<T>(async (resolve, reject) => {
    let isAborted = false;

    if (abortSignal) {
      if (abortSignal.aborted) {
        reject(new AbortFsError(abortSignal.reason));
        return;
      }

      abortSignal.addEventListener("abort", () => {
        isAborted = true;
        cancellable!.cancel();
        reject(new AbortFsError(abortSignal.reason));
      });
    }

    const asyncCallback = <F extends (...args: any[]) => any>(
      callback: F,
    ): F => {
      return ((...args: any[]) => {
        try {
          const r = callback.apply(null, args);
          if (r && r instanceof Promise) {
            r.catch((err) => {
              if (BreakPointError.isBreakPointError(err)) {
                return;
              }
              reject(parseFsError(name, err));
            });
          }
        } catch (err) {
          if (BreakPointError.isBreakPointError(err)) {
            return;
          }
          reject(parseFsError(name, err));
        }
      }) as F;
    };

    const breakpoint = abortSignal
      ? () => {
          if (isAborted) {
            throw new BreakPointError(
              "Breakpoint was reached after operation was aborted.",
            );
          }
        }
      : () => {};

    try {
      await callback({
        resolve,
        reject: (e) => reject(parseFsError(name, e)),
        asyncCallback,
        breakpoint,
        cancellable,
      });
    } catch (err) {
      if (BreakPointError.isBreakPointError(err)) {
        return;
      }
      reject(parseFsError(name, err));
    }
  });
};
