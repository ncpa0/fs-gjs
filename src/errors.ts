export class FsError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FsError";
  }
}
