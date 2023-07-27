import { VALID_ENCODINGS } from "./encoding";
import { InvalidOptionError } from "./errors";
import type { FilePermission } from "./permission-parser";

type LiteralToType<
  T extends "number" | "string" | "boolean" | "function" | "object",
> = {
  number: number;
  string: string;
  boolean: boolean;
  function: Function;
  object: object;
}[T];

// #region Option Validators

function validateType<
  T extends "number" | "string" | "boolean" | "function" | "object",
>(v: any, name: string, t: T): asserts v is LiteralToType<T> {
  if (typeof v !== t) {
    throw new InvalidOptionError(name, t);
  }

  if (t === "number" && Number.isNaN(v)) {
    throw new InvalidOptionError(name, t);
  }
}

const validateAbortSignal = (v: any) => {
  if (typeof AbortSignal === "undefined") {
    throw new Error(
      "AbortSignal is not supported in this environment.",
    );
  }

  validateType(v, "abortSignal", "object");

  if (!(v instanceof AbortSignal)) {
    throw new InvalidOptionError(
      "abortSignal",
      "AbortSignal instance",
    );
  }
};

const validateAttributes = (v: any) => {
  if (!Array.isArray(v)) {
    throw new InvalidOptionError("attributes", "array");
  }

  for (let i = 0; i < v.length; i++) {
    validateType(v[i], `attributes[${i}]`, "string");
  }
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

  if (v <= 0 || !Number.isInteger(v)) {
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
  ["abortSignal", validateAbortSignal],
  ["allMetadata", validateAllMetadata],
  ["attributes", validateAttributes],
  ["batchSize", validateBatchSize],
  ["encoding", validateEncoding],
  ["etag", validateEtag],
  ["followSymlinks", validateFollowSymlinks],
  ["ioPriority", validateIoPriority],
  ["makeBackup", validateMakeBackup],
  ["noFallbackForMove", validateNoFallbackForMove],
  ["onProgress", validateOnProgress],
  ["overwrite", validateOverwrite],
  ["private", validatePrivate],
  ["recursive", validateRecursive],
  ["replace", validateReplace],
  ["targetDefaultPermissions", validateTargetDefaultPermissions],
  ["trash", validateTrash],
]);

// #endregion

// #region Other Validators

export function validateBytes(
  v: any,
  name?: string,
): asserts v is Uint8Array {
  if (!(v instanceof Uint8Array)) {
    throw new TypeError(
      "Expected a [Uint8Array]." + (name ? ` (${name})` : ""),
    );
  }
}

export function validateText(
  v: any,
  name?: string,
): asserts v is string {
  if (typeof v !== "string") {
    throw new TypeError(
      "Expected a [string]." + (name ? ` (${name})` : ""),
    );
  }
}

export function validateNumber(
  v: any,
  name?: string,
): asserts v is number {
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new TypeError(
      "Expected a [number]." + (name ? ` (${name})` : ""),
    );
  }
}

export function validatePositiveNumber(
  v: any,
  name?: string,
): asserts v is number {
  if (typeof v !== "number" || Number.isNaN(v) || v <= 0) {
    throw new TypeError(
      "Expected a [positive number]." + (name ? ` (${name})` : ""),
    );
  }
}

export function validateInteger(
  v: any,
  name?: string,
): asserts v is number {
  if (
    typeof v !== "number" ||
    Number.isNaN(v) ||
    !Number.isInteger(v)
  ) {
    throw new TypeError(
      "Expected a [integer]." + (name ? ` (${name})` : ""),
    );
  }
}

export function validatePositiveInteger(
  v: any,
  name?: string,
): asserts v is number {
  if (
    typeof v !== "number" ||
    Number.isNaN(v) ||
    v <= 0 ||
    !Number.isInteger(v)
  ) {
    throw new TypeError(
      "Expected a [positive integer]." + (name ? ` (${name})` : ""),
    );
  }
}

const PERMS_REGEXP = /^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/;
export function validatePermissions(perms: FilePermission) {
  if (typeof perms === "number") {
    return;
  }

  if (typeof perms === "string" && !PERMS_REGEXP.test(perms)) {
    throw new TypeError("Expected a [string] detailing permissions.");
  }

  if (typeof perms === "object") {
    const isValid =
      typeof perms.group === "object" &&
      perms.group != null &&
      typeof perms.group.execute === "boolean" &&
      typeof perms.group.read === "boolean" &&
      typeof perms.group.write === "boolean" &&
      typeof perms.group === "object" &&
      perms.others != null &&
      typeof perms.others.execute === "boolean" &&
      typeof perms.others.read === "boolean" &&
      typeof perms.others.write === "boolean" &&
      typeof perms.others === "object" &&
      perms.owner != null &&
      typeof perms.owner.execute === "boolean" &&
      typeof perms.owner.read === "boolean" &&
      typeof perms.owner.write === "boolean";

    if (!isValid) {
      throw new TypeError(
        "Expected a [object] detailing permissions.",
      );
    }
  }
}

// #endregion
