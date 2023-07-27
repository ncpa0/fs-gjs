export class FsError extends Error {
  static isFsError(err: any): err is FsError {
    return !!err && typeof err === "object" && err instanceof FsError;
  }

  static from(err: Error) {
    const fsErr = new FsError(err.message);
    fsErr.stack = err.stack;
    return fsErr;
  }

  private _originalMessage;

  constructor(msg: string) {
    super(msg);
    this._originalMessage = msg;
    this.name = "FsError";
  }

  setOriginFunctionName(name: string) {
    this.message = `'${name}' failed with error: ${this._originalMessage}`;
    return this;
  }
}

export class InvalidOptionError extends TypeError {
  constructor(
    public name: string,
    public expectedType: any,
  ) {
    super(`Invalid option '${name}' - Expected a [${expectedType}].`);
  }
}
