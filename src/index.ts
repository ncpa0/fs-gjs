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

export default Fs;
export { Fs, FileInfo, FsError, IOStream };
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
};
