import Gio from "gi://Gio?version=2.0";
import type { OptionsResolver } from "./option-resolver";

export interface FileQueryFlagOptions {
  /**
   * Follow symlinks.
   */
  followSymlinks?: boolean;
}

export const getQueryFileFlag = (
  options: OptionsResolver<FileQueryFlagOptions>,
) => {
  if (options.get("followSymlinks", false) === true) {
    return Gio.FileQueryInfoFlags.NONE;
  }
  return Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS;
};

export interface FileCopyFlagOptions {
  /**
   * Overwrite any existing files
   */
  overwrite?: boolean;
  /**
   * Make a backup of any existing files.
   */
  makeBackup?: boolean;
  /**
   * Follow symlinks.
   */
  followSymlinks?: boolean;
  /**
   * Copy all file metadata instead of just default set used for copy
   * (see #GFileInfo).
   */
  allMetadata?: boolean;
  /**
   * Don't use copy and delete fallback if native move not supported.
   */
  noFallbackForMove?: boolean;
  /**
   * Leaves target file with default perms, instead of setting the
   * source file perms.
   */
  targetDefaultPermissions?: boolean;
}

export const getCopyFileFlag = (
  options: OptionsResolver<FileCopyFlagOptions>,
) => {
  let flags = Gio.FileCopyFlags.NONE;

  if (options.get("overwrite", false) === true) {
    flags |= Gio.FileCopyFlags.OVERWRITE;
  }

  if (options.get("makeBackup", false) === true) {
    flags |= Gio.FileCopyFlags.BACKUP;
  }

  if (options.get("followSymlinks", false) === false) {
    flags |= Gio.FileCopyFlags.NOFOLLOW_SYMLINKS;
  }

  if (options.get("allMetadata", false) === true) {
    flags |= Gio.FileCopyFlags.ALL_METADATA;
  }

  if (options.get("noFallbackForMove", false) === true) {
    flags |= Gio.FileCopyFlags.NO_FALLBACK_FOR_MOVE;
  }

  if (options.get("targetDefaultPermissions", false) === true) {
    flags |= Gio.FileCopyFlags.TARGET_DEFAULT_PERMS;
  }

  return flags;
};

export interface FileCreateFlagOptions {
  /**
   * Create a file that can only be accessed by the current user.
   */
  private?: boolean;
  /**
   * Replace the destination as if it didn't exist before. Don't try
   * to keep any old permissions, replace instead of following links.
   * This is generally useful if you're doing a "copy over" rather
   * than a "save new version of" replace operation. You can think of
   * it as "unlink destination" before writing to it, although the
   * implementation may not be exactly like that.
   */
  replace?: boolean;
}

export const getCreateFileFlag = (
  options: OptionsResolver<FileCreateFlagOptions>,
) => {
  let flags = Gio.FileCreateFlags.NONE;

  if (options.get("private", false) === true) {
    flags |= Gio.FileCreateFlags.PRIVATE;
  }

  if (options.get("replace", false) === true) {
    flags |= Gio.FileCreateFlags.REPLACE_DESTINATION;
  }

  return flags;
};
