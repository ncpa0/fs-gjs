import { VALID_ENCODINGS } from "./encoding";
import { InvalidOptionError } from "./errors";

type LiteralToType<T extends "number" | "string" | "boolean" | "function"> = {
  number: number;
  string: string;
  boolean: boolean;
  function: Function;
}[T];

function validateType<T extends "number" | "string" | "boolean" | "function">(
  v: any,
  name: string,
  t: T
): asserts v is LiteralToType<T> {
  if (typeof v !== t) {
    throw new InvalidOptionError(name, t);
  }
}

const validateAttributes = (v: any) => {
  validateType(v, "attributes", "string");
};

const validateFollowSymlinks = (v: any) => {
  validateType(v, "followSymlinks", "boolean");
};

const validateMakeBackup = (v: any) => {
  validateType(v, "makeBackup", "boolean");
};

const validateIoPriority = (v: any) => {
  validateType(v, "ioPriority", "number");

  if (!Number.isInteger(v)) {
    throw new InvalidOptionError("ioPriority", "integer");
  }
};

const validateRecursive = (v: any) => {
  validateType(v, "recursive", "boolean");
};

const validateEncoding = (v: any) => {
  validateType(v, "encoding", "string");

  if (!VALID_ENCODINGS.has(v)) {
    throw new InvalidOptionError("encoding", "valid encoding");
  }
};

const validateEtag = (v: any) => {
  validateType(v, "etag", "string");
};

const validateOnProgress = (v: any) => {
  validateType(v, "onProgress", "function");
};

const validateTrash = (v: any) => {
  validateType(v, "trash", "boolean");
};

const validateBatchSize = (v: any) => {
  validateType(v, "batchSize", "number");

  if (v < 0 || !Number.isInteger(v)) {
    throw new InvalidOptionError("batchSize", "positive integer");
  }
};

// Flags

const validateOverwrite = (v: any) => {
  validateType(v, "overwrite", "boolean");
};

const validateAllMetadata = (v: any) => {
  validateType(v, "allMetadata", "boolean");
};

const validateNoFallbackForMove = (v: any) => {
  validateType(v, "noFallbackForMove", "boolean");
};

const validateTargetDefaultPermissions = (v: any) => {
  validateType(v, "targetDefaultPermissions", "boolean");
};

const validatePrivate = (v: any) => {
  validateType(v, "private", "boolean");
};

const validateReplace = (v: any) => {
  validateType(v, "replace", "boolean");
};

export const OptValidators = new Map([
  ["attributes", validateAttributes],
  ["followSymlinks", validateFollowSymlinks],
  ["makeBackup", validateMakeBackup],
  ["ioPriority", validateIoPriority],
  ["recursive", validateRecursive],
  ["encoding", validateEncoding],
  ["etag", validateEtag],
  ["onProgress", validateOnProgress],
  ["trash", validateTrash],
  ["overwrite", validateOverwrite],
  ["allMetadata", validateAllMetadata],
  ["noFallbackForMove", validateNoFallbackForMove],
  ["targetDefaultPermissions", validateTargetDefaultPermissions],
  ["private", validatePrivate],
  ["replace", validateReplace],
]);
