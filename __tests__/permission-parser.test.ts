import { describe, expect, it } from "@reactgjs/gest";
import { parseFilePermission } from "../src/permission-parser";

export default describe("parseFilePermission", () => {
  it("should return numeric values as given", () => {
    expect(parseFilePermission(0o124)).toBe(0o124);
    expect(parseFilePermission(0o777)).toBe(0o777);
    expect(parseFilePermission(0o050)).toBe(0o050);
  });

  it("should correctly parse object values", () => {
    const result1 = parseFilePermission({
      owner: {
        read: true,
        write: true,
        execute: true,
      },
      group: {
        read: true,
        write: false,
        execute: true,
      },
      others: {
        read: false,
        write: true,
        execute: true,
      },
    });

    expect(result1).toBe(0o753);

    const result2 = parseFilePermission({
      owner: {
        read: true,
        write: true,
        execute: false,
      },
      group: {
        read: false,
        write: false,
        execute: false,
      },
      others: {
        read: false,
        write: false,
        execute: true,
      },
    });

    expect(result2).toBe(0o601);
  });

  it("should correctly parse string values", () => {
    expect(parseFilePermission("rwxrwxrwx")).toBe(0o777);
    expect(parseFilePermission("rwxr-xr-x")).toBe(0o755);
    expect(parseFilePermission("rw-rw-rw-")).toBe(0o666);
    expect(parseFilePermission("rw-r--r--")).toBe(0o644);
    expect(parseFilePermission("rwx------")).toBe(0o700);
    expect(parseFilePermission("rw-------")).toBe(0o600);
    expect(parseFilePermission("r--------")).toBe(0o400);
    expect(parseFilePermission("---------")).toBe(0o000);
    expect(parseFilePermission("-------wx")).toBe(0o003);
    expect(parseFilePermission("-----x-w-")).toBe(0o012);
  });
});
