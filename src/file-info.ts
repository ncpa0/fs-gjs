import Gio from "gi://Gio?version=2.0";

export class FileInfo {
  private _fileType;

  constructor(public filepath: string, public _gioInfo: Gio.FileInfo) {
    this._fileType = this._gioInfo.get_file_type();
  }

  get filename() {
    return this._gioInfo.get_name();
  }

  get isDirectory() {
    return this._fileType === Gio.FileType.DIRECTORY;
  }

  get isFile() {
    return this.isSymlink ? false : this._fileType === Gio.FileType.REGULAR;
  }

  get isSymlink() {
    return this._gioInfo.get_is_symlink();
  }

  get symlinkTarget() {
    return this._gioInfo.get_symlink_target();
  }

  get isMountpoint() {
    return this._gioInfo.get_attribute_boolean("unix::is-mountpoint");
  }

  /** The ID of the user that owns the file. */
  get uid() {
    return this._gioInfo.get_attribute_uint32("unix::uid");
  }

  /** The ID of the group that owns the file. */
  get gid() {
    return this._gioInfo.get_attribute_uint32("unix::gid");
  }

  /** The username of the user that own the file. */
  get username() {
    return this._gioInfo.get_attribute_string("owner::user");
  }

  /** The groupname of the group that owns the file. */
  get groupname() {
    return this._gioInfo.get_attribute_string("owner::group");
  }

  /** The icon of the file. */
  get icon() {
    return this._gioInfo.get_icon();
  }

  /**
   * The path to the thumbnail of the file. If it has one. If the
   * thumbnailing has recently failed or the current thumbnail is
   * outdated", " this value will be `null`.
   */
  get thumbnailPath(): string | null {
    const failed = this._gioInfo.get_attribute_boolean("thumbnail::failed");

    if (failed) {
      return null;
    }

    const isValid = this._gioInfo.get_attribute_boolean("thumbnail::valid");

    if (!isValid) {
      return null;
    }

    return this._gioInfo.get_attribute_byte_string("thumbnail::path");
  }

  /** Whether the file should be previewed in a file manager. */
  get usePreview() {
    return this._gioInfo.get_attribute_uint32(
      "filesystem::use-preview"
    ) as Gio.FilesystemPreviewType;
  }

  /** The size of the file in bytes. */
  get size() {
    return this._gioInfo.get_size();
  }

  /**
   * The time the file was last accessed in milliseconds since
   * the UNIX epoch.
   */

  get accessTime() {
    const sec = this._gioInfo.get_attribute_uint64("time::access");
    const usec = this._gioInfo.get_attribute_uint32("time::access-usec");

    const millis = Math.round(sec * 1000 + usec / 1000);

    return millis;
  }

  /**
   * The time the file was last modified in milliseconds since
   * the UNIX epoch.
   */
  get modifiedTime() {
    const sec = this._gioInfo.get_attribute_uint64("time::modified");
    const usec = this._gioInfo.get_attribute_uint32("time::modified-usec");

    const millis = Math.round(sec * 1000 + usec / 1000);

    return millis;
  }

  /**
   * The time the file was last changed in milliseconds since the
   * UNIX epoch.
   */
  get changedTime() {
    const sec = this._gioInfo.get_attribute_uint64("time::changed");
    const usec = this._gioInfo.get_attribute_uint32("time::changed-usec");

    const millis = Math.round(sec * 1000 + usec / 1000);

    return millis;
  }

  /**
   * The time the file was created in milliseconds since the UNIX
   * epoch.
   */
  get createdTime() {
    const sec = this._gioInfo.get_attribute_uint64("time::created");
    const usec = this._gioInfo.get_attribute_uint32("time::created-usec");

    const millis = Math.round(sec * 1000 + usec / 1000);

    return millis;
  }

  /** The block size of the filesystem. */
  get blockSize() {
    return this._gioInfo.get_attribute_uint32("unix::block-size");
  }

  /** The number of blocks allocated for the file. */
  get blocks() {
    return this._gioInfo.get_attribute_uint64("unix::blocks");
  }

  /** Whether the file can be read from. */
  get canRead() {
    return this._gioInfo.get_attribute_boolean("access::can-read");
  }

  /** Whether the file can be written to. */
  get canWrite() {
    return this._gioInfo.get_attribute_boolean("access::can-write");
  }

  /** Whether the file can be executed. */
  get canExecute() {
    return this._gioInfo.get_attribute_boolean("access::can-execute");
  }

  /** Whether the file can be deleted. */
  get canDelete() {
    return this._gioInfo.get_attribute_boolean("access::can-delete");
  }

  /** Whether the file can be trashed. */
  get canTrash() {
    return this._gioInfo.get_attribute_boolean("access::can-trash");
  }
}

/**
 * A list of attributes used in every File operation within
 * fs-gjs.
 */
export const BASE_ATTRIBUTES = new Set([
  "standard::*",
  "etag::value",
  "unix::is-mountpoint",
  "unix::uid",
  "unix::gid",
  "unix::block-size",
  "unix::blocks",
  "unix::mode",
  "owner::user",
  "access::can-read",
  "access::can-write",
  "access::can-execute",
  "access::can-delete",
  "access::can-trash",
  "owner::group",
  "filesystem::size",
  "filesystem::use-preview",
  "time::access",
  "time::access-usec",
  "time::modified",
  "time::modified-usec",
  "time::changed",
  "time::changed-usec",
  "time::created",
  "time::created-usec",
  "thumbnail::failed",
  "thumbnail::valid",
  "thumbnail::path",
]);

export const getAttributes = (attributes: string[]) => {
  const final = new Set(BASE_ATTRIBUTES);

  for (let i = 0; i < attributes.length; ++i) {
    final.add(attributes[i]!);
  }

  let result = "";
  final.forEach((attr) => {
    result += attr + ",";
  });

  return result;
};
