import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import type { Encoding } from "./encoding";
import { FsError } from "./errors";
import { FileInfo } from "./file-info";
import type { IOStreamOptions, IOStreamType } from "./io-stream";
import { IOStream } from "./io-stream";
import { OptionsResolver } from "./option-resolver";
import { isAbsolute, join } from "./path";
import { promise } from "./promise";

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
  moveToTrash?: boolean;
  ioPriority?: number;
  /** Not implemented yet. */
  recursive?: boolean;
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

type FilePermission =
  | number
  | string
  | {
      owner: {
        read: boolean;
        write: boolean;
        execute: boolean;
      };
      group: {
        read: boolean;
        write: boolean;
        execute: boolean;
      };
      others: {
        read: boolean;
        write: boolean;
        execute: boolean;
      };
    };

const parseFilePermission = (permission: FilePermission) => {
  switch (typeof permission) {
    case "number":
      return permission;
    case "string": {
      const p: FilePermission = {
        owner: {
          read: permission[0] === "r",
          write: permission[1] === "w",
          execute: permission[2] === "x",
        },
        group: {
          read: permission[3] === "r",
          write: permission[4] === "w",
          execute: permission[5] === "x",
        },
        others: {
          read: permission[6] === "r",
          write: permission[7] === "w",
          execute: permission[8] === "x",
        },
      };
      permission = p;
    }
    case "object": {
      let mode = 0;

      if (permission.owner.read) {
        mode |= 0o400;
      }

      if (permission.owner.write) {
        mode |= 0o200;
      }

      if (permission.owner.execute) {
        mode |= 0o100;
      }

      if (permission.group.read) {
        mode |= 0o40;
      }

      if (permission.group.write) {
        mode |= 0o20;
      }

      if (permission.group.execute) {
        mode |= 0o10;
      }

      if (permission.others.read) {
        mode |= 0o4;
      }

      if (permission.others.write) {
        mode |= 0o2;
      }

      if (permission.others.execute) {
        mode |= 0o1;
      }

      return mode;
    }
    default:
      throw new Error("Invalid permission type.");
  }
};

interface FsOptions {
  cwd?: string;
}

class Fs {
  // #region Static

  private static globalInstance = new Fs();

  public static file(path: string, cwd?: string) {
    return Fs.globalInstance.file(path, cwd);
  }

  public static fileExists(path: string, options?: FileExistsOptions) {
    return Fs.globalInstance.fileExists(path, options);
  }

  public static listDir(path: string, options?: ListDirOptions) {
    return Fs.globalInstance.listDir(path, options);
  }

  public static fileInfo(path: string, options?: FileInfoOptions) {
    return Fs.globalInstance.fileInfo(path, options);
  }

  public static readFile(path: string, options?: ReadFileOptions) {
    return Fs.globalInstance.readFile(path, options);
  }

  public static readTextFile(path: string, options?: ReadTextFileOptions) {
    return Fs.globalInstance.readTextFile(path, options);
  }

  public static writeFile(
    path: string,
    data: Uint8Array,
    options?: WriteFileOptions
  ) {
    return Fs.globalInstance.writeFile(path, data, options);
  }

  public static writeTextFile(
    path: string,
    data: string,
    options?: WriteTextFileOptions
  ) {
    return Fs.globalInstance.writeTextFile(path, data, options);
  }

  public static appendFile(
    path: string,
    data: Uint8Array,
    options?: AppendFileOptions
  ) {
    return Fs.globalInstance.appendFile(path, data, options);
  }

  public static appendTextFile(
    path: string,
    data: string,
    options?: AppendTextFileOptions
  ) {
    return Fs.globalInstance.appendTextFile(path, data, options);
  }

  public static moveFile(
    source: string,
    destination: string,
    options?: MoveFileOptions
  ) {
    return Fs.globalInstance.moveFile(source, destination, options);
  }

  public static renameFile(
    source: string,
    destination: string,
    options?: MoveFileOptions
  ) {
    return Fs.globalInstance.renameFile(source, destination, options);
  }

  public static copyFile(
    source: string,
    destination: string,
    options?: CopyFileOptions
  ) {
    return Fs.globalInstance.copyFile(source, destination, options);
  }

  public static deleteFile(path: string, options?: DeleteFileOptions) {
    return Fs.globalInstance.deleteFile(path, options);
  }

  public static makeDir(path: string, options?: MakeDirOptions) {
    return Fs.globalInstance.makeDir(path, options);
  }

  public static makeLink(from: string, to: string, options?: MakeLinkOptions) {
    return Fs.globalInstance.makeLink(from, to, options);
  }

  public static chmod(
    path: string,
    mode: FilePermission,
    options?: ChmodOptions
  ) {
    return Fs.globalInstance.chmod(path, mode, options);
  }

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
    this.file = this.file.bind(this);
    this.makeDir = this.makeDir.bind(this);
    this.makeLink = this.makeLink.bind(this);
    this.chmod = this.chmod.bind(this);
    this.chown = this.chown.bind(this);
    this.appendFile = this.appendFile.bind(this);
    this.appendTextFile = this.appendTextFile.bind(this);
    this.fileExists = this.fileExists.bind(this);
    this.openIOStream = this.openIOStream.bind(this);
  }

  public file(path: string, cwd?: string) {
    const isRelative = !isAbsolute(path);
    if (isRelative) {
      path = join(cwd ?? this._cwd ?? GLib.get_current_dir(), path);
    }
    return Gio.File.new_for_path(path);
  }

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
              p2.resolve(enumerator);
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
              p3.resolve(enumerator.next_files_finish(result));
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
          p.resolve(new FileInfo(file.get_path()!, ginfo));
        })
      );
    });
  }

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

  public readTextFile(path: string, options?: ReadTextFileOptions) {
    const opt = OptionsResolver(options);

    return this.readFile(path, options).then((contents) => {
      const decoder = new TextDecoder(opt.get("encoding", "utf-8"));
      return decoder.decode(contents);
    });
  }

  public writeFile(
    path: string,
    contents: Uint8Array,
    options?: WriteFileOptions
  ) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise("writeFile", opt.get("abortSignal"), (p) => {
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
    });
  }

  public writeTextFile(
    path: string,
    contents: string,
    options?: WriteTextFileOptions
  ) {
    const encoder = new TextEncoder();

    const data = encoder.encode(contents);

    return this.writeFile(path, data, options);
  }

  public appendFile(
    path: string,
    contents: Uint8Array,
    options?: AppendFileOptions
  ) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise("appendFile", opt.get("abortSignal"), async (p) => {
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
              p2.resolve(outputStream);
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
              p3.resolve(void stream.write_bytes_finish(result));
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

  public appendTextFile(
    path: string,
    contents: string,
    options?: AppendTextFileOptions
  ) {
    const encoder = new TextEncoder();

    const data = encoder.encode(contents);

    return this.appendFile(path, data, options);
  }

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

  public renameFile(
    sourcePath: string,
    destinationPath: string,
    options?: MoveFileOptions
  ) {
    return this.moveFile(sourcePath, destinationPath, options);
  }

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

  public deleteFile(path: string, options?: DeleteFileOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise("deleteFile", opt.get("abortSignal"), async (p) => {
      if (opt.get("moveToTrash", false)) {
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
   * Creates a symbolic link.
   *
   * @param linkToFile The file this link will be pointing to.
   * @param linkPath The path to the link itself.
   * @param option Options for the operation.
   */
  public makeLink(
    linkToFile: string,
    linkPath: string,
    option?: MakeLinkOptions
  ) {
    const srcFile = this.file(linkToFile);
    const linkFile = this.file(linkPath);
    const opt = OptionsResolver(option);

    return promise("makeLink", opt.get("abortSignal"), (p) => {
      linkFile.make_symbolic_link_async(
        srcFile.get_path()!,
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
          const success = linkFile.make_symbolic_link_finish(result);
          if (success) {
            p.resolve();
          } else {
            p.reject(
              new FsError(
                `Failed to create symbolic link: ${linkFile.get_path()} -> ${srcFile.get_path()}`
              )
            );
          }
        })
      );
    });
  }

  public chmod(path: string, mode: FilePermission, options?: ChmodOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise("chmod", opt.get("abortSignal"), async (p) => {
      const { _gioInfo: info } = await this.fileInfo(path, options);
      p.breakpoint();

      info.set_attribute_uint32("unix::mode", parseFilePermission(mode));

      file.set_attributes_async(
        info,
        opt.get("queryInfoFlags", Gio.FileQueryInfoFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        p.subCall((_, result: Gio.AsyncResult) => {
          file.set_attributes_finish(result);
          p.resolve();
        })
      );
    });
  }

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
          file.set_attributes_finish(result);
          p.resolve();
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
