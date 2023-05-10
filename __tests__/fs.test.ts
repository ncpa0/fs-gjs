import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  match,
} from "@reactgjs/gest";
import GLib from "gi://GLib?version=2.0";
import { Fs, IOStream } from "../src/index";

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

const TMP_DIR_PATH = GLib.get_current_dir() + "/__tests__/fs-test-tmp";

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
      files.map((f) => fs.deleteFile(f.filepath, { recursive: true }))
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
        await fs.writeTextFile(testFile + "/executable", "#!/bin/bash");
        await fs.chmod(testFile + "/executable", "rwxr-xr-x");
        await fs.makeDir(testFile + "/childDir");
        await fs.makeLink(testFile + "/link", testFile + "/txtfile");

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
            filepath: match.stringContaining(testFile + "/executable"),
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
            symlinkTarget: match.stringContaining(testFile + "/txtfile"),
            isDirectory: false,
            isFile: false,
            isSymlink: true,
            canDelete: true,
            canExecute: false,
            canRead: true,
            canWrite: true,
            canTrash: true,
          }
        );
      });
    });

    describe("fileInfo", () => {
      it("should return a FileInfo object for the given file", async () => {
        // setup
        await fs.makeDir(testFile);

        await fs.writeTextFile(testFile + "/txtfile", "123");
        await fs.writeTextFile(testFile + "/executable", "#!/bin/bash");
        await fs.chmod(testFile + "/executable", "rwxr-xr-x");
        await fs.makeDir(testFile + "/childDir");
        await fs.makeLink(testFile + "/link", testFile + "/txtfile");

        // test
        const txtfileInfo = await fs.fileInfo(testFile + "/txtfile");
        const executableInfo = await fs.fileInfo(testFile + "/executable");
        const childDirInfo = await fs.fileInfo(testFile + "/childDir");
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
          symlinkTarget: match.stringContaining(testFile + "/txtfile"),
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
    });

    describe("writeTextFile", () => {
      it("should correctly encode the content", async () => {
        const data = "hello world";
        await fs.writeTextFile(testFile, data);

        const readData = await fs.readTextFile(testFile);
        expect(readData).toEqual(data);

        const newData = "bye\ncruel\nworld\nit was not nice knowing you";
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

        expect(readData).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
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
          }
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
          }
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
      it("should make a link", async () => {
        await fs.writeTextFile(testFile, loremIpsum);
        await fs.makeLink(testFile + "-link", testFile);

        const exists = await fs.fileExists(testFile + "-link");
        expect(exists).toBe(true);

        const info = await fs.fileInfo(testFile + "-link");
        expect(info.isSymlink).toBe(true);
        expect(info.symlinkTarget).toMatchRegex(new RegExp(`^.+?${testFile}$`));
      });
    });

    describe("chmod", () => {
      it("should change the permission of the given file", async () => {
        await fs.writeTextFile(testFile, loremIpsum);

        await fs.chmod(testFile, "rwxrwxrwx");

        const info = await fs.fileInfo(testFile);

        expect(info.canRead).toBe(true);
        expect(info.canWrite).toBe(true);
        expect(info.canExecute).toBe(true);

        await fs.chmod(testFile, "---------");

        const info2 = await fs.fileInfo(testFile);

        expect(info2.canRead).toBe(false);
        expect(info2.canWrite).toBe(false);
        expect(info2.canExecute).toBe(false);
      });
    });

    describe("openIOStream", () => {
      it("should create new instance of IOStream (CREATE)", async () => {
        const stream = await fs.openIOStream(testFile, "CREATE");

        expect(stream).toBeDefined();
        expect(stream instanceof IOStream).toBe(true);
        expect(stream.state).toBe("OPEN");
        expect(stream.type).toBe("CREATE");

        await stream.close();
      });

      it("should create new instance of IOStream (OPEN)", async () => {
        await fs.writeTextFile(testFile, "");

        const stream = await fs.openIOStream(testFile, "OPEN");

        expect(stream).toBeDefined();
        expect(stream instanceof IOStream).toBe(true);
        expect(stream.state).toBe("OPEN");
        expect(stream.type).toBe("OPEN");

        await stream.close();
      });

      it("should create new instance of IOStream (REPLACE)", async () => {
        await fs.writeTextFile(testFile, "");

        const stream = await fs.openIOStream(testFile, "REPLACE");

        expect(stream).toBeDefined();
        expect(stream instanceof IOStream).toBe(true);
        expect(stream.state).toBe("OPEN");
        expect(stream.type).toBe("REPLACE");

        await stream.close();
      });
    });
  });
});
