import { Mutex } from "@ncpa0cpl/mutex.js";
import GLib from "gi://GLib?version=2.0";
import type Gio from "gi://Gio?version=2.0";
import { FsError } from "./errors";
import type { FileCreateFlagOptions } from "./flags";
import { getCreateFileFlag } from "./flags";
import { Fs } from "./fs";
import { OptionsResolver } from "./option-resolver";
import { promise } from "./promise";
import {
  OptValidators,
  validateBytes,
  validateInteger,
  validatePositiveInteger,
} from "./validators";

interface IOStreamOptions extends FileCreateFlagOptions {
  cwd?: string;
  ioPriority?: number;
  etag?: string;
  makeBackup?: boolean;
}

type IOStreamType = "OPEN" | "CREATE" | "REPLACE";

class IOStream {
  static async openFile(
    path: string,
    type: IOStreamType,
    options?: IOStreamOptions
  ) {
    return promise<IOStream>("IOStream.openFile", null, async (p) => {
      const file = Fs.file(path, options?.cwd);
      const stream = new IOStream(file, options);

      await stream._initFile(type);

      return p.resolve(stream);
    });
  }

  private _options;
  private _stream?: Gio.FileIOStream;
  private _state: "OPEN" | "CLOSED" = "OPEN";
  private _mutex = new Mutex();
  private _type!: IOStreamType;

  private constructor(private gioFile: Gio.File, options?: IOStreamOptions) {
    this._options = OptionsResolver(options, OptValidators);

    /** Options are validated on access */
    this._options.get("cwd");
    this._options.get("etag");
    this._options.get("ioPriority");
    this._options.get("makeBackup");
    this._options.get("private");
    this._options.get("replace");
  }

  public get _gioStream() {
    return this._stream!;
  }

  public get state() {
    return this._state;
  }

  public get etag() {
    return this._stream?.get_etag();
  }

  public get type() {
    return this._type;
  }

  /**
   * Whether the Output Stream is currently in the process of
   * closing.
   */
  public get isClosing() {
    return this._stream?.output_stream.is_closing();
  }

  private async _initFile(type: IOStreamType) {
    const opt = this._options;
    this._type = type;

    switch (type) {
      case "CREATE":
        this._stream = await promise<Gio.FileIOStream>(
          "IOStream._initFile",
          null,
          (p) => {
            const createFlag = getCreateFileFlag(opt);

            this.gioFile.create_readwrite_async(
              createFlag,
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p.asyncCallback((_, result: Gio.AsyncResult) => {
                const stream = this.gioFile.create_readwrite_finish(result);

                if (!stream) {
                  p.reject(new FsError("Failed to create a new stream."));
                } else {
                  p.resolve(stream);
                }
              })
            );
          }
        );
        return;
      case "REPLACE":
        this._stream = await promise<Gio.FileIOStream>(
          "IOStream._initFile",
          null,
          (p) => {
            const createFlag = getCreateFileFlag(opt);

            this.gioFile.replace_readwrite_async(
              opt.get("etag", null),
              opt.get("makeBackup", false),
              createFlag,
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p.asyncCallback((_, result: Gio.AsyncResult) => {
                const stream = this.gioFile.replace_readwrite_finish(result);

                if (!stream) {
                  p.reject(new FsError("Failed to replace a new stream."));
                } else {
                  p.resolve(stream);
                }
              })
            );
          }
        );
        return;
      case "OPEN":
        this._stream = await promise<Gio.FileIOStream>(
          "IOStream._initFile",
          null,
          (p) => {
            this.gioFile.open_readwrite_async(
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p.asyncCallback((_, result: Gio.AsyncResult) => {
                const stream = this.gioFile.open_readwrite_finish(result);

                if (!stream) {
                  p.reject(new FsError("Failed to open a new stream."));
                } else {
                  p.resolve(stream);
                }
              })
            );
          }
        );
        return;
    }

    throw new FsError("Invalid IOStream type.");
  }

  private _ensureCanSeek() {
    if (!this._stream!.can_seek()) {
      throw new FsError("Stream cannot seek.");
    }
  }

  private _ensureCanTruncate() {
    if (!this._stream!.can_truncate()) {
      throw new FsError("Stream cannot truncate.");
    }
  }

  public async currentPosition() {
    return await promise<number>(
      "IOStream.currentPosition",
      null,
      async (p) => {
        await this._mutex.acquire();

        try {
          return p.resolve(this._stream!.tell());
        } finally {
          this._mutex.release();
        }
      }
    );
  }

  public async seek(offset: number) {
    return await promise("IOStream.seek", null, async (p) => {
      validateInteger(offset);

      await this._mutex.acquire();
      this._ensureCanSeek();

      try {
        const success = this._stream!.seek(offset, GLib.SeekType.CUR, null);

        if (!success) {
          throw new FsError("Failed to seek stream.");
        }
      } finally {
        this._mutex.release();
      }

      p.resolve();
    });
  }

  public async seekFromEnd(offset: number) {
    return await promise("IOStream.seekFromEnd", null, async (p) => {
      validateInteger(offset);

      await this._mutex.acquire();
      this._ensureCanSeek();

      try {
        const success = this._stream!.seek(offset, GLib.SeekType.END, null);

        if (!success) {
          throw new FsError("Failed to seek stream.");
        }
      } finally {
        this._mutex.release();
      }

      p.resolve();
    });
  }

  public async seekFromStart(offset: number) {
    return await promise("IOStream.seekFromStart", null, async (p) => {
      validateInteger(offset);

      await this._mutex.acquire();
      this._ensureCanSeek();

      try {
        const success = this._stream!.seek(offset, GLib.SeekType.SET, null);

        if (!success) {
          throw new FsError("Failed to seek stream.");
        }
      } finally {
        this._mutex.release();
      }

      p.resolve();
    });
  }

  public async skip(offset: number) {
    return await promise<number>("IOStream.skip", null, async (p) => {
      validatePositiveInteger(offset);

      await this._mutex.acquire();

      let bytesSkipped;

      try {
        bytesSkipped = await promise<number>("IOStream.skip", null, (p2) => {
          this._stream!.input_stream.skip_async(
            offset,
            this._options.get("ioPriority", GLib.PRIORITY_DEFAULT),
            null,
            p2.asyncCallback((_, result: Gio.AsyncResult) => {
              const bytesSkipped =
                this._stream!.input_stream.skip_finish(result);

              if (bytesSkipped === -1) {
                p2.reject(new FsError("Failed to skip bytes."));
              } else {
                p2.resolve(bytesSkipped);
              }
            })
          );
        });
      } finally {
        this._mutex.release();
      }

      p.resolve(bytesSkipped);
    });
  }

  public async write(content: Uint8Array) {
    return await promise<number>("IOStream.write", null, async (p) => {
      validateBytes(content);

      if (content.byteLength === 0) {
        return p.resolve(0); // Nothing to write.
      }

      await this._mutex.acquire();

      let bytesWritten: number;

      try {
        const opt = this._options;

        bytesWritten = await promise<number>("IOStream.write", null, (p2) => {
          const bytes = GLib.Bytes.new(content);
          this._stream!.output_stream.write_bytes_async(
            bytes,
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            null,
            p2.asyncCallback((_, result: Gio.AsyncResult) => {
              const bytesWritten =
                this._stream!.output_stream.write_bytes_finish(result);

              if (bytesWritten === -1) {
                p2.reject(new FsError("Failed to write to stream."));
              } else {
                p2.resolve(bytesWritten);
              }
            })
          );
        });
      } finally {
        this._mutex.release();
      }

      p.resolve(bytesWritten);
    });
  }

  public async read(byteCount: number) {
    return await promise<Uint8Array>("IOStream.read", null, async (p) => {
      validatePositiveInteger(byteCount);

      await this._mutex.acquire();

      let bytes: Uint8Array;

      try {
        const opt = this._options;

        bytes = await promise<Uint8Array>("IOStream.read", null, (p2) => {
          this._stream!.input_stream.read_bytes_async(
            byteCount,
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            null,
            p2.asyncCallback((_, result: Gio.AsyncResult) => {
              const bytes =
                this._stream!.input_stream.read_bytes_finish(result);

              if (bytes != null) {
                p2.resolve(bytes.unref_to_array());
              } else {
                p2.reject(new FsError("Failed to read from stream."));
              }
            })
          );
        });
      } finally {
        this._mutex.release();
      }

      p.resolve(bytes);
    });
  }

  public async readAll(options?: { chunkSize?: number }) {
    return await promise<Uint8Array>("IOStream.readAll", null, async (p) => {
      const { chunkSize = 500000 } = options ?? {};
      validatePositiveInteger(chunkSize);

      await this._mutex.acquire();

      let bytes: Uint8Array;

      try {
        const opt = this._options;

        bytes = await promise<Uint8Array>(
          "IOStream.readAll",
          null,
          async (p2) => {
            let result = new Uint8Array([]);

            while (true) {
              const nextBytes = await promise<Uint8Array>(
                "IOStream.readAll",
                null,
                (p3) => {
                  this._stream!.input_stream.read_bytes_async(
                    chunkSize,
                    opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
                    null,
                    p3.asyncCallback((_, result: Gio.AsyncResult) => {
                      const bytes =
                        this._stream!.input_stream.read_bytes_finish(result);

                      if (bytes != null) {
                        p3.resolve(bytes.unref_to_array());
                      } else {
                        p3.reject(new FsError("Failed to read from stream."));
                      }
                    })
                  );
                }
              );

              if (nextBytes.byteLength === 0) {
                break;
              } else {
                const newResult = new Uint8Array(
                  result.byteLength + nextBytes.byteLength
                );
                newResult.set(result);
                newResult.set(nextBytes, result.byteLength);
                result = newResult;
              }
            }

            p2.resolve(result);
          }
        );
      } finally {
        this._mutex.release();
      }

      p.resolve(bytes);
    });
  }

  public async truncate(length: number) {
    return await promise("IOStream.truncate", null, async (p) => {
      this._ensureCanTruncate();
      validatePositiveInteger(length);

      await this._mutex.acquire();

      try {
        const success = this._stream!.truncate(length, null);

        if (!success) {
          throw new FsError("Failed to truncate stream.");
        }
      } finally {
        this._mutex.release();
      }

      p.resolve();
    });
  }

  /**
   * Returns a promise that resolves once all currently pending
   * operations have finished.
   *
   * @example
   *   stream.write("Hello");
   *   stream.write("World");
   *   stream.write("!");
   *   await stream.finishPending(); // Waits for all above writes to finish.
   */
  public async finishPending() {
    return await promise("IOStream.finishPending", null, async (p) => {
      await this._mutex.acquire();
      this._mutex.release();
      p.resolve();
    });
  }

  public async flush() {
    return await promise("IOStream.flush", null, async (p) => {
      await this._mutex.acquire();

      try {
        const opt = this._options;

        await promise("IOStream.flush", null, (p) => {
          this._stream!.output_stream.flush_async(
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            null,
            p.asyncCallback((_, result: Gio.AsyncResult) => {
              const success = this._stream!.output_stream.flush_finish(result);

              if (success) {
                p.resolve();
              } else {
                p.reject(new FsError("Failed to flush stream."));
              }
            })
          );
        });
      } finally {
        this._mutex.release();
      }

      p.resolve();
    });
  }

  public async close() {
    if (this._stream) {
      return await promise("IOStream.close", null, async (p) => {
        const opt = this._options;

        await this._mutex.acquire();

        try {
          await promise("IOStream.close", null, (p2) => {
            this._stream!.close_async(
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p2.asyncCallback((_, result: Gio.AsyncResult) => {
                const success = this._stream!.close_finish(result);

                if (success) {
                  this._state = "CLOSED";
                  p2.resolve();
                } else {
                  p2.reject(new FsError("Failed to close stream."));
                }
              })
            );
          });
        } finally {
          this._mutex.release();
        }

        p.resolve();
      });
    }
  }
}

export { IOStream };
export type { IOStreamOptions, IOStreamType };
