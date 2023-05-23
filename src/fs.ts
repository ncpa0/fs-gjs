import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import type { Encoding } from "./encoding";
import { FsError } from "./errors";
import { FileInfo, getAttributes } from "./file-info";
import type {
  FileCopyFlagOptions,
  FileCreateFlagOptions,
  FileQueryFlagOptions,
} from "./flags";
import { getCopyFileFlag, getCreateFileFlag, getQueryFileFlag } from "./flags";
import type { IOStreamOptions, IOStreamType } from "./io-stream";
import { IOStream } from "./io-stream";
import { OptionsResolver } from "./option-resolver";
import { isAbsolute, join } from "./path";
import type { FilePermission } from "./permission-parser";
import { parseFilePermission } from "./permission-parser";
import { promise } from "./promise";
import { SyncFs, sync } from "./sync-fs";
import {
  OptValidators,
  validateBytes,
  validateNumber,
  validateText,
} from "./validators";

type Tail<T extends any[]> = T extends [any, ...infer U] ? U : [];

type Mixin<T extends any[]> = T["length"] extends 0
  ? {}
  : Mixin<Tail<T>> & T[0];

interface FsOperationOptions {
  abortSignal?: AbortSignal;
}

interface ListFilenamesOptions
  extends Mixin<[FsOperationOptions, FileQueryFlagOptions]> {
  ioPriority?: number;
  batchSize?: number;
}

interface ListDirOptions extends Mixin<[ListFilenamesOptions]> {
  attributes?: string[];
}

interface FileInfoOptions
  extends Mixin<[FsOperationOptions, FileQueryFlagOptions]> {
  attributes?: string[];
  ioPriority?: number;
}

interface FileExistsOptions
  extends Mixin<[FsOperationOptions, FileQueryFlagOptions]> {
  ioPriority?: number;
}

interface ReadFileOptions extends Mixin<[FsOperationOptions]> {}

interface ReadTextFileOptions extends Mixin<[ReadFileOptions]> {
  encoding?: Encoding;
}

interface WriteFileOptions
  extends Mixin<[FsOperationOptions, FileCreateFlagOptions]> {
  ioPriority?: number;
  etag?: string;
  makeBackup?: boolean;
}

interface AppendFileOptions
  extends Mixin<[WriteFileOptions, FileCreateFlagOptions]> {
  ioPriority?: number;
}

interface AppendTextFileOptions extends Mixin<[AppendFileOptions]> {}

interface WriteTextFileOptions extends Mixin<[WriteFileOptions]> {}

interface MoveFileOptions
  extends Mixin<[FsOperationOptions, FileCopyFlagOptions]> {
  ioPriority?: number;
  onProgress?: (current_num_bytes: number, total_num_bytes: number) => void;
}

interface CopyFileOptions
  extends Mixin<[MoveFileOptions, FileCopyFlagOptions]> {
  ioPriority?: number;
  onProgress?: (current_num_bytes: number, total_num_bytes: number) => void;
}

interface DeleteFileOptions extends Mixin<[FileInfoOptions, ListDirOptions]> {
  trash?: boolean;
  ioPriority?: number;
  recursive?: boolean;
}

interface MakeDirOptions extends Mixin<[FsOperationOptions]> {
  ioPriority?: number;
}

interface MakeLinkOptions extends Mixin<[FsOperationOptions]> {
  ioPriority?: number;
}

interface ChmodOptions
  extends Mixin<[FsOperationOptions, FileQueryFlagOptions]> {
  ioPriority?: number;
}

interface ChownOptions
  extends Mixin<[FsOperationOptions, FileQueryFlagOptions]> {
  ioPriority?: number;
}

interface FsOptions {
  cwd?: string;
}

const DEFAULT_BATCH_SIZE = 16;

class Fs {
  // #region Static

  static get sync() {
    return SyncFs;
  }

  private static globalInstance = new Fs();

  /** Creates a new Gio.File instance for the given path. */
  public static file(path: string, cwd?: string) {
    return Fs.globalInstance.file(path, cwd);
  }

  /** Checks if a file or directory exists. */
  public static fileExists(path: string, options?: FileExistsOptions) {
    return Fs.globalInstance.fileExists(path, options);
  }

  /** Lists all the contents of a directory. */
  public static listDir(path: string, options?: ListDirOptions) {
    return Fs.globalInstance.listDir(path, options);
  }

  /** Lists all the contents of a directory as file names. */
  public static listFilenames(path: string, options?: ListFilenamesOptions) {
    return Fs.globalInstance.listFilenames(path, options);
  }

  /** Gets information about a specific file or directory. */
  public static fileInfo(path: string, options?: FileInfoOptions) {
    return Fs.globalInstance.fileInfo(path, options);
  }

  /**
   * Reads the content of a file under the given path.
   *
   * @returns A Promise with a byte array of the contents.
   */
  public static readFile(path: string, options?: ReadFileOptions) {
    return Fs.globalInstance.readFile(path, options);
  }

  /**
   * Reads the content of a file under the given path using the
   * `readFile()` method and decodes that content to string using
   * the given encoding.
   */
  public static readTextFile(path: string, options?: ReadTextFileOptions) {
    return Fs.globalInstance.readTextFile(path, options);
  }

  /** Writes the given data to a file under the given path. */
  public static writeFile(
    path: string,
    data: Uint8Array,
    options?: WriteFileOptions
  ) {
    return Fs.globalInstance.writeFile(path, data, options);
  }

  /**
   * Encodes given string into a byte array (UTF-8), and writes
   * that data to a file under the given path using the
   * `writeFile()` method.
   */
  public static writeTextFile(
    path: string,
    data: string,
    options?: WriteTextFileOptions
  ) {
    return Fs.globalInstance.writeTextFile(path, data, options);
  }

  /** Appends the given data to a file under the given path. */
  public static appendFile(
    path: string,
    data: Uint8Array,
    options?: AppendFileOptions
  ) {
    return Fs.globalInstance.appendFile(path, data, options);
  }

  /**
   * Encodes given string into a byte array (UTF-8), and appends
   * that data to a file under the given path using the
   * `appendFile()` method.
   */
  public static appendTextFile(
    path: string,
    data: string,
    options?: AppendTextFileOptions
  ) {
    return Fs.globalInstance.appendTextFile(path, data, options);
  }

  /** Moves a file or directory from one path to another. */
  public static moveFile(
    source: string,
    destination: string,
    options?: MoveFileOptions
  ) {
    return Fs.globalInstance.moveFile(source, destination, options);
  }

  /** Alias for the `moveFile()` method. */
  public static renameFile(
    source: string,
    destination: string,
    options?: MoveFileOptions
  ) {
    return Fs.globalInstance.renameFile(source, destination, options);
  }

  /** Copies a file or directory from one path to another. */
  public static copyFile(
    source: string,
    destination: string,
    options?: CopyFileOptions
  ) {
    return Fs.globalInstance.copyFile(source, destination, options);
  }

  /**
   * Deletes a file or directory from under the given path.
   *
   * If `trash` is set to `true`, the file will be moved to the
   * user's trash directory instead of being deleted.
   */
  public static deleteFile(path: string, options?: DeleteFileOptions) {
    return Fs.globalInstance.deleteFile(path, options);
  }

  /** Creates a new directory under the given path. */
  public static makeDir(path: string, options?: MakeDirOptions) {
    return Fs.globalInstance.makeDir(path, options);
  }

  /**
   * Creates a symbolic link file undef the path given in the
   * first parameter, created link will point to a file or
   * directory that's provided as the second parameter.
   *
   * @param linkPath The path to the new link file.
   * @param pointingTo Link destination file.
   * @param option Options for the operation.
   */
  public static makeLink(
    linkPath: string,
    pointingTo: string,
    options?: MakeLinkOptions
  ) {
    return Fs.globalInstance.makeLink(linkPath, pointingTo, options);
  }

  /**
   * Changes the UNIX permissions of a file or directory.
   *
   * The provided mode can be either:
   *
   * - A number representing the octal value of the permissions
   *   (ex. `0o755`)
   * - A string in the rwx format (ex. `rwxrw-r--`)
   * - An object describing all the permissions
   */
  public static chmod(
    path: string,
    mode: FilePermission,
    options?: ChmodOptions
  ) {
    return Fs.globalInstance.chmod(path, mode, options);
  }

  /** Changes the owner and group of a file or directory. */
  public static chown(
    path: string,
    uid: number,
    gid: number,
    options?: ChownOptions
  ) {
    return Fs.globalInstance.chown(path, uid, gid, options);
  }

  /**
   * Creates a new IOStream instance.
   *
   * `type` parameter determines if the Stream should create a
   * new file, open an existing one or overwrite an existing
   * one.
   */
  public static openIOStream(
    path: string,
    type: IOStreamType,
    options?: IOStreamOptions
  ) {
    return Fs.globalInstance.openFileIOStream(path, type, options);
  }

  // #endregion

  // #region Instance

  private _cwd: string | null;

  constructor(options?: FsOptions) {
    this._cwd = options?.cwd ?? null;

    this.resolvePath = sync("resolvePath", this.resolvePath.bind(this));
    this.file = sync("file", this.file.bind(this));
    this.fileExists = this.fileExists.bind(this);
    this.listDir = this.listDir.bind(this);
    this.listFilenames = this.listFilenames.bind(this);
    this.fileInfo = this.fileInfo.bind(this);
    this.readFile = this.readFile.bind(this);
    this.readTextFile = this.readTextFile.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.writeTextFile = this.writeTextFile.bind(this);
    this.appendFile = this.appendFile.bind(this);
    this.appendTextFile = this.appendTextFile.bind(this);
    this.moveFile = this.moveFile.bind(this);
    this.renameFile = this.renameFile.bind(this);
    this.copyFile = this.copyFile.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.makeDir = this.makeDir.bind(this);
    this.makeLink = this.makeLink.bind(this);
    this.chmod = this.chmod.bind(this);
    this.chown = this.chown.bind(this);
    this.openFileIOStream = this.openFileIOStream.bind(this);
  }

  private resolvePath(path: string, cwd?: string) {
    const isRelative = !isAbsolute(path);
    if (isRelative) {
      path = join(cwd ?? this._cwd ?? GLib.get_current_dir(), path);
    }
    return path;
  }

  /** Creates a new Gio.File instance for the given path. */
  public file(path: string, cwd?: string) {
    return Gio.File.new_for_path(this.resolvePath(path, cwd));
  }

  /** Checks if a file or directory exists. */
  public fileExists(path: string, options?: FileExistsOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise<boolean>("fileExists", opt.get("abortSignal"), (p) => {
      const queryFlag = getQueryFileFlag(opt);

      file.query_info_async(
        "standard::name",
        queryFlag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          try {
            file.query_info_finish(result);
            p.resolve(true);
          } catch {
            p.resolve(false);
          }
        })
      );
    });
  }

  /** Lists all the contents of a directory. */
  public listDir(path: string, options?: ListDirOptions) {
    const dir = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise<FileInfo[]>("listDir", opt.get("abortSignal"), async (p) => {
      const ioPriority = opt.get("ioPriority", GLib.PRIORITY_DEFAULT);
      const batchSize = opt.get("batchSize", DEFAULT_BATCH_SIZE);

      const enumerator = await promise<Gio.FileEnumerator>(
        "listDir",
        opt.get("abortSignal"),
        (p2) => {
          const queryFlag = getQueryFileFlag(opt);

          dir.enumerate_children_async(
            getAttributes(opt.get("attributes", [])),
            queryFlag,
            ioPriority,
            p2.cancellable,
            p2.asyncCallback((_, result: Gio.AsyncResult) => {
              const enumerator = dir.enumerate_children_finish(result);
              if (enumerator) {
                p2.resolve(enumerator);
              } else {
                p2.reject(
                  new FsError(`Failed to list directory: ${dir.get_path()}`)
                );
              }
            })
          );
        }
      );

      const getNextBatch = () =>
        promise<Gio.FileInfo[]>("listDir", opt.get("abortSignal"), (p3) => {
          enumerator.next_files_async(
            batchSize,
            ioPriority,
            p3.cancellable,
            p3.asyncCallback((_, result: Gio.AsyncResult) => {
              p3.resolve(enumerator.next_files_finish(result) ?? []);
            })
          );
        });

      const allFiles: FileInfo[] = [];

      while (true) {
        p.breakpoint();

        const nextBatch = await getNextBatch();

        if (nextBatch.length === 0) {
          break;
        }

        allFiles.push(
          ...nextBatch.map(
            (f) => new FileInfo(join(dir.get_path()!, f.get_name()), f)
          )
        );
      }

      enumerator.close_async(ioPriority, null, (_, result) => {
        enumerator.close_finish(result);
      });

      return p.resolve(allFiles);
    });
  }

  /** Lists the names of all files inside of a directory. */
  public listFilenames(path: string, options?: ListFilenamesOptions) {
    const dir = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise<string[]>(
      "listFilenames",
      opt.get("abortSignal"),
      async (p) => {
        const ioPriority = opt.get("ioPriority", GLib.PRIORITY_DEFAULT);
        const batchSize = opt.get("batchSize", DEFAULT_BATCH_SIZE);

        const enumerator = await promise<Gio.FileEnumerator>(
          "listDir",
          opt.get("abortSignal"),
          (p2) => {
            const queryFlag = getQueryFileFlag(opt);

            dir.enumerate_children_async(
              "standard::name",
              queryFlag,
              ioPriority,
              p2.cancellable,
              p2.asyncCallback((_, result: Gio.AsyncResult) => {
                const enumerator = dir.enumerate_children_finish(result);
                if (enumerator) {
                  p2.resolve(enumerator);
                } else {
                  p2.reject(
                    new FsError(`Failed to list filenames: ${dir.get_path()}`)
                  );
                }
              })
            );
          }
        );

        const getNextBatch = () =>
          promise<Gio.FileInfo[]>("listDir", opt.get("abortSignal"), (p3) => {
            enumerator.next_files_async(
              batchSize,
              ioPriority,
              p3.cancellable,
              p3.asyncCallback((_, result: Gio.AsyncResult) => {
                p3.resolve(enumerator.next_files_finish(result) ?? []);
              })
            );
          });

        const allFiles: string[] = [];

        while (true) {
          p.breakpoint();

          const nextBatch = await getNextBatch();

          if (nextBatch.length === 0) {
            break;
          }

          allFiles.push(...nextBatch.map((f) => f.get_name()));
        }

        enumerator.close_async(ioPriority, null, (_, result) => {
          enumerator.close_finish(result);
        });

        return p.resolve(allFiles);
      }
    );
  }

  /** Gets information about a specific file or directory. */
  public fileInfo(path: string, options?: FileInfoOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise<FileInfo>("fileInfo", opt.get("abortSignal"), (p) => {
      const queryFlag = getQueryFileFlag(opt);

      file.query_info_async(
        getAttributes(opt.get("attributes", [])),
        queryFlag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const ginfo = file.query_info_finish(result);
          if (ginfo) {
            p.resolve(new FileInfo(file.get_path()!, ginfo));
          } else {
            p.reject(
              new FsError(`Failed to get file info: ${file.get_path()}`)
            );
          }
        })
      );
    });
  }

  /**
   * Reads the content of a file under the given path.
   *
   * @returns A Promise with a byte array of the contents.
   */
  public readFile(path: string, options?: ReadFileOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise<Uint8Array>("readFile", opt.get("abortSignal"), (p) => {
      file.load_bytes_async(
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const [bytes] = file.load_bytes_finish(result);
          if (bytes != null) {
            p.resolve(bytes.unref_to_array());
          } else {
            p.reject(new FsError(`Failed to read file: ${file.get_path()}`));
          }
        })
      );
    });
  }

  /**
   * Reads the content of a file under the given path using the
   * `readFile()` method and decodes that content to string using
   * the given encoding.
   */
  public readTextFile(path: string, options?: ReadTextFileOptions) {
    const opt = OptionsResolver(options, OptValidators);

    return promise<string>(
      "readTextFile",
      opt.get("abortSignal"),
      async (p) => {
        const decoder = new TextDecoder(opt.get("encoding", "utf-8"));

        const contents = await this.readFile(path, options);

        p.resolve(decoder.decode(contents));
      }
    );
  }

  /** Writes the given data to a file under the given path. */
  public writeFile(
    path: string,
    contents: Uint8Array,
    options?: WriteFileOptions
  ) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise("writeFile", opt.get("abortSignal"), async (p) => {
      validateBytes(contents);

      const createFlag = getCreateFileFlag(opt);
      const ioPriority = opt.get("ioPriority", GLib.PRIORITY_DEFAULT);

      if (contents.byteLength === 0) {
        const stream = await promise<Gio.FileOutputStream>(
          "writeFile",
          opt.get("abortSignal"),
          (p2) => {
            file.replace_async(
              opt.get("etag", null),
              opt.get("makeBackup", false),
              createFlag,
              ioPriority,
              p2.cancellable,
              p2.asyncCallback((_, result: Gio.AsyncResult) => {
                const stream = file.replace_finish(result);
                if (stream) {
                  p2.resolve(stream);
                } else {
                  p2.reject(
                    new FsError(`Failed to write file: ${file.get_path()}`)
                  );
                }
              })
            );
          }
        );

        try {
          stream.truncate(0, null);
        } finally {
          await promise("writeFile", null, (p3) => {
            stream.close_async(
              ioPriority,
              null,
              p3.asyncCallback((_, result: Gio.AsyncResult) => {
                const success = stream.close_finish(result);
                if (success) {
                  p3.resolve();
                } else {
                  p3.reject(new FsError("Failed to close stream."));
                }
              })
            );
          });
        }

        return p.resolve();
      } else {
        const bytes = GLib.Bytes.new(contents);

        file.replace_contents_bytes_async(
          bytes,
          opt.get("etag", null),
          opt.get("makeBackup", false),
          createFlag,
          p.cancellable,
          p.asyncCallback((_, result: Gio.AsyncResult) => {
            const [success] = file.replace_contents_finish(result);
            if (success) {
              p.resolve();
            } else {
              p.reject(new FsError(`Failed to write file: ${file.get_path()}`));
            }
          })
        );
      }
    });
  }

  /**
   * Encodes given string into a byte array (UTF-8), and writes
   * that data to a file under the given path using the
   * `writeFile()` method.
   */
  public writeTextFile(
    path: string,
    contents: string,
    options?: WriteTextFileOptions
  ) {
    const opt = OptionsResolver(options, OptValidators);

    return promise("writeTextFile", opt.get("abortSignal"), async (p) => {
      validateText(contents);

      const encoder = new TextEncoder();
      const data = encoder.encode(contents);

      await this.writeFile(path, data, options);

      p.resolve();
    });
  }

  /** Appends the given data to a file under the given path. */
  public appendFile(
    path: string,
    contents: Uint8Array,
    options?: AppendFileOptions
  ) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise("appendFile", opt.get("abortSignal"), async (p) => {
      validateBytes(contents);

      if (contents.byteLength === 0) {
        return p.resolve(); // appending empty buffer is a no-op
      }

      const stream = await promise<Gio.FileOutputStream>(
        "appendFile",
        opt.get("abortSignal"),
        (p2) => {
          const createFlag = getCreateFileFlag(opt);

          file.append_to_async(
            createFlag,
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            p2.cancellable,
            p2.asyncCallback((_, result: Gio.AsyncResult) => {
              const outputStream = file.append_to_finish(result);
              if (outputStream) {
                p2.resolve(outputStream);
              } else {
                p2.reject(
                  new FsError(`Failed to append to file: ${file.get_path()}`)
                );
              }
            })
          );
        }
      );

      p.breakpoint();

      try {
        await promise("appendFile", opt.get("abortSignal"), (p3) => {
          const bytes = GLib.Bytes.new(contents);
          stream.write_bytes_async(
            bytes,
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            p3.cancellable,
            p3.asyncCallback((_, result: Gio.AsyncResult) => {
              const bytesWritten = stream.write_bytes_finish(result);
              if (bytesWritten === -1) {
                p3.reject(new FsError("Failed to write to stream."));
              } else {
                p3.resolve();
              }
            })
          );
        });
      } finally {
        await promise("appendFile", null, (p4) => {
          stream.close_async(
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            null,
            p4.asyncCallback((_, result: Gio.AsyncResult) => {
              const success = stream.close_finish(result);
              if (success) {
                p4.resolve();
              } else {
                p4.reject(new FsError("Failed to close stream."));
              }
            })
          );
        });
      }

      p.resolve();
    });
  }

  /**
   * Encodes given string into a byte array (UTF-8), and appends
   * that data to a file under the given path using the
   * `appendFile()` method.
   */
  public appendTextFile(
    path: string,
    contents: string,
    options?: AppendTextFileOptions
  ) {
    const opt = OptionsResolver(options, OptValidators);

    return promise("appendTextFile", opt.get("abortSignal"), async (p) => {
      validateText(contents);

      const encoder = new TextEncoder();
      const data = encoder.encode(contents);

      await this.appendFile(path, data, options);

      p.resolve();
    });
  }

  /** Moves a file or directory from one path to another. */
  public moveFile(
    sourcePath: string,
    destinationPath: string,
    options?: MoveFileOptions
  ) {
    const oldFile = this.file(sourcePath);
    const newFile = this.file(destinationPath);
    const opt = OptionsResolver(options, OptValidators);

    return promise("moveFile", opt.get("abortSignal"), (p) => {
      const copyFlag = getCopyFileFlag(opt);

      oldFile.move_async(
        newFile,
        copyFlag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        opt.get("onProgress", null),
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const success = oldFile.move_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(
                `Failed to move file: ${oldFile.get_path()} -> ${newFile.get_path()}`
              )
            );
          }
        })
      );
    });
  }

  /** Alias for the `moveFile()` method. */
  public renameFile(
    sourcePath: string,
    destinationPath: string,
    options?: MoveFileOptions
  ) {
    return this.moveFile(sourcePath, destinationPath, options);
  }

  /** Copies a file or directory from one path to another. */
  public copyFile(
    sourcePath: string,
    destinationPath: string,
    options?: CopyFileOptions
  ) {
    const srcFile = this.file(sourcePath);
    const destFile = this.file(destinationPath);
    const opt = OptionsResolver(options, OptValidators);

    return promise("copyFile", opt.get("abortSignal"), (p) => {
      const copyFlag = getCopyFileFlag(opt);

      srcFile.copy_async(
        destFile,
        copyFlag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        // @ts-expect-error
        opt.get("onProgress", null),
        p.asyncCallback((_: any, result: Gio.AsyncResult) => {
          const success = srcFile.copy_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(
                `Failed to copy file: ${srcFile.get_path()} -> ${destFile.get_path()}`
              )
            );
          }
        })
      );
    });
  }

  /**
   * Deletes a file or directory from under the given path.
   *
   * If `trash` is set to `true`, the file will be moved to the
   * user's trash directory instead of being deleted.
   */
  public deleteFile(path: string, options?: DeleteFileOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    opt.setDefault("followSymlinks", false);

    return promise("deleteFile", opt.get("abortSignal"), async (p) => {
      if (opt.get("trash", false)) {
        file.trash_async(
          opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
          p.cancellable,
          p.asyncCallback((_, result: Gio.AsyncResult) => {
            const success = file.trash_finish(result);
            if (success) {
              p.resolve();
            } else {
              p.reject(new FsError(`Failed to trash file: ${file.get_path()}`));
            }
          })
        );

        return;
      }

      if (
        opt.get("recursive", false) &&
        (await this.fileInfo(path, options)).isDirectory
      ) {
        p.breakpoint();

        const files = await this.listFilenames(path, options);

        p.breakpoint();

        await Promise.all(
          files.map((filename) =>
            this.deleteFile(join(path, filename), options)
          )
        );
      }

      p.breakpoint();

      file.delete_async(
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const success = file.delete_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(new FsError(`Failed to delete file: ${file.get_path()}`));
          }
        })
      );
    });
  }

  /** Creates a new directory under the given path. */
  public makeDir(path: string, options?: MakeDirOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise("makeDir", opt.get("abortSignal"), (p) => {
      file.make_directory_async(
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const success = file.make_directory_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(`Failed to make directory: ${file.get_path()}`)
            );
          }
        })
      );
    });
  }

  /**
   * Creates a symbolic link file undef the path given in the
   * first parameter, created link will point to a file or
   * directory that's provided as the second parameter.
   *
   * @param linkPath The path to the new link file.
   * @param pointingTo Link destination file.
   * @param option Options for the operation.
   */
  public makeLink(
    linkPath: string,
    pointingTo: string,
    option?: MakeLinkOptions
  ) {
    const linkFile = this.file(linkPath);
    const dest = this.resolvePath(pointingTo);
    const opt = OptionsResolver(option, OptValidators);

    return promise("makeLink", opt.get("abortSignal"), (p) => {
      linkFile.make_symbolic_link_async(
        dest,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const success = linkFile.make_symbolic_link_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(
                `Failed to create symbolic link: ${linkFile.get_path()} -> ${dest}`
              )
            );
          }
        })
      );
    });
  }

  /**
   * Changes the UNIX permissions of a file or directory.
   *
   * The provided mode can be either:
   *
   * - A number representing the octal value of the permissions
   *   (ex. `0o755`)
   * - A string in the rwx format (ex. `rwxrw-r--`)
   * - An object describing all the permissions
   */
  public chmod(path: string, mode: FilePermission, options?: ChmodOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise("chmod", opt.get("abortSignal"), async (p) => {
      const queryFlag = getQueryFileFlag(opt);

      const info = Gio.FileInfo.new();
      info.set_attribute_uint32("unix::mode", parseFilePermission(mode));

      file.set_attributes_async(
        info,
        queryFlag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const [success] = file.set_attributes_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(
                `Failed to change file permissions: ${file.get_path()}`
              )
            );
          }
        })
      );
    });
  }

  /** Changes the owner and group of a file or directory. */
  public chown(path: string, uid: number, gid: number, options?: ChownOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    return promise("chown", opt.get("abortSignal"), async (p) => {
      validateNumber(uid, "uid");
      validateNumber(gid, "gid");

      const queryFlag = getQueryFileFlag(opt);

      const info = Gio.FileInfo.new();
      info.set_attribute_uint32("unix::uid", uid);
      info.set_attribute_uint32("unix::gid", gid);

      file.set_attributes_async(
        info,
        queryFlag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.asyncCallback((_, result: Gio.AsyncResult) => {
          const [success] = file.set_attributes_finish(result);

          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(`Failed to change file owner: ${file.get_path()}`)
            );
          }
        })
      );
    });
  }

  /**
   * Creates a new IOStream instance.
   *
   * `type` parameter determines if the Stream should create a
   * new file, open an existing one or overwrite an existing
   * one.
   */
  public openFileIOStream(
    path: string,
    type: IOStreamType,
    options: IOStreamOptions = {}
  ) {
    return IOStream.openFile(
      path,
      type,
      this._cwd ? { cwd: this._cwd, ...options } : options
    );
  }

  // #endregion
}

export { Fs };
export type {
  FileExistsOptions,
  ListDirOptions,
  FileInfoOptions,
  ReadFileOptions,
  ReadTextFileOptions,
  WriteFileOptions,
  WriteTextFileOptions,
  AppendFileOptions,
  AppendTextFileOptions,
  MoveFileOptions,
  CopyFileOptions,
  DeleteFileOptions,
  MakeDirOptions,
  MakeLinkOptions,
  ChmodOptions,
  ChownOptions,
};
