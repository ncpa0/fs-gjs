import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import type { Encoding } from "./encoding";
import { FsError } from "./errors";
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

interface ReadFileOptions extends FsOperationOptions {}

interface ReadTextFileOptions extends ReadFileOptions {
  encoding?: Encoding;
}

interface WriteFileOptions extends FsOperationOptions {
  etag?: string;
  makeBackup?: boolean;
  createFlags?: Gio.FileCreateFlags;
}

interface WriteTextFileOptions extends WriteFileOptions {}

interface MoveFileOptions extends FsOperationOptions {
  fileCopyFlags?: Gio.FileCopyFlags;
  ioPriority?: number;
  onProgress?: (current_num_bytes: number, total_num_bytes: number) => void;
}

interface DeleteFileOptions extends FsOperationOptions {
  moveToTrash?: boolean;
  ioPriority?: number;
  /** Not implemented yet. */
  recursive?: boolean;
}

class Fs {
  // #region Static

  private static globalInstance = new Fs();

  public static listDir(path: string, options?: ListDirOptions) {
    return Fs.globalInstance.listDir(path, options);
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
    return Fs.globalInstance.writeFile(path, data);
  }

  public static writeTextFile(
    path: string,
    data: string,
    options?: WriteTextFileOptions
  ) {
    return Fs.globalInstance.writeTextFile(path, data, options);
  }

  public static moveFile(
    source: string,
    destination: string,
    options?: MoveFileOptions
  ) {
    return Fs.globalInstance.moveFile(source, destination, options);
  }

  public static deleteFile(path: string, options?: DeleteFileOptions) {
    return Fs.globalInstance.deleteFile(path, options);
  }

  // #endregion

  // #region Instance

  public file(path: string) {
    const isRelative = !isAbsolute(path);
    if (isRelative) {
      path = join(GLib.get_current_dir(), path);
    }
    return Gio.File.new_for_path(path);
  }

  public listDir(path: string, options?: ListDirOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise<string[]>(opt.get("abortSignal"), async (p) => {
      const ioPriority = opt.get("ioPriority", GLib.PRIORITY_DEFAULT);
      const batchSize = opt.get("batchSize", 50);

      const enumerator = await promise<Gio.FileEnumerator>(null, (p2) => {
        file.enumerate_children_async(
          opt.get("attributes", "*"),
          opt.get("queryInfoFlags", Gio.FileQueryInfoFlags.NONE),
          ioPriority,
          p.cancellable,
          p2.subCall((_, result: Gio.AsyncResult) => {
            const enumerator = file.enumerate_children_finish(result);
            p2.resolve(enumerator);
          })
        );
      });

      p.breakPoint();

      const getNextBatch = () =>
        promise<Gio.FileInfo[]>(null, (p3) => {
          enumerator.next_files_async(
            batchSize,
            ioPriority,
            p.cancellable,
            p3.subCall((_, result: Gio.AsyncResult) => {
              p3.resolve(enumerator.next_files_finish(result));
            })
          );
        });

      p.breakPoint();

      const allFiles: string[] = [];

      let nextBatch: Gio.FileInfo[] = [];

      while (true) {
        p.breakPoint();

        nextBatch = await getNextBatch();

        if (nextBatch.length === 0) {
          break;
        }

        allFiles.push(...nextBatch.map((f) => f.get_name()));
      }

      return p.resolve(allFiles);
    });
  }

  public readFile(path: string, options?: ReadFileOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise<Uint8Array>(opt.get("abortSignal"), (p) => {
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

    return promise(opt.get("abortSignal"), (p) => {
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

  public moveFile(
    sourcePath: string,
    destinationPath: string,
    options?: MoveFileOptions
  ) {
    const oldFile = this.file(sourcePath);
    const newFile = this.file(destinationPath);
    const opt = OptionsResolver(options);

    return promise(opt.get("abortSignal"), (p) => {
      oldFile.move_async(
        newFile,
        opt.get("fileCopyFlags", Gio.FileCopyFlags.NONE),
        opt.get("ioPriority", GLib.PRIORITY_DEFAULT),
        p.cancellable,
        opt.get("onProgress", () => {}),
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

  public deleteFile(path: string, options?: DeleteFileOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options);

    return promise(opt.get("abortSignal"), (p) => {
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

  // #endregion
}

export { Fs };
