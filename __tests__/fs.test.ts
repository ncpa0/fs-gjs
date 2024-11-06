import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  match,
  skip,
} from "@reactgjs/gest";
import GLib from "gi://GLib?version=2.0";
import { Fs, IOStream, Permission } from "../src/index";
import {
  compareBytes,
  lns,
  matchFsError,
  matchMessageContaining,
} from "./shared";

declare global {
  const _CI_: boolean;
}

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Praesent quis turpis pharetra, lobortis felis vitae, lacinia magna.
Donec ac dolor pulvinar, laoreet libero a, pellentesque massa.
Mauris vel erat vitae ex suscipit euismod. Nulla commodo mollis
nulla, id sagittis justo eleifend at. Phasellus euismod sem eu
risus ultrices posuere a dignissim leo. Praesent a vulputate nibh,
nec accumsan nunc. Pellentesque a est nisi. In at porttitor eros,
non placerat ante. Curabitur quis porta eros, sit amet aliquet
sapien.

Donec ac eros arcu. Quisque egestas ullamcorper turpis vitae pretium.
Vestibulum sed nisl mollis, malesuada mauris in, convallis felis.
Maecenas mollis eros iaculis elit interdum, ac fringilla sem
bibendum. Maecenas rhoncus lobortis dictum. Cras ligula dolor,
aliquet non semper sit amet, gravida vitae elit. Praesent ac varius
risus. Nulla varius suscipit mauris nec vestibulum. Nulla facilisis
fringilla interdum. Sed consectetur ex eu fermentum rhoncus.
Suspendisse placerat lorem at scelerisque bibendum. In hac habitasse
platea dictumst. Ut facilisis, nisi in ultrices viverra, justo magna
dignissim augue, a sagittis erat arcu et metus. Lorem ipsum dolor sit
amet, consectetur adipiscing elit. Donec at commodo purus.
`;

let _i = 1;
const getNextTestFile = () => `test${_i++}`;

const TMP_DIR_PATH =
  GLib.get_current_dir() + "/__tests__/fs-test-tmp";

export default describe("Fs", () => {
  let testFile = "";
  const fs = new Fs({ cwd: TMP_DIR_PATH });

  beforeAll(async () => {
    const tmpDirExists = await Fs.fileExists(TMP_DIR_PATH);
    if (!tmpDirExists) {
      await Fs.makeDir(TMP_DIR_PATH);
    }
  });

  beforeEach(() => {
    testFile = getNextTestFile();
  });

  afterAll(async () => {
    const files = await fs.listDir(".");

    await Promise.all(
      files.map((f) =>
        fs.deleteFile(f.filepath, { recursive: true, trash: !_CI_ }),
      ),
    );
  });

  describe("positive scenarios", () => {
    describe("fileExists", () => {
      it("should return true for an existing file", async () => {
        await fs.writeFile(testFile, new Uint8Array([1, 2, 3, 4]));
        expect(await fs.fileExists(testFile)).toBe(true);
      });

      it("should return false for a non-existing file", async () => {
        expect(await fs.fileExists(testFile)).toBe(false);
      });
    });

    describe("listDir", () => {
      it("should return a list of FileInfo objects for each file and dir", async () => {
        // setup
        await fs.makeDir(testFile);

        await fs.writeTextFile(testFile + "/txtfile", "123");
        await fs.writeTextFile(
          testFile + "/executable",
          "#!/bin/bash",
        );
        await fs.chmod(testFile + "/executable", "rwxr-xr-x");
        await fs.makeDir(testFile + "/childDir");
        await lns(
          testFile + "/link",
          testFile + "/txtfile",
          TMP_DIR_PATH,
        );

        // test
        const files = await fs.listDir(testFile);

        expect(files.length).toBe(4);
        expect(files).toContainMatch(
          {
            filename: "txtfile",
            filepath: match.stringContaining(testFile + "/txtfile"),
            isDirectory: false,
            isFile: true,
            isSymlink: false,
            canDelete: true,
            canExecute: false,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
          {
            filename: "executable",
            filepath: match.stringContaining(
              testFile + "/executable",
            ),
            isDirectory: false,
            isFile: true,
            isSymlink: false,
            canDelete: true,
            canExecute: true,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
          {
            filename: "childDir",
            filepath: match.stringContaining(testFile + "/childDir"),
            isDirectory: true,
            isFile: false,
            isSymlink: false,
            canDelete: true,
            canExecute: true,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
          {
            filename: "link",
            filepath: match.stringContaining(testFile + "/link"),
            symlinkTarget: match.stringContaining(
              testFile + "/txtfile",
            ),
            isDirectory: false,
            isFile: false,
            isSymlink: true,
            canDelete: true,
            canExecute: false,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
        );
      });

      it("should work with flag options", async () => {
        // setup
        await fs.makeDir(testFile);

        await fs.writeTextFile(testFile + "/txtfile", "123");
        await fs.writeTextFile(
          testFile + "/executable",
          "#!/bin/bash",
        );
        await fs.chmod(testFile + "/executable", "rwxr-xr-x");
        await fs.makeDir(testFile + "/childDir");
        await lns(
          testFile + "/link",
          testFile + "/txtfile",
          TMP_DIR_PATH,
        );

        // test
        const files = await fs.listDir(testFile, {
          attributes: ["*"],
          batchSize: 2,
          followSymlinks: true,
        });

        expect(files.length).toBe(4);
        expect(files).toContainMatch(
          {
            filename: "txtfile",
            filepath: match.stringContaining(testFile + "/txtfile"),
            isDirectory: false,
            isFile: true,
            isSymlink: false,
            canDelete: true,
            canExecute: false,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
          {
            filename: "executable",
            filepath: match.stringContaining(
              testFile + "/executable",
            ),
            isDirectory: false,
            isFile: true,
            isSymlink: false,
            canDelete: true,
            canExecute: true,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
          {
            filename: "childDir",
            filepath: match.stringContaining(testFile + "/childDir"),
            isDirectory: true,
            isFile: false,
            isSymlink: false,
            canDelete: true,
            canExecute: true,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
          {
            filename: "link",
            filepath: match.stringContaining(testFile + "/link"),
            symlinkTarget: match.stringContaining(
              testFile + "/txtfile",
            ),
            isDirectory: false,
            isFile: false,
            isSymlink: true,
            canDelete: true,
            canExecute: false,
            canRead: true,
            canWrite: true,
            canTrash: true,
          },
        );
      });
    });

    describe("listFilenames", () => {
      it("should return a list of FileInfo objects for each file and dir", async () => {
        // setup
        await fs.makeDir(testFile);

        await fs.writeTextFile(testFile + "/file.txt", "123");
        await fs.writeFile(
          testFile + "/binary",
          new Uint8Array([1, 2, 3, 4]),
        );
        await fs.writeTextFile(
          testFile + "/executable.sh",
          "#!/bin/bash",
        );
        await fs.makeDir(testFile + "/childDir");
        await lns(
          testFile + "/link",
          testFile + "/file.txt",
          TMP_DIR_PATH,
        );

        // test
        const files = await fs.listFilenames(testFile, {
          batchSize: 2,
        });

        expect(files.length).toBe(5);
        expect(files).toContainOnly(
          "file.txt",
          "binary",
          "executable.sh",
          "childDir",
          "link",
        );
      });
    });

    describe("fileInfo", () => {
      it("should return a FileInfo object for the given file", async () => {
        // setup
        await fs.makeDir(testFile);

        await fs.writeTextFile(testFile + "/txtfile", "123");
        await fs.writeTextFile(
          testFile + "/executable",
          "#!/bin/bash",
        );
        await fs.chmod(testFile + "/executable", "rwxr-xr-x");
        await fs.makeDir(testFile + "/childDir");
        await lns(
          testFile + "/link",
          testFile + "/txtfile",
          TMP_DIR_PATH,
        );

        // test
        const txtfileInfo = await fs.fileInfo(testFile + "/txtfile");
        const executableInfo = await fs.fileInfo(
          testFile + "/executable",
        );
        const childDirInfo = await fs.fileInfo(
          testFile + "/childDir",
        );
        const linkInfo = await fs.fileInfo(testFile + "/link");

        expect(txtfileInfo).toMatch({
          filename: "txtfile",
          filepath: match.stringContaining(testFile + "/txtfile"),
          isDirectory: false,
          isFile: true,
          isSymlink: false,
          canDelete: true,
          canExecute: false,
          canRead: true,
          canWrite: true,
          canTrash: true,
        });

        expect(executableInfo).toMatch({
          filename: "executable",
          filepath: match.stringContaining(testFile + "/executable"),
          isDirectory: false,
          isFile: true,
          isSymlink: false,
          canDelete: true,
          canExecute: true,
          canRead: true,
          canWrite: true,
          canTrash: true,
        });

        expect(childDirInfo).toMatch({
          filename: "childDir",
          filepath: match.stringContaining(testFile + "/childDir"),
          isDirectory: true,
          isFile: false,
          isSymlink: false,
          canDelete: true,
          canExecute: true,
          canRead: true,
          canWrite: true,
          canTrash: true,
        });

        expect(linkInfo).toMatch({
          filename: "link",
          filepath: match.stringContaining(testFile + "/link"),
          symlinkTarget: match.stringContaining(
            testFile + "/txtfile",
          ),
          isDirectory: false,
          isFile: false,
          isSymlink: true,
          canDelete: true,
          canExecute: false,
          canRead: true,
          canWrite: true,
          canTrash: true,
        });
      });
    });

    describe("readFile", () => {
      it("should correctly read the contents of the file", async () => {
        const bytes = await fs.readFile("../data/lorem-ipsum.txt");

        const text = new TextDecoder().decode(bytes);

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("readTextFile", () => {
      it("should correctly read the contents of the file", async () => {
        const text = await fs.readTextFile("../data/lorem-ipsum.txt");

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("writeFile", () => {
      it("should correctly create a new file and write to it", async () => {
        const data = new Uint8Array([2, 1, 4, 3, 6, 5, 8, 7]);
        await fs.writeFile(testFile, data);

        const readData = await fs.readFile(testFile);
        expect(readData).toEqual(data);
      });

      it("should overwrite an existing file", async () => {
        const data = new Uint8Array([2, 1, 4, 3, 6, 5, 8, 7]);
        await fs.writeFile(testFile, data);

        const readData = await fs.readFile(testFile);
        expect(readData).toEqual(data);

        const newData = new Uint8Array([100, 1000, 10000]);
        await fs.writeFile(testFile, newData);

        const readNewData = await fs.readFile(testFile);
        expect(readNewData).toEqual(newData);
      });

      it("should work with flag options", async () => {
        const data = new Uint8Array([2, 1, 4, 3, 6, 5, 8, 7]);
        await fs.writeFile(testFile, data);

        const readData = await fs.readFile(testFile);
        expect(readData).toEqual(data);

        const newData = new Uint8Array([100, 1000, 10000]);
        await fs.writeFile(testFile, newData, {
          makeBackup: true,
          private: true,
          replace: true,
        });

        const readNewData = await fs.readFile(testFile);
        expect(readNewData).toEqual(newData);

        const backupData = await fs.readFile(testFile + "~");
        expect(compareBytes(backupData, data)).toBe(true);
      });
    });

    describe("writeTextFile", () => {
      it("should correctly encode the content", async () => {
        const data = "hello world";
        await fs.writeTextFile(testFile, data);

        const readData = await fs.readTextFile(testFile);
        expect(readData).toEqual(data);

        const newData =
          "bye\ncruel\nworld\nit was not nice knowing you";
        await fs.writeTextFile(testFile, newData);

        const readNewData = await fs.readTextFile(testFile);
        expect(readNewData).toEqual(newData);
      });
    });

    describe("appendFile", () => {
      it("should open an existing file and append new content to it", async () => {
        const bytes1 = new Uint8Array([1, 2, 3, 4]);
        const bytes2 = new Uint8Array([5, 6, 7, 8]);

        await fs.writeFile(testFile, bytes1);
        await fs.appendFile(testFile, bytes2);

        const readData = await fs.readFile(testFile);

        expect(readData).toEqual(
          new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        );
      });
    });

    describe("appendTextFile", () => {
      it("should open an existing file and append new content to it", async () => {
        const text1 = loremIpsum.slice(0, 525);
        const text2 = loremIpsum.slice(525);

        await fs.writeTextFile(testFile, text1);
        await fs.appendTextFile(testFile, text2);

        const readData = await fs.readTextFile(testFile);

        expect(readData).toEqual(loremIpsum);
      });
    });

    describe("moveFile", () => {
      it("should correctly rename given file", async () => {
        await fs.writeTextFile(testFile, loremIpsum);

        await fs.moveFile(testFile, testFile + "-renamed");

        const files = await fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile + "-renamed",
        });
        expect(files).not.toContainMatch({
          filename: testFile,
        });

        const text = await fs.readTextFile(testFile + "-renamed");

        expect(text).toEqual(loremIpsum);
      });

      it("should work with flag options", async () => {
        await fs.writeTextFile(testFile, loremIpsum);

        await fs.writeFile(
          testFile + "-ov",
          new Uint8Array([1, 2, 3, 4]),
        );

        await fs.moveFile(testFile, testFile + "-ov", {
          allMetadata: true,
          makeBackup: true,
          noFallbackForMove: true,
          overwrite: true,
          targetDefaultPermissions: true,
        });

        const files = await fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile + "-ov",
        });
        expect(files).toContainMatch({
          filename: testFile + "-ov~",
        });
        expect(files).not.toContainMatch({
          filename: testFile,
        });

        const text = await fs.readTextFile(testFile + "-ov");

        expect(text).toEqual(loremIpsum);

        const backup = await fs.readFile(testFile + "-ov~");
        expect(
          compareBytes(backup, new Uint8Array([1, 2, 3, 4])),
        ).toBe(true);
      });
    });

    describe("copyFile", () => {
      it("should correctly copy the given file", async () => {
        await fs.writeTextFile(testFile, loremIpsum);

        await fs.copyFile(testFile, testFile + "-copied");

        const files = await fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile + "-copied",
        });
        expect(files).toContainMatch({
          filename: testFile,
        });

        const text = await fs.readTextFile(testFile + "-copied");

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("deleteFile", () => {
      it("should delete the given file", async () => {
        await fs.writeTextFile(testFile, "");

        const files = await fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile,
        });

        await fs.deleteFile(testFile);

        const filesAfterDelete = await fs.listDir(".");

        expect(filesAfterDelete).not.toContainMatch({
          filename: testFile,
        });
      });

      it("should delete recursively if the recursive option is set", async () => {
        await fs.makeDir(testFile);
        await fs.writeTextFile(testFile + "/file1", "");
        await fs.writeTextFile(testFile + "/file2", "");
        await fs.makeDir(testFile + "/dir1");
        await fs.writeTextFile(testFile + "/dir1/file1", "");
        await fs.makeDir(testFile + "/dir1/dir2");
        await fs.writeTextFile(testFile + "/dir1/dir2/file1", "");

        const files = await fs.listDir(testFile);

        expect(files).toContainMatch(
          {
            filename: "file1",
            isFile: true,
          },
          {
            filename: "file2",
            isFile: true,
          },
          {
            filename: "dir1",
            isDirectory: true,
          },
        );

        const dirFiles = await fs.listDir(testFile + "/dir1");

        expect(dirFiles).toContainMatch(
          {
            filename: "file1",
            isFile: true,
          },
          {
            filename: "dir2",
            isDirectory: true,
          },
        );

        const dir2Files = await fs.listDir(testFile + "/dir1/dir2");

        expect(dir2Files).toContainMatch({
          filename: "file1",
          isFile: true,
        });

        await fs.deleteFile(testFile, { recursive: true });

        const testFileExists = await fs.fileExists(testFile);

        expect(testFileExists).toBe(false);
      });
    });

    describe("makeDir", () => {
      it("should make a directory", async () => {
        await fs.makeDir(testFile);

        const exists = await fs.fileExists(testFile);

        expect(exists).toBe(true);

        const info = await fs.fileInfo(testFile);

        expect(info.isDirectory).toBe(true);
      });
    });

    describe("makeLink", () => {
      /**
       * CI workflow runs on Ubuntu latest, for some reason,
       * Gio.File.make_symbolic_link_async is not available on the
       * version of GJS+GIO that is shipped with that image so we have
       * to skip this test.
       */
      const itOnlyLocal = _CI_ ? skip : it;

      itOnlyLocal("should make a link", async () => {
        await fs.writeTextFile(testFile, loremIpsum);
        await fs.makeLink(testFile + "-link", testFile);

        const exists = await fs.fileExists(testFile + "-link");
        expect(exists).toBe(true);

        const info = await fs.fileInfo(testFile + "-link");
        expect(info.isSymlink).toBe(true);
        expect(info.symlinkTarget).toMatchRegex(
          new RegExp(`^.+?${testFile}$`),
        );
      });
    });

    describe("chmod", () => {
      it("should change the permission of the given file", async () => {
        await fs.writeTextFile(testFile, loremIpsum);

        await fs.chmod(testFile, "rwxrwxrwx");

        const info1 = await fs.fileInfo(testFile);

        expect(info1.checkPermission(Permission.OwnerRead)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.OwnerWrite)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.OwnerExecute)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.GroupRead)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.GroupWrite)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.GroupExecute)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.OthersRead)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.OthersWrite)).toBe(
          true,
        );
        expect(info1.checkPermission(Permission.OthersExecute)).toBe(
          true,
        );

        await fs.chmod(testFile, "---------");

        const info2 = await fs.fileInfo(testFile);

        expect(info2.checkPermission(Permission.OwnerRead)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.OwnerWrite)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.OwnerExecute)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.GroupRead)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.GroupWrite)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.GroupExecute)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.OthersRead)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.OthersWrite)).toBe(
          false,
        );
        expect(info2.checkPermission(Permission.OthersExecute)).toBe(
          false,
        );

        await fs.chmod(testFile, {
          group: {
            read: true,
            write: true,
            execute: true,
          },
          others: {
            read: true,
            write: true,
            execute: true,
          },
          owner: { read: true, write: true, execute: true },
        });

        const info3 = await fs.fileInfo(testFile);

        expect(info3.checkPermission(Permission.OwnerRead)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.OwnerWrite)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.OwnerExecute)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.GroupRead)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.GroupWrite)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.GroupExecute)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.OthersRead)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.OthersWrite)).toBe(
          true,
        );
        expect(info3.checkPermission(Permission.OthersExecute)).toBe(
          true,
        );
      });
    });

    describe("openIOStream", () => {
      it("should create new instance of IOStream (CREATE)", async () => {
        const stream = await fs.openFileIOStream(testFile, "CREATE");

        expect(stream).toBeDefined();
        expect(stream instanceof IOStream).toBe(true);
        expect(stream.state).toBe("OPEN");
        expect(stream.type).toBe("CREATE");

        await stream.close();
      });

      it("should create new instance of IOStream (OPEN)", async () => {
        await fs.writeTextFile(testFile, "");

        const stream = await fs.openFileIOStream(testFile, "OPEN");

        expect(stream).toBeDefined();
        expect(stream instanceof IOStream).toBe(true);
        expect(stream.state).toBe("OPEN");
        expect(stream.type).toBe("OPEN");

        await stream.close();
      });

      it("should create new instance of IOStream (REPLACE)", async () => {
        await fs.writeTextFile(testFile, "");

        const stream = await fs.openFileIOStream(testFile, "REPLACE");

        expect(stream).toBeDefined();
        expect(stream instanceof IOStream).toBe(true);
        expect(stream.state).toBe("OPEN");
        expect(stream.type).toBe("REPLACE");

        await stream.close();
      });
    });
  });

  describe("negative scenarios", () => {
    describe("invalid options", () => {
      describe("listDir", () => {
        it("should fail when invalid option given: 'followSymlinks'", async () => {
          await expect(
            fs.listDir(".", { followSymlinks: 1 as any }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'followSymlinks' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'attributes'", async () => {
          await expect(
            fs.listDir(".", { attributes: 1 as any }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'attributes' - Expected a [array].",
            ),
          );
        });

        it("should fail when invalid option given: 'batchSize'", async () => {
          await expect(
            fs.listDir(".", { batchSize: "12" as any }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'batchSize' - Expected a [number].",
            ),
          );
          await expect(
            fs.listDir(".", { batchSize: NaN }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'batchSize' - Expected a [number].",
            ),
          );
          await expect(
            fs.listDir(".", { batchSize: -1 }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'batchSize' - Expected a [positive integer].",
            ),
          );
          await expect(
            fs.listDir(".", { batchSize: 1.000000000001 }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'batchSize' - Expected a [positive integer].",
            ),
          );
        });

        it("should fail when invalid option given: 'ioPriority'", async () => {
          await expect(
            fs.listDir(".", { ioPriority: "" as any }),
          ).toRejectMatch(
            matchFsError(
              "'listDir' failed with error: Invalid option 'ioPriority' - Expected a [number].",
            ),
          );
        });
      });

      describe("fileInfo", () => {
        it("should fail when invalid option given: 'followSymlinks'", async () => {
          await expect(
            fs.fileInfo(".", { followSymlinks: 1 as any }),
          ).toRejectMatch(
            matchFsError(
              "'fileInfo' failed with error: Invalid option 'followSymlinks' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'attributes'", async () => {
          await expect(
            fs.fileInfo(".", { attributes: 1 as any }),
          ).toRejectMatch(
            matchFsError(
              "'fileInfo' failed with error: Invalid option 'attributes' - Expected a [array].",
            ),
          );
          await expect(
            fs.fileInfo(".", { attributes: "*" as any }),
          ).toRejectMatch(
            matchFsError(
              "'fileInfo' failed with error: Invalid option 'attributes' - Expected a [array].",
            ),
          );
          await expect(
            fs.fileInfo(".", { attributes: [1] as any }),
          ).toRejectMatch(
            matchFsError(
              "'fileInfo' failed with error: Invalid option 'attributes[0]' - Expected a [string].",
            ),
          );
        });
      });

      describe("readTextFile", () => {
        it("should fail when invalid option given: 'encoding'", async () => {
          await fs.writeTextFile(testFile, "hello");

          await expect(
            fs.readTextFile(testFile, { encoding: 1 as any }),
          ).toRejectMatch(
            matchFsError(
              "'readTextFile' failed with error: Invalid option 'encoding' - Expected a [string].",
            ),
          );
          await expect(
            fs.readTextFile(testFile, { encoding: "lul" as any }),
          ).toRejectMatch(
            matchFsError(
              "'readTextFile' failed with error: Invalid option 'encoding' - Expected a [valid encoding].",
            ),
          );
        });
      });

      describe("writeFile", () => {
        it("should fail when invalid content argument", async () => {
          await expect(
            fs.writeFile(testFile, "123" as any),
          ).toRejectMatch(
            matchFsError(
              "'writeFile' failed with error: Expected a [Uint8Array].",
            ),
          );
        });
      });

      describe("writeTextFile", () => {
        it("should fail when invalid option given: 'etag'", async () => {
          await expect(
            fs.writeTextFile(testFile, loremIpsum, {
              etag: 3 as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'writeTextFile' failed with error: Invalid option 'etag' - Expected a [string].",
            ),
          );
        });

        it("should fail when invalid option given: 'makeBackup'", async () => {
          await expect(
            fs.writeTextFile(testFile, loremIpsum, {
              makeBackup: "yes" as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'writeTextFile' failed with error: Invalid option 'makeBackup' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'private'", async () => {
          await expect(
            fs.writeTextFile(testFile, loremIpsum, {
              private: 1 as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'writeTextFile' failed with error: Invalid option 'private' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'replace'", async () => {
          await expect(
            fs.writeTextFile(testFile, loremIpsum, {
              replace: {} as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'writeTextFile' failed with error: Invalid option 'replace' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid content argument", async () => {
          await expect(
            fs.writeTextFile(testFile, 123 as any),
          ).toRejectMatch(
            matchFsError(
              "'writeTextFile' failed with error: Expected a [string].",
            ),
          );
        });
      });

      describe("appendFile", () => {
        it("should fail when invalid content argument", async () => {
          await expect(
            fs.appendFile(testFile, "123" as any),
          ).toRejectMatch(
            matchFsError(
              "'appendFile' failed with error: Expected a [Uint8Array].",
            ),
          );
        });
      });

      describe("appendTextFile", () => {
        it("should fail when invalid content argument", async () => {
          await expect(
            fs.appendTextFile(testFile, 123 as any),
          ).toRejectMatch(
            matchFsError(
              "'appendTextFile' failed with error: Expected a [string].",
            ),
          );
        });
      });

      describe("moveFile", () => {
        it("should fail when invalid option given: 'onProgress'", async () => {
          await expect(
            fs.moveFile(testFile, testFile + "-ov", {
              onProgress: {} as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'moveFile' failed with error: Invalid option 'onProgress' - Expected a [function].",
            ),
          );
        });

        it("should fail when invalid option given: 'allMetadata'", async () => {
          await expect(
            fs.moveFile(testFile, testFile + "-ov", {
              allMetadata: [] as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'moveFile' failed with error: Invalid option 'allMetadata' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'makeBackup'", async () => {
          await expect(
            fs.moveFile(testFile, testFile + "-ov", {
              makeBackup: 0 as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'moveFile' failed with error: Invalid option 'makeBackup' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'noFallbackForMove'", async () => {
          await expect(
            fs.moveFile(testFile, testFile + "-ov", {
              noFallbackForMove: (() => {}) as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'moveFile' failed with error: Invalid option 'noFallbackForMove' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'overwrite'", async () => {
          await expect(
            fs.moveFile(testFile, testFile + "-ov", {
              overwrite: "123" as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'moveFile' failed with error: Invalid option 'overwrite' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'targetDefaultPermissions'", async () => {
          await expect(
            fs.moveFile(testFile, testFile + "-ov", {
              targetDefaultPermissions: 1 as any,
            }),
          ).toRejectMatch(
            matchFsError(
              "'moveFile' failed with error: Invalid option 'targetDefaultPermissions' - Expected a [boolean].",
            ),
          );
        });
      });

      describe("deleteFile", () => {
        it("should fail when invalid option given: 'recursive'", async () => {
          await expect(
            fs.deleteFile(testFile, { recursive: "yes" as any }),
          ).toRejectMatch(
            matchFsError(
              "'deleteFile' failed with error: Invalid option 'recursive' - Expected a [boolean].",
            ),
          );
        });

        it("should fail when invalid option given: 'trash'", async () => {
          await expect(
            fs.deleteFile(testFile, { trash: "~/trashbin" as any }),
          ).toRejectMatch(
            matchFsError(
              "'deleteFile' failed with error: Invalid option 'trash' - Expected a [boolean].",
            ),
          );
        });
      });

      describe("chown", () => {
        it("should fail when invalid uid argument", async () => {
          await expect(
            fs.chown(testFile, "1000" as any, 1000),
          ).toRejectMatch(
            matchFsError(
              "'chown' failed with error: Expected a [number]. (uid)",
            ),
          );
        });

        it("should fail when invalid gid argument", async () => {
          await expect(
            fs.chown(testFile, 1000, "1000" as any),
          ).toRejectMatch(
            matchFsError(
              "'chown' failed with error: Expected a [number]. (gid)",
            ),
          );
        });
      });

      describe("chmod", () => {
        it("should fail when invalid mode argument", async () => {
          await expect(
            fs.chmod(testFile, "777" as any),
          ).toRejectMatch(
            matchFsError(
              "'chmod' failed with error: Expected a [string] detailing permissions.",
            ),
          );
          await expect(fs.chmod(testFile, {} as any)).toRejectMatch(
            matchFsError(
              "'chmod' failed with error: Expected a [object] detailing permissions.",
            ),
          );
          await expect(
            fs.chmod(testFile, {
              group: {
                execute: true,
                read: true,
                write: true,
              },
              others: {
                execute: true,
                read: true,
                write: true,
              },
              owner: {
                execute: true,
                read: true,
                write: 1 as any,
              },
            }),
          ).toRejectMatch(
            matchFsError(
              "'chmod' failed with error: Expected a [object] detailing permissions.",
            ),
          );
        });
      });
    });

    describe("file doesn't exist", () => {
      it("listDir", async () => {
        await expect(fs.listDir(testFile)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'listDir' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("listFilenames", async () => {
        await expect(fs.listFilenames(testFile)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'listFilenames' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("fileInfo", async () => {
        await expect(fs.fileInfo(testFile)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'fileInfo' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("readFile", async () => {
        await expect(fs.readFile(testFile)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'readFile' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("readTextFile", async () => {
        await expect(fs.readTextFile(testFile)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'readTextFile' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("moveFile", async () => {
        await expect(
          fs.moveFile(testFile, testFile + "-ov"),
        ).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'moveFile' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("copyFile", async () => {
        await expect(
          fs.copyFile(testFile, testFile + "-ov"),
        ).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'copyFile' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("deleteFile", async () => {
        await expect(fs.deleteFile(testFile)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'deleteFile' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("chmod", async () => {
        await expect(fs.chmod(testFile, "rwxrwxrwx")).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'chmod' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });

      it("chown", async () => {
        await expect(fs.chown(testFile, 1000, 1000)).toRejectMatch(
          matchFsError(
            matchMessageContaining(
              "'chown' failed with error:",
              "No such file or directory",
            ),
          ),
        );
      });
    });
  });
});
