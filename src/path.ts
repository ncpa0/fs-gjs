const SEPARATOR_CHAR = "/";

function __assertPath(path: any): asserts path is string {
  if (typeof path !== "string") {
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(path),
    );
  }
}

function normalizeString(path: string, allowAboveRoot: boolean) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i);
    else if (code === 47 /*/*/) break;
    else code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== 46 /*.*/ ||
          res.charCodeAt(res.length - 2) !== 46 /*.*/
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(SEPARATOR_CHAR);
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = "";
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength =
                  res.length - 1 - res.lastIndexOf(SEPARATOR_CHAR);
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += "/..";
          else res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += SEPARATOR_CHAR + path.slice(lastSlash + 1, i);
        else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

export function isAbsolute(path: string) {
  __assertPath(path);
  return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
}

export function normalize(path: string) {
  __assertPath(path);

  if (path.length === 0) return ".";

  const isAbsolute = path.charCodeAt(0) === 47; /*/*/
  const trailingSeparator =
    path.charCodeAt(path.length - 1) === 47; /*/*/

  // Normalize the path
  path = normalizeString(path, !isAbsolute);

  if (path.length === 0 && !isAbsolute) path = ".";
  if (path.length > 0 && trailingSeparator) path += SEPARATOR_CHAR;

  if (isAbsolute) return SEPARATOR_CHAR + path;
  return path;
}

export function join(...args: string[]) {
  if (args.length === 0) return ".";
  let joined;
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    __assertPath(arg);
    if (arg.length > 0) {
      if (joined === undefined) joined = arg;
      else joined += SEPARATOR_CHAR + arg;
    }
  }
  if (joined === undefined) return ".";
  return normalize(joined);
}
