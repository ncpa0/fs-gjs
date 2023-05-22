import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { FsError } from "./errors";
import type { IOStreamType } from "./io-stream";
import { OptionsResolver } from "./option-resolver";
import { OptValidators } from "./option-validators";
import { SyncFs, sync } from "./sync-fs";

interface SyncIOStreamOptions {
  cwd?: string;
  fileCreateFlags?: Gio.FileCreateFlags;
  etag?: string;
  make_backup?: boolean;
}

class SyncIOStream {
  static openFile(
    path: string,
    type: IOStreamType,
    options?: SyncIOStreamOptions
  ) {
    return sync("SyncIOStream.open", () => {
      const file = SyncFs.file(path, options?.cwd);
      const stream = new SyncIOStream(file, options);

      stream._initFile(type);

      return stream;
    })();
  }

  private _options;
  private _stream?: Gio.FileIOStream;
  private _state: "OPEN" | "CLOSED" = "OPEN";
  private _type!: IOStreamType;

  private constructor(
    private gioFile: Gio.File,
    options?: SyncIOStreamOptions
  ) {
    this._options = OptionsResolver(options, OptValidators);

    this.close = sync("SyncIOStream.close", this.close.bind(this));
    this.flush = sync("SyncIOStream.flush", this.flush.bind(this));
    this.read = sync("SyncIOStream.read", this.read.bind(this));
    this.truncate = sync("SyncIOStream.truncate", this.truncate.bind(this));
    this.write = sync("SyncIOStream.write", this.write.bind(this));
    this.seek = sync("SyncIOStream.seek", this.seek.bind(this));
    this.seekFromEnd = sync(
      "SyncIOStream.seekFromEnd",
      this.seekFromEnd.bind(this)
    );
    this.seekFromStart = sync(
      "SyncIOStream.seekFromStart",
      this.seekFromStart.bind(this)
    );
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

  /**
   * Whether the Output Stream is currently in the process of
   * closing.
   */
  public get isClosing() {
    return this._stream?.output_stream.is_closing();
  }

  public get type() {
    return this._type;
  }

  private _initFile(type: IOStreamType) {
    const opt = this._options;
    this._type = type;

    switch (type) {
      case "CREATE":
        this._stream = this.gioFile.create_readwrite(
          opt.get("fileCreateFlags", Gio.FileCreateFlags.NONE),
          null
        );
        break;
      case "REPLACE":
        this._stream = this.gioFile.replace_readwrite(
          opt.get("etag", null),
          opt.get("make_backup", false),
          opt.get("fileCreateFlags", Gio.FileCreateFlags.NONE),
          null
        );
        break;
      case "OPEN":
        this._stream = this.gioFile.open_readwrite(null);
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

  public currentPosition() {
    return this._stream!.tell();
  }

  public seek(offset: number) {
    this._ensureCanSeek();

    this._stream!.seek(offset, GLib.SeekType.CUR, null);
  }

  public seekFromEnd(offset: number) {
    this._ensureCanSeek();

    this._stream!.seek(offset, GLib.SeekType.END, null);
  }

  public seekFromStart(offset: number) {
    this._ensureCanSeek();

    this._stream!.seek(offset, GLib.SeekType.SET, null);
  }

  public skip(offset: number) {
    this._stream!.input_stream.skip(offset, null);
  }

  public write(content: Uint8Array) {
    if (content.byteLength === 0) {
      return;
    }

    const bytesWritten = this._stream!.output_stream.write_bytes(
      GLib.Bytes.new(content),
      null
    );

    if (bytesWritten === -1) {
      throw new FsError("Failed to append to stream.");
    }
  }

  public read(byteCount: number) {
    const bytes = this._stream!.input_stream.read_bytes(byteCount, null);
    return bytes.unref_to_array();
  }

  public readAll(options?: { chunkSize?: number }) {
    const { chunkSize = 500000 } = options ?? {};
    let result = new Uint8Array([]);

    while (true) {
      const nextBytes = this._stream?.input_stream
        .read_bytes(chunkSize, null)
        .unref_to_array();

      if (nextBytes!.byteLength === 0) {
        break;
      } else {
        const newResult = new Uint8Array(
          result.byteLength + nextBytes!.byteLength
        );
        newResult.set(result);
        newResult.set(nextBytes!, result.byteLength);
        result = newResult;
      }
    }

    return result;
  }

  public truncate(length: number) {
    this._ensureCanTruncate();

    this._stream!.truncate(length, null);
  }

  public flush() {
    const success = this._stream!.output_stream.flush(null);

    if (!success) {
      throw new FsError("Failed to flush stream.");
    }
  }

  public close() {
    if (this._stream) {
      this._stream.close(null);
      this._state = "CLOSED";
    }
  }
}

export { SyncIOStream };
export type { SyncIOStreamOptions };
