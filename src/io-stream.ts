import { Mutex } from "@ncpa0cpl/mutex.js";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { FsError } from "./errors";
import { Fs } from "./fs";
import { OptionsResolver } from "./option-resolver";
import { promise } from "./promise";

interface IOStreamOptions {
  cwd?: string;
  fileCreateFlags?: Gio.FileCreateFlags;
  ioPriority?: number;
  etag?: string;
  make_backup?: boolean;
}

type IOStreamType = "OPEN" | "CREATE" | "REPLACE";

class IOStream {
  static async open(
    path: string,
    type: IOStreamType,
    options?: IOStreamOptions
  ) {
    return promise<IOStream>("IOStream.open", null, async (p) => {
      const file = Fs.file(path, options?.cwd);
      const stream = new IOStream(file, options);

      await stream._init(type);

      return p.resolve(stream);
    });
  }

  private _options;
  private _stream?: Gio.FileIOStream;
  private _state: "OPEN" | "CLOSED" = "OPEN";
  private _mutex = new Mutex();
  private _type!: IOStreamType;

  private constructor(private gioFile: Gio.File, options?: IOStreamOptions) {
    this._options = OptionsResolver(options);
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

  private async _init(type: IOStreamType) {
    const opt = this._options;
    this._type = type;

    switch (type) {
      case "CREATE":
        this._stream = await promise<Gio.FileIOStream>(
          "IOStream._init",
          null,
          (p) => {
            this.gioFile.create_readwrite_async(
              opt.get("fileCreateFlags", Gio.FileCreateFlags.NONE),
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p.subCall((_, result: Gio.AsyncResult) => {
                const stream = this.gioFile.create_readwrite_finish(result);
                p.resolve(stream);
              })
            );
          }
        );
        break;
      case "REPLACE":
        this._stream = await promise<Gio.FileIOStream>(
          "IOStream._init",
          null,
          (p) => {
            this.gioFile.replace_readwrite_async(
              opt.get("etag", null),
              opt.get("make_backup", false),
              opt.get("fileCreateFlags", Gio.FileCreateFlags.NONE),
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p.subCall((_, result: Gio.AsyncResult) => {
                const stream = this.gioFile.replace_readwrite_finish(result);
                p.resolve(stream);
              })
            );
          }
        );
        break;
      case "OPEN":
        this._stream = await promise<Gio.FileIOStream>(
          "IOStream._init",
          null,
          (p) => {
            this.gioFile.open_readwrite_async(
              opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
              null,
              p.subCall((_, result: Gio.AsyncResult) => {
                const stream = this.gioFile.open_readwrite_finish(result);
                p.resolve(stream);
              })
            );
          }
        );
        break;
    }
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

  public async seek(offset: number) {
    this._ensureCanSeek();

    await this._mutex.acquire();

    try {
      this._stream!.seek(offset, GLib.SeekType.CUR, null);
    } finally {
      this._mutex.release();
    }
  }

  public async seekFromEnd(offset: number) {
    this._ensureCanSeek();

    await this._mutex.acquire();

    try {
      this._stream!.seek(offset, GLib.SeekType.END, null);
    } finally {
      this._mutex.release();
    }
  }

  public async seekFromStart(offset: number) {
    this._ensureCanSeek();

    await this._mutex.acquire();

    try {
      this._stream!.seek(offset, GLib.SeekType.SET, null);
    } finally {
      this._mutex.release();
    }
  }

  public async write(content: Uint8Array) {
    await this._mutex.acquire();

    try {
      const opt = this._options;

      return await promise("IOStream.write", null, (p) => {
        this._stream!.output_stream.write_bytes_async(
          GLib.Bytes.new(content),
          opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
          null,
          p.subCall((_, result: Gio.AsyncResult) => {
            const bytesWritten =
              this._stream!.output_stream.write_bytes_finish(result);

            if (bytesWritten === -1) {
              p.reject(new FsError("Failed to write to stream."));
            } else {
              p.resolve();
            }
          })
        );
      });
    } finally {
      this._mutex.release();
    }
  }

  public async flush() {
    await this._mutex.acquire();

    try {
      const opt = this._options;

      return await promise("IOStream.flush", null, (p) => {
        this._stream!.output_stream.flush_async(
          opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
          null,
          p.subCall((_, result: Gio.AsyncResult) => {
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
  }

  public async read(byteCount: number) {
    await this._mutex.acquire();

    try {
      const opt = this._options;

      return await promise<Uint8Array>("IOStream.read", null, (p) => {
        this._stream!.input_stream.read_bytes_async(
          byteCount,
          opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
          null,
          p.subCall((_, result: Gio.AsyncResult) => {
            const bytes = this._stream!.input_stream.read_bytes_finish(result);
            const bytesArray = bytes.unref_to_array();
            p.resolve(bytesArray);
          })
        );
      });
    } finally {
      this._mutex.release();
    }
  }

  public async truncate(length: number) {
    this._ensureCanTruncate();

    await this._mutex.acquire();

    try {
      this._stream!.truncate(length, null);
    } finally {
      this._mutex.release();
    }
  }

  public async close() {
    if (this._stream) {
      const opt = this._options;

      await this._mutex.acquire();

      try {
        return await promise("IOStream.close", null, (p) => {
          this._stream!.close_async(
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            null,
            p.subCall((_, result: Gio.AsyncResult) => {
              const success = this._stream!.close_finish(result);
              if (success) {
                this._state = "CLOSED";
                p.resolve();
              } else {
                p.reject(new FsError("Failed to close stream."));
              }
            })
          );
        });
      } finally {
        this._mutex.release();
      }
    }
  }
}

export { IOStream };
export type { IOStreamOptions, IOStreamType };
