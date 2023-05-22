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
import { Fs, SyncFs, SyncIOStream } from "../src/index";

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

const TMP_DIR_PATH = GLib.get_current_dir() + "/__tests__/sync-fs-test-tmp";

export default describe("Fs", () => {
  let testFile = "";
  const fs = new SyncFs({ cwd: TMP_DIR_PATH });

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
    const files = await Fs.listDir(TMP_DIR_PATH);

    await Promise.all(
      files.map((f) =>
        fs.deleteFile(f.filepath, { recursive: true, trash: true })
      )
    );
  });

  describe("positive scenarios", () => {
    describe("fileExists", () => {
      it("should return true for an existing file", () => {
        fs.writeFile(testFile, new Uint8Array([1, 2, 3, 4]));
        expect(fs.fileExists(testFile)).toBe(true);
      });

      it("should return false for a non-existing file", () => {
        expect(fs.fileExists(testFile)).toBe(false);
      });
    });

    describe("listDir", () => {
      it("should return a list of FileInfo objects for each file and dir", () => {
        // setup
        fs.makeDir(testFile);

        fs.writeTextFile(testFile + "/txtfile", "123");
        fs.writeTextFile(testFile + "/executable", "#!/bin/bash");
        fs.chmod(testFile + "/executable", "rwxr-xr-x");
        fs.makeDir(testFile + "/childDir");
        fs.makeLink(testFile + "/link", testFile + "/txtfile");

        // test
        const files = fs.listDir(testFile);

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

    describe("listFilenames", () => {
      it("should return a list of FileInfo objects for each file and dir", () => {
        // setup
        fs.makeDir(testFile);

        fs.writeTextFile(testFile + "/file.txt", "123");
        fs.writeFile(testFile + "/binary", new Uint8Array([1, 2, 3, 4]));
        fs.writeTextFile(testFile + "/executable.sh", "#!/bin/bash");
        fs.makeDir(testFile + "/childDir");
        fs.makeLink(testFile + "/link", testFile + "/file.txt");

        // test
        const files = fs.listFilenames(testFile);

        expect(files.length).toBe(5);
        expect(files).toContainOnly(
          "file.txt",
          "binary",
          "executable.sh",
          "childDir",
          "link"
        );
      });
    });

    describe("fileInfo", () => {
      it("should return a FileInfo object for the given file", () => {
        // setup
        fs.makeDir(testFile);

        fs.writeTextFile(testFile + "/txtfile", "123");
        fs.writeTextFile(testFile + "/executable", "#!/bin/bash");
        fs.chmod(testFile + "/executable", "rwxr-xr-x");
        fs.makeDir(testFile + "/childDir");
        fs.makeLink(testFile + "/link", testFile + "/txtfile");

        // test
        const txtfileInfo = fs.fileInfo(testFile + "/txtfile");
        const executableInfo = fs.fileInfo(testFile + "/executable");
        const childDirInfo = fs.fileInfo(testFile + "/childDir");
        const linkInfo = fs.fileInfo(testFile + "/link");

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
      it("should correctly read the contents of the file", () => {
        const bytes = fs.readFile("../data/lorem-ipsum.txt");

        const text = new TextDecoder().decode(bytes);

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("readTextFile", () => {
      it("should correctly read the contents of the file", () => {
        const text = fs.readTextFile("../data/lorem-ipsum.txt");

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("writeFile", () => {
      it("should correctly create a new file and write to it", () => {
        const data = new Uint8Array([2, 1, 4, 3, 6, 5, 8, 7]);
        fs.writeFile(testFile, data);

        const readData = fs.readFile(testFile);
        expect(readData).toEqual(data);
      });

      it("should overwrite an existing file", () => {
        const data = new Uint8Array([2, 1, 4, 3, 6, 5, 8, 7]);
        fs.writeFile(testFile, data);

        const readData = fs.readFile(testFile);
        expect(readData).toEqual(data);

        const newData = new Uint8Array([100, 1000, 10000]);
        fs.writeFile(testFile, newData);

        const readNewData = fs.readFile(testFile);
        expect(readNewData).toEqual(newData);
      });
    });

    describe("writeTextFile", () => {
      it("should correctly encode the content", () => {
        const data = "hello world";
        fs.writeTextFile(testFile, data);

        const readData = fs.readTextFile(testFile);
        expect(readData).toEqual(data);

        const newData = "bye\ncruel\nworld\nit was not nice knowing you";
        fs.writeTextFile(testFile, newData);

        const readNewData = fs.readTextFile(testFile);
        expect(readNewData).toEqual(newData);
      });
    });

    describe("appendFile", () => {
      it("should open an existing file and append new content to it", () => {
        const bytes1 = new Uint8Array([1, 2, 3, 4]);
        const bytes2 = new Uint8Array([5, 6, 7, 8]);

        fs.writeFile(testFile, bytes1);
        fs.appendFile(testFile, bytes2);

        const readData = fs.readFile(testFile);

        expect(readData).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
      });
    });

    describe("appendTextFile", () => {
      it("should open an existing file and append new content to it", () => {
        const text1 = loremIpsum.slice(0, 525);
        const text2 = loremIpsum.slice(525);

        fs.writeTextFile(testFile, text1);
        fs.appendTextFile(testFile, text2);

        const readData = fs.readTextFile(testFile);

        expect(readData).toEqual(loremIpsum);
      });
    });

    describe("moveFile", () => {
      it("should correctly rename given file", () => {
        fs.writeTextFile(testFile, loremIpsum);

        fs.moveFile(testFile, testFile + "-renamed");

        const files = fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile + "-renamed",
        });
        expect(files).not.toContainMatch({
          filename: testFile,
        });

        const text = fs.readTextFile(testFile + "-renamed");

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("copyFile", () => {
      it("should correctly copy the given file", () => {
        fs.writeTextFile(testFile, loremIpsum);

        fs.copyFile(testFile, testFile + "-copied");

        const files = fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile + "-copied",
        });
        expect(files).toContainMatch({
          filename: testFile,
        });

        const text = fs.readTextFile(testFile + "-copied");

        expect(text).toEqual(loremIpsum);
      });
    });

    describe("deleteFile", () => {
      it("should delete the given file", () => {
        fs.writeTextFile(testFile, "");

        const files = fs.listDir(".");

        expect(files).toContainMatch({
          filename: testFile,
        });

        fs.deleteFile(testFile);

        const filesAfterDelete = fs.listDir(".");

        expect(filesAfterDelete).not.toContainMatch({
          filename: testFile,
        });
      });

      it("should delete recursively if the recursive option is set", () => {
        fs.makeDir(testFile);
        fs.writeTextFile(testFile + "/file1", "");
        fs.writeTextFile(testFile + "/file2", "");
        fs.makeDir(testFile + "/dir1");
        fs.writeTextFile(testFile + "/dir1/file1", "");
        fs.makeDir(testFile + "/dir1/dir2");
        fs.writeTextFile(testFile + "/dir1/dir2/file1", "");

        const files = fs.listDir(testFile);

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

        const dirFiles = fs.listDir(testFile + "/dir1");

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

        const dir2Files = fs.listDir(testFile + "/dir1/dir2");

        expect(dir2Files).toContainMatch({
          filename: "file1",
          isFile: true,
        });

        fs.deleteFile(testFile, { recursive: true });

        const testFileExists = fs.fileExists(testFile);

        expect(testFileExists).toBe(false);
      });
    });

    describe("makeDir", () => {
      it("should make a directory", () => {
        fs.makeDir(testFile);

        const exists = fs.fileExists(testFile);

        expect(exists).toBe(true);

        const info = fs.fileInfo(testFile);

        expect(info.isDirectory).toBe(true);
      });
    });

    describe("makeLink", () => {
      it("should make a link", () => {
        fs.writeTextFile(testFile, loremIpsum);
        fs.makeLink(testFile + "-link", testFile);

        const exists = fs.fileExists(testFile + "-link");
        expect(exists).toBe(true);

        const info = fs.fileInfo(testFile + "-link");
        expect(info.isSymlink).toBe(true);
        expect(info.symlinkTarget).toMatchRegex(new RegExp(`^.+?${testFile}$`));
      });
    });

    describe("chmod", () => {
      it("should change the permission of the given file", () => {
        fs.writeTextFile(testFile, loremIpsum);

        fs.chmod(testFile, "rwxrwxrwx");

        const info = fs.fileInfo(testFile);

        expect(info.canRead).toBe(true);
        expect(info.canWrite).toBe(true);
        expect(info.canExecute).toBe(true);

        fs.chmod(testFile, "---------");

        const info2 = fs.fileInfo(testFile);

        expect(info2.canRead).toBe(false);
        expect(info2.canWrite).toBe(false);
        expect(info2.canExecute).toBe(false);
      });
    });

    describe("openIOStream", () => {
      it("should create new instance of SyncIOStream (CREATE)", () => {
        const stream = fs.openFileIOStream(testFile, "CREATE");

        try {
          expect(stream).toBeDefined();
          expect(stream instanceof SyncIOStream).toBe(true);
          expect(stream.state).toBe("OPEN");
          expect(stream.type).toBe("CREATE");
        } finally {
          stream.close();
        }
      });

      it("should create new instance of SyncIOStream (OPEN)", () => {
        fs.writeTextFile(testFile, "");

        const stream = fs.openFileIOStream(testFile, "OPEN");

        try {
          expect(stream).toBeDefined();
          expect(stream instanceof SyncIOStream).toBe(true);
          expect(stream.state).toBe("OPEN");
          expect(stream.type).toBe("OPEN");
        } finally {
          stream.close();
        }
      });

      it("should create new instance of SyncIOStream (REPLACE)", () => {
        fs.writeTextFile(testFile, "");

        const stream = fs.openFileIOStream(testFile, "REPLACE");

        try {
          expect(stream).toBeDefined();
          expect(stream instanceof SyncIOStream).toBe(true);
          expect(stream.state).toBe("OPEN");
          expect(stream.type).toBe("REPLACE");
        } finally {
          stream.close();
        }
      });
    });
  });

  describe("negative scenarios", () => {
    describe("listDir", () => {
      it("should fail when invalid option given: 'followSymlinks'", () => {
        expect(() => fs.listDir(".", { followSymlinks: 1 as any })).toThrow();
      });

      it("should fail when invalid option given: 'attributes'", () => {
        expect(() => fs.listDir(".", { attributes: 1 as any })).toThrow();
      });
    });

    describe("fileInfo", () => {
      it("should fail when invalid option given: 'followSymlinks'", () => {
        expect(() => fs.fileInfo(".", { followSymlinks: 1 as any })).toThrow();
      });

      it("should fail when invalid option given: 'attributes'", () => {
        expect(() => fs.fileInfo(".", { attributes: 1 as any })).toThrow();
        expect(() => fs.fileInfo(".", { attributes: "*" as any })).toThrow();
      });
    });

    describe("readTextFile", () => {
      it("should fail when invalid option given: 'encoding'", () => {
        expect(() => fs.readTextFile(".", { encoding: 1 as any })).toThrow();
        expect(() =>
          fs.readTextFile(".", { encoding: "lul" as any })
        ).toThrow();
      });
    });

    describe("writeTextFile", () => {
      it("should fail when invalid option given: 'etag'", () => {
        expect(() =>
          fs.writeTextFile(testFile, loremIpsum, { etag: 3 as any })
        ).toThrow();
      });

      it("should fail when invalid option given: 'makeBackup'", () => {
        expect(() =>
          fs.writeTextFile(testFile, loremIpsum, { makeBackup: "yes" as any })
        ).toThrow();
      });

      it("should fail when invalid option given: 'private'", () => {
        expect(() =>
          fs.writeTextFile(testFile, loremIpsum, { private: 1 as any })
        ).toThrow();
      });

      it("should fail when invalid option given: 'replace'", () => {
        expect(() =>
          fs.writeTextFile(testFile, loremIpsum, { replace: {} as any })
        ).toThrow();
      });
    });

    describe("moveFile", () => {
      it("should fail when invalid option given: 'onProgress'", () => {
        expect(() =>
          fs.moveFile(testFile, testFile + "-ov", {
            onProgress: {} as any,
          })
        ).toThrow();
      });

      it("should fail when invalid option given: 'allMetadata'", () => {
        expect(() =>
          fs.moveFile(testFile, testFile + "-ov", {
            allMetadata: [] as any,
          })
        ).toThrow();
      });

      it("should fail when invalid option given: 'makeBackup'", () => {
        expect(() =>
          fs.moveFile(testFile, testFile + "-ov", {
            makeBackup: 0 as any,
          })
        ).toThrow();
      });

      it("should fail when invalid option given: 'noFallbackForMove'", () => {
        expect(() =>
          fs.moveFile(testFile, testFile + "-ov", {
            noFallbackForMove: (() => {}) as any,
          })
        ).toThrow();
      });

      it("should fail when invalid option given: 'overwrite'", () => {
        expect(() =>
          fs.moveFile(testFile, testFile + "-ov", {
            overwrite: "123" as any,
          })
        ).toThrow();
      });

      it("should fail when invalid option given: 'targetDefaultPermissions'", () => {
        expect(() =>
          fs.moveFile(testFile, testFile + "-ov", {
            targetDefaultPermissions: 1 as any,
          })
        ).toThrow();
      });
    });

    describe("deleteFile", () => {
      it("should fail when invalid option given: 'recursive'", () => {
        expect(() =>
          fs.deleteFile(testFile, { recursive: "yes" as any })
        ).toThrow();
      });

      it("should fail when invalid option given: 'trash'", () => {
        expect(() =>
          fs.deleteFile(testFile, { trash: "~/trashbin" as any })
        ).toThrow();
      });
    });
  });
});
