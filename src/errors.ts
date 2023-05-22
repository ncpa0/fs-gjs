export class FsError extends Error {
  static isFsError(err: any): err is FsError {
    return !!err && typeof err === "object" && err instanceof FsError;
  }

  static from(err: Error) {
    const fsErr = new FsError(err.message);
    fsErr.stack = err.stack;
    return fsErr;
  }

  private _isPrefixAdded = false;

  constructor(msg: string) {
    super(msg);
    this.name = "FsError";
  }

  addMessagePrefix(msg: string) {
    if (this._isPrefixAdded) return; // Prevent adding prefix twice.

    this.message = `${msg}: ${this.message}`;
    this._isPrefixAdded = true;
  }
}

export class InvalidOptionError extends TypeError {
  constructor(public name: string, public expectedType: any) {
    super(`Invalid option: '${name}' - Expected a [${expectedType}].`);
  }
}
