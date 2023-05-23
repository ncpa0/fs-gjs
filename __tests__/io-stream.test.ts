import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@reactgjs/gest";
import GLib from "gi://GLib?version=2.0";
import { Fs } from "../src/index";
import { compareBytes, encode, matchFsError } from "./shared";

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

const TMP_DIR_PATH = GLib.get_current_dir() + "/__tests__/iostream-test-tmp";

export default describe("IOStream", () => {
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
    it("should manage it's state", async () => {
      const stream = await fs.openFileIOStream(testFile, "CREATE");

      try {
        expect(stream.state).toBe("OPEN");
      } finally {
        await stream.close();
      }

      expect(stream.state).toBe("CLOSED");
    });

    it("should create a new file", async () => {
      const stream = await fs.openFileIOStream(testFile, "CREATE");
      await stream.close();

      expect(stream.type).toBe("CREATE");

      const exists = await fs.fileExists(testFile);

      expect(exists).toBe(true);
    });

    it("should open an existing file", async () => {
      await fs.writeTextFile(testFile, loremIpsum);

      const stream = await fs.openFileIOStream(testFile, "OPEN");

      try {
        const data = await stream.readAll();

        expect(new TextDecoder().decode(data)).toBe(loremIpsum);
      } finally {
        await stream.close();
      }
    });

    it("should replace an existing file", async () => {
      await fs.writeTextFile(testFile, loremIpsum);

      const stream = await fs.openFileIOStream(testFile, "REPLACE");

      try {
        const data = await stream.readAll();

        expect(new TextDecoder().decode(data)).toBe("");
      } finally {
        await stream.close();
      }
    });

    it("should correctly queue writes and wait for them", async () => {
      const stream = await fs.openFileIOStream(testFile, "CREATE");

      try {
        stream.write(encode("Hello "));
        stream.write(encode("World!\n"));
        stream.write(encode("How are you?"));
        stream.write(encode(" I'm fine!\n"));

        await stream.finishPending();

        await stream.seekFromStart(0);

        const data = await stream.readAll();

        expect(new TextDecoder().decode(data)).toBe(
          "Hello World!\nHow are you? I'm fine!\n"
        );
      } finally {
        await stream.close();
      }

      const fdata = await fs.readTextFile(testFile);

      expect(fdata).toBe("Hello World!\nHow are you? I'm fine!\n");
    });

    it("should correctly skip bytes", async () => {
      const stream = await fs.openFileIOStream(testFile, "CREATE");

      try {
        await stream.write(new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]));
        await stream.seekFromStart(0);

        const firstTwoBytes = await stream.read(2);

        expect(compareBytes(firstTwoBytes, new Uint8Array([11, 22]))).toBe(
          true
        );

        await stream.skip(2);

        const nextTwoBytes = await stream.read(2);

        expect(compareBytes(nextTwoBytes, new Uint8Array([55, 66]))).toBe(true);

        await stream.skip(1);

        const lastTwoBytes = await stream.read(2);

        expect(compareBytes(lastTwoBytes, new Uint8Array([88]))).toBe(true);

        await stream.seekFromStart(1);

        await stream.write(new Uint8Array([456, 789]));

        await stream.seekFromStart(0);

        const data = await stream.read(4);

        expect(compareBytes(data, new Uint8Array([11, 456, 789, 44]))).toBe(
          true
        );
      } finally {
        await stream.close();
      }
    });

    it("Should correctly truncate", async () => {
      const stream = await fs.openFileIOStream(testFile, "CREATE");

      try {
        await stream.write(
          new Uint8Array(Array.from({ length: 100 }, (_, i) => i))
        );
        await stream.seekFromStart(0);

        await stream.truncate(37);

        const data = await stream.readAll();

        expect(
          compareBytes(
            data,
            new Uint8Array(Array.from({ length: 37 }, (_, i) => i))
          )
        ).toBe(true);
      } finally {
        await stream.close();
      }
    });

    it("should correctly tell the cursor position", async () => {
      const stream = await fs.openFileIOStream(testFile, "CREATE");

      try {
        await stream.write(new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]));

        expect(await stream.currentPosition()).toBe(8);

        await stream.seekFromStart(0);

        expect(await stream.currentPosition()).toBe(0);

        await stream.skip(4);

        expect(await stream.currentPosition()).toBe(4);

        await stream.seekFromEnd(-2);

        expect(await stream.currentPosition()).toBe(6);

        await stream.write(new Uint8Array([10001, 10002, 10003, 10004]));

        expect(await stream.currentPosition()).toBe(10);

        await stream.seekFromStart(4);

        expect(await stream.currentPosition()).toBe(4);

        await stream.read(2);

        expect(await stream.currentPosition()).toBe(6);
      } finally {
        await stream.close();
      }
    });
  });

  describe("negative scenarios", () => {
    describe("invalid options", () => {
      describe("openFile", () => {
        it("should fail when invalid option given: 'ioPriority'", async () => {
          await expect(
            fs.openFileIOStream(testFile, "CREATE", {
              ioPriority: "1000" as any,
            })
          ).toRejectMatch(
            matchFsError(
              "'IOStream.openFile' failed with error: Invalid option 'ioPriority' - Expected a [number]."
            )
          );
        });

        it("should fail when invalid option given: 'etag'", async () => {
          await expect(
            fs.openFileIOStream(testFile, "CREATE", { etag: 100 as any })
          ).toRejectMatch(
            matchFsError(
              "'IOStream.openFile' failed with error: Invalid option 'etag' - Expected a [string]."
            )
          );
        });

        it("should fail when invalid option given: 'makeBackup'", async () => {
          await expect(
            fs.openFileIOStream(testFile, "CREATE", { makeBackup: "." as any })
          ).toRejectMatch(
            matchFsError(
              "'IOStream.openFile' failed with error: Invalid option 'makeBackup' - Expected a [boolean]."
            )
          );
        });

        it("should fail when invalid option given: 'private'", async () => {
          await expect(
            fs.openFileIOStream(testFile, "CREATE", { private: "yes" as any })
          ).toRejectMatch(
            matchFsError(
              "'IOStream.openFile' failed with error: Invalid option 'private' - Expected a [boolean]."
            )
          );
        });

        it("should fail when invalid option given: 'replace'", async () => {
          await expect(
            fs.openFileIOStream(testFile, "CREATE", { replace: [true] as any })
          ).toRejectMatch(
            matchFsError(
              "'IOStream.openFile' failed with error: Invalid option 'replace' - Expected a [boolean]."
            )
          );
        });

        it("should fail when invalid type argument is given", async () => {
          await expect(
            fs.openFileIOStream(testFile, "create" as any)
          ).toRejectMatch(
            matchFsError(
              "'IOStream.openFile' failed with error: Invalid IOStream type."
            )
          );
        });
      });

      describe("seek", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.seek("1" as any)).toRejectMatch(
              matchFsError(
                "'IOStream.seek' failed with error: Expected a [integer]."
              )
            );
            await expect(stream.seek(1.1)).toRejectMatch(
              matchFsError(
                "'IOStream.seek' failed with error: Expected a [integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("seekFromEnd", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.seekFromEnd(NaN as any)).toRejectMatch(
              matchFsError(
                "'IOStream.seekFromEnd' failed with error: Expected a [integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("seekFromStart", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.seekFromStart({} as any)).toRejectMatch(
              matchFsError(
                "'IOStream.seekFromStart' failed with error: Expected a [integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("skip", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.skip([1] as any)).toRejectMatch(
              matchFsError(
                "'IOStream.skip' failed with error: Expected a [positive integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("write", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.write([] as any)).toRejectMatch(
              matchFsError(
                "'IOStream.write' failed with error: Expected a [Uint8Array]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("read", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.read(NaN)).toRejectMatch(
              matchFsError(
                "'IOStream.read' failed with error: Expected a [positive integer]."
              )
            );
            await expect(stream.read(-1)).toRejectMatch(
              matchFsError(
                "'IOStream.read' failed with error: Expected a [positive integer]."
              )
            );
            await expect(stream.read(1.1)).toRejectMatch(
              matchFsError(
                "'IOStream.read' failed with error: Expected a [positive integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("readAll", () => {
        it("should fail when invalid given invalid 'chunkSize' argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(
              stream.readAll({ chunkSize: "" as any })
            ).toRejectMatch(
              matchFsError(
                "'IOStream.readAll' failed with error: Expected a [positive integer]."
              )
            );
            await expect(stream.readAll({ chunkSize: 0 })).toRejectMatch(
              matchFsError(
                "'IOStream.readAll' failed with error: Expected a [positive integer]."
              )
            );
            await expect(
              stream.readAll({ chunkSize: (0.1 + 0.2) * 10 })
            ).toRejectMatch(
              matchFsError(
                "'IOStream.readAll' failed with error: Expected a [positive integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });

      describe("truncate", () => {
        it("should fail when invalid given invalid argument", async () => {
          const stream = await fs.openFileIOStream(testFile, "CREATE");

          try {
            await expect(stream.truncate("1" as any)).toRejectMatch(
              matchFsError(
                "'IOStream.truncate' failed with error: Expected a [positive integer]."
              )
            );
            await expect(stream.truncate(-1)).toRejectMatch(
              matchFsError(
                "'IOStream.truncate' failed with error: Expected a [positive integer]."
              )
            );
            await expect(stream.truncate(1.1)).toRejectMatch(
              matchFsError(
                "'IOStream.truncate' failed with error: Expected a [positive integer]."
              )
            );
          } finally {
            await stream.close();
          }
        });
      });
    });
  });
});
