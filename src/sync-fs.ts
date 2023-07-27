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
import {
  getCopyFileFlag,
  getCreateFileFlag,
  getQueryFileFlag,
} from "./flags";
import type { IOStreamOptions, IOStreamType } from "./io-stream";
import { OptionsResolver } from "./option-resolver";
import { parseFsError } from "./parse-fs-error";
import { isAbsolute, join } from "./path";
import type { FilePermission } from "./permission-parser";
import { parseFilePermission } from "./permission-parser";
import type { SyncIOStreamOptions } from "./sync-io-stream";
import { SyncIOStream } from "./sync-io-stream";
import {
  OptValidators,
  validateBytes,
  validateNumber,
  validatePermissions,
  validateText,
} from "./validators";

type Tail<T extends any[]> = T extends [any, ...infer U] ? U : [];

type Mixin<T extends any[]> = T["length"] extends 0
  ? {}
  : Mixin<Tail<T>> & T[0];

interface SyncFsOperationOptions {}

interface SyncListFilenamesOptions
  extends Mixin<[SyncFsOperationOptions, FileQueryFlagOptions]> {}

interface SyncListDirOptions
  extends Mixin<[SyncListFilenamesOptions]> {
  /**
   * A list of additional attributes to query for each file. These
   * attributes can be then later accessed via the
   * `file._gioInfo.get_attribute_*` methods.
   */
  attributes?: string[];
}

interface SyncFileInfoOptions
  extends Mixin<[SyncFsOperationOptions, FileQueryFlagOptions]> {
  /**
   * A list of additional attributes to query for each file. These
   * attributes can be then later accessed via the
   * `file._gioInfo.get_attribute_*` methods.
   */
  attributes?: string[];
}

interface SyncReadFileOptions
  extends Mixin<[SyncFsOperationOptions]> {}

interface SyncReadTextFileOptions
  extends Mixin<[SyncReadFileOptions]> {
  /**
   * The encoding to use when reading the file.
   *
   * @default "utf-8"
   */
  encoding?: Encoding;
}

interface SyncWriteFileOptions
  extends Mixin<[SyncFsOperationOptions, FileCreateFlagOptions]> {
  etag?: string;
  /**
   * When enabled, if a file already exists at the given path, it will
   * be backed up before being overwritten.
   *
   * Created backup can be found at the same directory as the original
   * file, with the same name, but with a "~" appended at the end.
   */
  makeBackup?: boolean;
}

interface SyncAppendFileOptions
  extends Mixin<[SyncWriteFileOptions, FileCreateFlagOptions]> {}

interface SyncAppendTextFileOptions
  extends Mixin<[SyncAppendFileOptions]> {}

interface SyncWriteTextFileOptions
  extends Mixin<[SyncWriteFileOptions]> {}

interface SyncMoveFileOptions
  extends Mixin<[SyncFsOperationOptions, FileCopyFlagOptions]> {
  /**
   * A callback that will be called with the current progress of the
   * operation.
   */
  onProgress?: (
    current_num_bytes: number,
    total_num_bytes: number,
  ) => void;
}

interface SyncCopyFileOptions
  extends Mixin<[SyncMoveFileOptions, FileCopyFlagOptions]> {}

interface SyncDeleteFileOptions
  extends Mixin<[SyncFsOperationOptions, FileQueryFlagOptions]> {
  /**
   * When enabled, instead of permanently deleting the file, it will
   * be moved to the trash directory.
   */
  trash?: boolean;
  /**
   * When enabled, if a file is a directory, all of the files inside
   * it will be deleted before deleting the directory itself.
   */
  recursive?: boolean;
}

interface SyncChmodOptions
  extends Mixin<[SyncFsOperationOptions, FileQueryFlagOptions]> {}

interface SyncChownOptions
  extends Mixin<[SyncFsOperationOptions, FileQueryFlagOptions]> {}

interface SyncFsOptions {
  /**
   * Path to a directory which will be used as a base for all calls on
   * this SyncFs instance.
   *
   * @example
   *   const fs = new SyncFs({ cwd: "/home/user" });
   *
   *   fs.readFile("./file.txt"); // will read /home/user/file.txt
   */
  cwd?: string;
}

export const sync = <F extends (...args: any[]) => any>(
  name: string,
  fn: F,
): F => {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (err) {
      throw parseFsError(name, err);
    }
  }) as F;
};

class SyncFs {
  // #region Static

  private static globalInstance = new SyncFs();

  /**
   * Creates a new Gio.File instance for the given path.
   */
  public static file(path: string, cwd?: string) {
    return SyncFs.globalInstance.file(path, cwd);
  }

  /**
   * Checks if a file or directory exists.
   */
  public static fileExists(path: string) {
    return SyncFs.globalInstance.fileExists(path);
  }

  /**
   * Lists all the contents of a directory.
   */
  public static listDir(path: string, options?: SyncListDirOptions) {
    return SyncFs.globalInstance.listDir(path, options);
  }

  /**
   * Lists the names of all files inside of a directory.
   */
  public static listFilenames(
    path: string,
    options?: SyncListFilenamesOptions,
  ) {
    return SyncFs.globalInstance.listFilenames(path, options);
  }

  /**
   * Gets information about a specific file or directory.
   */
  public static fileInfo(
    path: string,
    options?: SyncFileInfoOptions,
  ) {
    return SyncFs.globalInstance.fileInfo(path, options);
  }

  /**
   * Reads the content of a file under the given path.
   *
   * @returns A Promise with a byte array of the contents.
   */
  public static readFile(path: string) {
    return SyncFs.globalInstance.readFile(path);
  }

  /**
   * Reads the content of a file under the given path using the
   * `readFile()` method and decodes that content to string using the
   * given encoding.
   */
  public static readTextFile(
    path: string,
    options?: SyncReadTextFileOptions,
  ) {
    return SyncFs.globalInstance.readTextFile(path, options);
  }

  /**
   * Writes the given data to a file under the given path.
   */
  public static writeFile(
    path: string,
    data: Uint8Array,
    options?: SyncWriteFileOptions,
  ) {
    return SyncFs.globalInstance.writeFile(path, data, options);
  }

  /**
   * Encodes given string into a byte array (UTF-8), and writes that
   * data to a file under the given path using the `writeFile()`
   * method.
   */
  public static writeTextFile(
    path: string,
    data: string,
    options?: SyncWriteTextFileOptions,
  ) {
    return SyncFs.globalInstance.writeTextFile(path, data, options);
  }

  /**
   * Appends the given data to a file under the given path.
   */
  public static appendFile(
    path: string,
    data: Uint8Array,
    options?: SyncAppendFileOptions,
  ) {
    return SyncFs.globalInstance.appendFile(path, data, options);
  }

  /**
   * Encodes given string into a byte array (UTF-8), and appends that
   * data to a file under the given path using the `appendFile()`
   * method.
   */
  public static appendTextFile(
    path: string,
    data: string,
    options?: SyncAppendTextFileOptions,
  ) {
    return SyncFs.globalInstance.appendTextFile(path, data, options);
  }

  /**
   * Moves a file or directory from one path to another.
   */
  public static moveFile(
    source: string,
    destination: string,
    options?: SyncMoveFileOptions,
  ) {
    return SyncFs.globalInstance.moveFile(
      source,
      destination,
      options,
    );
  }

  /**
   * Alias for the `moveFile()` method.
   */
  public static renameFile(
    source: string,
    destination: string,
    options?: SyncMoveFileOptions,
  ) {
    return SyncFs.globalInstance.renameFile(
      source,
      destination,
      options,
    );
  }

  /**
   * Copies a file or directory from one path to another.
   */
  public static copyFile(
    source: string,
    destination: string,
    options?: SyncCopyFileOptions,
  ) {
    return SyncFs.globalInstance.copyFile(
      source,
      destination,
      options,
    );
  }

  /**
   * Deletes a file or directory from under the given path.
   *
   * If `trash` is set to `true`, the file will be moved to the user's
   * trash directory instead of being deleted.
   */
  public static deleteFile(
    path: string,
    options?: SyncDeleteFileOptions,
  ) {
    return SyncFs.globalInstance.deleteFile(path, options);
  }

  /**
   * Creates a new directory under the given path.
   */
  public static makeDir(path: string) {
    return SyncFs.globalInstance.makeDir(path);
  }

  /**
   * Creates a symbolic link file undef the path given in the first
   * parameter, created link will point to a file or directory that's
   * provided as the second parameter.
   *
   * @param linkPath The path to the new link file.
   * @param pointingTo Link destination file.
   */
  public static makeLink(linkPath: string, pointingTo: string) {
    return SyncFs.globalInstance.makeLink(linkPath, pointingTo);
  }

  /**
   * Changes the UNIX permissions of a file or directory.
   *
   * The provided mode can be either:
   *
   * - A number representing the octal value of the permissions (ex.
   *   `0o755`)
   * - A string in the rwx format (ex. `rwxrw-r--`)
   * - An object describing all the permissions
   */
  public static chmod(
    path: string,
    mode: FilePermission,
    options?: SyncChmodOptions,
  ) {
    return SyncFs.globalInstance.chmod(path, mode, options);
  }

  /**
   * Changes the owner and group of a file or directory.
   */
  public static chown(
    path: string,
    uid: number,
    gid: number,
    options?: SyncChownOptions,
  ) {
    return SyncFs.globalInstance.chown(path, uid, gid, options);
  }

  /**
   * Creates a new SyncIOStream instance.
   *
   * `type` parameter determines if the Stream should create a new
   * file, open an existing one or overwrite an existing one.
   */
  public static openIOStream(
    path: string,
    type: IOStreamType,
    options?: IOStreamOptions,
  ) {
    return SyncFs.globalInstance.openFileIOStream(
      path,
      type,
      options,
    );
  }

  // #endregion

  // #region Instance

  private _cwd: string | null;

  constructor(options?: SyncFsOptions) {
    this._cwd = options?.cwd ?? null;

    this.resolvePath = sync(
      "resolvePath",
      this.resolvePath.bind(this),
    );
    this.file = sync("file", this.file.bind(this));
    this.fileExists = sync("fileExists", this.fileExists.bind(this));
    this.listDir = sync("listDir", this.listDir.bind(this));
    this.listFilenames = sync(
      "listFilenames",
      this.listFilenames.bind(this),
    );
    this.fileInfo = sync("fileInfo", this.fileInfo.bind(this));
    this.readFile = sync("readFile", this.readFile.bind(this));
    this.readTextFile = sync(
      "readTextFile",
      this.readTextFile.bind(this),
    );
    this.writeFile = sync("writeFile", this.writeFile.bind(this));
    this.writeTextFile = sync(
      "writeTextFile",
      this.writeTextFile.bind(this),
    );
    this.appendFile = sync("appendFile", this.appendFile.bind(this));
    this.appendTextFile = sync(
      "appendTextFile",
      this.appendTextFile.bind(this),
    );
    this.moveFile = sync("moveFile", this.moveFile.bind(this));
    this.renameFile = sync("renameFile", this.renameFile.bind(this));
    this.copyFile = sync("copyFile", this.copyFile.bind(this));
    this.deleteFile = sync("deleteFile", this.deleteFile.bind(this));
    this.makeDir = sync("makeDir", this.makeDir.bind(this));
    this.makeLink = sync("makeLink", this.makeLink.bind(this));
    this.chmod = sync("chmod", this.chmod.bind(this));
    this.chown = sync("chown", this.chown.bind(this));
  }

  private resolvePath(path: string, cwd?: string) {
    const isRelative = !isAbsolute(path);
    if (isRelative) {
      path = join(cwd ?? this._cwd ?? GLib.get_current_dir(), path);
    }
    return path;
  }

  /**
   * Creates a new Gio.File instance for the given path.
   */
  public file(path: string, cwd?: string) {
    return Gio.File.new_for_path(this.resolvePath(path, cwd));
  }

  /**
   * Checks if a file or directory exists.
   */
  public fileExists(path: string) {
    const file = this.file(path);
    return file.query_exists(null);
  }

  /**
   * Lists all the contents of a directory.
   */
  public listDir(path: string, options?: SyncListDirOptions) {
    const dirFile = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    const queryFlag = getQueryFileFlag(opt);

    const enumerator = dirFile.enumerate_children(
      getAttributes(opt.get("attributes", [])),
      queryFlag,
      null,
    );

    if (!enumerator) {
      throw new FsError("Failed to enumerate directory.");
    }

    const allFiles: FileInfo[] = [];

    while (true) {
      const nextFile = enumerator.next_file(null);

      if (!nextFile) {
        break;
      }

      allFiles.push(
        new FileInfo(
          join(dirFile.get_path()!, nextFile.get_name()),
          nextFile,
        ),
      );
    }

    return allFiles;
  }

  /**
   * Lists all the contents of a directory as file names.
   */
  public listFilenames(
    path: string,
    options?: SyncListFilenamesOptions,
  ) {
    const dirFile = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    const queryFlag = getQueryFileFlag(opt);

    const enumerator = dirFile.enumerate_children(
      "standard::name",
      queryFlag,
      null,
    );

    if (!enumerator) {
      throw new FsError("Failed to enumerate directory.");
    }

    const allFiles: string[] = [];

    while (true) {
      const nextFile = enumerator.next_file(null);

      if (!nextFile) {
        break;
      }

      allFiles.push(nextFile.get_name());
    }

    enumerator.close(null);

    return allFiles;
  }

  /**
   * Gets information about a specific file or directory.
   */
  public fileInfo(path: string, options?: SyncFileInfoOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    const flag = getQueryFileFlag(opt);

    const info = file.query_info(
      getAttributes(opt.get("attributes", [])),
      flag,
      null,
    );

    return new FileInfo(file.get_path()!, info);
  }

  /**
   * Reads the content of a file under the given path.
   *
   * @returns A Promise with a byte array of the contents.
   */
  public readFile(path: string) {
    const file = this.file(path);

    const [bytes] = file.load_bytes(null);

    if (bytes != null) {
      return bytes.unref_to_array();
    } else {
      throw new FsError(`Failed to read file: ${file.get_path()}`);
    }
  }

  /**
   * Reads the content of a file under the given path using the
   * `readFile()` method and decodes that content to string using the
   * given encoding.
   */
  public readTextFile(
    path: string,
    options?: SyncReadTextFileOptions,
  ) {
    const opt = OptionsResolver(options, OptValidators);
    const decoder = new TextDecoder(opt.get("encoding", "utf-8"));

    const contents = this.readFile(path);

    return decoder.decode(contents);
  }

  /**
   * Writes the given data to a file under the given path.
   */
  public writeFile(
    path: string,
    contents: Uint8Array,
    options?: SyncWriteFileOptions,
  ) {
    validateBytes(contents);

    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    const createFlag = getCreateFileFlag(opt);

    if (contents.byteLength === 0) {
      const stream = file.replace(
        opt.get("etag", null),
        opt.get("makeBackup", false),
        createFlag,
        null,
      );

      let closeSuccess: boolean;

      try {
        stream.truncate(0, null);
      } finally {
        closeSuccess = stream.close(null);
      }

      if (closeSuccess) {
        return;
      } else {
        throw new FsError(
          `Failed to close file stream: ${file.get_path()}`,
        );
      }
    } else {
      const [success] = file.replace_contents(
        contents,
        opt.get("etag", null),
        opt.get("makeBackup", false),
        createFlag,
        null,
      );

      if (success) {
        return;
      } else {
        throw new FsError(`Failed to write file: ${file.get_path()}`);
      }
    }
  }

  /**
   * Encodes given string into a byte array (UTF-8), and writes that
   * data to a file under the given path using the `writeFile()`
   * method.
   */
  public writeTextFile(
    path: string,
    contents: string,
    options?: SyncWriteTextFileOptions,
  ) {
    validateText(contents);

    const encoder = new TextEncoder();

    const data = encoder.encode(contents);

    return this.writeFile(path, data, options);
  }

  /**
   * Appends the given data to a file under the given path.
   */
  public appendFile(
    path: string,
    contents: Uint8Array,
    options?: SyncAppendFileOptions,
  ) {
    validateBytes(contents);

    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    const createFlag = getCreateFileFlag(opt);

    const stream = file.append_to(createFlag, null);

    let closeSuccess: boolean;

    try {
      const bytes = GLib.Bytes.new(contents);
      const bytesWritten = stream.write_bytes(bytes, null);

      if (bytesWritten === -1) {
        throw new FsError(
          `Failed to append file: ${file.get_path()}`,
        );
      }
    } finally {
      closeSuccess = stream.close(null);
    }

    if (closeSuccess) {
      return;
    } else {
      throw new FsError(
        `Failed to close file stream: ${file.get_path()}`,
      );
    }
  }

  /**
   * Encodes given string into a byte array (UTF-8), and appends that
   * data to a file under the given path using the `appendFile()`
   * method.
   */
  public appendTextFile(
    path: string,
    contents: string,
    options?: SyncAppendTextFileOptions,
  ) {
    validateText(contents);

    const encoder = new TextEncoder();

    const data = encoder.encode(contents);

    return this.appendFile(path, data, options);
  }

  /**
   * Moves a file or directory from one path to another.
   */
  public moveFile(
    sourcePath: string,
    destinationPath: string,
    options?: SyncMoveFileOptions,
  ) {
    const oldFile = this.file(sourcePath);
    const newFile = this.file(destinationPath);
    const opt = OptionsResolver(options, OptValidators);
    const copyFlag = getCopyFileFlag(opt);

    const success = oldFile.move(
      newFile,
      copyFlag,
      null,
      opt.get("onProgress", null),
    );

    if (success) {
      return;
    } else {
      throw new FsError(
        `Failed to move file: ${oldFile.get_path()} -> ${newFile.get_path()}`,
      );
    }
  }

  /**
   * Alias for the `moveFile()` method.
   */
  public renameFile(
    sourcePath: string,
    destinationPath: string,
    options?: SyncMoveFileOptions,
  ) {
    return this.moveFile(sourcePath, destinationPath, options);
  }

  /**
   * Copies a file or directory from one path to another.
   */
  public copyFile(
    sourcePath: string,
    destinationPath: string,
    options?: SyncCopyFileOptions,
  ) {
    const srcFile = this.file(sourcePath);
    const destFile = this.file(destinationPath);
    const opt = OptionsResolver(options, OptValidators);
    const copyFlag = getCopyFileFlag(opt);

    const success = srcFile.copy(
      destFile,
      copyFlag,
      null,
      opt.get("onProgress", null),
    );

    if (success) {
      return;
    } else {
      throw new FsError(
        `Failed to copy file: ${srcFile.get_path()} -> ${destFile.get_path()}`,
      );
    }
  }

  /**
   * Deletes a file or directory from under the given path.
   *
   * If `trash` is set to `true`, the file will be moved to the user's
   * trash directory instead of being deleted.
   */
  public deleteFile(path: string, options?: SyncDeleteFileOptions) {
    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);

    if (opt.get("trash", false)) {
      const success = file.trash(null);

      if (success) {
        return;
      } else {
        throw new FsError(`Failed to trash file: ${file.get_path()}`);
      }
    }

    if (
      opt.get("recursive", false) &&
      this.fileInfo(path).isDirectory
    ) {
      const files = this.listFilenames(path, options);

      for (const filename of files) {
        this.deleteFile(join(path, filename), options);
      }
    }

    const success = file.delete(null);

    if (success) {
      return;
    } else {
      throw new FsError(`Failed to delete file: ${file.get_path()}`);
    }
  }

  /**
   * Creates a new directory under the given path.
   */
  public makeDir(path: string) {
    const file = this.file(path);

    const success = file.make_directory(null);

    if (success) {
      return;
    } else {
      throw new FsError(
        `Failed to make directory: ${file.get_path()}`,
      );
    }
  }

  /**
   * Creates a symbolic link file undef the path given in the first
   * parameter, created link will point to a file or directory that's
   * provided as the second parameter.
   *
   * @param linkPath The path to the new link file.
   * @param pointingTo Link destination file.
   */
  public makeLink(linkPath: string, pointingTo: string) {
    const linkFile = this.file(linkPath);
    const dest = this.resolvePath(pointingTo);

    const success = linkFile.make_symbolic_link(dest, null);

    if (success) {
      return;
    } else {
      throw new FsError(
        `Failed to create symbolic link: ${linkFile.get_path()} -> ${dest}`,
      );
    }
  }

  /**
   * Changes the UNIX permissions of a file or directory.
   *
   * The provided mode can be either:
   *
   * - A number representing the octal value of the permissions (ex.
   *   `0o755`)
   * - A string in the rwx format (ex. `rwxrw-r--`)
   * - An object describing all the permissions
   */
  public chmod(
    path: string,
    mode: FilePermission,
    options?: SyncChmodOptions,
  ) {
    validatePermissions(mode);

    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    const queryFlag = getQueryFileFlag(opt);

    const info = Gio.FileInfo.new();
    info.set_attribute_uint32(
      "unix::mode",
      parseFilePermission(mode),
    );

    const success = file.set_attributes_from_info(
      info,
      queryFlag,
      null,
    );

    if (success) {
      return;
    } else {
      throw new FsError(
        `Failed to change file permissions: ${file.get_path()}`,
      );
    }
  }

  /**
   * Changes the owner and group of a file or directory.
   */
  public chown(
    path: string,
    uid: number,
    gid: number,
    options?: SyncChownOptions,
  ) {
    validateNumber(uid, "uid");
    validateNumber(gid, "gid");

    const file = this.file(path);
    const opt = OptionsResolver(options, OptValidators);
    const queryFlag = getQueryFileFlag(opt);

    const info = Gio.FileInfo.new();
    info.set_attribute_uint32("unix::uid", uid);
    info.set_attribute_uint32("unix::gid", gid);

    const success = file.set_attributes_from_info(
      info,
      queryFlag,
      null,
    );

    if (!success) {
      throw new FsError(
        `Failed to change file owner: ${file.get_path()}`,
      );
    }
  }

  /**
   * Creates a new SyncIOStream instance.
   *
   * `type` parameter determines if the Stream should create a new
   * file, open an existing one or overwrite an existing one.
   */
  public openFileIOStream(
    path: string,
    type: IOStreamType,
    options: SyncIOStreamOptions = {},
  ) {
    return SyncIOStream.openFile(
      path,
      type,
      this._cwd ? { cwd: this._cwd, ...options } : options,
    );
  }

  // #endregion
}

export { SyncFs };
export type {
  SyncListDirOptions,
  SyncFileInfoOptions,
  SyncReadFileOptions,
  SyncReadTextFileOptions,
  SyncWriteFileOptions,
  SyncWriteTextFileOptions,
  SyncAppendFileOptions,
  SyncAppendTextFileOptions,
  SyncMoveFileOptions,
  SyncCopyFileOptions,
  SyncDeleteFileOptions,
  SyncChmodOptions,
  SyncChownOptions,
};
