import type { Encoding } from "./encoding";
import { FsError } from "./errors";
import { FileInfo } from "./file-info";
import type {
  AppendFileOptions,
  AppendTextFileOptions,
  ChmodOptions,
  ChownOptions,
  CopyFileOptions,
  DeleteFileOptions,
  FileExistsOptions,
  FileInfoOptions,
  ListDirOptions,
  MakeDirOptions,
  MakeLinkOptions,
  MoveFileOptions,
  ReadFileOptions,
  ReadTextFileOptions,
  WriteFileOptions,
  WriteTextFileOptions,
} from "./fs";
import { Fs } from "./fs";
import type { IOStreamOptions, IOStreamType } from "./io-stream";
import { IOStream } from "./io-stream";
import { Permission } from "./permission-parser";
import type {
  SyncAppendFileOptions,
  SyncAppendTextFileOptions,
  SyncChmodOptions,
  SyncChownOptions,
  SyncCopyFileOptions,
  SyncDeleteFileOptions,
  SyncFileInfoOptions,
  SyncListDirOptions,
  SyncMoveFileOptions,
  SyncReadFileOptions,
  SyncReadTextFileOptions,
  SyncWriteFileOptions,
  SyncWriteTextFileOptions,
} from "./sync-fs";
import { SyncFs } from "./sync-fs";
import type { SyncIOStreamOptions } from "./sync-io-stream";
import { SyncIOStream } from "./sync-io-stream";

export default Fs;
export {
  FileInfo,
  Fs,
  FsError,
  IOStream,
  Permission,
  SyncFs,
  SyncIOStream,
};
export type {
  AppendFileOptions,
  AppendTextFileOptions,
  ChmodOptions,
  ChownOptions,
  CopyFileOptions,
  DeleteFileOptions,
  Encoding,
  FileExistsOptions,
  FileInfoOptions,
  IOStreamOptions,
  IOStreamType,
  ListDirOptions,
  MakeDirOptions,
  MakeLinkOptions,
  MoveFileOptions,
  ReadFileOptions,
  ReadTextFileOptions,
  SyncAppendFileOptions,
  SyncAppendTextFileOptions,
  SyncChmodOptions,
  SyncChownOptions,
  SyncCopyFileOptions,
  SyncDeleteFileOptions,
  SyncFileInfoOptions,
  SyncIOStreamOptions,
  SyncListDirOptions,
  SyncMoveFileOptions,
  SyncReadFileOptions,
  SyncReadTextFileOptions,
  SyncWriteFileOptions,
  SyncWriteTextFileOptions,
  WriteFileOptions,
  WriteTextFileOptions,
};
