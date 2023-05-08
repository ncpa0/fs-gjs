import Gio from "gi://Gio?version=2.0";

type PromiseApi<T> = {
  /** Resolves this promise with the given value. */
  resolve: (value: T) => void;
  /** Rejects this promise with the given reason. */
  reject: (reason?: any) => void;
  /**
   * Creates a callback function, if that function ever throws,
   * this promise will reject with the thrown error.
   */
  subCall: <F extends (...args: any[]) => any>(callback: F) => F;
  /**
   * If this operation was aborted this will throw an error,
   * stopping the execution of next operations.
   */
  breakPoint: () => void;
  /**
   * Gio cancellable object which can be passed to Gio async
   * functions.
   */
  cancellable: Gio.Cancellable | null;
};

class AbortFsError extends Error {
  constructor(public reason: any) {
    super("Operation was Aborted.");
    this.name = "AbortFsError";
  }
}

class BreakPointError extends Error {
  constructor(public msg: any) {
    super("Breakpoint was reached after operation was aborted.");
    this.name = "BreakPointError";
  }
}

export const promise = <T = void>(
  abortSignal: AbortSignal | undefined | null,
  callback: (api: PromiseApi<T>) => any
) => {
  let cancellable: Gio.Cancellable | null = null;

  if (abortSignal) {
    cancellable = Gio.Cancellable.new();
  }

  return new Promise<T>(async (resolve, reject) => {
    if (abortSignal) {
      if (abortSignal.aborted) {
        reject(new AbortFsError(abortSignal.reason));
        return;
      }

      abortSignal.addEventListener("abort", () => {
        cancellable!.cancel();
        reject(new AbortFsError(abortSignal.reason));
      });
    }

    const subCall = <F extends (...args: any[]) => any>(callback: F): F => {
      return ((...args: any[]) => {
        try {
          callback.apply(null, args);
        } catch (err) {
          reject(err);
        }
      }) as F;
    };

    const breakPoint = abortSignal
      ? () => {
          if (abortSignal.aborted) {
            throw new BreakPointError(
              "Breakpoint was reached after operation was aborted."
            );
          }
        }
      : () => {};

    try {
      await callback({
        resolve,
        reject,
        subCall,
        breakPoint,
        cancellable,
      });
    } catch (err) {
      reject(err);
    }
  });
};
