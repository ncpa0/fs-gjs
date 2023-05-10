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
export { Fs, SyncFs, FileInfo, FsError, IOStream, SyncIOStream };
export type {
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
  Encoding,
  IOStreamOptions,
  IOStreamType,
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
  SyncIOStreamOptions,
};
