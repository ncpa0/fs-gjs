import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import type { Encoding } from "./encoding";
import { FsError } from "./errors";
import { FileInfo } from "./file-info";
import type { IOStreamOptions, IOStreamType } from "./io-stream";
import { IOStream } from "./io-stream";
import { OptionsResolver } from "./option-resolver";
import { isAbsolute, join } from "./path";
import type { FilePermission } from "./permission-parser";
import { parseFilePermission } from "./permission-parser";
import { promise } from "./promise";
import { SyncFs, sync } from "./sync-fs";

interface FsOperationOptions {
  abortSignal?: AbortSignal;
}

interface ListDirOptions extends FsOperationOptions {
  attributes?: string;
  queryInfoFlags?: Gio.FileQueryInfoFlags;
  ioPriority?: number;
  abortSignal?: AbortSignal;
  batchSize?: number;
}

interface FileInfoOptions extends FsOperationOptions {
  followSymlinks?: boolean;
  ioPriority?: number;
}

interface FileExistsOptions extends FsOperationOptions {
  queryInfoFlags?: Gio.FileQueryInfoFlags;
  ioPriority?: number;
}

interface ReadFileOptions extends FsOperationOptions {}

interface ReadTextFileOptions extends ReadFileOptions {
  encoding?: Encoding;
}

interface WriteFileOptions extends FsOperationOptions {
  etag?: string;
  makeBackup?: boolean;
  createFlags?: Gio.FileCreateFlags;
}

interface AppendFileOptions extends WriteFileOptions {
  fileCreateFlags?: Gio.FileCreateFlags;
  ioPriority?: number;
}

interface AppendTextFileOptions extends AppendFileOptions {}

interface WriteTextFileOptions extends WriteFileOptions {}

interface MoveFileOptions extends FsOperationOptions {
  fileCopyFlags?: Gio.FileCopyFlags;
  ioPriority?: number;
  onProgress?: (current_num_bytes: number, total_num_bytes: number) => void;
}

interface CopyFileOptions extends MoveFileOptions {
  ioPriority?: number;
  fileCopyFlags?: Gio.FileCopyFlags;
  onProgress?: (current_num_bytes: number, total_num_bytes: number) => void;
}

interface DeleteFileOptions extends FsOperationOptions {
  trash?: boolean;
  ioPriority?: number;
  /** Not implemented yet. */
  recursive?: boolean;
  queryInfoFlags?: Gio.FileQueryInfoFlags;
}

interface MakeDirOptions extends FsOperationOptions {
  ioPriority?: number;
}

interface MakeLinkOptions extends FsOperationOptions {
  ioPriority?: number;
}

interface ChmodOptions extends FsOperationOptions {
  queryInfoFlags?: Gio.FileQueryInfoFlags;
  ioPriority?: number;
}

interface ChownOptions extends FsOperationOptions {
  queryInfoFlags?: Gio.FileQueryInfoFlags;
  ioPriority?: number;
}

interface FsOptions {
  cwd?: string;
}

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
    return Fs.globalInstance.openIOStream(path, type, options);
  }

  // #endregion

  // #region Instance

  private _cwd: string | null;

  constructor(options?: FsOptions) {
    this._cwd = options?.cwd ?? null;

    this.resolvePath = sync("resolvePath", this.resolvePath.bind(this));
    this.file = sync("file", this.file.bind(this));
    this.deleteFile = this.deleteFile.bind(this);
    this.moveFile = this.moveFile.bind(this);
    this.renameFile = this.renameFile.bind(this);
    this.copyFile = this.copyFile.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.writeTextFile = this.writeTextFile.bind(this);
    this.readFile = this.readFile.bind(this);
    this.readTextFile = this.readTextFile.bind(this);
    this.listDir = this.listDir.bind(this);
    this.fileInfo = this.fileInfo.bind(this);
    this.makeDir = this.makeDir.bind(this);
    this.makeLink = this.makeLink.bind(this);
    this.chmod = this.chmod.bind(this);
    this.chown = this.chown.bind(this);
    this.appendFile = this.appendFile.bind(this);
    this.appendTextFile = this.appendTextFile.bind(this);
    this.fileExists = this.fileExists.bind(this);
    this.openIOStream = this.openIOStream.bind(this);
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
    const opt = OptionsResolver(options);

    return promise<boolean>("fileExists", opt.get("abortSignal"), (p) => {
      file.query_info_async(
        "standard::name",
        opt.get("queryInfoFlags", Gio.FileQueryInfoFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise<FileInfo[]>("", opt.get("abortSignal"), async (p) => {
      const ioPriority = opt.get("ioPriority", GLib.PRIORITY_DEFAULT);
      const batchSize = opt.get("batchSize", 50);

      const enumerator = await promise<Gio.FileEnumerator>(
        "listDir",
        opt.get("abortSignal"),
        (p2) => {
          file.enumerate_children_async(
            opt.get("attributes", "*"),
            opt.get("queryInfoFlags", Gio.FileQueryInfoFlags.NONE),
            ioPriority,
            p2.cancellable,
            p2.subCall((_, result: Gio.AsyncResult) => {
              const enumerator = file.enumerate_children_finish(result);
              if (enumerator) {
                p2.resolve(enumerator);
              } else {
                p2.reject(
                  new FsError(`Failed to list directory: ${file.get_path()}`)
                );
              }
            })
          );
        }
      );

      p.breakpoint();

      const getNextBatch = () =>
        promise<Gio.FileInfo[]>("listDir", opt.get("abortSignal"), (p3) => {
          enumerator.next_files_async(
            batchSize,
            ioPriority,
            p3.cancellable,
            p3.subCall((_, result: Gio.AsyncResult) => {
              p3.resolve(enumerator.next_files_finish(result) ?? []);
            })
          );
        });

      p.breakpoint();

      const allFiles: FileInfo[] = [];

      let nextBatch: Gio.FileInfo[] = [];

      while (true) {
        p.breakpoint();

        nextBatch = await getNextBatch();

        if (nextBatch.length === 0) {
          break;
        }

        allFiles.push(
          ...nextBatch.map(
            (f) => new FileInfo(join(file.get_path()!, f.get_name()), f)
          )
        );
      }

      return p.resolve(allFiles);
    });
  }

  /** Gets information about a specific file or directory. */
  public fileInfo(path: string, options?: FileInfoOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise<FileInfo>("fileInfo", opt.get("abortSignal"), (p) => {
      const flag = opt.get("followSymlinks", false)
        ? Gio.FileQueryInfoFlags.NONE
        : Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS;

      file.query_info_async(
        "*",
        flag,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(options);

    return promise<Uint8Array>("readFile", opt.get("abortSignal"), (p) => {
      file.load_contents_async(
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
          const [success, contents] = file.load_contents_finish(result);
          if (success) {
            p.resolve(contents);
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
    const opt = OptionsResolver(options);

    return this.readFile(path, options).then((contents) => {
      const decoder = new TextDecoder(opt.get("encoding", "utf-8"));
      return decoder.decode(contents);
    });
  }

  /** Writes the given data to a file under the given path. */
  public writeFile(
    path: string,
    contents: Uint8Array,
    options?: WriteFileOptions
  ) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise("writeFile", opt.get("abortSignal"), async (p) => {
      if (contents.byteLength === 0) {
        const stream = await promise<Gio.FileOutputStream>(
          "writeFile",
          opt.get("abortSignal"),
          (p2) => {
            file.replace_async(
              opt.get("etag", null),
              opt.get("makeBackup", false),
              opt.get("createFlags", Gio.FileCreateFlags.NONE),
              GLib.PRIORITY_DEFAULT,
              p.cancellable,
              p.subCall((_, result: Gio.AsyncResult) => {
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
              GLib.PRIORITY_DEFAULT,
              null,
              p3.subCall((_, result: Gio.AsyncResult) => {
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

        p.resolve();
      } else {
        file.replace_contents_async(
          contents,
          opt.get("etag", null),
          opt.get("makeBackup", false),
          opt.get("createFlags", Gio.FileCreateFlags.NONE),
          p.cancellable,
          p.subCall((_, result: Gio.AsyncResult) => {
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
    const encoder = new TextEncoder();

    const data = encoder.encode(contents);

    return this.writeFile(path, data, options);
  }

  /** Appends the given data to a file under the given path. */
  public appendFile(
    path: string,
    contents: Uint8Array,
    options?: AppendFileOptions
  ) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise("appendFile", opt.get("abortSignal"), async (p) => {
      if (contents.byteLength === 0) {
        p.resolve();
        return;
      }

      const stream = await promise<Gio.FileOutputStream>(
        "appendFile",
        opt.get("abortSignal"),
        (p2) => {
          file.append_to_async(
            opt.get("fileCreateFlags", Gio.FileCreateFlags.NONE),
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            p2.cancellable,
            p2.subCall((_, result: Gio.AsyncResult) => {
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
          stream.write_bytes_async(
            GLib.Bytes.new(contents),
            opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
            p3.cancellable,
            p3.subCall((_, result: Gio.AsyncResult) => {
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
            p4.subCall((_, result: Gio.AsyncResult) => {
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
    const encoder = new TextEncoder();

    const data = encoder.encode(contents);

    return this.appendFile(path, data, options);
  }

  /** Moves a file or directory from one path to another. */
  public moveFile(
    sourcePath: string,
    destinationPath: string,
    options?: MoveFileOptions
  ) {
    const oldFile = this.file(sourcePath);
    const newFile = this.file(destinationPath);
    const opt = OptionsResolver(options);

    return promise("moveFile", opt.get("abortSignal"), (p) => {
      oldFile.move_async(
        newFile,
        opt.get("fileCopyFlags", Gio.FileCopyFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        opt.get("onProgress", null),
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(options);

    return promise("copyFile", opt.get("abortSignal"), (p) => {
      srcFile.copy_async(
        destFile,
        opt.get("fileCopyFlags", Gio.FileCopyFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        // @ts-expect-error
        opt.get("onProgress", null),
        p.subCall((_: any, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(options);

    return promise("deleteFile", opt.get("abortSignal"), async (p) => {
      if (opt.get("trash", false)) {
        file.trash_async(
          opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
          p.cancellable,
          p.subCall((_, result: Gio.AsyncResult) => {
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
        const files = await this.listDir(path, options);

        p.breakpoint();
        await Promise.all(
          files.map((file) => this.deleteFile(file.filepath, options))
        );

        p.breakpoint();
      }

      file.delete_async(
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(options);

    return promise("makeDir", opt.get("abortSignal"), (p) => {
      file.make_directory_async(
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(option);

    return promise("makeLink", opt.get("abortSignal"), (p) => {
      linkFile.make_symbolic_link_async(
        dest,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(options);

    return promise("chmod", opt.get("abortSignal"), async (p) => {
      const info = Gio.FileInfo.new();

      info.set_attribute_uint32("unix::mode", parseFilePermission(mode));

      file.set_attributes_async(
        info,
        opt.get("queryInfoFlags", Gio.FileQueryInfoFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
    const opt = OptionsResolver(options);

    return promise("chown", opt.get("abortSignal"), async (p) => {
      const { _gioInfo: info } = await this.fileInfo(path, options);
      p.breakpoint();

      info.set_attribute_uint32("unix::uid", uid);
      info.set_attribute_uint32("unix::gid", gid);

      file.set_attributes_async(
        info,
        opt.get("queryInfoFlags", Gio.FileQueryInfoFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
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
  public openIOStream(
    path: string,
    type: IOStreamType,
    options: IOStreamOptions = {}
  ) {
    return IOStream.open(
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
