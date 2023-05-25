import GLib from "gi://GLib?version=2.0";
import type Gio from "gi://Gio?version=2.0";
import { FsError } from "./errors";
import type { FileCreateFlagOptions } from "./flags";
import { getCreateFileFlag } from "./flags";
import type { IOStreamType } from "./io-stream";
import { OptionsResolver } from "./option-resolver";
import { SyncFs, sync } from "./sync-fs";
import {
  OptValidators,
  validateBytes,
  validateInteger,
  validatePositiveInteger,
} from "./validators";

interface SyncIOStreamOptions extends FileCreateFlagOptions {
  cwd?: string;
  etag?: string;
  makeBackup?: boolean;
}

class SyncIOStream {
  static openFile(
    path: string,
    type: IOStreamType,
    options?: SyncIOStreamOptions
  ) {
    return sync("SyncIOStream.openFile", () => {
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

    /** Options are validated on access */
    this._options.get("cwd");
    this._options.get("etag");
    this._options.get("makeBackup");
    this._options.get("private");
    this._options.get("replace");

    this.close = sync("SyncIOStream.close", this.close.bind(this));
    this.flush = sync("SyncIOStream.flush", this.flush.bind(this));
    this.read = sync("SyncIOStream.read", this.read.bind(this));
    this.readAll = sync("SyncIOStream.readAll", this.readAll.bind(this));
    this.truncate = sync("SyncIOStream.truncate", this.truncate.bind(this));
    this.write = sync("SyncIOStream.write", this.write.bind(this));
    this.skip = sync("SyncIOStream.skip", this.skip.bind(this));
    this.seek = sync("SyncIOStream.seek", this.seek.bind(this));
    this.seekFromEnd = sync(
      "SyncIOStream.seekFromEnd",
      this.seekFromEnd.bind(this)
    );
    this.seekFromStart = sync(
      "SyncIOStream.seekFromStart",
      this.seekFromStart.bind(this)
    );
    this.currentPosition = sync(
      "SyncIOStream.currentPosition",
      this.currentPosition.bind(this)
    );
  }

  /** The underlying Gio.FileIOStream. */
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
      case "CREATE": {
        const createFlag = getCreateFileFlag(opt);

        this._stream = this.gioFile.create_readwrite(createFlag, null);
        return;
      }
      case "REPLACE": {
        const createFlag = getCreateFileFlag(opt);

        this._stream = this.gioFile.replace_readwrite(
          opt.get("etag", null),
          opt.get("makeBackup", false),
          createFlag,
          null
        );
        return;
      }
      case "OPEN": {
        this._stream = this.gioFile.open_readwrite(null);
        return;
      }
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
  /**
   * Returns the current cursor position.
   *
   * @returns The (positive or zero) offset from the beginning of
   *   the buffer, zero if the target is not seekable.
   */
  public currentPosition() {
    return this._stream!.tell();
  }
  /**
   * Moves the cursor position by the given offset, from it's
   * current position.
   *
   * @param offset The offset from the current cursor position.
   */
  public seek(offset: number) {
    this._ensureCanSeek();
    validateInteger(offset);

    const success = this._stream!.seek(offset, GLib.SeekType.CUR, null);

    if (!success) {
      throw new FsError("Failed to seek stream.");
    }
  }
  /**
   * Moves the cursor position by the given offset, from the end
   * of the stream.
   *
   * @param offset The offset from the end of the stream.
   */
  public seekFromEnd(offset: number) {
    this._ensureCanSeek();
    validateInteger(offset);

    const success = this._stream!.seek(offset, GLib.SeekType.END, null);

    if (!success) {
      throw new FsError("Failed to seek stream.");
    }
  }
  /**
   * Moves the cursor position by the given offset, from the
   * start of the stream.
   *
   * @param offset The offset from the start of the stream.
   */
  public seekFromStart(offset: number) {
    this._ensureCanSeek();
    validateInteger(offset);

    const success = this._stream!.seek(offset, GLib.SeekType.SET, null);

    if (!success) {
      throw new FsError("Failed to seek stream.");
    }
  }
  /**
   * Skips the given number of bytes, effectively moving the
   * cursor position by the given offset, from it's current
   * position.
   *
   * @param byteCount The number of bytes to be skipped.
   * @returns The number of bytes skipped.
   */
  public skip(byteCount: number) {
    validatePositiveInteger(byteCount);
    const bytesSkipped = this._stream!.input_stream.skip(byteCount, null);

    if (bytesSkipped === -1) {
      throw new FsError("Failed to skip stream.");
    }

    return bytesSkipped;
  }

  /**
   * Writes the given content to the stream at the current cursor
   * position.
   *
   * @param content Array of bytes (`Uint8Array`) that is to be
   *   written.
   */
  public write(content: Uint8Array) {
    validateBytes(content);

    if (content.byteLength === 0) {
      return;
    }

    const bytes = GLib.Bytes.new(content);
    const bytesWritten = this._stream!.output_stream.write_bytes(bytes, null);

    if (bytesWritten === -1) {
      throw new FsError("Failed to write to stream.");
    }

    return bytesWritten;
  }

  /**
   * Reads the given number of bytes starting from the current
   * cursor position.
   *
   * @param byteCount The number of bytes to read.
   * @returns Array of bytes read (`Uint8Array`)
   */
  public read(byteCount: number) {
    validatePositiveInteger(byteCount);

    const bytes = this._stream!.input_stream.read_bytes(byteCount, null);

    if (bytes == null) {
      throw new FsError("Failed to read from stream.");
    }

    return bytes.unref_to_array();
  }

  /**
   * Reads all remaining bytes from the stream.
   *
   * @param options Options for the operation.
   * @param options.chunkSize Howe many bytes to read at a time.
   */
  public readAll(options?: { chunkSize?: number }) {
    const { chunkSize = 500000 } = options ?? {};
    validatePositiveInteger(chunkSize);

    let result = new Uint8Array([]);

    while (true) {
      const nextBytes = this._stream?.input_stream.read_bytes(chunkSize, null);

      if (nextBytes == null) {
        throw new FsError("Failed to read from stream.");
      }

      const byteArray = nextBytes.unref_to_array();

      if (byteArray!.byteLength === 0) {
        break;
      } else {
        const newResult = new Uint8Array(
          result.byteLength + byteArray!.byteLength
        );
        newResult.set(result);
        newResult.set(byteArray!, result.byteLength);
        result = newResult;
      }
    }

    return result;
  }

  /**
   * Truncates the stream to the given length.
   *
   * If the stream was previously larger than `length`, the extra
   * data is discarded. If the stream was previously shorter than
   * `length`, it is extended with NUL ('\0') bytes.
   */
  public truncate(length: number) {
    this._ensureCanTruncate();
    validatePositiveInteger(length);

    const success = this._stream!.truncate(length, null);

    if (!success) {
      throw new FsError("Failed to truncate stream.");
    }
  }

  /**
   * Forces an asynchronous write of all user-space buffered
   * data.
   */
  public flush() {
    const success = this._stream!.output_stream.flush(null);

    if (!success) {
      throw new FsError("Failed to flush stream.");
    }
  }

  /** Closes the stream. */
  public close() {
    if (this._stream) {
      const success = this._stream.close(null);

      if (!success) {
        throw new FsError("Failed to close stream.");
      }

      this._state = "CLOSED";
    }
  }
}

export { SyncIOStream };
export type { SyncIOStreamOptions };
